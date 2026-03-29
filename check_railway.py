import requests
url = "https://study-fly-tts-production.up.railway.app/health"
try:
    res = requests.get(url, timeout=5)
    print(f"Status: {res.status_code}")
    print(f"Body: {res.text}")
except Exception as e:
    print(f"Error: {e}")
