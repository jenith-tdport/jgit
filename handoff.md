# System Migration Handoff - September 1, 2025

## What We Built
Successfully migrated the Brain + TTS-WebUI system to a new, portable folder structure ready for backup and deployment.

## New Folder Structure
```
/home/jenith/jgit/brain/     → Git-tracked code and config (clean repo)
/home/jenith/jrun/            → Runtime assets (models, voices, docker images)
```

## Key Accomplishments

### ✅ Code Migration
- Copied all Brain app code to `/jgit/brain/`
- Copied all frontend assets (HTML, JS, CSS)
- Created fresh Python virtual environment with all dependencies
- Created single startup script: `start_jenith.sh`

### ✅ TTS-WebUI Migration
- Copied entire TTS-WebUI to `/jrun/TTS-WebUI/` (includes F5-TTS extension)
- Fixed PostgreSQL lock file issue from copy
- Configured to run on new ports (7771/8881/3031)

### ✅ Docker Container Setup
- Created new Kokoro container (`kokoro-fastapi-new`) on port 8881
- Exported Docker image to `/jrun/docker-images/kokoro-fastapi-gpu.tar`
- Old container preserved on port 8880 (stopped but available)

## Port Configuration

### New System Ports
- Brain UI: **6061**
- TTS-WebUI Gradio: **7771**  
- Kokoro Docker API: **8881**
- React UI: **3031**

### Old System Ports (for reference)
- Brain UI: 6060
- TTS-WebUI Gradio: 7770
- Kokoro Docker API: 8880
- React UI: 3030

## How to Run

### Start the New System
```bash
cd /home/jenith/jgit/brain
./start_jenith.sh
```
Then open: http://localhost:6061

### Docker Container (if needed)
```bash
# The container should already be running, but if not:
docker start kokoro-fastapi-new

# To restore from backup on new machine:
docker load -i /home/jenith/jrun/docker-images/kokoro-fastapi-gpu.tar
docker run -d --name kokoro-fastapi-new -p 8881:8880 --gpus all ghcr.io/remsky/kokoro-fastapi-gpu:latest
```

## File Locations

### Code (Git-tracked)
- `/home/jenith/jgit/brain/backend/` - Python backend with F5-TTS integration
- `/home/jenith/jgit/brain/frontend/` - Web UI files
- `/home/jenith/jgit/brain/venv/` - Python virtual environment
- `/home/jenith/jgit/brain/start_jenith.sh` - Startup script

### Runtime Assets  
- `/home/jenith/jrun/TTS-WebUI/` - Complete TTS server with models
- `/home/jenith/jrun/docker-images/` - Exported Docker containers
- `/home/jenith/jrun/reference_audio/` - User voice samples

## Known Working Features
✅ Kokoro TTS (multiple voices via Docker)
✅ F5-TTS voice cloning (via TTS-WebUI)
✅ Reference audio upload/recording
✅ Model switching (Kokoro ↔ F5-TTS)
✅ WebSocket chat streaming
✅ Auto-fallback to Kokoro if F5-TTS fails

## Issues Resolved During Migration
1. **PostgreSQL lock file** - Removed stale lock from copied data
2. **Port conflicts** - Configured new ports for parallel running
3. **Docker container** - Created separate instance for new system
4. **Import paths** - Fixed Python import paths for new structure
5. **Virtual environment** - Rebuilt fresh instead of copying

## Backup Instructions
To create a shelf-ready backup:
```bash
# This creates a complete portable system
cp -r /home/jenith/jgit /backup/location/
cp -r /home/jenith/jrun /backup/location/
```

## Notes
- The system is designed to run independently of the old setup
- Both old and new systems can run simultaneously on different ports
- F5-TTS voice cloning works perfectly (remember: it took 5 hours to debug originally, but the fix was just installing the extension!)
- Total size of `/jrun/` is large due to models (10-20GB+)

## Original F5-TTS Achievement
After 5 hours of debugging (4.5 hours unnecessary), discovered the solution was simply:
```bash
pip install git+https://github.com/rsxdalv/extension_f5_tts@main
```
The lesson: Always check if extensions are installed first!

---
*Migration completed: September 1, 2025*
*Original F5-TTS implementation: December 2024*