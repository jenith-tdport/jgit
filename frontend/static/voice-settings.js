// Voice Settings Page Management
class VoiceSettings {
    constructor(brainChat) {
        this.brainChat = brainChat;
        this.currentModel = 'kokoro';
        this.primaryModel = 'kokoro'; // Primary model for chat
        this.ttsServerUrl = 'http://localhost:8880';
        this.serverStatus = 'disconnected';
        
        this.initializeElements();
        this.setupEventListeners();
        this.checkServerStatus();
        this.loadSettings();
    }
    
    initializeElements() {
        // Navigation
        this.voiceNavBtn = document.getElementById('voice-settings-nav');
        this.voiceSettingsPage = document.getElementById('voice-settings-page');
        
        // Server status
        this.ttsStatus = document.getElementById('tts-status');
        this.openTtsBtn = document.getElementById('open-tts-webui');
        this.refreshStatusBtn = document.getElementById('refresh-server-status');
        
        // Model selection
        this.modelTabs = document.querySelectorAll('.model-tab');
        this.modelName = document.getElementById('model-name');
        this.voiceModelSelect = document.getElementById('voice-model-select');
        this.playSampleBtn = document.getElementById('play-sample');
        
        // F5-TTS specific controls
        this.standardVoiceControls = document.getElementById('standard-voice-controls');
        this.f5ttsVoiceControls = document.getElementById('f5tts-voice-controls');
        this.audioDropZone = document.getElementById('audio-drop-zone');
        this.refAudioFile = document.getElementById('ref-audio-file');
        this.recordRefBtn = document.getElementById('record-ref-btn');
        this.stopRefBtn = document.getElementById('stop-ref-btn');
        this.playRefBtn = document.getElementById('play-ref-btn');
        this.refText = document.getElementById('ref-text');
        
        // Recording state
        this.isRecordingRef = false;
        this.refMediaRecorder = null;
        this.refAudioChunks = [];
        this.refAudioBlob = null;
        
        // Voice controls
        this.voiceSpeed = document.getElementById('voice-speed');
        this.voicePitch = document.getElementById('voice-pitch');
        this.speedValue = document.getElementById('speed-value');
        this.pitchValue = document.getElementById('pitch-value');
        
        // Sample testing
        this.sampleText = document.getElementById('sample-text');
        this.testVoiceBtn = document.getElementById('test-voice');
        
        // VAD controls
        this.vadSensitivity = document.getElementById('vad-sensitivity-main');
        this.resumeDelay = document.getElementById('resume-delay');
        this.minRecordTime = document.getElementById('min-record-time');        this.hangoverTime = document.getElementById('hangover-time');
        this.micGain = document.getElementById('mic-gain');
        
        // VAD value displays
        this.sensitivityValue = document.getElementById('sensitivity-value-main');
        this.resumeDelayValue = document.getElementById('resume-delay-value');
        this.minRecordValue = document.getElementById('min-record-value');
        this.hangoverValue = document.getElementById('hangover-value');
        this.micGainValue = document.getElementById('mic-gain-value');
        
        // VAD options
        this.autoPauseTts = document.getElementById('auto-pause-tts');
        this.acousticFeedbackProtection = document.getElementById('acoustic-feedback-protection');
        
        // VAD actions
        this.testMicrophoneBtn = document.getElementById('test-microphone');
        this.saveProfileBtn = document.getElementById('save-voice-profile');
        this.resetDefaultsBtn = document.getElementById('reset-vad-defaults');
        
        // VAD monitor
        this.micLevelBar = document.getElementById('mic-level-bar');
        this.micLevelText = document.getElementById('mic-level-text');
    }
    
    setupEventListeners() {
        // Navigation
        this.voiceNavBtn?.addEventListener('click', () => this.showVoiceSettings());
        
        // Model tabs
        this.modelTabs.forEach(tab => {
            tab.addEventListener('click', () => this.selectModel(tab.dataset.model));
        });        
        // Voice controls
        this.playSampleBtn?.addEventListener('click', () => this.playSample());
        this.testVoiceBtn?.addEventListener('click', () => this.testVoice());
        
        // F5-TTS controls
        this.setupF5TTSControls();
        
        // Server controls
        this.refreshStatusBtn?.addEventListener('click', () => this.checkServerStatus());
    }
    
