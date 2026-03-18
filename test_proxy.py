import requests
import json

url = "https://study-fly-bot.study-fly-bot.workers.dev/api/ai/mistral"
payload = {
    "model": "mistralai/mistral-large-3-675b-instruct-2512",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10,
    "stream": False
}

try:
    print(f"Testing {url}...")
    response = requests.post(url, json=payload, timeout=10)
    print("Status Code:", response.status_code)
    try:
        print("Response:", response.json())
    except:
        print("Response:", response.text)
except Exception as e:
    print(f"Error: {e}")

