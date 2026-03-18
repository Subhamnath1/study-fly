import requests
import json

def test_mistral_vision():
    invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
    api_key = "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"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json"
    }
    
    # Tiny 1x1 transparent PNG base64
    b64_img = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

    payload = {
        "model": "mistralai/mistral-large-3-675b-instruct-2512",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "What is in this image?"},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_img}"}}
                ]
            }
        ],
        "max_tokens": 100
    }

    try:
        response = requests.post(invoke_url, headers=headers, json=payload)
        response.raise_for_status()
        print("Success:", json.dumps(response.json(), indent=2))
    except Exception as e:
        print("Error:", e)
        print(response.text if 'response' in locals() else "")

if __name__ == "__main__":
    test_mistral_vision()
