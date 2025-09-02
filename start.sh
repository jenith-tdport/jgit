#!/bin/bash

# Brain - Quick Start Script

echo "🧠 Starting Brain - Streaming Chat UI"

cd /home/jenith/Brain

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Run ./setup.sh first!"
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "⚠️  Warning: Ollama not detected on port 11434"
    echo "   Make sure Ollama is running with captaineris-nebula:latest"
fi

# Check if TTS-WebUI is running
if ! curl -s http://localhost:7770/health > /dev/null; then
    echo "⚠️  Warning: TTS-WebUI not detected on port 7770"
    echo "   Make sure TTS-WebUI is running with Kokoro TTS"
fi

echo ""
echo "🚀 Starting Brain server on http://localhost:6060"
echo ""

# Start the server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 6060