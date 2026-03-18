import requests

api_key = "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"
url = "https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/877104f7-e885-42b9-8de8-f6e4c6303969"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

# Payload guess 1: standard Riva SynthesizeSpeechRequest
payload1 = {
    "text": "Hello world",
    "language_code": "en-US",
    "voice_name": "Magpie-Multilingual.EN-US.Aria"
}

print("Testing Payload 1...")
res = requests.post(url, headers=headers, json=payload1)
print(res.status_code)
print(res.text[:500])

# Payload guess 2: nesting under 'request' or something
payload2 = {
    "request": {
        "text": "Hello world",
        "language_code": "en-US",
        "voice_name": "Magpie-Multilingual.EN-US.Aria"
    }
}
print("\nTesting Payload 2...")
res = requests.post(url, headers=headers, json=payload2)
print(res.status_code)
print(res.text[:500])

