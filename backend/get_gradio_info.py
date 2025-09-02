#!/usr/bin/env python3
"""
Get Gradio API info to find F5-TTS endpoints
"""

import asyncio
import httpx
import json

async def get_gradio_info():
    """Get detailed Gradio API information"""
    
    print("🔍 Getting TTS-WebUI Gradio API info...")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get("http://localhost:7770/gradio_api/info")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Gradio API info retrieved")
                
                # Look for named endpoints
                if 'named_endpoints' in data:
                    endpoints = data['named_endpoints']
                    print(f"📋 Found {len(endpoints)} named endpoints")
                    
                    # Filter for F5-TTS related endpoints
                    f5_endpoints = []
                    for name, details in endpoints.items():
                        if any(keyword in name.lower() for keyword in ['f5', 'tts', 'generate', 'clone']):
                            f5_endpoints.append(name)
                    
                    print(f"🎯 F5-TTS related endpoints: {f5_endpoints}")
                    
                    # Show details of most promising endpoint
                    if f5_endpoints:
                        endpoint_name = f5_endpoints[0]
                        endpoint_details = endpoints[endpoint_name]
                        print(f"\n📝 Details for '{endpoint_name}':")
                        
                        if 'parameters' in endpoint_details:
                            params = endpoint_details['parameters']
                            print(f"   Parameters ({len(params)}):")
                            for i, param in enumerate(params):
                                print(f"     [{i}] {param.get('label', 'unlabeled')}")
                        
                        if 'returns' in endpoint_details:
                            returns = endpoint_details['returns']
                            print(f"   Returns ({len(returns)}):")
                            for i, ret in enumerate(returns):
                                print(f"     [{i}] {ret.get('label', 'unlabeled')}")
                else:
                    print("❌ No named_endpoints found")
                    print(f"Available keys: {list(data.keys())}")
            else:
                print(f"❌ Failed to get info: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(get_gradio_info())
