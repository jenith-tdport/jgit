# Brain - Streaming Chat UI

## Features
- 🎤 **Voice Input**: Click microphone to speak your message
- 🔊 **Voice Output**: Instant TTS response using Kokoro
- ⚡ **Real-time Streaming**: No delays like OpenWebUI
- 🧠 **Smart LLM**: Uses captaineris-nebula:latest model

## Project Configuration
- **LLM Model**: `captaineris-nebula:latest` (Ollama)
- **TTS Engine**: Kokoro via TTS-WebUI (port 7770)  
- **STT Engine**: Browser Web Speech API
- **Purpose**: Real-time voice-to-voice AI chat

## Architecture
```
🎤 Voice Input ──→ Brain Chat UI ──→ Ollama (captaineris-nebula:latest)
                        ↓                    ↓
                   Stream Text        Real-time Response  
                        ↓                    ↓
                   TTS-WebUI API ←─────────┘
                   (Kokoro, Port 7770)
                        ↓
                   🔊 Voice Output
```

## Quick Start
```bash
cd /home/jenith/Brain
./setup.sh      # One-time setup
./start.sh      # Start server
```

**Access**: http://localhost:6060

## Voice Chat Usage
1. **Click the 🎤 microphone button**
2. **Speak your message** (it will auto-send when you stop)
3. **Listen to the AI response** with Kokoro TTS
4. **Toggle 🔊 Audio: ON/OFF** to control voice output

**Browser Requirements**: Chrome, Edge, or Safari (for speech recognition)

---
*The streaming voice chat interface that OpenWebUI should have been...*