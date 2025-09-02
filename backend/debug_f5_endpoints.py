#!/usr/bin/env python3
"""
Debug script to find F5-TTS Gradio endpoints in TTS-WebUI
Run this to discover the correct API endpoints for F5-TTS
"""

import httpx
import asyncio
import json

async def discover_f5_endpoints():
    """Discover available F5-TTS endpoints"""
    
    print("🔍 Discovering F5-TTS endpoints in TTS-WebUI...")
    
    try:
        # Try multiple common ports for TTS-WebUI
        ports = [7770, 8880, 7778, 5000, 8080]
        working_port = None
        
        for port in ports:
            print(f"🔍 Trying port {port}...")
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    info_response = await client.get(f"http://localhost:{port}/info")
                    
                    if info_response.status_code == 200:
                        working_port = port
                        print(f"✅ Found TTS-WebUI on port {port}")
                        break
                    else:
                        print(f"   Port {port}: Status {info_response.status_code}")
            except:
                print(f"   Port {port}: No response")
        
        if not working_port:
            print("❌ TTS-WebUI not found on any common port")
            print("💡 Make sure TTS-WebUI is running")
            return
        
        # Get Gradio app info from working port
        async with httpx.AsyncClient(timeout=10.0) as client:
            info_response = await client.get(f"http://localhost:{working_port}/info")
            
            if info_response.status_code != 200:
                print(f"❌ Cannot get info from port {working_port}")
                print(f"Status: {info_response.status_code}")
                return
            
            info = info_response.json()
            print(f"✅ Connected to TTS-WebUI on port {working_port}")
            print(f"📊 Total endpoints: {len(info.get('named_endpoints', {}))}")
            
            # Find F5-TTS related endpoints
            endpoints = info.get('named_endpoints', {})
            f5_endpoints = []
            
            for name, details in endpoints.items():
                name_lower = name.lower()
                if any(keyword in name_lower for keyword in ['f5', 'tts', 'clone', 'voice']):
                    f5_endpoints.append({
                        'name': name,
                        'details': details
                    })
            
            print(f"\n🎯 F5-TTS related endpoints found: {len(f5_endpoints)}")
            
            for endpoint in f5_endpoints:
                print(f"\n📝 Endpoint: {endpoint['name']}")
                if 'parameters' in endpoint['details']:
                    params = endpoint['details']['parameters']
                    print(f"   Parameters: {len(params)} inputs")
                    for i, param in enumerate(params):
                        param_info = param.get('python_type', {})
                        param_name = param_info.get('_name', 'unknown')
                        print(f"     [{i}] {param_name}")
                
                if 'returns' in endpoint['details']:
                    returns = endpoint['details']['returns']
                    print(f"   Returns: {len(returns)} outputs")
                    for i, ret in enumerate(returns):
                        ret_info = ret.get('python_type', {})
                        ret_name = ret_info.get('_name', 'unknown')
                        print(f"     [{i}] {ret_name}")
            
            # Test a likely endpoint
            if f5_endpoints:
                print(f"\n🧪 Testing most likely endpoint...")
                await test_endpoint(f5_endpoints[0]['name'], working_port)
            
    except Exception as e:
        print(f"❌ Error discovering endpoints: {e}")

async def test_endpoint(endpoint_name, port=7770):
    """Test an F5-TTS endpoint with dummy data"""
    
    try:
        url = f"http://localhost:{port}/queue/join"
        
        # Create dummy payload
        payload = {
            "data": [
                "dummy_audio.wav",  # Reference audio
                "Hello world",      # Reference text
                "Testing F5-TTS",   # Generate text
                "F5-TTS",          # Model
                1.0,               # Speed
                False              # Remove silence
            ],
            "event_data": None,
            "fn_index": 0,
            "session_hash": "debug123"
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            print(f"   Test response: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"   Result keys: {list(result.keys())}")
                if 'event_id' in result:
                    print(f"   ✅ Queue joined successfully")
                else:
                    print(f"   ⚠️  Unexpected response format")
            else:
                print(f"   ❌ Test failed: {response.text}")
    
    except Exception as e:
        print(f"   ❌ Test error: {e}")

if __name__ == "__main__":
    asyncio.run(discover_f5_endpoints())
