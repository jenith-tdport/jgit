from fastapi import FastAPI, WebSocket, HTTPException, UploadFile, File
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
import httpx
import asyncio
import json
import re
from typing import Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Brain - Streaming Chat UI")

# Configuration
CONFIG = {
    "ollama_base_url": "http://localhost:11434",
    "tts_webui_base_url": "http://localhost:8881",  # NEW port for new system
    "default_llm_model": "captaineris-nebula:latest",
    "default_tts_voice": "af_heart",
    "default_tts_model": "kokoro"
}

class ChatService:
    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=60.0)
    
    def is_sentence_boundary(self, text: str) -> bool:
        """Check if text ends with sentence boundary"""
        return bool(re.search(r'[.!?]\s*$', text.strip()))
    
    async def stream_llm_response(self, message: str, model: str = None):
        """Stream response from Ollama"""
        model = model or CONFIG["default_llm_model"]
        
        payload = {
            "model": model,
            "prompt": message,
            "stream": True
        }
        
        try:
            async with self.http_client.stream(
                "POST",
                f"{CONFIG['ollama_base_url']}/api/generate",
                json=payload
            ) as response:
                if response.status_code != 200:
                    logger.error(f"Ollama error: {response.status_code}")
                    return
                
                buffer = ""
                async for chunk in response.aiter_text():
                    if not chunk.strip():
                        continue
                    
                    try:
                        data = json.loads(chunk)
                        if "response" in data:
                            token = data["response"]
                            buffer += token
                            
                            # Check for sentence boundary
                            if self.is_sentence_boundary(buffer):
                                yield {"type": "sentence", "text": buffer.strip()}
                                buffer = ""
                            else:
                                yield {"type": "token", "text": token}
                        
                        if data.get("done", False):
                            # Send any remaining buffer
                            if buffer.strip():
                                yield {"type": "sentence", "text": buffer.strip()}
                            yield {"type": "done"}
                            break
                            
                    except json.JSONDecodeError:
                        logger.warning(f"Invalid JSON chunk: {chunk}")
                        continue
                        
        except Exception as e:
            logger.error(f"Error streaming from Ollama: {e}")
            yield {"type": "error", "message": str(e)}
    
    async def generate_tts(self, text: str, voice: str = None, model: str = None, ref_audio_path: str = None, ref_text: str = None):
        """Generate TTS audio from text"""
        voice = voice or CONFIG["default_tts_voice"]
        model = model or CONFIG["default_tts_model"]
        
        # Handle F5-TTS separately
        if model == "f5-tts":
            logger.info("Using F5-TTS for voice generation")
            try:
                from backend.f5_tts_client import call_f5_tts
                import tempfile
                import os
                
                # Get or create default reference audio
                if not ref_audio_path:
                    # Use a default reference audio if none provided
                    # You should save a reference audio when user selects F5-TTS in voice settings
                    ref_dir = "backend/reference_audio"
                    default_ref = os.path.join(ref_dir, "default_reference.wav")
                    default_ref_text_file = os.path.join(ref_dir, "default_reference.txt")
                    
                    if os.path.exists(default_ref):
                        ref_audio_path = default_ref
                        # Load reference text if it exists
                        if os.path.exists(default_ref_text_file):
                            with open(default_ref_text_file, "r") as f:
                                ref_text = f.read().strip()
                    else:
                        logger.warning("No reference audio for F5-TTS, falling back to Kokoro")
                        model = "kokoro"
                        voice = "af_heart"
                
                if ref_audio_path:
                    audio_data = await call_f5_tts(text, ref_audio_path, ref_text or "")
                    if audio_data:
                        return audio_data
                    else:
                        logger.warning("F5-TTS failed, falling back to Kokoro")
                        model = "kokoro"
                        voice = "af_heart"
                        
            except Exception as e:
                logger.error(f"F5-TTS error: {e}, falling back to Kokoro")
                model = "kokoro"
                voice = "af_heart"
        
        # Use OpenAI API for Kokoro and other models
        payload = {
            "input": text,
            "voice": voice,
            "model": model,
            "response_format": "mp3"
        }
        
        try:
            response = await self.http_client.post(
                f"{CONFIG['tts_webui_base_url']}/v1/audio/speech",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                return response.content
            else:
                logger.error(f"TTS error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error generating TTS: {e}")
            return None

# Global service instance
chat_service = ChatService()

# Mount static files
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def get_index():
    """Serve the main chat interface"""
    return FileResponse("frontend/index.html")

@app.get("/test-stt.html", response_class=HTMLResponse)
async def get_stt_test():
    """Serve the STT test page"""
    return FileResponse("test-stt.html")

@app.get("/test-f5.html", response_class=HTMLResponse)
async def get_test_f5():
    """Serve the F5-TTS test page"""
    return FileResponse("frontend/test-f5.html")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "config": CONFIG}

