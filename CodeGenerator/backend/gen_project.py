# gen_project.py
# Single-file generator with content={...} and narrative parsing,
# FAISS TF-IDF index, denylist for hidden paths (.github, .git, etc.).

import os, re, sys, ast, faiss, pickle, argparse
from typing import List, Tuple, Dict, Any

# Conjunto de nombres reservados en Windows (no se pueden usar como nombre de archivo solo)
_WIN_RESERVED = {
    "CON","PRN","AUX","NUL",
    "COM1","COM2","COM3","COM4","COM5","COM6","COM7","COM8","COM9",
    "LPT1","LPT2","LPT3","LPT4","LPT5","LPT6","LPT7","LPT8","LPT9",
}

_INVALID_CHARS = r'<>:"|?*'  # inválidos en Win
_invalid_re = re.compile(r'[<>:"|?*]')

DENY_PREFIXES = (".git", ".github", ".svn", ".hg")

def is_hidden_segment(seg: str) -> bool:
    return seg.startswith(".")

def is_denied_path(rel: str) -> bool:
    r = rel.lstrip("./")
    for p in DENY_PREFIXES:
        if r == p or r.startswith(p + "/"):
            return True
    parts = r.split("/")
    return any(is_hidden_segment(s) for s in parts)

def rewrite_if_denied(rel: str, allow_hidden: bool) -> str:
    if allow_hidden:
        return rel
    r = rel.lstrip("./")
    if is_denied_path(r):
        return f"infra/{r}"
    return r

def sanitize_rel_path(path: str, allow_hidden: bool = False) -> Tuple[bool, str]:
    """
    (ok, safe_path). Solo bloquea:
      - rutas absolutas
      - subir niveles ("..")
      - protocolos http(s) / "root:" / líneas no-ruta
    Normaliza separadores y quita './'. Opcionalmente bloquea ocultos.
    """
    if not path:
        return False, ""

    s = path.strip().replace("\\", "/")

    # descartar cosas claramente no rutas
    if s.lower().startswith(("http://", "https://", "root:", "note:", "desc:", "description:")):
        return False, ""

    # limpiar bullets o prefijos raros
    s = re.sub(r'^\s*(\|[-\s]+|[*\-•]\s+)', "", s)
    s = re.sub(r'^\s*(->|-\s+)\s*', "", s)

    if os.path.isabs(s):
        return False, ""
    if s.startswith("./"):
        s = s[2:]

    parts_in = [p for p in s.split("/") if p != ""]
    if ".." in parts_in:
        return False, ""

    # limpia solo caracteres realmente peligrosos en Windows
    parts_out = []
    for seg in parts_in:
        seg = seg.strip()
        if not seg:
            continue
        seg = _invalid_re.sub("_", seg)  # <>:"|?*
        parts_out.append(seg)

    if not parts_out:
        return False, ""

    safe = "/".join(parts_out).rstrip(":").strip()
    if ":" in safe:  # aún hay ":" interno
        return False, ""

    if not allow_hidden and any(p.startswith(".") for p in safe.split("/")):
        return False, ""

    return True, safe


def _looks_like_tree_line(s: str) -> bool:
    has_tree_glyph = any(ch in s for ch in ["├", "└", "│"])
    is_bullet_dir = (s.startswith(("-", "•", "*")) and s.strip().endswith("/"))
    return has_tree_glyph or is_bullet_dir

def is_dir_line(line: str) -> bool:
    """Heurística: una 'carpeta' termina con '/' en el árbol."""
    return line.strip().endswith("/")

def ensure_dirs_from_tree(tree_text: str, out_dir: str, allow_hidden: bool = False):
    """
    Crea carpetas declaradas en el campo "tree". Ignora líneas que no sean rutas.
    """
    for raw in tree_text.splitlines():
        line = raw.strip()
        if not line:
            continue
        ok, rel = sanitize_rel_path(line, allow_hidden=allow_hidden)
        if not ok:
            continue
        if not is_dir_line(rel):
            # Solo creamos directorios si la línea termina con '/'
            continue
        target = os.path.join(out_dir, *rel.split("/"))
        os.makedirs(target, exist_ok=True)

def slice_balanced_braces(s: str, start_idx: int) -> str:
    depth, i = 0, start_idx
    while i < len(s):
        ch = s[i]
        if ch == "{": depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0: return s[start_idx:i+1]
        i += 1
    raise ValueError("No se encontró cierre de llaves balanceado.")

def coerce_dict_str(d: Dict[Any, Any]) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for k, v in d.items():
        out[str(k)] = v if isinstance(v, str) else str(v)
    out.setdefault("tree", "")
    return out

