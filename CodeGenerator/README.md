# Project Generator (Backend + Flutter UI)

Este paquete contiene:
- **backend/** (FastAPI) que envuelve `gen_project.py` para generar proyectos desde un prompt o texto y opcionalmente indexar en FAISS.
- **project_gen_app/** (Flutter) que llama al backend con una UI sencilla.
- **.github/workflows/** con ejemplos de CI/CD (**ignorados** por `.gitignore` tal como pediste).

## Backend (local)
```bash
cd backend
# Si tienes el script:
.\scripts\create_venv.ps1
# O manual:
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip wheel
pip install -r requirements.txt
# macOS / Linux
export OPENAI_API_KEY="sk-..."
# Windows PowerShell
$Env:OPENAI_API_KEY="sk-..."
uvicorn api_main:app --reload --port 8000



```
## Backend (Docker)
```bash
cd backend
./scripts/create_venv.sh          # requiere python3.11 en PATH (o exporta PYTHON_BIN)
source .venv/bin/activate
uvicorn api_main:app --reload --port 8000

```
## Flutter (local)
> Recomendado crear base con Flutter y luego sobreescribir `lib/` y `pubspec.yaml` incluidos aquí:

```bash
flutter create project_gen_app
# Copia lib/ y pubspec.yaml desde este zip a la carpeta creada
cd project_gen_app
flutter pub get
flutter test
flutter run -d chrome
```


## Test API
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "mode":"text",
    "project_name":"demo_local",
    "text":"content = {\"tree\": \"src/\\n\", \"src/main.py\":\"print(\\\"hola\\\")\"}",
    "out_dir":"generated_projects",
    "faiss_dir":"faiss_debug"
  }'


  # Abre en navegador:
http://localhost:8000/download/demo_local

http://localhost:8000/download-ai-pdf/demo_local

Puedes visitar:

http://127.0.0.1:8000/health
→ ✅ { "status": "ok", "message": "Service is healthy", "timestamp": "..." }

http://127.0.0.1:8000/status
→ 📊 devuelve JSON con CPU, memoria, uptime, rutas, versión de Python y endpoints disponibles.



También incluimos `scripts/post_setup.sh` que automatiza lo anterior.


curl -X POST http://127.0.0.1:8000/generate -H "Content-Type: application/json" -d "{\"mode\":\"text\",\"project_name\":\"demo_web\",\"out_dir\":\"generated_projects\",\"text\":\"content = {\\\"tree\\\": \\\"src/\\\\n\\\", \\\"src/main.py\\\": \\\"print('hola mundo')\\\\n\\\"}\"}"


@echo off
echo === Probando backend FastAPI ===
curl -X POST http://127.0.0.1:8000/generate ^
  -H "Content-Type: application/json" ^
  -d "{\"mode\":\"text\",\"project_name\":\"demo_web\",\"out_dir\":\"generated_projects\",\"text\":\"content = {\\\"tree\\\": \\\"src/\\\\n\\\", \\\"src/main.py\\\": \\\"print('hola mundo desde .bat')\\\\n\\\"}\"}"
pause


backend/
  ├── api_main.py
  ├── gen_project.py
  ├── generated_projects/
  │   ├── demo_web/
  │   │   └── src/
  │   │       └── main.py

  uvicorn api_main:app --reload --port 8000


  code_generator_app/
 ┣ android/
 ┣ ios/
 ┣ lib/
 ┣ test/
 ┣ web/
 ┣ pubspec.yaml
 ┗ analysis_options.yaml


