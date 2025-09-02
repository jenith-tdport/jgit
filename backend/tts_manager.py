"""
TTS Manager - Handles multiple TTS models and services
Supports Kokoro, F5-TTS, XTTS, and Bark
"""

import httpx
import base64
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class TTSManager:
    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=30.0)
        
        # TTS Service Configurations
        self.services = {
            'kokoro': {
                'name': 'Kokoro TTS',
                'url': 'http://localhost:7770',
                'endpoint': '/api/tts',
                'voices': {
                    'af_aoede': 'Aoede (Female)',
                    'af_bella': 'Bella (Female)', 
                    'af_sarah': 'Sarah (Female)',
                    'am_adam': 'Adam (Male)',
                    'am_michael': 'Michael (Male)',
                    'bf_emma': 'Emma (British Female)',
                    'bm_george': 'George (British Male)'
                }
            },
            'f5-tts': {
                'name': 'F5-TTS',
                'url': 'http://localhost:8880',
                'endpoint': '/api/f5tts',
                'voices': {
                    'default': 'Default Voice',
                    'reference': 'Reference Voice'
                }
            },
            'xtts': {
                'name': 'XTTS v2',
                'url': 'http://localhost:8881',
                'endpoint': '/api/xtts',
                'voices': {
                    'en_speaker': 'English Speaker',
                    'multi_speaker': 'Multilingual'
                }
            },
            'bark': {
                'name': 'Bark',
                'url': 'http://localhost:8882',
                'endpoint': '/api/bark',
                'voices': {
                    'announcer': 'Announcer',
                    'speaker_0': 'Speaker 0',
                    'speaker_1': 'Speaker 1'
                }
            }
        }
        
        # Default settings
        self.current_model = 'kokoro'
        self.current_voice = 'af_aoede'
    
    async def generate_speech(self, 
                            text: str, 
                            model: str = None, 
                            voice: str = None,
                            speed: float = 1.0,
                            pitch: float = 1.0) -> Optional[bytes]:
        """Generate speech using specified TTS model and voice"""
        
        model = model or self.current_model
        voice = voice or self.current_voice
        
        if model not in self.services:
            logger.error(f"Unknown TTS model: {model}")
            return None
            
        service = self.services[model]
        
        # Check if service is available
        if not await self.check_service_status(model):
            logger.error(f"TTS service {model} is not available")
            return None
            
        try:
            # Prepare request based on model type
            if model == 'kokoro':
                payload = {
                    "text": text,
                    "voice": voice,
                    "speed": speed,
                    "pitch": pitch
                }
            elif model == 'f5-tts':
                payload = {
                    "text": text,
                    "reference_audio": voice,
                    "speed": speed
                }
            elif model == 'xtts':
                payload = {
                    "text": text,
                    "speaker": voice,
                    "language": "en"
                }
            elif model == 'bark':
                payload = {
                    "text": text,
                    "voice_preset": voice
                }
            
            # Make API request
            url = f"{service['url']}{service['endpoint']}"
            response = await self.http_client.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                # Get audio data based on response type
                content_type = response.headers.get('content-type', '')
                
                if 'audio' in content_type:
                    return response.content
                else:
                    # JSON response with base64 audio
                    data = response.json()
                    if 'audio' in data:
                        return base64.b64decode(data['audio'])
                    elif 'data' in data:
                        return base64.b64decode(data['data'])
                        
            logger.error(f"TTS request failed: {response.status_code}")
            return None
            
        except Exception as e:
            logger.error(f"Error generating speech with {model}: {e}")
            return None
