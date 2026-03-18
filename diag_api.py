import requests
import json
import socket

# Test standard IDs with multiple API versions
API_KEYS = [
    'AIzaSyC_tkBvEwdTneUSn-mdAelLfw9TEc5fYp0',
    'AIzaSyCETamSiYKQfVNitqlCNhv_Y36EXUPtkvA',
]

MODELS = ['gemini-1.5-flash', 'gemini-3-flash-preview']
VERSIONS = ['v1beta', 'v1']

def test(key, model, version):
    url = f"https://generativelanguage.googleapis.com/{version}/models/{model}:generateContent?key={key}"
    try:
        r = requests.post(url, json={"contents": [{"parts":[{"text":"hi"}]}]}, timeout=5)
        return r.status_code
    except:
        return "ERR"

if __name__ == "__main__":
    for m in MODELS:
        for v in VERSIONS:
            status = test(API_KEYS[0], m, v)
            print(f"{m} ({v}): {status}")
