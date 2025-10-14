import requests

url = "http://127.0.0.1:8000/generate"
payload = {
    "mode": "text",
    "project_name": "demo_web",
    "out_dir": "generated_projects",
    "text": "content = {\"tree\": \"src/\\n\", \"src/main.py\": \"print('hola desde Python test')\\n\"}"
}

response = requests.post(url, json=payload)
print("Status:", response.status_code)
print(response.json())