def extract_content_dict(text: str) -> Dict[str, str]:
    """
    Intenta extraer un dict 'content = {...}' o 'content = \"\"\"...\"\"\"'.
    Si falla, intenta limpiar backticks o retorna un único archivo GENERATED.md
    """
    if text is None:
        raise ValueError("Texto vacío")
    raw = text.strip()

    # content = "..."
    m_str = re.search(r"content\s*=\s*(['\"]{1,3})(.*?)\1\s*\Z", raw, flags=re.DOTALL)
    if m_str:
        only_text = m_str.group(2)
        return {"tree": "", "GENERATED.md": only_text if only_text else "# Empty content"}

    # Elimina fences globales si viniera entero en un bloque
    cleaned = re.sub(r"^```[a-zA-Z0-9_\-]*\s*", "", raw)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    # content = { ... }
    m = re.search(r"content\s*=\s*{", cleaned)
    if m:
        try:
            dict_text = slice_balanced_braces(cleaned, cleaned.find("{", m.start()))
            obj = ast.literal_eval(dict_text)
            if isinstance(obj, dict):
                return coerce_dict_str(obj)
        except Exception:
            pass

    # Otra heurística: buscar el primer { ... } balanceado
    first = cleaned.find("{")
    if first != -1:
        try:
            dict_text = slice_balanced_braces(cleaned, first)
            obj = ast.literal_eval(dict_text)
            if isinstance(obj, dict):
                return coerce_dict_str(obj)
        except Exception:
            pass

    # Si parece código Python, mételo como main.py
    if re.search(r"\bfrom\b|\bimport\b|\bdef\b|\bclass\b", cleaned):
        return {"tree": "", "main.py": cleaned}

    # Por defecto: un solo archivo con el texto crudo
    return {"tree": "", "GENERATED.md": cleaned or "# Empty content"}

CODE_FENCE_RE = re.compile(
    r"```(?P<lang>[a-zA-Z0-9_\-]*)\s*\n(?P<body>.*?)(?:```|$)",
    re.DOTALL
)

def guess_filename(pre_lines: List[str], code_body: str, idx: int, allow_hidden: bool) -> Tuple[str, str]:
    """
    Deducción heurística del nombre del archivo de un fence de código:
    - Si la primera línea del bloque empieza con "# path/archivo.ext", úsalo.
    - Si líneas previas tienen bullets "1) path", "- path", etc., úsalo.
    - Si no, 'snippet_{idx}.txt'
    Devuelve (filename_rel, contenido_sin_primera_linea_si_aplica)
    """
    body_lines = code_body.splitlines()

    # 1) '# path/to/file' en la primera línea
    if body_lines:
        m_first = re.match(r"^\s*#\s+([A-Za-z0-9_\-./]+)\s*$", body_lines[0].strip())
        if m_first:
            raw_path = m_first.group(1)
            ok, rel = sanitize_rel_path(raw_path, allow_hidden=allow_hidden)
            if ok:
                return rel, "\n".join(body_lines[1:]).lstrip("\n")

    # 2) Buscar en líneas previas al fence
    for prev in reversed(pre_lines[-4:]):
        prev_clean = prev.strip()

        m_num = re.match(r"^\d+\)\s+([A-Za-z0-9_\-./]+)$", prev_clean)
        if m_num:
            raw_path = m_num.group(1)
            ok, rel = sanitize_rel_path(raw_path, allow_hidden=allow_hidden)
            if ok:
                return rel, code_body

        m_bullet = re.match(r"^[\-\*•]\s+([A-Za-z0-9_\-./]+)$", prev_clean)
        if m_bullet:
            raw_path = m_bullet.group(1)
            ok, rel = sanitize_rel_path(raw_path, allow_hidden=allow_hidden)
            if ok:
                return rel, code_body

        m_simple = re.match(r"^([A-Za-z0-9_.\-\\/]+)$", prev_clean)
        if m_simple and ("/" in prev_clean or "." in prev_clean or prev_clean.lower().endswith("dockerfile")):
            raw_path = m_simple.group(1)
            ok, rel = sanitize_rel_path(raw_path, allow_hidden=allow_hidden)
            if ok:
                return rel, code_body

    return f"snippet_{idx}.txt", code_body

def extract_code_blocks_with_names(raw_text: str, allow_hidden: bool) -> Dict[str, str]:
    files: Dict[str, str] = {}
    for m in CODE_FENCE_RE.finditer(raw_text):
        body = m.group("body").rstrip()
        start_pos = m.start()
        prefix_lines = raw_text[:start_pos].splitlines()
        idx = len(files) + 1
        filename, code_text = guess_filename(prefix_lines, body, idx, allow_hidden=allow_hidden)
        code_text = code_text.replace("\r\n", "\n")
        files[filename] = code_text
    return files

