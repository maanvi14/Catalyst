import sys, io, urllib.request, urllib.error, json, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = 'http://127.0.0.1:8000/api/v1'

questions = [
    'Why did the Auto-Tender agent fail last night?',
    'What agents trigger on SHIPMENT_PLANNED?',
    'Show me all conflicts involving AI agents',
    'Compare PROD and TEST versions of AG-SHIP-AUTOTENDER',
]

all_pass = True
for q in questions:
    body = json.dumps({'question': q}).encode()
    req = urllib.request.Request(
        BASE + '/ask', data=body,
        headers={'Content-Type': 'application/json'}, method='POST'
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=35) as r:
            d = json.loads(r.read())
            elapsed = time.time() - t0
            grounded = d.get('grounded', False)
            answer = d.get('answer', '')
            cites = d.get('citations', [])
            if not grounded:
                all_pass = False
            print(f'{"[GROUNDED]" if grounded else "[FALLBACK!]"} {elapsed:.1f}s')
            print(f'  Q: {q}')
            print(f'  Citations: {cites}')
            print(f'  Answer: {answer[:280]}')
            print()
    except Exception as ex:
        all_pass = False
        print(f'[ERROR] {q}: {ex}')
        print()
    time.sleep(3)

print('ALL PASS:', all_pass)
