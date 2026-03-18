import requests
API_KEY = 'AIzaSyC_tkBvEwdTneUSn-mdAelLfw9TEc5fYp0'
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"
try:
    r = requests.get(url)
    if r.status_code == 200:
        models = [m['name'] for m in r.json().get('models', [])]
        for m in models:
            print(m)
    else:
        print(f"Error {r.status_code}: {r.text}")
except Exception as e:
    print(str(e))
