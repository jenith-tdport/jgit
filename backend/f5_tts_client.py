import httpx
import asyncio
import base64
import logging
import tempfile
import os
import json
from gradio_client import Client, file

logger = logging.getLogger(__name__)

async def call_f5_tts(text: str, ref_audio_path: str, ref_text: str = ""):
    """
    Multi-approach F5-TTS client with fallbacks
    Tries: Gradio API -> OpenAI API -> Direct model loading
    """
    
    logger.info(f"F5-TTS: Attempting generation with multiple methods")
    logger.info(f"F5-TTS: Text: '{text[:50]}...'")
    logger.info(f"F5-TTS: Reference audio: {ref_audio_path}")
    logger.info(f"F5-TTS: Reference text: '{ref_text[:50]}...'")
    
    # Method 1: Try Gradio wrapper endpoint with model warming
    try:
        result = await _try_gradio_with_warmup(text, ref_audio_path, ref_text)
        if result:
            logger.info("F5-TTS: Success with Gradio wrapper (warmup)")
            return result
    except Exception as e:
        logger.warning(f"F5-TTS: Gradio wrapper failed: {e}")
    
    # Method 2: Try different Gradio endpoints
    try:
        result = await _try_multiple_gradio_endpoints(text, ref_audio_path, ref_text)
        if result:
            logger.info("F5-TTS: Success with alternative Gradio endpoint")
            return result
    except Exception as e:
        logger.warning(f"F5-TTS: Alternative Gradio endpoints failed: {e}")
    
    # Method 3: Try OpenAI API (might work for some TTS-WebUI setups)
    try:
        result = await _try_openai_api(text, ref_audio_path, ref_text)
        if result:
            logger.info("F5-TTS: Success with OpenAI API")
            return result
    except Exception as e:
        logger.warning(f"F5-TTS: OpenAI API failed: {e}")
    
    # Method 4: Try direct model warming then retry
    try:
        result = await _try_model_warmup_retry(text, ref_audio_path, ref_text)
        if result:
            logger.info("F5-TTS: Success with model warmup retry")
            return result
    except Exception as e:
        logger.warning(f"F5-TTS: Model warmup retry failed: {e}")
    
    logger.error("F5-TTS: All methods failed")
    return None

async def _try_gradio_with_warmup(text: str, ref_audio_path: str, ref_text: str):
    """Try Gradio wrapper with model warming"""
    
    client = Client("http://localhost:7771")
    
    # First, try to "warm up" the model by checking its config
    try:
        logger.info("F5-TTS: Warming up model...")
        client.predict(
            "F5-TTS_v1",  # model_type
            "",           # path
            "",           # vocab_path
            '{"dim": 1024, "depth": 22, "heads": 16, "ff_mult": 2, "text_dim": 512, "conv_layers": 4}',
            api_name="/update_model_choice_json"
        )
        
        # Small delay for model loading
        await asyncio.sleep(2)
        
    except Exception as e:
        logger.debug(f"F5-TTS: Model warmup info: {e}")
    
    # Now try the main generation
    logger.info("F5-TTS: Calling /wrapper after warmup...")
    result = client.predict(
        file(ref_audio_path),  # Use file() helper for proper upload
        ref_text or "",  # Reference text
        text,            # Text to generate
        False,           # Remove silence
        0.15,            # Cross fade duration
        32,              # NFE steps
        1.0,             # Speed
        "-1",            # Seed (string)
        api_name="/wrapper"
    )
    
    return _extract_audio_from_result(result)

async def _try_multiple_gradio_endpoints(text: str, ref_audio_path: str, ref_text: str):
    """Try different possible F5-TTS Gradio endpoints"""
    
    client = Client("http://localhost:7771")
    
    # Try different endpoint patterns that might exist
    endpoints_to_try = [
        "/wrapper",
        "/f5_tts_inference", 
        "/generate_f5_tts",
        "/f5_tts_generate"
    ]
    
    for endpoint in endpoints_to_try:
        try:
            logger.info(f"F5-TTS: Trying endpoint {endpoint}")
            
            result = client.predict(
                file(ref_audio_path),  # Use file() helper
                ref_text or "",
                text,
                False,
                0.15,
                32,
                1.0,
                "-1",
                api_name=endpoint
            )
            
            audio_data = _extract_audio_from_result(result)
            if audio_data:
                logger.info(f"F5-TTS: Success with {endpoint}")
                return audio_data
                
        except Exception as e:
            logger.debug(f"F5-TTS: Endpoint {endpoint} failed: {e}")
            continue
    
    return None

