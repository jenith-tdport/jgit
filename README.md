# Brain - Streaming Chat UI with Voice Cloning

## Features
- 🎤 **Voice Input**: Click microphone to speak your message
- 🔊 **Voice Output**: Kokoro voices OR F5-TTS voice cloning
- 🎭 **Voice Cloning**: Clone any voice with 3-10 second reference audio
- ⚡ **Real-time Streaming**: No delays, instant responses
- 🧠 **Smart LLM**: Uses captaineris-nebula:latest model

## Project Configuration
- **LLM Model**: `captaineris-nebula:latest` (Ollama)
- **TTS Engines**: 
  - Kokoro via Docker (port 8881)
  - F5-TTS via TTS-WebUI (port 7771)
- **STT Engine**: Browser Web Speech API
- **Purpose**: Real-time voice-to-voice AI chat with voice cloning

## Architecture
```
🎤 Voice Input ──→ Brain Chat UI ──→ Ollama (captaineris-nebula:latest)
                        ↓                    ↓
                   Stream Text        Real-time Response  
                        ↓                    ↓
                   TTS Router ←─────────────┘
                    ↙      ↘
            Kokoro Docker   F5-TTS/TTS-WebUI
              (Port 8881)     (Port 7771)
                    ↘      ↙
                   🔊 Voice Output
```

## Quick Start
```bash
cd /home/jenith/jgit/brain
./start_jenith.sh      # Start all services
```

**Access**: http://localhost:6061

## Voice Chat Usage
1. **Click the 🎤 microphone button**
2. **Speak your message** (it will auto-send when you stop)
3. **Choose voice mode**:
   - **Kokoro**: Select from preset voices
   - **F5-TTS**: Upload/record reference audio for voice cloning
4. **Listen to the AI response** with your chosen voice
5. **Toggle 🔊 Audio: ON/OFF** to control voice output

**Browser Requirements**: Chrome, Edge, or Safari (for speech recognition)

---
*The streaming voice chat interface with advanced voice cloning capabilities.*