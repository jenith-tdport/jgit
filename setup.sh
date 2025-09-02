#!/bin/bash

# Brain - Streaming Chat UI Setup Script

echo "🧠 Setting up Brain - Streaming Chat UI"

# Create virtual environment
echo "Creating Python virtual environment..."
cd /home/jenith/Brain
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the Brain chat interface:"
echo "  1. cd /home/jenith/Brain"
echo "  2. source venv/bin/activate"
echo "  3. uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "Then open: http://localhost:8000"
echo ""
echo "Make sure these services are running:"
echo "  - Ollama on port 11434 (for captaineris-nebula:latest)"
echo "  - TTS-WebUI on port 7770 (for Kokoro TTS)"
echo ""
echo "🚀 Ready to experience streaming chat with instant TTS!"