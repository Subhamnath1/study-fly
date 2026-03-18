import requests
import json

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

def test_key(key, index):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={key}"
    headers = {'Content-Type': 'application/json'}
    payload = {
        "contents": [{
            "parts": [{"text": "Hi, are you working?"}]
        }]
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        if response.status_code == 200:
            print(f"Key {index+1}: ✅ Working")
        elif response.status_code == 429:
            print(f"Key {index+1}: ❌ Rate Limited (429)")
        else:
            print(f"Key {index+1}: ❌ Error {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Key {index+1}: ❌ Exception: {str(e)}")

if __name__ == "__main__":
    for i, key in enumerate(API_KEYS):
        test_key(key, i)
