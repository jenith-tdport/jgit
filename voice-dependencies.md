# Voice Dependencies for JBrain

JBrain provides streaming voice-to-voice chat by integrating with external voice services. This approach keeps the main repository lightweight while leveraging powerful, specialized voice AI tools.

## Required External Services

### TTS-WebUI (Text-to-Speech & Speech-to-Text)
- **Repository**: https://github.com/rsxdalv/tts-generation-webui
- **Purpose**: Provides both TTS generation and STT transcription
- **Default Port**: 7770
- **Installation Location**: `/home/jenith/Voice/TTS-WebUI` (or your preferred path)

#### Required Models
- **Kokoro TTS** (Phase 1): Fast, high-quality voice synthesis
- **Whisper STT**: Speech-to-text transcription (base.pt model)
- **F5-TTS** (Phase 2): Additional TTS model for variety

#### TTS-WebUI Features Used
- Kokoro API endpoint for real-time TTS
- Built-in Whisper extension for STT
- Model management and GPU acceleration
- Multiple voice models (20+ available)

### Docker Kokoro (Alternative TTS)
- **Image**: `ghcr.io/remsky/kokoro-fastapi-gpu:latest`
- **Port**: 8880
- **Purpose**: Standalone Kokoro TTS service
- **Status**: Currently used in Phase 1

## Setup Instructions

### 1. Install TTS-WebUI
```bash
# Clone TTS-WebUI
cd /home/jenith/Voice
git clone https://github.com/rsxdalv/tts-generation-webui.git TTS-WebUI
cd TTS-WebUI

# Follow TTS-WebUI installation guide
./start_tts_webui.sh
```

### 2. Verify Voice Services
- **TTS-WebUI**: http://localhost:7770
- **Kokoro Docker**: http://localhost:8880 (if using)

### 3. Start JBrain
```bash
cd /home/jenith/Brain
./start.sh
```

## API Integration Points

### Current (Phase 1)
- **TTS**: JBrain → Kokoro Docker (port 8880)
- **STT**: Browser Web Speech API + TTS-WebUI Whisper fallback (IMPLEMENTED)

### Planned (Phase 2)  
- **TTS**: JBrain → TTS-WebUI Bridge → TTS-WebUI (port 7770)
- **STT**: JBrain → TTS-WebUI Whisper Extension

## Service Dependencies

| JBrain Feature | Requires | Fallback |
|---------------|----------|----------|
| Voice Input | Web Speech API + TTS-WebUI Whisper | Text-only mode |
| Voice Output | Kokoro Docker | Text-only mode |
| Text Chat | None | Always available |
| Model Switching | TTS-WebUI | Single model |

## Development Notes

### Why External Dependencies?
- **Specialized Tools**: TTS-WebUI is purpose-built for voice AI
- **Model Management**: Handles 20+ TTS models, GPU optimization
- **Repository Size**: Keeps JBrain lightweight and fast to clone
- **Maintenance**: Each tool maintained by experts
- **Flexibility**: Users can choose their voice setup

### Integration Approach
- **HTTP APIs**: Clean service boundaries
- **Graceful Fallbacks**: App works without voice services
- **Clear Error Messages**: Users know what's missing
- **Modular Design**: Easy to swap voice providers

## Troubleshooting

### No Voice Output
1. Check if TTS service is running on configured port
2. Verify network connectivity between services
3. Check JBrain logs for TTS API errors

### No Voice Input  
1. Check browser microphone permissions
2. Verify Web Speech API support (Chrome/Edge work best)
3. Firefox users: Planned STT server endpoint

### Performance Issues
1. Enable GPU acceleration in TTS-WebUI
2. Use smaller models (base vs large) for faster response
3. Check system resources (RAM/VRAM usage)

---

*This dependency approach allows JBrain to remain focused on chat UI/UX while leveraging best-in-class voice AI tools.*