@app.get("/models/ollama")
async def get_ollama_models():
    """Get available Ollama models"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{CONFIG['ollama_base_url']}/api/tags")
            if response.status_code == 200:
                data = response.json()
                models = [model["name"] for model in data.get("models", [])]
                return {"models": models, "default": CONFIG["default_llm_model"]}
            else:
                return {"models": [CONFIG["default_llm_model"]], "default": CONFIG["default_llm_model"]}
    except Exception as e:
        logger.error(f"Error fetching Ollama models: {e}")
        return {"models": [CONFIG["default_llm_model"]], "default": CONFIG["default_llm_model"]}

@app.post("/api/upload-reference-audio")
async def upload_reference_audio(file: UploadFile = File(...)):
    """Upload reference audio for F5-TTS"""
    try:
        import tempfile
        import os
        import shutil
        
        # Validate file type
        if not file.content_type.startswith('audio/'):
            return {"error": "File must be audio format"}
        
        # Create TTS-WebUI reference directory if it doesn't exist
        ref_dir = "/tmp/tts_references"
        os.makedirs(ref_dir, exist_ok=True)
        
        # Save file with unique name
        import uuid
        ref_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1] or '.wav'
        ref_path = os.path.join(ref_dir, f"{ref_id}{file_extension}")
        
        # Save uploaded file
        with open(ref_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"Reference audio saved: {ref_path}")
        
        return {
            "success": True, 
            "reference_id": ref_id,
            "path": ref_path,
            "filename": file.filename
        }
        
    except Exception as e:
        logger.error(f"Error uploading reference audio: {e}")
        return {"error": str(e)}

@app.post("/tts/generate")
async def generate_tts_endpoint(
    text: str, 
    voice: str = CONFIG["default_tts_voice"],
    model: str = CONFIG["default_tts_model"]
):
    """Generate TTS for a text chunk"""
    audio_data = await chat_service.generate_tts(text, voice, model)
    if audio_data:
        return {"success": True, "audio_length": len(audio_data)}
    else:
        raise HTTPException(status_code=500, detail="TTS generation failed")

@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio using Whisper via TTS-WebUI"""
    import tempfile
    import subprocess
    import os
    
    if not file.filename.endswith(('.wav', '.webm', '.ogg', '.mp3', '.flac')):
        raise HTTPException(status_code=400, detail="Unsupported audio format")
    
    # Save uploaded audio to temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_path = temp_file.name
    
    try:
        # Path to TTS-WebUI's Python environment
        tts_webui_env = "/home/jenith/Voice/TTS-WebUI/installer_files/env/bin/python"
        
        # Create a simple transcription script
        transcribe_script = f"""
import whisper
import sys

try:
    model = whisper.load_model('base')
    result = model.transcribe('{temp_path}')
    print(result['text'].strip())
except Exception as e:
    print(f"ERROR: {{e}}", file=sys.stderr)
    sys.exit(1)
"""
        
        # Write script to temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as script_file:
            script_file.write(transcribe_script)
            script_path = script_file.name
        
        # Run transcription
        result = subprocess.run([
            tts_webui_env, script_path
        ], capture_output=True, text=True, timeout=30)
        
        # Clean up script
        os.unlink(script_path)
        
        if result.returncode == 0:
            transcribed_text = result.stdout.strip()
            logger.info(f"Transcribed: {transcribed_text}")
            return {"text": transcribed_text, "success": True}
        else:
            error_msg = result.stderr.strip()
            logger.error(f"Whisper error: {error_msg}")
            raise HTTPException(status_code=500, detail=f"Transcription failed: {error_msg}")
            
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Transcription timeout")
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        # Clean up audio file
        if os.path.exists(temp_path):
            os.unlink(temp_path)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time chat"""
    await websocket.accept()
    logger.info("WebSocket connection established")
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "chat":
                message = data.get("message", "")
                model = data.get("model", CONFIG["default_llm_model"])
                tts_voice = data.get("voice", CONFIG["default_tts_voice"])
                primary_model = data.get("primary_model", "kokoro")  # Primary TTS model
                
                logger.info(f"Processing chat message with LLM: {model}, TTS: {primary_model}")
                
                # Stream response from LLM
                async for chunk in chat_service.stream_llm_response(message, model):
                    if chunk["type"] == "sentence":
                        # Send text to client
                        await websocket.send_json({
                            "type": "text",
                            "content": chunk["text"]
                        })
                        
                        # Generate TTS for sentence
                        audio_data = await chat_service.generate_tts(
                            chunk["text"], tts_voice, primary_model
                        )
                        
                        if audio_data:
                            # Send audio data (base64 encoded)
                            import base64
                            audio_b64 = base64.b64encode(audio_data).decode()
                            await websocket.send_json({
                                "type": "audio",
                                "data": audio_b64,
                                "text": chunk["text"]
                            })
                        
                    elif chunk["type"] == "token":
                        # Send individual token for real-time display
                        await websocket.send_json({
                            "type": "token",
                            "content": chunk["text"]
                        })
                    
                    elif chunk["type"] == "done":
                        await websocket.send_json({"type": "done"})
                        break
                    
                    elif chunk["type"] == "error":
                        await websocket.send_json({
                            "type": "error",
                            "message": chunk["message"]
                        })
                        break
            
            elif message_type == "tts_test":
                # Handle TTS test from voice settings
                text = data.get("text", "Hello, this is a test.")
                voice = data.get("voice", CONFIG["default_tts_voice"])
                model = data.get("model", "kokoro")
                
                logger.info(f"Testing TTS with model: {model}, voice: {voice}")
                
                # Handle F5-TTS with reference audio
                if model == "f5-tts":
                    ref_audio_b64 = data.get("ref_audio")
                    ref_text = data.get("ref_text", "")
                    
                    if ref_audio_b64:
                        import tempfile
                        import base64
                        
                        # Save reference audio to temp file
                        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
                            audio_data = base64.b64decode(ref_audio_b64)
                            tmp_file.write(audio_data)
                            ref_audio_path = tmp_file.name
                        
                        try:
                            # Call F5-TTS through TTS-WebUI
                            from backend.f5_tts_client import call_f5_tts
                            
                            logger.info(f"F5-TTS: Generating with reference audio")
                            audio_data = await call_f5_tts(text, ref_audio_path, ref_text)
                            
                            if audio_data:
                                import base64
                                audio_b64 = base64.b64encode(audio_data).decode()
                                await websocket.send_json({
                                    "type": "audio",
                                    "data": audio_b64,
                                    "text": text
                                })
                                logger.info("F5-TTS: Audio sent successfully")
                            else:
                                # Fallback to regular TTS
                                logger.warning("F5-TTS failed, using fallback")
                                audio_data = await chat_service.generate_tts(text, "af_aoede")
                            
                            if audio_data:
                                import base64
                                audio_b64 = base64.b64encode(audio_data).decode()
                                await websocket.send_json({
                                    "type": "audio",
                                    "data": audio_b64,
                                    "text": text
                                })
                            
                            # Clean up temp file
                            import os
                            os.unlink(ref_audio_path)
                            
                        except Exception as e:
                            logger.error(f"F5-TTS error: {e}")
                            await websocket.send_json({
                                "type": "error",
                                "message": f"F5-TTS generation failed: {str(e)}"
                            })
                    else:
                        await websocket.send_json({
                            "type": "error",
                            "message": "F5-TTS requires reference audio"
                        })
                else:
                    # Standard TTS test (Kokoro, etc.)
                    audio_data = await chat_service.generate_tts(text, voice)
                    
                    if audio_data:
                        import base64
                        audio_b64 = base64.b64encode(audio_data).decode()
                        await websocket.send_json({
                            "type": "audio",
                            "data": audio_b64,
                            "text": text
                        })
                    else:
                        await websocket.send_json({
                            "type": "error",
                            "message": "TTS generation failed"
                        })
                    
            elif message_type == "set_f5_reference":
                # Save F5-TTS reference audio for chat use
                ref_audio_b64 = data.get("ref_audio")
                ref_text = data.get("ref_text", "")
                
                if ref_audio_b64:
                    import tempfile
                    import base64
                    import os
                    
                    # Create reference audio directory if it doesn't exist
                    ref_dir = "backend/reference_audio"
                    os.makedirs(ref_dir, exist_ok=True)
                    
                    # Save as default reference
                    default_ref_path = os.path.join(ref_dir, "default_reference.wav")
                    audio_data = base64.b64decode(ref_audio_b64)
                    
                    with open(default_ref_path, "wb") as f:
                        f.write(audio_data)
                    
                    # Save reference text too
                    if ref_text:
                        with open(os.path.join(ref_dir, "default_reference.txt"), "w") as f:
                            f.write(ref_text)
                    
                    logger.info(f"F5-TTS reference audio saved for chat use")
                    await websocket.send_json({
                        "type": "f5_reference_saved",
                        "success": True
                    })
                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": "No reference audio provided"
                    })
            elif message_type == "ping":
                await websocket.send_json({"type": "pong"})
                
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        logger.info("WebSocket connection closed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=6060, reload=True)