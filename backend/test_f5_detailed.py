#!/usr/bin/env python3
"""
Test F5-TTS with better debugging
"""

import asyncio
import sys
import os
sys.path.append('/home/jenith/Brain/backend')

from f5_tts_client import call_f5_tts
import logging

# Enable detailed logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

async def test_f5_with_logging():
    """Test F5-TTS with the same setup as your UI"""
    
    print("🧪 Testing F5-TTS client with detailed logging...")
    
    # Create a test reference audio file (same as UI would have)
    test_audio_path = "/tmp/test_ref.wav"
    
    # Create a proper WAV file header + some audio data
    wav_header = (
        b'RIFF\x24\x08\x00\x00WAVEfmt \x10\x00\x00\x00'
        b'\x01\x00\x01\x00\x44\xac\x00\x00\x88X\x01\x00'
        b'\x02\x00\x10\x00data\x00\x08\x00\x00'
    )
    
    # Add some dummy audio samples
    audio_samples = b'\x00\x00' * 1024  # 1024 samples of silence
    
    with open(test_audio_path, 'wb') as f:
        f.write(wav_header + audio_samples)
    
    print(f"📁 Created test reference audio: {test_audio_path}")
    print(f"📊 File size: {os.path.getsize(test_audio_path)} bytes")
    
    # Test F5-TTS generation
    test_text = "Hello, this is a test of F5-TTS voice cloning."
    ref_text = "This is the reference text."
    
    print(f"🎯 Generating: '{test_text}'")
    print(f"📝 Reference: '{ref_text}'")
    
    try:
        audio_data = await call_f5_tts(test_text, test_audio_path, ref_text)
        
        if audio_data:
            print(f"✅ F5-TTS SUCCESS! Generated {len(audio_data)} bytes of audio")
            
            # Save the result to test
            output_path = "/tmp/f5_output.wav"
            with open(output_path, 'wb') as f:
                f.write(audio_data)
            print(f"💾 Saved result to: {output_path}")
            
        else:
            print("❌ F5-TTS returned no audio data")
            
    except Exception as e:
        print(f"❌ F5-TTS test failed: {e}")
    
    finally:
        # Clean up
        if os.path.exists(test_audio_path):
            os.unlink(test_audio_path)

if __name__ == "__main__":
    asyncio.run(test_f5_with_logging())
