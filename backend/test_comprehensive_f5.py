#!/usr/bin/env python3
"""
Test the new comprehensive F5-TTS client
"""

import asyncio
import sys
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

# Add backend to path
sys.path.append('/home/jenith/Brain/backend')

from f5_tts_client import call_f5_tts, test_f5_connection

async def main():
    print("🧪 Testing comprehensive F5-TTS client...")
    
    # First test connection
    print("\n📡 Testing F5-TTS connection...")
    connection_ok = await test_f5_connection()
    
    if not connection_ok:
        print("❌ Cannot connect to F5-TTS - check TTS-WebUI is running")
        return
    
    print("✅ F5-TTS connection successful")
    
    # Create test reference audio
    test_audio_path = "/tmp/test_f5_ref.wav"
    
    # Create a proper WAV file
    wav_data = (
        b'RIFF\x2c\x08\x00\x00WAVEfmt \x10\x00\x00\x00'
        b'\x01\x00\x01\x00\x44\xac\x00\x00\x88X\x01\x00'
        b'\x02\x00\x10\x00data\x08\x08\x00\x00'
    )
    # Add some audio samples
    wav_data += b'\x00\x00' * 1024
    
    with open(test_audio_path, 'wb') as f:
        f.write(wav_data)
    
    print(f"📁 Created reference audio: {test_audio_path}")
    print(f"📊 File size: {os.path.getsize(test_audio_path)} bytes")
    
    # Test F5-TTS generation
    test_text = "Testing F5-TTS with comprehensive client."
    ref_text = "This is reference text for voice cloning."
    
    print(f"\n🎯 Generating: '{test_text}'")
    print(f"📝 Reference: '{ref_text}'")
    
    try:
        audio_data = await call_f5_tts(test_text, test_audio_path, ref_text)
        
        if audio_data:
            print(f"\n🎉 SUCCESS! F5-TTS generated {len(audio_data)} bytes of audio!")
            
            # Save result
            output_path = "/tmp/f5_comprehensive_output.wav"
            with open(output_path, 'wb') as f:
                f.write(audio_data)
            print(f"💾 Saved result to: {output_path}")
            
            print("\n✅ F5-TTS is now working! Test the 'Test Voice' button in your Brain app.")
            
        else:
            print("\n❌ F5-TTS failed - no audio generated")
            print("💡 Check TTS-WebUI logs for more details")
            
    except Exception as e:
        print(f"\n❌ F5-TTS test failed: {e}")
    
    finally:
        # Clean up
        if os.path.exists(test_audio_path):
            os.unlink(test_audio_path)

if __name__ == "__main__":
    asyncio.run(main())
