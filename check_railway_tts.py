import requests
url = "https://study-fly-tts-production.up.railway.app/api/tts"
payload = {"text": "Hello"}
try:
    res = requests.post(url, json=payload, timeout=10)
    print(f"Status: {res.status_code}")
    if res.status_code == 200:
        print(f"Audio size: {len(res.content)} bytes")
    else:
        print(f"Body: {res.text}")
except Exception as e:
    print(f"Error: {e}")
