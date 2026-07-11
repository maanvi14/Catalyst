import urllib.request
import urllib.error
import json
import os

# Helper to load .env manually if running test script directly
for env_path in [".env", "backend/.env", "../.env"]:
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if "=" in line and not line.strip().startswith("#"):
                    k, v = line.strip().split("=", 1)
                    os.environ[k.strip()] = v.strip()

api_key = os.environ.get("GROQ_API_KEY", "")
url = "https://api.groq.com/openai/v1/chat/completions"
model = "llama-3.1-8b-instant"

req_body = {
    "model": model,
    "messages": [{"role": "user", "content": "Hello!"}],
    "temperature": 0.0,
    "max_tokens": 10
}

req = urllib.request.Request(
    url,
    data=json.dumps(req_body).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    method="POST"
)

try:
    with urllib.request.urlopen(req, timeout=10) as response:
        print("Success:", response.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP Error code:", e.code)
    print("HTTP Error body:", e.fp.read().decode() if e.fp else "No body")
except Exception as e:
    print("Error:", e)