def create_project_from_content(content: Dict[str, str], base_path: str, overwrite: bool, dry_run: bool, allow_hidden: bool) -> Tuple[Dict[str, list], Dict[str, str]]:
    """
    Escribe archivos desde content = {"tree": "...", "path/file.ext": "code", ...}
    Devuelve (report, written_map) donde written_map: rel_path -> abs_path
    """
    os.makedirs(base_path, exist_ok=True)
    report = {"created": [], "overwritten": [], "skipped": []}
    written: Dict[str, str] = {}

    tree_text = content.get("tree") or content.get("TREE") or ""
    if tree_text:
        ensure_dirs_from_tree(tree_text, base_path, allow_hidden=allow_hidden)

    for k, code in content.items():
        if k.lower() == "tree":
            continue
        ok, rel = sanitize_rel_path(k, allow_hidden=allow_hidden)
        if not ok:
            report["skipped"].append(k)
            continue

        abs_path = os.path.join(base_path, *rel.split("/"))
        folder = os.path.dirname(abs_path)
        os.makedirs(folder, exist_ok=True)

        if dry_run:
            report["skipped"].append(rel)
            continue

        if os.path.exists(abs_path):
            if overwrite:
                with open(abs_path, "w", encoding="utf-8", newline="\n") as f:
                    f.write(code)
                report["overwritten"].append(rel)
                written[rel] = abs_path
            else:
                report["skipped"].append(rel)
        else:
            with open(abs_path, "w", encoding="utf-8", newline="\n") as f:
                f.write(code)
            report["created"].append(rel)
            written[rel] = abs_path
        # --- DEBUG: log de saltos
    # --- DEBUG: log de saltos
    if report["skipped"]:
        print("[gen_project] SKIPPED paths:", report["skipped"])

    # “salvavidas”: si no se creó nada, deja al menos un archivo indicador
    if not report["created"] and not report["overwritten"]:
        marker = os.path.join(base_path, "RAW_RESPONSE.md")
        try:
            with open(marker, "w", encoding="utf-8", newline="\n") as f:
                f.write("# Materialización vacía\n\n")
                f.write("No se pudo crear ningún archivo a partir del contenido recibido.\n")
        except Exception:
            pass

    return report, written

