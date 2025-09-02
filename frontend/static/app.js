// Brain - Universal Voice Recording with MediaRecorder API

class BrainChat {
    constructor() {
        console.log('BrainChat constructor starting...');
        this.websocket = null;
        this.audioQueue = [];
        this.isAudioEnabled = true;
        this.currentModel = 'captaineris-nebula:latest';
        this.currentVoice = 'af_aoede';
        
        // MediaRecorder for universal browser support
        this.mediaRecorder = null;
        this.mediaStream = null;
        this.audioChunks = [];
        this.isRecording = false;
        
        // Voice Activity Detection settings - FIXED VALUES
        this.vadEnabled = true;
        this.silenceThreshold = -30; // Fixed from -45 to -30 (less sensitive, prevents false triggers)
        this.hangoverTime = 300; // Prevents cutting off words (ms)
        this.minRecordingTime = 800; // Minimum recording duration (ms) - prevents rapid cycling
        this.restartDelay = 500; // Delay before restarting (ms) - debounce protection
        this.lastSpeechTime = null; // Track last speech detection
        this.recordingStartTime = null; // Track recording start
        this.cooldownActive = false; // Prevent rapid cycling
        this.vadSilenceTimer = null; // Timer for hangover period
        this.ttsPlaying = false; // Track TTS playback state
        this.ttsResumeTimer = null; // Timer for resuming VAD after TTS
        this.isFirstInteraction = true; // Track if this is the first chat interaction
        this.waitingForFirstResponse = false; // Prevent VAD during first response
        this.audioContext = null;
        this.analyser = null;
        this.isDetectingVoice = false;
        
        this.currentMessage = null;
        this.isFirstMessage = true;
        
        this.initializeElements();
        console.log('Elements initialized, sendBtn:', this.sendBtn);
        this.setupMediaRecorder();
        this.setupEventListeners();
        this.connectWebSocket();
        this.setupSuggestionCards();
        
        // Initialize voice settings after DOM is ready
        setTimeout(() => {
            if (window.VoiceSettings) {
                this.voiceSettings = new VoiceSettings(this);
                console.log('Voice settings initialized');
            }
        }, 100);
    }
    
    initializeElements() {
        // Main interface elements
        this.welcomeScreen = document.getElementById('welcome-screen');
        this.messagesContainer = document.getElementById('messages-container');
        this.voiceViz = document.getElementById('voice-viz');
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.voiceBtn = document.getElementById('voice-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.audioToggle = document.getElementById('audio-toggle');
        this.modelSelect = document.getElementById('model-select');
        this.voiceSelect = document.getElementById('voice-select');
        this.connectionStatus = document.getElementById('connection-status');
        this.audioPlayer = document.getElementById('audio-player');
        this.listeningIndicator = document.getElementById('listening-indicator');
        this.stopListeningBtn = document.getElementById('stop-listening');
        
        // Voice visualization elements
        this.userCircle = document.getElementById('user-circle');
        this.assistantCircles = document.getElementById('assistant-circles');
        this.userLiveText = document.getElementById('user-live-text');
        this.assistantLiveText = document.getElementById('assistant-live-text');
        
        // Model name display
        this.modelName = document.getElementById('model-name');
        
        // Voice Mode elements
        this.voiceModeBtn = document.getElementById('voice-mode-btn');
        this.voicePanel = document.getElementById('voice-panel');
        this.closeVoicePanel = document.getElementById('close-voice-panel');
        this.stopVoiceMode = document.getElementById('stop-voice-mode');
        this.voiceChatMessages = document.getElementById('voice-chat-messages');
        this.voiceStatusText = document.getElementById('voice-status-text');
        this.voiceTranscript = document.getElementById('voice-transcript');
        
        // VAD Control elements
        this.vadEnabled = document.getElementById('vad-enabled');
        this.currentAudioLevel = document.getElementById('current-audio-level');
        this.audioStatusIcon = document.getElementById('audio-status-icon');
        
        // Voice mode state
        this.voiceModeActive = false;
        this.voiceModeRecording = false;
        this.audioContext = null;
        this.analyser = null;
        this.audioLevelMonitor = null; // For real-time level display
    }
    
    async setupMediaRecorder() {
        // Check if MediaRecorder API is available (works in all modern browsers)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('Media devices not supported');
            this.voiceBtn.disabled = true;
            this.voiceBtn.title = 'Audio recording not supported in this browser';
            this.voiceBtn.style.opacity = '0.5';
            return;
        }
        
        // Check MediaRecorder support
        if (typeof MediaRecorder === 'undefined') {
            console.warn('MediaRecorder API not supported');
            this.voiceBtn.disabled = true;
            this.voiceBtn.title = 'MediaRecorder not supported in this browser';
            return;
        }
        
        // Test MIME type support
        const mimeTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            'audio/mp4',
            'audio/mpeg',
            'audio/wav'
        ];
        
        this.supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
        
