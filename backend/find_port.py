#!/usr/bin/env python3
"""
Quick test to find F5-TTS endpoint since Kokoro is working
"""

import httpx
import asyncio

async def find_working_port():
    """Find which port TTS-WebUI is actually running on"""
    
    # Since Kokoro works, try the ports mentioned in your docs
    test_ports = [8880, 7770, 7778]
    
    for port in test_ports:
        try:
            print(f"🔍 Testing port {port}...")
            async with httpx.AsyncClient(timeout=5.0) as client:
                # Try the info endpoint
                response = await client.get(f"http://localhost:{port}/info")
                if response.status_code == 200:
                    print(f"✅ TTS-WebUI responding on port {port}")
                    return port
                else:
                    print(f"   Port {port}: HTTP {response.status_code}")
        except Exception as e:
            print(f"   Port {port}: {str(e)[:50]}...")
    
    # If /info doesn't work, try basic health check
    for port in test_ports:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"http://localhost:{port}/")
                if response.status_code == 200:
                    print(f"✅ TTS-WebUI base URL responding on port {port}")
                    return port
        except:
            continue
    
    print("❌ Could not find TTS-WebUI port")
    return None

if __name__ == "__main__":
    port = asyncio.run(find_working_port())
    if port:
        print(f"\n🎯 Use port {port} for F5-TTS")
    else:
        print("\n💡 Check that TTS-WebUI is running with --listen --api flags")