def build_project_from_text(text: str, out_dir: str="generated_project",
                            overwrite: bool=True, dry_run: bool=False, allow_hidden: bool=False):
    """
    Si no viene un dict content={...}, intenta extraer bloques ```lang ...```.
    Devuelve (report, written_map) donde written_map: rel_path -> contenido (si dry_run) o contenido (en memoria) — se normaliza afuera si hace falta.
    """
    os.makedirs(out_dir, exist_ok=True)
    report = {"created": [], "overwritten": [], "skipped": []}
    written: Dict[str, str] = {}

    # Intenta crear directorios si el texto contiene un ascii tree en 'tree' (líneas con '/')
    ensure_dirs_from_tree(text, out_dir, allow_hidden=allow_hidden)

    files = extract_code_blocks_with_names(text, allow_hidden=allow_hidden)
    if not files:
        files = {"GENERATED.md": text}

    for rel, content in files.items():
        ok, rel_sane = sanitize_rel_path(rel, allow_hidden=allow_hidden)
        if not ok:
            ok, rel_sane = sanitize_rel_path(f"snippets/{rel.replace('/', '_')}", allow_hidden=allow_hidden)
            if not ok:
                report["skipped"].append(rel)
                continue

        abs_path = os.path.join(out_dir, rel_sane)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)

        if os.path.exists(abs_path) and not overwrite:
            report["skipped"].append(rel_sane)
            continue

        if dry_run:
            # Simula
            (report["overwritten"] if os.path.exists(abs_path) else report["created"]).append(rel_sane)
            written[rel_sane] = content
            continue

        mode = "overwritten" if os.path.exists(abs_path) else "created"
        with open(abs_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(content)
        report[mode].append(rel_sane)
        written[rel_sane] = content
        # --- DEBUG: log de saltos
    if report["skipped"]:
        print("[gen_project] SKIPPED paths:", report["skipped"])

    # “salvavidas”: si no se creó nada, deja al menos un archivo indicador
    if not report["created"] and not report["overwritten"]:
        marker = os.path.join(base_path, "RAW_RESPONSE.md")
        try:
            with open(marker, "w", encoding="utf-8", newline="\n") as f:
                f.write("# Materialización vacía\n\n")
                f.write("No se pudo crear ningún archivo a partir del contenido recibido.\n")
        except Exception:
            pass

    return report, written

def build_faiss_index(files_map: Dict[str, str], index_dir: str, max_features: int = 4096) -> None:
    """
    files_map: dict ruta_relativa -> texto (contenido)
    """
    from sklearn.feature_extraction.text import TfidfVectorizer
    os.makedirs(index_dir, exist_ok=True)
    paths, texts = [], []
    for path, txt in files_map.items():
        paths.append(path)
        texts.append(f"{path}\n{txt}")
    vec = TfidfVectorizer(max_features=max_features)
    X = vec.fit_transform(texts).toarray().astype("float32")
    faiss.normalize_L2(X)
    index = faiss.IndexFlatIP(X.shape[1]); index.add(X)
    faiss.write_index(index, os.path.join(index_dir, "index.faiss"))
    with open(os.path.join(index_dir, "meta.pkl"), "wb") as f:
        pickle.dump(paths, f)
    with open(os.path.join(index_dir, "vectorizer.pkl"), "wb") as f:
        pickle.dump(vec, f)

def search_faiss(query: str, index_dir: str, k: int = 5):
    from sklearn.feature_extraction.text import TfidfVectorizer
    index_path = os.path.join(index_dir, "index.faiss")
    meta_path = os.path.join(index_dir, "meta.pkl")
    vec_path = os.path.join(index_dir, "vectorizer.pkl")
    if not (os.path.exists(index_path) and os.path.exists(meta_path) and os.path.exists(vec_path)):
        raise FileNotFoundError("Índice FAISS incompleto.")
    index = faiss.read_index(index_path)
    with open(meta_path, "rb") as f:
        paths = pickle.load(f)
    with open(vec_path, "rb") as f:
        vec: TfidfVectorizer = pickle.load(f)
    q = vec.transform([query]).toarray().astype("float32")
    faiss.normalize_L2(q)
    D, I = index.search(q, min(k, len(paths)))
    out = []
    for s, idx in zip(D[0], I[0]):
        if idx < 0:
            continue
        out.append((float(s), paths[idx]))
    return out

FORCE_FORMAT_SYSTEM = (
    "Always reply ONLY with a single valid Python assignment of the form:\n"
    "content = {\n"
    '  "tree": """<ASCII tree of the project>""",\n'
    '  "<path/to/file.ext>": """<file content>""",\n'
    '  "...": """..."""\n'
    "}\n"
    "- No extra text, no backticks, no explanations. Just the assignment."
)

def call_model_and_get_text(prompt: str, model_name: str = "gpt-5") -> str:
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage
    except Exception as e:
        raise RuntimeError("Instala dependencias: pip install langchain-openai") from e
    llm = ChatOpenAI(model=model_name)
    msgs = [SystemMessage(content=FORCE_FORMAT_SYSTEM), HumanMessage(content=prompt or "Create a minimal skeleton.")]
    out = llm.invoke(msgs)
    return out.content

def auto_materialize(source_text: str, out_dir: str, overwrite: bool, dry_run: bool, allow_hidden: bool):
    """
    Intenta primero extraer un dict 'content={...}'. Si falla, parsea fences.
    Retorna (report, written_map).
    - Si content={...}: written_map es rel_path -> abs_path.
    - Si fences: written_map es rel_path -> contenido (en memoria). (Para FAISS, es preferible releer del disco después.)
    """
    try:
        content = extract_content_dict(source_text)
        return create_project_from_content(
            content,
            base_path=out_dir,
            overwrite=overwrite,
            dry_run=dry_run,
            allow_hidden=allow_hidden
        )
    except Exception:
        return build_project_from_text(
            source_text,
            out_dir=out_dir,
            overwrite=overwrite,
            dry_run=dry_run,
            allow_hidden=allow_hidden
        )

# -----------------------
# CLI
# -----------------------
def main():
    ap = argparse.ArgumentParser(description="Materializa archivos desde respuesta LLM (content={...} o fences ```)")
    ap.add_argument("--out", default="generated_project", help="Directorio de salida")
    ap.add_argument("--overwrite", action="store_true", help="Sobrescribir archivos existentes")
    ap.add_argument("--dry-run", action="store_true", help="No escribir, solo simular")
    ap.add_argument("--allow-hidden", action="store_true", help="Permitir rutas ocultas (.carpetas)")
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--from-file", help="Ruta a archivo con la respuesta del LLM")
    group.add_argument("--from-stdin", action="store_true", help="Leer la respuesta desde STDIN")
    args = ap.parse_args()

    if args.from_file:
        with open(args.from_file, "r", encoding="utf-8") as f:
            source_text = f.read()
    else:
        source_text = sys.stdin.read()

    report, written = auto_materialize(
        source_text,
        out_dir=args.out,
        overwrite=args.overwrite,
        dry_run=args.dry_run,
        allow_hidden=args.allow_hidden
    )
    print("CREATED:", report.get("created", []))
    print("OVERWRITTEN:", report.get("overwritten", []))
    print("SKIPPED:", report.get("skipped", []))

if __name__ == "__main__":
    main()
