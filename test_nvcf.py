import requests
import json

api_key = "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"
url = "https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/877104f7-e885-42b9-8de8-f6e4c6303969"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

payloads = [
    {
        "text": "Hello world",
        "language_code": "en-US",
        "voice_name": "Magpie-Multilingual.EN-US.Aria",
        "encoding": "LINEAR_PCM",
        "sample_rate_hz": 44100
    },
    {
        "text": "Hello world",
        "language_code": "en-US",
        "voice_name": "Magpie-Multilingual.EN-US.Aria",
        "encoding": 1,
        "sample_rate_hz": 44100
    },
    {
        "request": {
            "text": "Hello world",
            "language_code": "en-US",
            "voice_name": "Magpie-Multilingual.EN-US.Aria",
            "encoding": "LINEAR_PCM",
            "sample_rate_hz": 44100
        }
    }
]

for i, p in enumerate(payloads):
    print(f"Testing Payload {i+1}...")
    try:
        res = requests.post(url, headers=headers, json=p)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text[:300]}")
    except Exception as e:
        print(e)
    print("-" * 40)
