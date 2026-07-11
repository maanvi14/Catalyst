import urllib.request
import urllib.error
import json
import time
import sys

# Force UTF-8 stdout
sys.stdout.reconfigure(encoding="utf-8")

OLLAMA_URL = "http://localhost:11434"
BACKEND_URL = "http://localhost:8000/api/v1"

def ollama_chat(prompt, timeout=120):
    req_body = {
        "model": "gemma:2b",
        "messages": [{"role": "user", "content": prompt}],
        "stream": False
    }
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/chat",
        data=json.dumps(req_body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            data = json.loads(res.read().decode("utf-8"))
            return data["message"]["content"]
    except urllib.error.HTTPError as e:
        body = e.fp.read().decode("utf-8")
        return f"HTTP {e.code}: {body}"
    except Exception as ex:
        return f"Error: {ex}"

def backend_ask(question, timeout=120):
    req_body = {"question": question}
    req = urllib.request.Request(
        f"{BACKEND_URL}/ask",
        data=json.dumps(req_body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return json.loads(res.read().decode("utf-8"))
    except Exception as ex:
        return {"error": str(ex)}

print("=" * 60)
print("STEP 1: Direct Ollama Vulkan inference test (gemma:2b)")
print("=" * 60)
t0 = time.time()
answer = ollama_chat("Say 'hello world' and nothing else.")
t1 = time.time()
print(f"Response ({t1-t0:.1f}s): {answer[:150]}")

print()
print("=" * 60)
print("STEP 2: All 4 Ask Catalyst queries via backend RAG")
print("=" * 60)

questions = [
    "Why did the Auto-Tender agent fail last night?",
    "What agents trigger on SHIPMENT_PLANNED?",
    "Show me all conflicts involving AI agents",
    "Compare PROD and TEST versions of AG-SHIP-AUTOTENDER"
]

for q in questions:
    print(f"\n>> {q}")
    t0 = time.time()
    result = backend_ask(q)
    t1 = time.time()
    if "error" in result:
        print(f"ERROR ({t1-t0:.1f}s): {result['error']}")
    else:
        grounded = result.get("grounded", False)
        citations = result.get("citations", [])
        answer = result.get("answer", "")
        is_fallback = "fallback" in answer.lower() or "not configured" in answer.lower()
        status = "FALLBACK" if is_fallback else "GROUNDED"
        print(f"Status: {status} ({t1-t0:.1f}s)")
        print(f"Citations: {citations}")
        print(f"Answer: {answer[:300]}")
