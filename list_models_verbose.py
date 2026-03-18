import requests
import sys

API_KEY = 'AIzaSyC_tkBvEwdTneUSn-mdAelLfw9TEc5fYp0'
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"

print(f"Connecting to {url}...", file=sys.stderr)
try:
    r = requests.get(url, timeout=10)
    print(f"Status Code: {r.status_code}", file=sys.stderr)
    if r.status_code == 200:
        data = r.json()
        models = data.get('models', [])
        print(f"Found {len(models)} models.")
        for m in models:
            print(m.get('name'))
    else:
        print(f"Error Body: {r.text}")
except Exception as e:
    print(f"Exception: {str(e)}")