        if (!this.supportedMimeType) {
            console.warn('No supported audio MIME types found');
            this.supportedMimeType = ''; // Use browser default
        } else {
            console.log('Using MIME type:', this.supportedMimeType);
        }
    }
    
    setupEventListeners() {
        console.log('Setting up event listeners...');
        console.log('sendBtn element:', this.sendBtn);
        console.log('messageInput element:', this.messageInput);
        
        // Text input
        this.sendBtn.addEventListener('click', () => {
            console.log('Send button clicked!');
            this.sendMessage();
        });        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        });
        
        // Voice input with MediaRecorder
        this.voiceBtn.addEventListener('click', () => this.toggleVoiceRecording());
        this.stopListeningBtn.addEventListener('click', () => this.stopVoiceRecording());
        
        // Voice Mode handlers
        if (this.voiceModeBtn) {
            this.voiceModeBtn.addEventListener('click', () => this.toggleVoiceMode());
        }
        if (this.closeVoicePanel) {
            this.closeVoicePanel.addEventListener('click', () => this.exitVoiceMode());
        }
        if (this.stopVoiceMode) {
            this.stopVoiceMode.addEventListener('click', () => this.exitVoiceMode());
        }
        
        // Voice Settings
        const sensitivitySlider = document.getElementById('sensitivity-slider');
        const sensitivityValue = document.getElementById('sensitivity-value');
        const vadEnabled = document.getElementById('vad-enabled');
        
        if (sensitivitySlider) {
            sensitivitySlider.addEventListener('input', (e) => {
                this.silenceThreshold = parseInt(e.target.value);
                sensitivityValue.textContent = e.target.value + ' dB';
                console.log('Sensitivity updated to:', this.silenceThreshold, 'dB');
            });
        }
        
        if (vadEnabled) {
            vadEnabled.addEventListener('change', (e) => {
                console.log('VAD toggled:', e.target.checked);
                if (this.voiceModeActive) {
                    if (e.target.checked) {
                        this.addVoiceMessage('system', '🔊 Auto-detection enabled - speak anytime');
                        // Start recording if not already
                        if (!this.voiceModeRecording) {
                            this.startVoiceModeRecording();
                        }
                    } else {
                        this.addVoiceMessage('system', '🎤 Manual mode - click mic to record');
                        // Stop current recording
                        if (this.voiceModeRecording) {
                            this.stopVoiceModeRecording();
                        }
                    }
                }
            });
        }
        
        // Settings
        this.modelSelect.addEventListener('change', (e) => {
            this.currentModel = e.target.value;
            this.modelName.textContent = e.target.value;
        });
        
        this.voiceSelect.addEventListener('change', (e) => {
            this.currentVoice = e.target.value;
        });
        
        this.audioToggle.addEventListener('click', () => this.toggleAudio());
        this.clearBtn.addEventListener('click', () => this.clearChat());
        
        // Navigation menu items
        this.setupNavigation();
        
        // Audio player with TTS state tracking
        this.audioPlayer.addEventListener('ended', () => {
            this.onTTSEnded();
            this.playNextAudio();
        });
        this.audioPlayer.addEventListener('error', () => {
            this.onTTSEnded(); 
            this.playNextAudio();
        });
        
        // Monitor TTS playback state changes
        this.audioPlayer.addEventListener('play', () => this.onTTSStarted());
        this.audioPlayer.addEventListener('pause', () => this.onTTSEnded());
    }
    
    setupNavigation() {
        // Handle navigation menu items
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const text = item.querySelector('.menu-text')?.textContent;
                this.handleNavigation(text, item);
            });
        });
    }
    
    handleNavigation(itemText, menuItem) {
        // Remove active class from all menu items
        document.querySelectorAll('.menu-item').forEach(item => 
            item.classList.remove('active')
        );
        
        // Add active class to clicked item
        menuItem.classList.add('active');
        
        // Handle different navigation options
        switch(itemText) {
            case 'New Chat':
                this.showMainChat();
                break;
            case 'Voice':
                // Voice settings will be handled by VoiceSettings class
                if (this.voiceSettings) {
                    this.voiceSettings.showVoiceSettings();
                }
                break;
            case 'Search':
                // TODO: Implement search functionality
                console.log('Search clicked - not yet implemented');
                this.showMainChat(); // For now, show main chat
                break;
            case 'Workspace':
                // TODO: Implement workspace functionality  
                console.log('Workspace clicked - not yet implemented');
                this.showMainChat(); // For now, show main chat
                break;
            default:
                this.showMainChat();
        }
    }
    
    showMainChat() {
        // Hide voice settings page
        const voiceSettingsPage = document.getElementById('voice-settings-page');
        if (voiceSettingsPage) {
            voiceSettingsPage.style.display = 'none';
        }
        
        // Show appropriate main content
        if (this.isFirstMessage) {
            this.welcomeScreen.style.display = 'block';
            this.messagesContainer.style.display = 'none';
            this.voiceViz.style.display = 'none';
        } else {
            this.welcomeScreen.style.display = 'none';
            this.messagesContainer.style.display = 'block';
            this.voiceViz.style.display = 'none';
        }
    }
    
    async toggleVoiceRecording() {
        if (this.isRecording) {
            this.stopVoiceRecording();
        } else {
            await this.startVoiceRecording();
        }
    }
    
    async startVoiceRecording() {
        try {
            // Request microphone permission (audio only for better compatibility)
            console.log('Requesting microphone access...');
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000 // Optimal for speech
                }
            });
            
            console.log('Microphone access granted');
            
            // Create MediaRecorder instance
            const options = this.supportedMimeType ? { mimeType: this.supportedMimeType } : {};
            this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
            
            // Clear previous chunks
            this.audioChunks = [];
            
            // Handle data available
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            // Handle recording stop
            this.mediaRecorder.onstop = () => {
                // Create blob from chunks
                const audioBlob = new Blob(this.audioChunks, { 
                    type: this.supportedMimeType || 'audio/webm' 
                });
                
                // Process the recorded audio
                this.processRecordedAudio(audioBlob);
                
                // Clean up
                this.cleanupRecording();
            };
            
            // Handle errors
            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event);
                this.showMessage('system', `Recording error: ${event.error}`);
                this.cleanupRecording();
            };
            
            // Start recording
            this.mediaRecorder.start(100); // Capture in 100ms chunks
            this.isRecording = true;
            
            console.log('Recording started - click voice button again to stop');
            
            // Update UI
            this.voiceBtn.classList.add('listening');
            this.listeningIndicator.style.display = 'flex';
            
            // Show voice interface if first message
            if (this.isFirstMessage) {
                this.showVoiceInterface();
            }
            
            // Start visual feedback
            this.userCircle.classList.add('speaking');
            this.userLiveText.textContent = 'Recording... Click 🎤 or ✕ to stop';
            document.querySelector('.user-bubble').classList.add('active');
            
            // Update UI
            this.voiceBtn.classList.add('listening');
            this.listeningIndicator.style.display = 'flex';
            
            // Show voice interface if first message
            if (this.isFirstMessage) {
                this.showVoiceInterface();
            }
            
            // Start visual feedback
            this.userCircle.classList.add('speaking');
            this.userLiveText.textContent = 'Recording... Click stop when done';
            document.querySelector('.user-bubble').classList.add('active');
            
        } catch (error) {
            console.error('Failed to start recording:', error);
            
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                this.showMessage('system', '🎤 Microphone access denied. Please allow microphone access when prompted.');
                
                // Show helpful notification
                const notification = document.createElement('div');
                notification.className = 'permission-notification';
                notification.innerHTML = `
                    <div style="background: #ff6b6b; color: white; padding: 15px; border-radius: 8px; 
                             position: fixed; top: 20px; right: 20px; z-index: 10000; max-width: 400px; 
                             box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                        <strong>🎤 Microphone Permission Required</strong><br>
                        <small>1. Click "Allow" when browser asks for permission<br>
                        2. Or click the lock icon in address bar<br>
                        3. Set Microphone to "Allow"<br>
                        4. Try again</small>
                    </div>
                `;
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 10000);
                
            } else if (error.name === 'NotFoundError') {
                this.showMessage('system', '🎤 No microphone found. Please connect a microphone.');
            } else if (error.name === 'NotReadableError') {
                this.showMessage('system', '🎤 Microphone is being used by another application.');
            } else {
                this.showMessage('system', `🎤 Error: ${error.message}`);
            }
        }
    }
    
    stopVoiceRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        // Update UI immediately
        this.isRecording = false;
        this.voiceBtn.classList.remove('listening');
        this.listeningIndicator.style.display = 'none';
        
        if (this.userCircle) {            this.userCircle.classList.remove('speaking');
        }
        
        if (this.userLiveText) {
            this.userLiveText.textContent = 'Processing...';
        }
        
        const userBubble = document.querySelector('.user-bubble');
        if (userBubble) {
            userBubble.classList.remove('active');
        }
    }
    
    cleanupRecording() {
        // Stop all tracks to release microphone
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => {
                track.stop();
            });
            this.mediaStream = null;
        }
        
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
    }
    
    async processRecordedAudio(audioBlob) {
        console.log('Processing audio blob:', audioBlob.size, 'bytes', audioBlob.type);
        
        // Always use server-side transcription for recorded audio
        // Web Speech API doesn't work with pre-recorded blobs
        await this.sendAudioToServer(audioBlob);
    }
    
    tryWebSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Transcribed:', transcript);
            this.messageInput.value = transcript;
            this.sendMessage();
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            // Fall back to sending audio to server
            if (this.audioChunks.length > 0) {
                const audioBlob = new Blob(this.audioChunks, { 
                    type: this.supportedMimeType || 'audio/webm' 
                });
                this.sendAudioToServer(audioBlob);            }
        };
        
        try {
            recognition.start();
        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            // Fall back to server transcription
            if (this.audioChunks.length > 0) {
                const audioBlob = new Blob(this.audioChunks, { 
                    type: this.supportedMimeType || 'audio/webm' 
                });
                this.sendAudioToServer(audioBlob);
            }
        }
    }
    
    async sendAudioToServer(audioBlob) {
        try {
            // Convert blob to FormData with correct field name
            const formData = new FormData();
            formData.append('file', audioBlob, 'recording.webm');
            
            // Send to your transcription endpoint
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('STT Response:', data);
                if (data.text) {
                    console.log('Setting transcribed text:', data.text);
                    
                    // Clear the processing message
                    if (this.userLiveText) {
                        this.userLiveText.textContent = `Transcribed: "${data.text}"`;
                    }
                    
                    this.messageInput.value = data.text;
                    this.sendMessage();
                } else {
                    console.log('No text in response');
                    if (this.userLiveText) {
                        this.userLiveText.textContent = 'No speech detected';
                    }
                }
            } else {
                // Show transcription error
                const errorData = await response.json().catch(() => ({detail: 'Unknown error'}));
                this.showMessage('system', `Transcription failed: ${errorData.detail || 'Server error'}`);
                
                // Clear processing message
                if (this.userLiveText) {
                    this.userLiveText.textContent = 'Transcription failed';
                }
            }
        } catch (error) {
            console.error('Failed to send audio to server:', error);
            this.showMessage('system', 'Failed to process audio. Please try again.');
            
            // Clear processing message
            if (this.userLiveText) {
                this.userLiveText.textContent = 'Audio processing failed';
            }
        }
    }
    
    setupSuggestionCards() {
        const suggestionCards = document.querySelectorAll('.suggestion-card');
        suggestionCards.forEach((card, index) => {
            card.addEventListener('click', () => {
                let message = '';
                switch(index) {
                    case 0:
                        this.toggleVoiceRecording();
                        return;
                    case 1:                        message = 'Hello! Let\'s start a text conversation.';
                        break;
                    case 2:
                        message = 'I\'d like to try both voice and text chat.';
                        break;
                }
                if (message) {
                    this.messageInput.value = message;
                    this.sendMessage();
                }
            });
        });
    }
    
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        this.updateConnectionStatus('connecting');
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
            console.log('Connected to Brain');
            this.updateConnectionStatus('connected');
        };
        
        this.websocket.onclose = () => {
            console.log('Disconnected from Brain');
            this.updateConnectionStatus('disconnected');
            setTimeout(() => this.connectWebSocket(), 3000);
        };        
        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateConnectionStatus('disconnected');
        };
        
        this.websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleResponse(data);
        };
    }
    
    updateConnectionStatus(status) {
        this.connectionStatus.className = `connection-status ${status}`;
        this.connectionStatus.textContent = status === 'connected' ? '● Connected' : 
                                          status === 'connecting' ? '● Connecting...' : 
                                          '● Disconnected';
        
        if (status === 'connected') {
            this.sendBtn.disabled = false;
            this.voiceBtn.disabled = false;
        } else {
            this.sendBtn.disabled = true;
            this.voiceBtn.disabled = true;
        }
    }
    
    showVoiceInterface() {
        this.welcomeScreen.style.display = 'none';
        this.messagesContainer.style.display = 'block';
        this.voiceViz.style.display = 'flex';        this.isFirstMessage = false;
    }
    
    showTextInterface() {
        this.welcomeScreen.style.display = 'none';
        this.messagesContainer.style.display = 'block';
        this.voiceViz.style.display = 'none';
        this.isFirstMessage = false;
    }
    
    sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            return;
        }
        
        // Show appropriate interface
        if (this.isFirstMessage) {
            if (this.isRecording) {
                this.showVoiceInterface();
            } else {
                this.showTextInterface();
            }
        }
        
        // Add user message
        this.addMessage('user', message);
        
        // Clear input
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
                // Prepare for response
        this.currentMessage = this.addMessage('assistant', '', true);
        
        // Send to backend
        this.websocket.send(JSON.stringify({
            type: 'chat',
            message: message,
            model: this.currentModel,
            voice: this.currentVoice,
            primary_model: this.voiceSettings?.primaryModel || this.voiceSettings?.currentModel || 'kokoro'
        }));
        
        this.sendBtn.disabled = true;
        this.sendBtn.textContent = '↻';
    }
    
    addMessage(role, content, streaming = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(contentDiv);
        this.messagesContainer.appendChild(messageDiv);
        
        this.scrollToBottom();
        
        return streaming ? contentDiv : messageDiv;
    }
    
    handleResponse(data) {
        // Always use regular chat mode handling - no separate voice mode logic
        this.handleRegularResponse(data);
        
        // If in voice mode and response is complete, get ready for next voice input
        if (this.voiceModeActive && data.type === 'complete') {
            this.voiceStatusText.textContent = 'Ready';
            this.voiceTranscript.textContent = '';
            
            // Auto-restart listening if VAD is enabled
            if (this.vadEnabled && this.vadEnabled.checked) {
                setTimeout(() => this.startVoiceModeRecording(), 1000);
            }
        }
    }
    
    handleRegularResponse(data) {
        switch (data.type) {
            case 'token':
                if (this.currentMessage) {
                    this.currentMessage.textContent += data.content;
                    this.scrollToBottom();
                    
                    // Update live text if in voice mode
                    if (this.voiceViz.style.display === 'flex') {
                        this.assistantLiveText.textContent = this.currentMessage.textContent;
                    }
                }
                break;
                
            case 'audio':
                if (this.isAudioEnabled && data.data) {
                    console.log('Queueing audio chunk');
                    this.audioQueue.push(data.data);
                    // Only start playing if audio player is paused and this is the first chunk
                    if (this.audioPlayer.paused && this.audioQueue.length === 1) {
                        this.playNextAudio();
                    }
                }
                break;
                
            case 'complete':
                this.currentMessage = null;
                this.sendBtn.disabled = false;
                this.sendBtn.textContent = '➤';
                
                // Reset voice interface
                if (this.voiceViz.style.display === 'flex') {
                    this.assistantCircles.classList.remove('active');                    document.querySelector('.assistant-bubble').classList.remove('active');
                }
                break;
                
            case 'error':
                this.showMessage('system', `Error: ${data.message || data.error || 'Unknown error'}`);
                this.sendBtn.disabled = false;
                this.sendBtn.textContent = '➤';
                break;
        }
    }
    
    playNextAudio() {
        if (this.audioQueue.length === 0) {
            return;
        }
        
        const audioData = this.audioQueue.shift();
        
        try {
            // Convert base64 to blob (like the original)
            const byteCharacters = atob(audioData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'audio/mpeg' });
            
            // Create object URL and play
            const audioUrl = URL.createObjectURL(blob);
            this.audioPlayer.src = audioUrl;
            
            // TTS state will be automatically tracked by 'play' event listener
            this.audioPlayer.play().catch(error => {
                console.error('Audio playback error:', error);
                this.playNextAudio();
            });
            
            // Cleanup URL after 10 seconds
            setTimeout(() => URL.revokeObjectURL(audioUrl), 10000);
        } catch (error) {
            console.error('Audio processing error:', error);
            this.playNextAudio();
        }
    }
    
    // Method for testing TTS from voice settings
    async testTTS(text) {
        try {
            console.log('Testing TTS with text:', text);
            
            // Use the existing WebSocket to request TTS
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                const message = {
                    type: 'tts_test',
                    text: text,
                    voice: this.currentVoice || 'af_aoede'
                };
                
                this.websocket.send(JSON.stringify(message));
                console.log('TTS test request sent');
                return true;
            } else {
                console.warn('WebSocket not available for TTS test');
                return false;
            }
        } catch (error) {
            console.error('TTS test failed:', error);
            return false;
        }
    }
    
    showMessage(type, content) {
        this.addMessage(type, content);
    }
    
    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;    }
    
    toggleAudio() {
        this.isAudioEnabled = !this.isAudioEnabled;
        
        if (this.isAudioEnabled) {
            this.audioToggle.classList.remove('disabled');
            this.audioToggle.classList.add('enabled');
            this.audioToggle.textContent = '🔊';
        } else {
            this.audioToggle.classList.remove('enabled');
            this.audioToggle.classList.add('disabled');
            this.audioToggle.textContent = '🔇';
            
            // Stop current audio
            this.audioPlayer.pause();
            this.audioQueue = [];
        }
    }
    
    // ========== TTS STATE MANAGEMENT ==========
    
    onTTSStarted() {
        console.log('🔊 TTS started - pausing VAD');
        this.ttsPlaying = true;
        
        // Clear any pending TTS resume timer
        if (this.ttsResumeTimer) {
            clearTimeout(this.ttsResumeTimer);
            this.ttsResumeTimer = null;
        }
        
        // If currently recording in voice mode, stop it to prevent TTS interference
        if (this.voiceModeRecording && this.voiceModeActive) {
            console.log('⚠️ Stopping voice recording due to TTS playback');
            this.stopVoiceModeRecording();
        }
    }
    
    onTTSEnded() {
        if (!this.ttsPlaying) return; // Already handled
        
        console.log('🔇 TTS ended - will resume VAD after delay');
        console.log('Audio queue length:', this.audioQueue.length);
        
        // Clear any existing resume timer
        if (this.ttsResumeTimer) {
            clearTimeout(this.ttsResumeTimer);
        }
        
        // Check if more audio is queued OR if we're still expecting more chunks
        if (this.audioQueue.length > 0) {
            console.log('📢 More TTS audio queued - keeping VAD paused');
            return; // Don't resume yet, more TTS coming
        }
        
        // Additional check: Make sure we're not in the middle of receiving a streaming response
        if (this.currentMessage !== null) {
            console.log('📝 LLM still generating response - keeping VAD paused');
            return; // Don't resume yet, response still coming
        }
        
        console.log('🕒 Starting 600ms delay before VAD resume...');
        
        // Resume VAD after delay (allows TTS echo to settle)
        this.ttsResumeTimer = setTimeout(() => {
            // Double-check again before resuming - sometimes audio arrives late
            if (this.audioQueue.length > 0) {
                console.log('🔄 Late audio detected - canceling VAD resume');
                return;
            }
            
            this.ttsPlaying = false;
            
            // Release first response hold if applicable
            if (this.waitingForFirstResponse) {
                this.waitingForFirstResponse = false;
                this.isFirstInteraction = false;
                console.log('🔓 First response complete - VAD now fully active');
            }
            
            console.log('✅ VAD resumed after TTS completion');
            
            // Auto-restart voice mode recording if conditions are met
            console.log('🔍 Checking auto-restart conditions...');
            console.log('  voiceModeActive:', this.voiceModeActive);
            console.log('  vadEnabled exists:', !!this.vadEnabled);
            console.log('  vadEnabled.checked:', this.vadEnabled ? this.vadEnabled.checked : 'N/A');
            console.log('  voiceModeRecording:', this.voiceModeRecording);
            console.log('  cooldownActive:', this.cooldownActive);
            console.log('  waitingForFirstResponse:', this.waitingForFirstResponse);
            
            if (this.voiceModeActive && this.vadEnabled && this.vadEnabled.checked && !this.voiceModeRecording && !this.cooldownActive && !this.waitingForFirstResponse) {
                console.log('🎤 Auto-restarting voice mode recording after TTS');
                
                // Use a slightly longer delay to ensure everything is settled
                setTimeout(() => {
                    if (this.voiceModeActive) { // Double-check we're still in voice mode
                        this.startVoiceModeRecording();
                    }
                }, 500);
            } else {
                console.log('❌ Not auto-restarting - conditions not met');
                if (this.voiceStatusText) {
                    this.voiceStatusText.textContent = 'Ready';
                }
                
                // If we're in voice mode with VAD enabled but something else is wrong, force a restart
                if (this.voiceModeActive && this.vadEnabled && this.vadEnabled.checked && !this.voiceModeRecording && !this.waitingForFirstResponse) {
                    console.log('🔧 Force restarting in voice mode...');
                    this.cooldownActive = false; // Clear any cooldown
                    setTimeout(() => this.startVoiceModeRecording(), 1000);
                }
            }
        }, 600); // Optimized delay - prevents acoustic feedback while maintaining conversational flow
    }
    
    clearChat() {
        this.messagesContainer.innerHTML = '';
        this.welcomeScreen.style.display = 'flex';
        this.voiceViz.style.display = 'none';
        this.isFirstMessage = true;
        this.currentMessage = null;
        this.audioQueue = [];
    }
    
    setupVoiceActivityDetection() {
        try {
            // Create audio context for voice detection
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            
            // Connect media stream to analyser
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            source.connect(this.analyser);
            
            // Start monitoring audio levels
            this.monitorVoiceActivity();
            
        } catch (error) {
            console.error('Failed to setup voice activity detection:', error);
            // Continue without VAD
        }
    }
    
    monitorVoiceActivity() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const detectVoice = () => {
            if (!this.isRecording) return;
            
            this.analyser.getByteFrequencyData(dataArray);
            
            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;
            
            // Convert to decibels (approximation)
            const decibels = 20 * Math.log10(average / 255);
            
            const hasVoice = decibels > this.silenceThreshold;
            const now = Date.now();
            
            if (hasVoice) {
                this.lastSpeechTime = now;
                
                // Voice detected - cancel any pending stop
                if (this.silenceTimer) {
                    clearTimeout(this.silenceTimer);
                    this.silenceTimer = null;
                }
                
                if (!this.isDetectingVoice && !this.cooldownActive) {
                    this.isDetectingVoice = true;
                    this.recordingStartTime = now;
                    console.log('Voice activity detected');
                    // Update UI to show voice detected
                    if (this.userLiveText) {
                        this.userLiveText.textContent = 'Listening... (speaking detected)';
                    }
                }
            } else {
                // Silence detected - check timing constraints
                if (this.isDetectingVoice && !this.silenceTimer) {
                    const recordingDuration = now - this.recordingStartTime;
                    const silenceDuration = now - this.lastSpeechTime;
                    
                    // Only start stop timer if minimum recording time is met
                    if (recordingDuration > this.minRecordingTime) {
                        console.log('Silence detected, starting timer');
                        if (this.userLiveText) {
                            this.userLiveText.textContent = 'Listening... (will auto-stop soon)';
                        }
                        
                        // Use hangoverTime instead of fixed silenceTimeout
                        this.silenceTimer = setTimeout(() => {
                            console.log('Auto-stopping after hangover period');
                            this.stopVoiceRecording();
                            
                            // Apply cooldown to prevent immediate restart
                            this.cooldownActive = true;
                            setTimeout(() => {
                                this.cooldownActive = false;
                                console.log('Cooldown period ended');
                            }, this.restartDelay);
                        }, this.hangoverTime);
                    }
                }
            }
            
            // Continue monitoring
            requestAnimationFrame(detectVoice);
        };
        
        detectVoice();
    }
    
    updateSilenceThreshold(value) {
        this.silenceThreshold = value;
        console.log('Silence threshold updated to:', value, 'dB');
    }
    
    // ========== VOICE MODE METHODS ==========
    
    toggleVoiceMode() {
        if (this.voiceModeActive) {
            this.exitVoiceMode();
        } else {
            this.enterVoiceMode();
        }
    }
    
    async enterVoiceMode() {
        console.log('Entering voice mode...');
        this.voiceModeActive = true;
        
        // Show voice panel - uses flexbox now instead of sliding
        this.voicePanel.style.display = 'flex';
        this.voiceModeBtn.classList.add('active');
        
        // Initialize audio context for voice activity detection
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Clear voice panel messages
        this.voiceChatMessages.innerHTML = '';
        this.addVoiceMessage('system', 'Voice mode activated!');
        
        // Show mode instructions based on VAD setting
        if (this.vadEnabled.checked) {
            this.addVoiceMessage('system', '🔊 Auto-detection ON - Just start speaking anytime');
        } else {
            this.addVoiceMessage('system', '🎤 Manual mode - Click mic button to record');
        }
        
        // Start the voice loop
        await this.startVoiceLoop();
    }
    
    exitVoiceMode() {
        console.log('🚪 EXITING VOICE MODE - voiceModeActive will be set to false');
        console.trace('Exit voice mode called from:'); // This will show the call stack
        this.voiceModeActive = false;
        
        // Stop any ongoing recording
        if (this.voiceModeRecording) {
            this.stopVoiceModeRecording();
        }
        
        // Clear any pending VAD timers
        if (this.vadSilenceTimer) {
            clearTimeout(this.vadSilenceTimer);
            this.vadSilenceTimer = null;
        }
        
        // Clear any pending TTS resume timers
        if (this.ttsResumeTimer) {
            clearTimeout(this.ttsResumeTimer);
            this.ttsResumeTimer = null;
        }
        
        // Reset TTS and cooldown state
        this.ttsPlaying = false;
        this.cooldownActive = false;
        
        // Stop audio level monitoring
        if (this.audioLevelMonitor) {
            cancelAnimationFrame(this.audioLevelMonitor);
            this.audioLevelMonitor = null;
        }
        
        // Clean up media stream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        // Hide voice panel - uses flexbox now
        this.voicePanel.style.display = 'none';
        this.voiceModeBtn.classList.remove('active');
        
        // Clean up audio context
        if (this.audioContext && this.audioContext.state === 'running') {
            this.audioContext.suspend();
        }
        
        // Reset audio level display
        if (this.currentAudioLevel) {
            this.currentAudioLevel.textContent = '-- dB';
        }
        if (this.audioStatusIcon) {
            this.audioStatusIcon.textContent = '🔇';
            this.audioStatusIcon.style.color = '#6b7280';
        }
        
        this.addVoiceMessage('system', 'Voice mode deactivated.');
    }
    
    async startVoiceLoop() {
        if (!this.voiceModeActive) return;
        
        try {
            // Request microphone permission if not already granted
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000
                }
            });
            this.mediaStream = stream;
            
            // Set up voice activity detection for real-time monitoring
            this.setupVoiceActivityDetection(stream);
            
            // Update status
            this.voiceStatusText.textContent = 'Ready';
            
            // If VAD is disabled, wait for manual mic button click
            if (!this.vadEnabled.checked) {
                this.addVoiceMessage('system', 'Click the microphone button to start recording');
                return;
            }
            
            // If VAD is enabled, start automatic recording
            await this.startVoiceModeRecording();
            
        } catch (error) {
            console.error('Failed to start voice loop:', error);
            this.addVoiceMessage('system', `Error: ${error.message}`);
            this.exitVoiceMode();
        }
    }
    
    setupVoiceActivityDetection(stream) {
        const source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.3;
        source.connect(this.analyser);
        
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        
        // Start real-time audio level monitoring (always runs for visual feedback)
        this.startAudioLevelMonitoring(dataArray);
        
        // VAD logic with TTS interference protection + first response hold - FIXED
        const checkVoiceActivity = () => {
            if (!this.voiceModeActive) return;
            
            // SKIP VAD processing if TTS is playing OR waiting for first response
            if (this.ttsPlaying || this.waitingForFirstResponse) {
                // Continue checking but don't process voice activity
                requestAnimationFrame(checkVoiceActivity);
                return;
            }
            
            this.analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            
            // Convert to dB (more accurate calculation)
            const level = average > 0 ? 20 * Math.log10(average / 255) : -100;
            
            const hasVoice = level > this.silenceThreshold;
            const now = Date.now();
            
            // Only do auto VAD if enabled AND TTS is not playing
            if (this.vadEnabled.checked) {
                if (hasVoice) {
                    this.lastSpeechTime = now;
                    
                    // Clear any pending stop timer
                    if (this.vadSilenceTimer) {
                        clearTimeout(this.vadSilenceTimer);
                        this.vadSilenceTimer = null;
                    }
                    
                    // Start recording if not already recording and not in cooldown
                    if (!this.voiceModeRecording && !this.cooldownActive) {
                        console.log('🔊 Voice detected - starting recording');
                        this.startVoiceModeRecording();
                    }
                } else if (this.voiceModeRecording) {
                    // Silence detected during recording - apply timing protections
                    const recordingDuration = now - this.recordingStartTime;
                    const silenceDuration = now - (this.lastSpeechTime || now);
                    
                    // Only start stop timer if minimum recording time is met
                    if (recordingDuration > this.minRecordingTime && !this.vadSilenceTimer) {
                        console.log('🔇 Silence detected - starting hangover timer');
                        
                        // Use hangover time before stopping
                        this.vadSilenceTimer = setTimeout(() => {
                            console.log('⏰ Hangover period ended - stopping recording');
                            this.stopVoiceModeRecording();
                            
                            // Apply cooldown to prevent immediate restart
                            this.cooldownActive = true;
                            setTimeout(() => {
                                this.cooldownActive = false;
                                console.log('✅ Cooldown period ended - ready for next recording');
                            }, this.restartDelay);
                        }, this.hangoverTime);
                    }
                }
            }
            
            // Continue checking
            if (this.voiceModeActive) {
                requestAnimationFrame(checkVoiceActivity);
            }
        };
        
        checkVoiceActivity();
    }
    
    startAudioLevelMonitoring(dataArray) {
        // Real-time audio level display (OpenWebUI style)
        const updateAudioLevel = () => {
            if (!this.voiceModeActive || !this.analyser) return;
            
            this.analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            const level = average > 0 ? 20 * Math.log10(average / 255) : -100;
            
            // Update real-time display
            if (this.currentAudioLevel) {
                this.currentAudioLevel.textContent = Math.round(level) + ' dB';
            }
            
            // Update status icon like OpenWebUI
            if (this.audioStatusIcon) {
                if (level > this.silenceThreshold) {
                    this.audioStatusIcon.textContent = '🔊'; // Sound detected
                    this.audioStatusIcon.style.color = '#10b981'; // Green
                } else {
                    this.audioStatusIcon.textContent = '🔇'; // Silence
                    this.audioStatusIcon.style.color = '#6b7280'; // Gray
                }
            }
            
            // Continue monitoring
            if (this.voiceModeActive) {
                this.audioLevelMonitor = requestAnimationFrame(updateAudioLevel);
            }
        };
        
        updateAudioLevel();
    }
    
    async startVoiceModeRecording() {
        console.log('🎬 startVoiceModeRecording() called');
        console.log('  voiceModeRecording:', this.voiceModeRecording);
        console.log('  mediaStream exists:', !!this.mediaStream);
        console.log('  voiceModeActive:', this.voiceModeActive);
        
        if (this.voiceModeRecording) {
            console.log('❌ Already recording, skipping');
            return;
        }
        
        if (!this.mediaStream) {
            console.log('❌ No media stream, cannot start recording');
            return;
        }
        
        console.log('✅ Starting voice mode recording...');
        this.voiceModeRecording = true;
        this.audioChunks = [];
        
        // Track recording start time for timing protections
        this.recordingStartTime = Date.now();
        
        // Update status
        if (this.voiceStatusText) {
            this.voiceStatusText.textContent = 'Listening...';
        }
        if (this.voiceTranscript) {
            this.voiceTranscript.textContent = '';
        }
        
        try {
            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.mediaStream, {
                mimeType: this.supportedMimeType || 'audio/webm'
            });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, {
                    type: this.supportedMimeType || 'audio/webm'
                });
                
                // Process the audio
                await this.processVoiceModeAudio(audioBlob);
            };
            
            this.mediaRecorder.start(100); // Capture in 100ms chunks
            console.log('🎤 MediaRecorder started successfully');
            
        } catch (error) {
            console.error('❌ Failed to start MediaRecorder:', error);
            this.voiceModeRecording = false;
        }
    }
    
    stopVoiceModeRecording() {
        if (!this.voiceModeRecording || !this.mediaRecorder) return;
        
        console.log('Stopping voice mode recording...');
        this.voiceModeRecording = false;
        
        // Clear any pending silence timer
        if (this.vadSilenceTimer) {
            clearTimeout(this.vadSilenceTimer);
            this.vadSilenceTimer = null;
        }
        
        if (this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        // Update status
        this.voiceStatusText.textContent = 'Processing...';
    }
    
    async processVoiceModeAudio(audioBlob) {
        try {
            // Update status
            this.voiceStatusText.textContent = 'Transcribing...';
            
            // Send to transcription
            const formData = new FormData();
            formData.append('file', audioBlob, 'recording.webm');
            
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.text) {
                    // Show transcription in voice panel
                    this.voiceTranscript.textContent = `You said: "${data.text}"`;
                    this.addVoiceMessage('user', data.text);
                    
                    // If this is the first interaction, set waiting flag
                    if (this.isFirstInteraction) {
                        this.waitingForFirstResponse = true;
                        console.log('🔒 First interaction - holding VAD until response complete');
                    }
                    
                    // Route through the working sendMessage() path
                    this.messageInput.value = data.text;
                    this.sendMessage(); // Use the proven working flow!
                    
                    // Update status
                    this.voiceStatusText.textContent = 'Getting response...';
                } else {
                    // No speech detected, restart listening if VAD enabled
                    this.voiceStatusText.textContent = 'Ready';
                    if (this.vadEnabled.checked && this.voiceModeActive) {
                        setTimeout(() => this.startVoiceModeRecording(), 500);
                    }
                }
            } else {
                throw new Error('Transcription failed');
            }
        } catch (error) {
            console.error('Voice mode audio processing error:', error);
            this.addVoiceMessage('system', 'Error processing audio');
            
            // Restart listening after error
            if (this.vadEnabled.checked && this.voiceModeActive) {
                setTimeout(() => this.startVoiceModeRecording(), 2000);
            }
        }
    }
    
    addVoiceMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `voice-message ${role}`;
        messageDiv.textContent = content;
        this.voiceChatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        this.voiceChatMessages.scrollTop = this.voiceChatMessages.scrollHeight;
        
        return messageDiv;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.brainChat = new BrainChat();
    console.log('Brain Chat initialized with MediaRecorder API');
});