#!/usr/bin/env python3
"""
Check what TTS-WebUI actually exposes for F5-TTS
"""

import asyncio
import httpx

async def probe_gradio():
    """Probe what Gradio endpoints exist"""
    
    print("🔍 Probing TTS-WebUI Gradio interface...")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Try to get app info
        endpoints_to_try = [
            "/info",
            "/config", 
            "/api/predict",
            "/queue/join",
            "/queue/status",
            "/gradio_api/info"
        ]
        
        for endpoint in endpoints_to_try:
            try:
                response = await client.get(f"http://localhost:7770{endpoint}")
                print(f"   {endpoint}: {response.status_code}")
                
                if response.status_code == 200 and len(response.content) < 1000:
                    try:
                        data = response.json()
                        if isinstance(data, dict):
                            print(f"      Keys: {list(data.keys())[:5]}...")  # Show first 5 keys
                    except:
                        print(f"      Content: {response.text[:100]}...")
                        
            except Exception as e:
                print(f"   {endpoint}: ❌ {str(e)[:30]}...")

if __name__ == "__main__":
    asyncio.run(probe_gradio())
