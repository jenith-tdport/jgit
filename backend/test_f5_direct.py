#!/usr/bin/env python3
"""
Test the actual F5-TTS endpoint with a real file
"""

import asyncio
import tempfile
import os

async def test_f5_directly():
    """Test F5-TTS endpoint directly with gradio_client"""
    
    try:
        from gradio_client import Client
        
        print("🔍 Testing F5-TTS /wrapper endpoint directly...")
        
        client = Client("http://localhost:7770")
        
        # Create a dummy audio file for testing
        dummy_audio_path = "/tmp/test_audio.wav"
        
        # Create a minimal WAV file (just for testing)
        with open(dummy_audio_path, 'wb') as f:
            # Write a minimal WAV header + some data
            f.write(b'RIFF\x2c\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x08\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00')
        
        print(f"📁 Created test audio: {dummy_audio_path}")
        
        # Test the /wrapper endpoint
        print("🧪 Calling F5-TTS /wrapper endpoint...")
        
        result = client.predict(
            dummy_audio_path,  # ref_audio_orig
            "Hello world",     # ref_text  
            "Testing F5-TTS",  # text
            False,             # remove_silence
            0.15,              # cross_fade_duration
            32,                # nfe_steps
            1.0,               # speed
            "-1",              # seed
            api_name="/wrapper"
        )
        
        print(f"✅ F5-TTS call succeeded!")
        print(f"📊 Result type: {type(result)}")
        print(f"📊 Result length: {len(result) if isinstance(result, (list, tuple)) else 'N/A'}")
        
        if isinstance(result, (list, tuple)):
            for i, item in enumerate(result):
                print(f"   [{i}] {type(item)}: {str(item)[:100]}")
        
        # Clean up
        os.unlink(dummy_audio_path)
        
    except ImportError:
        print("❌ gradio_client not available")
        print("💡 Run: pip install gradio_client")
    except Exception as e:
        print(f"❌ F5-TTS test failed: {e}")
        print(f"   Error type: {type(e)}")

if __name__ == "__main__":
    asyncio.run(test_f5_directly())
