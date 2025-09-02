#!/usr/bin/env python3
"""
Test F5-TTS using file handle method
"""

from gradio_client import Client, file
import tempfile
import os

# Create a minimal WAV file
wav_header = (
    b'RIFF\x24\x08\x00\x00WAVEfmt \x10\x00\x00\x00'
    b'\x01\x00\x01\x00\x44\xac\x00\x00\x88X\x01\x00'
    b'\x02\x00\x10\x00data\x00\x08\x00\x00'
)
audio_samples = b'\x00\x00' * 1024  # Some silence

with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
    f.write(wav_header + audio_samples)
    ref_audio_path = f.name

print(f"Created temp audio: {ref_audio_path}")
print(f"File exists: {os.path.exists(ref_audio_path)}")

try:
    client = Client("http://localhost:7770")
    print("Connected to TTS-WebUI")
    
    # Use the file() helper to properly handle the file upload
    result = client.predict(
        file(ref_audio_path),  # Use file() helper for proper upload
        "Test reference text",  # Reference text
        "Hello, this is a test of F5-TTS.",  # Text to generate
        False,  # Remove silence
        0.15,  # Cross fade duration
        32,  # NFE steps
        1.0,  # Speed
        "-1",  # Seed (as STRING!)
        api_name="/wrapper"
    )
    
    print(f"Result type: {type(result)}")
    print(f"Result: {result}")
    
    if isinstance(result, tuple) and len(result) > 0:
        audio_path = result[0]
        print(f"Generated audio path: {audio_path}")
        if isinstance(audio_path, str) and os.path.exists(audio_path):
            print(f"Generated audio size: {os.path.getsize(audio_path)} bytes")
            print("✅ SUCCESS!")
            # Save it somewhere we can check
            import shutil
            output_path = "/tmp/f5_test_output.wav"
            shutil.copy(audio_path, output_path)
            print(f"Saved output to: {output_path}")
        else:
            print("❌ Audio file not found or invalid path")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    
finally:
    # Clean up
    if os.path.exists(ref_audio_path):
        os.unlink(ref_audio_path)
        print(f"Cleaned up temp file")
