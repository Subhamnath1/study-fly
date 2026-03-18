import requests
import json
import time
import sys

API_KEYS = [
    'AIzaSyC_tkBvEwdTneUSn-mdAelLfw9TEc5fYp0',
    'AIzaSyCETamSiYKQfVNitqlCNhv_Y36EXUPtkvA',
    'AIzaSyDYXbfEIH9oSNq6V-PBp2l-9fsmFRvU1jI',
    'AIzaSyBE-Ih4Sx_aPwcTDQlIP4vklliaV6X0Cj4',
    'AIzaSyAYnqkOLFAIf8OzFR9JuXn3RTf2PboPTOA',
    'AIzaSyBxQ_UhyDWsO0Bd1e65DjweKkLCDG4lItI',
    'AIzaSyAMcjeeFKBw4VRW3G6sQ_g88rolN2kr5z4',
    'AIzaSyC3QhsAsYKrsEpvLca_dDAkDnfajRdyJkw',
    'AIzaSyBP6fE9OWoi2eLqCXhMDCaj1mOIY0v9Ko8',
    'AIzaSyAtFu7xVgUkk9PAQOUVZ93gL_aCgbVLUGo',
]

MODELS = ['gemini-1.5-flash', 'gemini-3-flash-preview']

def test_key(key, index, model):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    headers = {'Content-Type': 'application/json'}
    payload = {
        "contents": [{
            "parts": [{"text": "Hi"}]
        }]
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        if response.status_code == 200:
            return "✅ OK"
        elif response.status_code == 429:
            return "❌ 429"
        else:
            return f"❌ {response.status_code}"
    except Exception as e:
        return f"❌ Exc"

if __name__ == "__main__":
    print(f"{'Key #':<6} | {'Gemini 1.5':<12} | {'Gemini 2.0':<12}")
    print("-" * 40)
    sys.stdout.flush()
    for i, key in enumerate(API_KEYS):
        res15 = test_key(key, i, 'gemini-1.5-flash')
        res20 = test_key(key, i, 'gemini-3-flash-preview')
        print(f"Key {i+1:<2} | {res15:<12} | {res20:<12}")
        sys.stdout.flush()
        time.sleep(0.5)