    setupF5TTSControls() {
        if (!this.audioDropZone) return;
        
        // Drop zone click
        this.audioDropZone.addEventListener('click', () => {
            this.refAudioFile?.click();
        });
        
        // File input
        this.refAudioFile?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleRefAudioFile(e.target.files[0]);
            }
        });
        
        // Record button
        this.recordRefBtn?.addEventListener('click', () => this.startRecordingRef());
        this.stopRefBtn?.addEventListener('click', () => this.stopRecordingRef());
        this.playRefBtn?.addEventListener('click', () => this.playRefAudio());
    }    
    showVoiceSettings() {
        // Hide main content
        const welcomeScreen = document.getElementById('welcome-screen');
        const messagesContainer = document.getElementById('messages-container');
        const voiceViz = document.getElementById('voice-viz');
        
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        if (messagesContainer) messagesContainer.style.display = 'none';
        if (voiceViz) voiceViz.style.display = 'none';
        
        // Show voice settings
        if (this.voiceSettingsPage) {
            this.voiceSettingsPage.style.display = 'block';
        }
    }
    
    selectModel(modelName) {
        this.currentModel = modelName;
        this.primaryModel = modelName; // Set as primary chat model
        
        // Update tabs
        this.modelTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.model === modelName);
        });
        
        // Show/hide appropriate controls
        if (modelName === 'f5-tts') {
            if (this.standardVoiceControls) this.standardVoiceControls.style.display = 'none';
            if (this.f5ttsVoiceControls) this.f5ttsVoiceControls.style.display = 'block';
            
            // Send reference audio to backend if available
            if (this.refAudioBlob) {
                this.sendF5ReferenceToBackend();
            }
        } else {
            if (this.standardVoiceControls) this.standardVoiceControls.style.display = 'block';
            if (this.f5ttsVoiceControls) this.f5ttsVoiceControls.style.display = 'none';
        }
        
        // Save primary model selection
        this.saveSettings();
        
        // Update the brain chat's voice settings
        if (this.brainChat) {
            this.brainChat.primaryModel = modelName;
        }
    }
    
    async sendF5ReferenceToBackend() {
        // Check if we have F5-TTS selected and reference audio available
        if (this.currentModel !== 'f5-tts' || !this.refAudioBlob) {
            console.log('No F5-TTS reference audio to send');
            return false;
        }
        
        try {
            // Convert blob to base64
            const reader = new FileReader();
            const audioBase64 = await new Promise((resolve, reject) => {
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(this.refAudioBlob);
            });
            
            // Send to backend via WebSocket
            if (this.brainChat.websocket && this.brainChat.websocket.readyState === WebSocket.OPEN) {
                this.brainChat.websocket.send(JSON.stringify({
                    type: 'set_f5_reference',
                    ref_audio: audioBase64,
                    ref_text: this.refText?.value || ''
                }));
                
                console.log('F5-TTS reference audio sent to backend');
                return true;
            } else {
                console.error('WebSocket not connected');
                return false;
            }
        } catch (error) {
            console.error('Error sending F5-TTS reference:', error);
            return false;
        }
    }    
    async checkServerStatus() {
        // Simple stub for now
        this.serverStatus = 'connected';
        if (this.ttsStatus) {
            this.ttsStatus.textContent = '🟢';
        }
    }
    
    loadSettings() {
        // Load from localStorage if available
        const saved = localStorage.getItem('voiceSettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                if (settings.primaryModel) {
                    this.primaryModel = settings.primaryModel;
                    this.selectModel(settings.primaryModel);
                } else if (settings.model) {
                    this.selectModel(settings.model);
                }
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
        }
    }
    
    playSample() {
        const text = "Hello, this is a voice sample.";
        this.testVoiceOutput(text);
    }
    
    testVoice() {
        const text = this.sampleText?.value || "Hello, this is a test.";
        this.testVoiceOutput(text);
    }    
    async testVoiceOutput(text) {
        console.log('Test voice output - current model:', this.currentModel);
        
        if (this.currentModel === 'f5-tts') {
            if (!this.refAudioBlob) {
                alert('Please upload or record reference audio first');
                return;
            }
            
            console.log('Sending F5-TTS request with reference audio');
            
            // Convert reference audio to base64
            const reader = new FileReader();
            reader.onload = () => {
                const base64Audio = reader.result.split(',')[1];
                
                // Send F5-TTS request with reference audio
                if (this.brainChat && this.brainChat.websocket) {
                    const message = {
                        type: 'tts_test',
                        model: 'f5-tts',
                        text: text,
                        ref_audio: base64Audio,
                        ref_text: this.refText?.value || ""
                    };
                    console.log('Sending F5-TTS message:', { ...message, ref_audio: 'base64...' });
                    this.brainChat.websocket.send(JSON.stringify(message));
                    console.log('F5-TTS test request sent with reference audio');
                }
            };
            reader.readAsDataURL(this.refAudioBlob);
        } else {
            console.log('Using standard TTS for model:', this.currentModel);
            // Standard TTS test for other models
            if (this.brainChat && this.brainChat.testTTS) {
                this.brainChat.currentVoice = this.voiceModelSelect?.value || 'af_aoede';
                await this.brainChat.testTTS(text);
            }
        }
    }
    
    // F5-TTS Methods
    async startRecordingRef() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.refMediaRecorder = new MediaRecorder(stream);
            this.refAudioChunks = [];
            
            this.refMediaRecorder.ondataavailable = (event) => {
                this.refAudioChunks.push(event.data);
            };
            
            this.refMediaRecorder.onstop = () => {
                this.refAudioBlob = new Blob(this.refAudioChunks, { type: 'audio/wav' });
                if (this.audioDropZone) {
                    this.audioDropZone.textContent = '✅ Reference audio recorded';
                }
                stream.getTracks().forEach(track => track.stop());
            };            
            this.refMediaRecorder.start();
            this.isRecordingRef = true;
            
            if (this.recordRefBtn) this.recordRefBtn.style.display = 'none';
            if (this.stopRefBtn) this.stopRefBtn.style.display = 'inline-block';
        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    }
    
    stopRecordingRef() {
        if (this.refMediaRecorder && this.isRecordingRef) {
            this.refMediaRecorder.stop();
            this.isRecordingRef = false;
            
            if (this.stopRefBtn) this.stopRefBtn.style.display = 'none';
            if (this.recordRefBtn) this.recordRefBtn.style.display = 'inline-block';
            if (this.playRefBtn) this.playRefBtn.style.display = 'inline-block';
            
            // Send reference audio to backend if F5-TTS is selected
            // Note: The blob is set in the ondataavailable handler, 
            // so we might need a small delay
            setTimeout(() => {
                if (this.currentModel === 'f5-tts' && this.refAudioBlob) {
                    this.sendF5ReferenceToBackend();
                }
            }, 100);
        }
    }
    
    playRefAudio() {
        if (this.refAudioBlob) {
            const audio = new Audio(URL.createObjectURL(this.refAudioBlob));
            audio.play();
        }
    }
    
    handleRefAudioFile(file) {
        if (file.type.startsWith('audio/')) {
            this.refAudioBlob = file;
            if (this.audioDropZone) {
                this.audioDropZone.textContent = `✅ ${file.name}`;
            }
            if (this.playRefBtn) this.playRefBtn.style.display = 'inline-block';
            
            // Send reference audio to backend if F5-TTS is selected
            if (this.currentModel === 'f5-tts') {
                this.sendF5ReferenceToBackend();
            }
        }
    }
    
    saveSettings() {
        const settings = {
            primaryModel: this.primaryModel,
            currentModel: this.currentModel
        };
        localStorage.setItem('voiceSettings', JSON.stringify(settings));
    }
}

// Export for use in main app
window.VoiceSettings = VoiceSettings;