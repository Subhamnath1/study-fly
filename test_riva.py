import os
import io
import grpc
import riva.client

# --- Configuration ---
NVIDIA_API_KEY = "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"
RIVA_SERVER = "grpc.nvcf.nvidia.com:443"
FUNCTION_ID = "877104f7-e885-42b9-8de8-f6e4c6303969"
DEFAULT_VOICE = "Magpie-Multilingual.EN-US.Aria"
DEFAULT_LANG = "en-US"

print("Initializing Riva Auth...")
# --- Initialize Riva Auth ---
auth = riva.client.Auth(
    ssl_root_cert=None, 
    use_ssl=True, 
    uri=RIVA_SERVER,
    metadata_args=[
        ("function-id", FUNCTION_ID),
        ("authorization", f"Bearer {NVIDIA_API_KEY}")
    ]
)
print("Creating SpeechSynthesisService...")
tts_service = riva.client.SpeechSynthesisService(auth)

print("Synthesizing audio...")
try:
    responses = tts_service.synthesize_online(
        text="Hello, this is a test.",
        voice_name=DEFAULT_VOICE,
        language_code=DEFAULT_LANG,
        sample_rate_hz=44100
    )
    
    count = 0
    for resp in responses:
        if len(resp.audio) > 0:
            count += 1
    print(f"Success! Received {count} audio chunks.")
except Exception as e:
    print(f"Error: {e}")
