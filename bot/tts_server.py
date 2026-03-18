import os
import io
import grpc
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import riva.client

# --- Configuration ---
# Use environment variables for security in production
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "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")
RIVA_SERVER = os.getenv("RIVA_SERVER", "grpc.nvcf.nvidia.com:443")
FUNCTION_ID = os.getenv("FUNCTION_ID", "877104f7-e885-42b9-8de8-f6e4c6303969")
DEFAULT_VOICE = "Magpie-Multilingual.EN-US.Aria"
DEFAULT_LANG = "en-US"

app = FastAPI(title="Study Fly TTS Proxy", description="Proxy server for NVIDIA Riva Magpie TTS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow React frontend to connect
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TTSRequest(BaseModel):
    text: str
    voice: str = DEFAULT_VOICE
    language_code: str = DEFAULT_LANG

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
tts_service = riva.client.SpeechSynthesisService(auth)

@app.post("/api/tts")
async def generate_tts(req: TTSRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
        
    print(f"Generating TTS for voice: {req.voice}, lang: {req.language_code}")
    print(f"Text: {req.text[:50]}...")

    try:
        # Request audio generation
        responses = tts_service.synthesize_online(
            text=req.text,
            voice_name=req.voice,
            language_code=req.language_code,
            sample_rate_hz=44100
        )
        
        # Collect the audio stream directly into memory
        audio_buffer = io.BytesIO()
        for resp in responses:
            audio_buffer.write(resp.audio)
            
        audio_bytes = audio_buffer.getvalue()
        if not audio_bytes:
            raise Exception("No audio received from Riva.")

        # Return WAV audio (Riva default output for online synthesis is linear PCM WAV encoded)
        return Response(content=audio_bytes, media_type="audio/wav")

    except grpc.RpcError as e:
        print(f"gRPC Error: {e.details()}")
        raise HTTPException(status_code=502, detail=f"NVIDIA API Error: {e.details()}")
    except Exception as e:
        print(f"Internal Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error generating TTS.")

@app.get("/health")
def health():
    return {"status": "ok"}

# Run with: uvicorn bot.tts_server:app --port 8000
