import requests
import json

api_key = "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"

# Try OpenAI-compatible audio/speech endpoint
url = "https://integrate.api.nvidia.com/v1/audio/speech"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

payload = {
    "model": "nvidia/riva-tts-magpie-en-us",
    "input": "This is a test of the text to speech system.",
    "voice": "Magpie-Multilingual.EN-US.Aria"
}

try:
    print("Testing standard NIM TTS endpoint...")
    response = requests.post(url, headers=headers, json=payload, timeout=10)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Success! Got audio.")
        with open("test_audio.mp3", "wb") as f:
            f.write(response.content)
    else:
        print(response.text)
except Exception as e:
    print("Error:", e)

# Also try the NVCF execute endpoint
nvcf_url = "https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/877104f7-e885-42b9-8de8-f6e4c6303969"
print("\nTesting NVCF endpoint...")
try:
    nvcf_res = requests.post(nvcf_url, headers=headers, json=payload, timeout=10)
    print(f"Status Code: {nvcf_res.status_code}")
    if nvcf_res.status_code == 200:
        print("NVCF Success!")
    else:
        print(nvcf_res.text)
except Exception as e:
    print("Error:", e)
