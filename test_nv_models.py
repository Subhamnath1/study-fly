import requests

api_key = "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"
url = "https://integrate.api.nvidia.com/v1/models"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Accept": "application/json"
}

res = requests.get(url, headers=headers)
if res.status_code == 200:
    models = res.json().get("data", [])
    tts_models = [m["id"] for m in models if "tts" in m["id"] or "audio" in m["id"] or "magpie" in m["id"].lower()]
    print("TTS Models found:", tts_models)
    
    # Just list some model IDs
    print("Sample of all models:", [m["id"] for m in models[:10]])
else:
    print(res.status_code, res.text)
