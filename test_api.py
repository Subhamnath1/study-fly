import requests
import json

def test_mistral_api():
    """
    Test the NVIDIA Mistral API connectivity as requested by the user.
    """
    invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
    api_key = "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"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "mistralai/mistral-large-3-675b-instruct-2512",
        "messages": [{"role": "user", "content": "Hello, are you working?"}],
        "max_tokens": 100,
        "temperature": 0.15,
        "top_p": 1.00,
        "stream": False
    }

    print(f"Testing connectivity to {invoke_url}...")
    try:
        response = requests.post(invoke_url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        print("Success! Response received:")
        print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"API Test Failed: {e}")

if __name__ == "__main__":
    test_mistral_api()
