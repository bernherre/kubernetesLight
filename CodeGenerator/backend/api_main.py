# api_main.py - FastAPI wrapper + ZIP/PDF downloads (Windows-friendly)

import os
import io
import shutil
from typing import Optional
from datetime import datetime
import platform

import psutil  # <- necesario para /status

from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv
# ======================================================
# Load environment variables
# =======================================================
load_dotenv()
# Set up OpenAI API key
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
GEN_PERMISSIVE = os.environ.get("GEN_PERMISSIVE")
if not OPENAI_API_KEY:
    OPENAI_API_KEY = input("Please enter your OpenAI API key: ")
    os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY


# --- PDF (opcional) ---
# pip install reportlab
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm

import gen_project as gp  # tu módulo de materialización

# ====== CONSTANTES ======
DEFAULT_BASE_OUT = os.environ.get("DEFAULT_BASE_OUT", "generated_projects")
os.makedirs(DEFAULT_BASE_OUT, exist_ok=True)

# ====== APP ======
app = FastAPI(title="Project Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # abre CORS para Flutter web/dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====== MODELOS ======
class GenerateRequest(BaseModel):
    mode: str = Field(..., description="model|text")
    project_name: str = Field(..., min_length=1)
    language_hint: Optional[str] = None
    prompt: Optional[str] = None
    text: Optional[str] = None
    model_name: str = "gpt-5-mini"
    out_dir: Optional[str] = None
    faiss_dir: Optional[str] = None
    allow_hidden_paths: bool = False
    no_overwrite: bool = False
    dry_run: bool = False

# ====== PDF helpers ======
def _wrap_text(text: str, max_chars: int = 100) -> list[str]:
    lines = []
    for paragraph in text.replace("\r\n", "\n").split("\n"):
        if not paragraph:
            lines.append("")
            continue
        current = []
        count = 0
        for word in paragraph.split(" "):
            wlen = len(word) + 1
            if count + wlen > max_chars:
                lines.append(" ".join(current))
                current = [word]
                count = len(word) + 1
            else:
                current.append(word)
                count += wlen
        if current:
            lines.append(" ".join(current))
    return lines

def save_ai_response_pdf(text: str, out_dir: str, filename: str = "ai_response.pdf") -> str:
    os.makedirs(out_dir, exist_ok=True)
    pdf_path = os.path.join(out_dir, filename)
    c = canvas.Canvas(pdf_path, pagesize=A4)
    width, height = A4

    left = 2 * cm
    top = height - 2 * cm
    line_height = 12
    max_width_chars = 100

    c.setFont("Helvetica-Bold", 14)
    c.drawString(left, top, "AI Raw Response")
    y = top - 1.2 * line_height

    c.setFont("Courier", 10)
    for line in _wrap_text(text, max_chars=max_width_chars):
        if y < 2 * cm:
            c.showPage()
            c.setFont("Courier", 10)
            y = top
        c.drawString(left, y, line)
        y -= line_height

    c.save()
    return pdf_path

def _collect_files_map(root: str) -> dict[str, str]:
    """
    Lee todos los archivos de texto del proyecto materializado y
    devuelve un dict ruta_relativa -> contenido_texto (para FAISS).
    Ignora binarios comunes.
    """
    text_exts = {
        ".txt",".md",".json",".yaml",".yml",".py",".js",".ts",".tsx",
        ".jsx",".css",".html",".toml",".ini",".cfg",".env",".sh",".bat",
        ".xml",".vue",".svelte",".mdx"
    }
    files_map: dict[str, str] = {}
    for dirpath, _, filenames in os.walk(root):
        for fn in filenames:
            rel = os.path.relpath(os.path.join(dirpath, fn), root)
            ext = os.path.splitext(fn)[1].lower()
            if ext not in text_exts:
                # Intento de lectura como texto por si acaso
                try:
                    with open(os.path.join(dirpath, fn), "r", encoding="utf-8") as f:
                        files_map[rel] = f.read()
                except Exception:
                    continue
            else:
                try:
                    with open(os.path.join(dirpath, fn), "r", encoding="utf-8") as f:
                        files_map[rel] = f.read()
                except Exception:
                    # ignora archivos no-texto o permisos
                    pass
    return files_map

# ====== ENDPOINTS ======
@app.post("/generate")
def generate(req: GenerateRequest):
    print(req)
    # --- 0. Directorio de salida ---
    base_out = req.out_dir or DEFAULT_BASE_OUT
    project_name = req.project_name.strip() or "demo_project"
    out_dir = os.path.join(base_out, project_name)
    os.makedirs(out_dir, exist_ok=True)
    overwrite = not req.no_overwrite

    # --- 1. Obtener texto del modelo o del campo 'text' ---
    if req.mode == "model":
        if not req.prompt:
            lang = req.language_hint or "Flask + MongoDB"
            req.prompt = (
                f"Genera un proyecto en {lang} llamado '{project_name}', "
                f"reutilizable, limpio y ordenado, con CI/CD, documentación breve y pruebas unitarias. "
                f"Usa el formato exacto 'content = {{ ... }}' para los archivos."
            )
        text = gp.call_model_and_get_text(req.prompt, model_name=req.model_name)
    elif req.mode == "text":
        if not req.text:
            raise HTTPException(status_code=400, detail="Para mode='text' debes enviar 'text'.")
        text = req.text
    else:
        raise HTTPException(status_code=400, detail="mode inválido: usa 'model' o 'text'.")

    # --- 2. Materializar a disco ---
    text_or_content = text
    report, written_map = gp.auto_materialize(
        text_or_content,
        out_dir=out_dir,
        overwrite=overwrite,
        dry_run=req.dry_run,
        allow_hidden=True if os.getenv("GEN_PERMISSIVE", "0") == "1" else req.allow_hidden_paths,
    )

    # --- 3. (Opcional) Indexar con FAISS ---
    faiss_created = False
    faiss_path = None
    if req.faiss_dir:
            try:
                # Construimos SIEMPRE un files_map de ruta_relativa -> contenido_texto
                files_map = _collect_files_map(out_dir)
                if files_map:
                    idx_dir = os.path.join(req.faiss_dir, project_name)
                    gp.build_faiss_index(files_map, idx_dir)
                    faiss_created = True
                    faiss_path = os.path.abspath(idx_dir)
                else:
                    faiss_created = False
                    faiss_path = "No se encontraron archivos de texto para indexar."
            except Exception as e:
                faiss_created = False
                faiss_path = f"ERROR: {e}"

    # --- 4. Guardar respuesta original (txt + pdf) ---
    ai_txt_path = os.path.join(out_dir, "ai_response.txt")
    with open(ai_txt_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text or "")

    # tu helper existente:
    ai_pdf_path = save_ai_response_pdf(text, out_dir=out_dir, filename="ai_response.pdf")

    # --- 5. Responder con rutas de descarga ya existentes ---
    return {
        "ok": True,
        "out_dir": os.path.abspath(out_dir),
        "report": report,
        "written_count": len(written_map or {}),
        "faiss_index": faiss_created,
        "faiss_dir": faiss_path,
        "downloads": {
            "zip": f"/download/{project_name}",
            "pdf": f"/download-ai-pdf/{project_name}"
        },
        "ai_pdf_path": ai_pdf_path
    }


def get_project_dir(project_name: str) -> str:
    return os.path.join(DEFAULT_BASE_OUT, project_name)

@app.get("/zip")
def zip_dir(dir: str = Query(..., description="Ruta del directorio a comprimir")):
    """
    Comprime exactamente el directorio 'dir' (ruta absoluta o relativa).
    """
    folder_path = os.path.abspath(dir)
    if not os.path.isdir(folder_path):
        raise HTTPException(status_code=404, detail="Directorio no encontrado")

    base_name = os.path.basename(folder_path.rstrip(os.sep))
    tmp_zip_path = shutil.make_archive(base_name=folder_path, format="zip", root_dir=folder_path)
    # Lo servimos directo desde disco
    return FileResponse(tmp_zip_path, media_type="application/zip", filename=f"{base_name}.zip")
    
@app.get("/download/{project_name}")
def download_project(project_name: str, base_out: str = DEFAULT_BASE_OUT):
    folder_path = os.path.join(base_out, project_name)
    print(folder_path)
    if not os.path.isdir(folder_path):
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    zip_path = shutil.make_archive(folder_path, "zip", folder_path)
    filename = f"{project_name}.zip"
    return FileResponse(zip_path, media_type="application/zip", filename=filename)

@app.get("/download-ai-pdf/{project_name}")
def download_ai_pdf(project_name: str, base_out: str = DEFAULT_BASE_OUT):
    folder_path = os.path.join(base_out, project_name)
    pdf_path = os.path.join(folder_path, "ai_response.pdf")
    if not os.path.isfile(pdf_path):
        raise HTTPException(status_code=404, detail="PDF no encontrado (genera el proyecto primero).")
    return FileResponse(pdf_path, media_type="application/pdf", filename=f"{project_name}_ai_response.pdf")

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Service is healthy", "timestamp": datetime.utcnow().isoformat()}


@app.get("/status")
def status_all():
    process = psutil.Process(os.getpid())
    mem_info = process.memory_info()

    return {
        "service": "Project Generator API",
        "version": "1.0.0",
        "uptime_seconds": int(datetime.now().timestamp() - process.create_time()),
        "timestamp": datetime.utcnow().isoformat(),
        "system": {
            "os": platform.system(),
            "os_version": platform.version(),
            "python_version": platform.python_version(),
            "cpu_percent": psutil.cpu_percent(interval=0.5),
            "memory_percent": psutil.virtual_memory().percent,
            "memory_used_mb": round(mem_info.rss / 1024 / 1024, 2),
        },
        "directories": {
            "default_output": os.path.abspath(DEFAULT_BASE_OUT),
            "exists": os.path.isdir(DEFAULT_BASE_OUT),
        },
        "endpoints": [
            "/generate",
            "/zip?dir=<abs_or_rel_path>",
            "/download/{project_name}",
            "/download-ai-pdf/{project_name}",
            "/health",
            "/status",
        ],
    }
@app.post("/debug/materialize")
def debug_materialize(text: str = Body(..., media_type="text/plain")):
    # Solo usa el parser para ver qué archivos sacaría
    files = gp.extract_code_blocks_with_names(text, allow_hidden=True)
    if not files:
        try:
            content = gp.extract_content_dict(text)
            return {"mode": "content_dict_keys", "keys": list(content.keys())}
        except Exception as e:
            return {"mode": "none", "error": str(e)}
    return {"mode": "fences", "files": list(files.keys())[:50]}