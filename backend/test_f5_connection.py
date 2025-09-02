#!/usr/bin/env python3
"""
Quick F5-TTS connection test to see what's failing
"""

import asyncio
import httpx

async def test_f5_tts_endpoints():
    """Test the actual F5-TTS endpoints on TTS-WebUI"""
    
    print("🔍 Testing F5-TTS connection to TTS-WebUI...")
    
    # Test the OpenAI-compatible endpoint (port 7778)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            print("📡 Testing port 7778 (OpenAI API)...")
            
            payload = {
                "model": "f5-tts",
                "input": "Hello, this is a test",
                "voice": "custom",
                "reference_audio": "dummy_base64",
                "response_format": "wav"
            }
            
            response = await client.post("http://localhost:7778/v1/audio/speech", json=payload)
            print(f"   Status: {response.status_code}")
            print(f"   Headers: {dict(response.headers)}")
            
            if response.status_code != 200:
                print(f"   Error: {response.text}")
            else:
                print(f"   Success! Audio length: {len(response.content)} bytes")
                
    except Exception as e:
        print(f"   ❌ Port 7778 failed: {e}")
    
    # Test the Gradio endpoint (port 7770)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            print("\n📡 Testing port 7770 (Gradio)...")
            
            # Try basic connection
            response = await client.get("http://localhost:7770/")
            print(f"   Base URL: {response.status_code}")
            
            # Try queue endpoint
            payload = {
                "data": ["dummy_audio", "Hello", "Testing F5-TTS"],
                "fn_index": 0,
                "session_hash": "test123"
            }
            
            response = await client.post("http://localhost:7770/queue/join", json=payload)
            print(f"   Queue: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"   Result keys: {list(result.keys())}")
            
    except Exception as e:
        print(f"   ❌ Port 7770 failed: {e}")
    
    print("\n💡 Check TTS-WebUI logs for F5-TTS availability")

if __name__ == "__main__":
    asyncio.run(test_f5_tts_endpoints())