async def _try_openai_api(text: str, ref_audio_path: str, ref_text: str):
    """Try OpenAI-compatible API (might work in some TTS-WebUI configs)"""
    
    # Read reference audio
    with open(ref_audio_path, 'rb') as f:
        audio_b64 = base64.b64encode(f.read()).decode()
    
    # Try both possible OpenAI API ports
    ports = [7778, 8880]
    
    for port in ports:
        try:
            logger.info(f"F5-TTS: Trying OpenAI API on port {port}")
            
            url = f"http://localhost:{port}/v1/audio/speech"
            payload = {
                "model": "f5-tts",
                "input": text,
                "voice": "custom",
                "reference_audio": audio_b64,
                "reference_text": ref_text,
                "response_format": "wav"
            }
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, json=payload)
                
                if response.status_code == 200:
                    logger.info(f"F5-TTS: OpenAI API success on port {port}")
                    return response.content
                else:
                    logger.debug(f"F5-TTS: Port {port} returned {response.status_code}")
                    
        except Exception as e:
            logger.debug(f"F5-TTS: Port {port} failed: {e}")
            continue
    
    return None

async def _try_model_warmup_retry(text: str, ref_audio_path: str, ref_text: str):
    """Try to warm up the model with a simple generation first"""
    
    client = Client("http://localhost:7771")
    
    try:
        # Create a minimal test case first
        logger.info("F5-TTS: Model warmup with minimal test...")
        
        # Try a very short generation first to warm up the model
        warmup_result = client.predict(
            file(ref_audio_path),  # Use file() helper
            ref_text or "test",
            "test",  # Very short text
            False,
            0.15,
            16,      # Fewer steps for warmup
            1.0,
            "-1",
            api_name="/wrapper"
        )
        
        logger.info(f"F5-TTS: Warmup result: {type(warmup_result)}")
        
        # Small delay
        await asyncio.sleep(1)
        
        # Now try the real generation
        logger.info("F5-TTS: Attempting real generation after warmup...")
        result = client.predict(
            file(ref_audio_path),  # Use file() helper
            ref_text or "",
            text,
            False,
            0.15,
            32,
            1.0,
            "-1",
            api_name="/wrapper"
        )
        
        return _extract_audio_from_result(result)
        
    except Exception as e:
        logger.debug(f"F5-TTS: Warmup retry failed: {e}")
        return None

def _extract_audio_from_result(result):
    """Extract audio data from Gradio result"""
    
    if not result:
        return None
        
    logger.info(f"F5-TTS: Extracting audio from result type: {type(result)}")
    
    # Handle tuple results
    if isinstance(result, tuple) and len(result) > 0:
        audio_file_path = result[0]
        
        if isinstance(audio_file_path, str):
            logger.info(f"F5-TTS: Audio file path: {audio_file_path}")
            
            if os.path.exists(audio_file_path):
                logger.info(f"F5-TTS: Reading audio file: {os.path.getsize(audio_file_path)} bytes")
                with open(audio_file_path, 'rb') as f:
                    return f.read()
            else:
                logger.warning(f"F5-TTS: Audio file not found: {audio_file_path}")
    
    # Handle other result formats
    logger.warning(f"F5-TTS: Unexpected result format: {result}")
    return None

# Test function for debugging
async def test_f5_connection():
    """Test F5-TTS connection and model status"""
    
    try:
        client = Client("http://localhost:7771")
        logger.info("F5-TTS: Testing connection...")
        
        # Test basic connectivity
        app_info = client.view_api()
        endpoints = app_info.get('named_endpoints', {})
        
        f5_endpoints = [name for name in endpoints.keys() if 'f5' in name.lower() or 'wrapper' in name.lower()]
        logger.info(f"F5-TTS: Available endpoints: {f5_endpoints}")
        
        return True
        
    except Exception as e:
        logger.error(f"F5-TTS: Connection test failed: {e}")
        return False
