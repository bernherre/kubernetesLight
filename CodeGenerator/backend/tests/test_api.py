# backend/tests/test_api.py
import os
from dotenv import load_dotenv
import pytest
from fastapi.testclient import TestClient
from api_main import app
# ======================================================
# Load environment variables
# =======================================================
load_dotenv()
# Set up OpenAI API key
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    OPENAI_API_KEY = input("Please enter your OpenAI API key: ")
    os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
client = TestClient(app)

def test_generate_project(tmp_path, monkeypatch):
    # Mock para que no dependa de OpenAI
    monkeypatch.setenv("OPENAI_API_KEY", "dummy")

    payload = {
        "language": "python",
        "project_name": "demo_project"
    }
    response = client.post("/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "download_url_hint" in data
    assert data["project_path"].endswith("demo_project")

def test_download_zip(tmp_path):
    project_name = "demo_project"
    os.makedirs(f"generated_projects/{project_name}", exist_ok=True)
    with open(f"generated_projects/{project_name}/README.md", "w") as f:
        f.write("# Demo")

    response = client.get(f"/download/{project_name}")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/x-zip-compressed"
