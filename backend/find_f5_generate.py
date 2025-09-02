#!/usr/bin/env python3
"""
Find the F5-TTS generation endpoint since we know it's installed
"""

from gradio_client import Client
import json

try:
    client = Client("http://localhost:7770/")
    
    # Get all endpoints
    app_info = client.view_api()
    
    print("🔍 Searching for F5-TTS generation endpoints...")
    
    # Look for generation endpoints
    generation_endpoints = []
    for endpoint_name, endpoint_info in app_info.get('named_endpoints', {}).items():
        # Look for F5 or generation patterns
        if any(keyword in endpoint_name.lower() for keyword in ['f5', 'generate', 'infer', 'tts']):
            params = endpoint_info.get('parameters', [])
            if len(params) >= 3:  # Needs text + audio + options
                generation_endpoints.append((endpoint_name, len(params)))
    
    print(f"🎯 Found {len(generation_endpoints)} potential generation endpoints:")
    for name, param_count in generation_endpoints:
        print(f"   {name} ({param_count} parameters)")
    
    # Test the most likely candidate
    if generation_endpoints:
        test_endpoint = generation_endpoints[0][0]
        print(f"\n🧪 Testing endpoint: {test_endpoint}")
        
        try:
            # Try with minimal parameters 
            result = client.predict(
                "Hello world",          # Text
                "dummy.wav",           # Reference audio 
                "Hello",               # Reference text
                api_name=test_endpoint
            )
            print(f"✅ Success! Endpoint works: {test_endpoint}")
            print(f"Result type: {type(result)}")
            
        except Exception as e:
            print(f"❌ Test failed: {str(e)[:100]}...")
    
except Exception as e:
    print(f"❌ Error: {e}")
