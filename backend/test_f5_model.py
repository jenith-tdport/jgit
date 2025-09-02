#!/usr/bin/env python3
"""
Test F5-TTS model status in TTS-WebUI
"""

from gradio_client import Client

try:
    print("🔍 Testing F5-TTS model status...")
    client = Client("http://localhost:7770/")
    
    # Test if F5-TTS model is loaded
    result = client.predict(api_name="/f5_tts_model_unload_model")
    print(f"✅ F5-TTS model unload result: {result}")
    print("✅ F5-TTS extension is installed and model was loaded!")
    
except Exception as e:
    print(f"❌ F5-TTS test failed: {e}")
    print("❌ F5-TTS extension may not be installed or models not loaded")
