#!/bin/bash

# Jenith's Brain + TTS-WebUI Startup Script
# This starts the NEW system with proper ports and paths

echo "========================================="
echo "Starting Jenith's Brain System"
echo "========================================="

# Clean up any stuck processes from previous runs
echo "Cleaning up any stuck processes..."
pkill -f "port 3031" 2>/dev/null
pkill -f "port 7771" 2>/dev/null

# Start TTS-WebUI
echo "Starting TTS-WebUI from /jrun..."
cd /home/jenith/jrun/TTS-WebUI
source installer_files/env/bin/activate

# Start with explicit port configuration
GRADIO_SERVER_PORT=7771 OPENAI_API_PORT=8881 REACT_UI_PORT=3031 python server.py --share-gradio --gradio-port 7771 --openai-api-port 8881 2>&1 &
TTS_PID=$!

echo "Waiting for TTS-WebUI to initialize..."
sleep 15

# Start Brain UI
echo "Starting Brain UI..."
cd /home/jenith/jgit/brain
source venv/bin/activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 6061 &
BRAIN_PID=$!

# Display status
echo ""
echo "========================================="
echo "✅ JENITH'S SYSTEM IS RUNNING"
echo "========================================="
echo "📱 Brain UI:        http://localhost:6061"
echo "🎙️ TTS Gradio:      http://localhost:7771"
echo "🔊 Kokoro API:      http://localhost:8881"
echo "🎨 React UI:        http://localhost:3031"
echo ""
echo "🐳 Docker: kokoro-fastapi-new on port 8881"
echo "📂 Code:   /home/jenith/jgit/brain"
echo "💾 Models: /home/jenith/jrun"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for processes
wait
