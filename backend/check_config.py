import urllib.request
import json
try:
    with urllib.request.urlopen("http://127.0.0.1:8000/api/v1/health", timeout=3) as r:
        print("Response:", r.read().decode())
except Exception as e:
    print("Failed connection:", e)
