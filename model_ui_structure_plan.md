# Model UI Structure & Implementation Plan

## 🧠 LLM MODEL SELECTION SYSTEM - COMPREHENSIVE PLAN

### Status: **PLANNING PHASE** 📋
Multi-provider LLM model selection system for JBrain application.

**Objective**: Create a unified interface for accessing Ollama, NIM, HuggingFace, and API-based models.

## System Overview

### Current Assets Available:
- **11 Ollama Models**: 76+ GB stored in ~/.ollama/models/ (shared with other apps)
- **Ollama Service**: Running at localhost:11434 (system-wide service)
- **RTX 4060**: Dedicated LLM GPU (separate from RTX 4070 voice GPU)
- **Proven Pattern**: Voice Settings page structure to replicate

### **Architecture Philosophy: API Client Approach**
- **JBrain = Model Consumer** (not storage)
- **Models stay in system locations** (shared with OpenWebUI, other apps)
- **Dynamic discovery** of available models at runtime
- **Clean Git repository** (no 76GB model files committed)

## UI Design & Navigation

### Sidebar Navigation Addition:
```html
<div class="nav-item" data-page="models">
    <span class="nav-icon">🧠</span>
    <span class="nav-text">Models</span>
</div>
```

### Models Page Tab Structure:
```
┌─────────┬─────────┬──────────────┬─────────┐
│ Ollama  │   NIM   │ Hugging Face │  APIs   │
└─────────┴─────────┴──────────────┴─────────┘
```

#### **Tab 1: Ollama** (Immediate Implementation)
```
🎭 CREATIVE MODELS
● captaineris-nebula (7.5GB) [Current - Last Used]
○ captain-eris-violet (7.5GB) 
○ gurubot/pivot-roleplay-v0.2 (6.5GB)
○ jimscard/adult-film-screenwriter-nsfw (4.1GB)

💻 CODING MODELS  
○ MHKetbi/Qwen2.5-Coder-32B-Instruct (65GB)
○ thirdeyeai/DeepSeek-R1-Distill-Qwen-7B-uncensored (15GB)

🧠 RESEARCH MODELS
○ adi0adi/ollama_stheno-8b_v3.1_q6k (6.6GB)
○ deepseek-r1:8b (5.2GB)
○ BhanuPrakashKona/nemesis (5.0GB)
○ llama3.2 (2.0GB)
○ olmo2 (4.5GB)
```

#### **Tab 2: NIM** (Phase 2)
```
🔬 NVIDIA OPTIMIZED MODELS
○ Meta Llama 3 8B (TensorRT optimized)
○ Microsoft Phi-3 (vLLM optimized)  
○ Mistral 7B (Mixed precision)

Status: RTX 4060 ready for NIM deployment
Note: Will switch GPU usage with Ollama models
```

#### **Tab 3: HuggingFace** (Phase 3)
```
🤗 COMMUNITY MODELS
[Search: "mistral, llama, phi..."]

Popular Models:
○ microsoft/DialoGPT-large
○ bigscience/bloom-7b1
○ EleutherAI/gpt-j-6b

⚠️ Note: Will compete with Ollama for GPU resources
```

#### **Tab 4: APIs** (Phase 4)
```
🤖 OPENAI
○ gpt-4o ($15/1M tokens)
○ gpt-4o-mini ($0.15/1M tokens)
○ o1-preview ($15/1M tokens)

🏛️ ANTHROPIC  
○ claude-3.5-sonnet ($3/1M tokens)
○ claude-3-haiku ($0.25/1M tokens)

🔍 GOOGLE
○ gemini-1.5-pro ($7/1M tokens)
○ gemini-flash ($0.075/1M tokens)

API Keys: [Configure] [Test Connection]
```

## Technical Architecture

### **Model Storage Strategy: Point, Don't Store**

#### **Current Model Locations (DO NOT MOVE):**
```
System-wide Ollama Service:
├─ Models stored: ~/.ollama/models/
├─ Service endpoint: http://localhost:11434
├─ Used by: OpenWebUI, JBrain, other apps
└─ Total: 76+ GB (stays in system, not in git)
```

#### **JBrain as API Client:**
```python
# JBrain connects to existing Ollama service
class OllamaClient:
    def __init__(self):
        self.base_url = "http://localhost:11434"  # Point to system service
        
    async def list_models(self):
        # GET /api/tags - discovers available models dynamically
        response = await httpx.get(f"{self.base_url}/api/tags")
        return response.json()['models']  # Your 11 models
        
    async def generate(self, text, model):
        # POST /api/generate - uses model via API
        # Ollama service handles loading/GPU management
```

### Folder Structure (Following Voice System Pattern):

```
/home/jenith/Brain/
├── backend/
│   ├── main.py                     # ✅ Add model routing to existing
│   │
│   ├── models/                     # 🆕 NEW - Model management
│   │   ├── __init__.py
│   │   ├── base_client.py          # Abstract base for all providers
│   │   ├── ollama_client.py        # Ollama API client
│   │   ├── nim_client.py           # NVIDIA NIM client  
│   │   ├── huggingface_client.py   # HuggingFace client
│   │   └── api_clients.py          # OpenAI/Anthropic/Google APIs
│   │
│   ├── config/                     # 🆕 NEW - Configuration (lightweight)
│   │   ├── __init__.py
│   │   ├── model_categories.py    # Model UI categorization (~5KB)
│   │   ├── last_used.json         # User preferences (~1KB)
│   │   └── api_keys.json          # Encrypted API keys (~2KB)
│   │
│   └── utils/                      # 🆕 NEW - Utilities  
│       ├── __init__.py
│       ├── gpu_monitor.py          # RTX 4060 monitoring
│       ├── model_discovery.py     # Runtime model discovery
│       └── container_manager.py    # Docker/NIM container management
│
│   📝 NOTE: NO model files stored in JBrain folder
│           Models remain in ~/.ollama/models/ (shared)
│
├── frontend/
│   ├── index.html                  # ✅ Add Models nav to existing
│   ├── static/
│   │   ├── app.js                  # ✅ Add model routing to existing
│   │   ├── voice-settings.js       # ✅ Keep existing voice system
│   │   ├── model-settings.js       # 🆕 NEW - Model page logic
│   │   └── style.css               # ✅ Add model styles to existing
```

### Core Backend Classes:

#### Base Model Client:
```python
from abc import ABC, abstractmethod

class ModelClient(ABC):
    @abstractmethod
    async def generate(self, text: str, model: str) -> str:
        """Generate response from model"""
        pass
    
    @abstractmethod
    async def list_models(self) -> list:
        """Get available models"""
        pass
    
    @abstractmethod 
    async def get_model_info(self, model: str) -> dict:
        """Get model metadata (size, type, etc.)"""
        pass
```

#### Model Discovery Service:
```python
class ModelDiscoveryService:
    async def get_available_models(self):
        """Runtime discovery of what's actually available right now"""
        available = {}
        
        # Ollama models (dynamic discovery)
        try:
            response = await httpx.get("http://localhost:11434/api/tags")
            ollama_models = response.json()['models']
            available['ollama'] = self.categorize_models(ollama_models)
        except ConnectionError:
            available['ollama'] = []  # Service down
            
        # NIM containers (if running)
        available['nim'] = await self.discover_nim_containers()
        
        # API models (if keys configured)
        available['apis'] = self.get_api_models() if self.has_api_keys() else []
        
        return available
    
    def categorize_models(self, models):
        """Apply UI categories to discovered models"""
        categorized = {'creative': [], 'coding': [], 'research': []}
        for model in models:
            category = self.detect_category(model['name'])
            categorized[category].append(model)
        return categorized
```

### Frontend Architecture:

#### Model Settings Class (Dynamic Discovery):
```javascript
class ModelSettings {
    constructor(brainChat) {
        this.brainChat = brainChat;
        this.currentProvider = 'ollama';
        this.currentModel = this.loadLastUsed();
        this.availableModels = {};  // Populated by API calls
    }
    
    async refreshAvailableModels() {
        """Dynamically discover what models are available right now"""
        const response = await fetch('/api/models/available');
        this.availableModels = await response.json();
        this.updateModelsUI();
    }
    
    loadLastUsed() {
        return localStorage.getItem('lastUsedModel') || 'ollama:captaineris-nebula:latest';
    }
    
    handleModelUnavailable(model) {
        // Graceful handling when model not found
        console.warn(`Model ${model} not available, falling back to default`);
        this.switchToDefaultModel();
    }
}
```

## GPU Resource Management

### Critical GPU Separation:
```
RTX 4070 (GPU 0) → Voice/TTS System (NEVER TOUCH)
RTX 4060 (GPU 1) → LLM Models (Our workspace)
```

### Single GPU Model Switching Strategy:
```python
class RTX4060ModelManager:
    def __init__(self):
        self.gpu_device = 1  # RTX 4060 only
        self.current_provider = None
        
    async def switch_model(self, new_provider, new_model):
        if new_provider != self.current_provider:
            await self.graceful_shutdown(self.current_provider)
            await self.start_provider(new_provider, new_model)
            self.current_provider = new_provider
```

### Model Categories & Discovery:

```python
# backend/config/model_categories.py - UI organization only
OLLAMA_CATEGORY_PATTERNS = {
    'creative': {
        'icon': '🎭',
        'patterns': ['nebula', 'eris', 'roleplay', 'screenwriter'],
        'description': 'Creative writing, roleplay, storytelling'
    },
    'coding': {
        'icon': '💻', 
        'patterns': ['coder', 'code', 'deepseek'],
        'description': 'Code generation, debugging, programming help'
    },
    'research': {
        'icon': '🧠',
        'patterns': ['stheno', 'research', 'nemesis', 'llama', 'olmo'],
        'description': 'Analysis, research, general intelligence'
    }
}

def categorize_discovered_model(model_name):
    """Apply categories to models found via API discovery"""
    name_lower = model_name.lower()
    for category, config in OLLAMA_CATEGORY_PATTERNS.items():
        if any(pattern in name_lower for pattern in config['patterns']):
            return category
    return 'research'  # Default category
```

## Implementation Phases

### **Phase 1: Ollama Foundation** (Week 1)
**Goal**: Create Models page with dynamic discovery of existing Ollama models

**Tasks**:
- [ ] Add "Models" to sidebar navigation
- [ ] Create `model-settings.js` with dynamic model discovery
- [ ] Build Ollama tab with runtime model detection via API
- [ ] Implement model switching (Ollama API parameter change only)
- [ ] Add "last used" model persistence
- [ ] Style Models page matching voice system
- [ ] Handle cases where models are unavailable gracefully

**Success Criteria**:
- ✅ Dynamically discovers all available Ollama models
- ✅ Can switch models and see different responses
- ✅ Last used model remembered across sessions
- ✅ Voice system completely unaffected
- ✅ Works even if models are added/removed from system
- ✅ Clean git repository (no model files committed)

### **Phase 2: NIM Integration** (Week 2)
**Goal**: Add NVIDIA NIM as second provider

**Tasks**:
- [ ] Install NIM on RTX 4060 (device=1 only)
- [ ] Create `nim_client.py` with container management
- [ ] Add NIM tab to Models page
- [ ] Implement GPU switching between Ollama/NIM
- [ ] Add model performance monitoring

**Success Criteria**:
- ✅ NIM models work alongside Ollama
- ✅ Clean GPU resource switching
- ✅ No interference with RTX 4070 voice system

### **Phase 3: API Providers** (Week 3)
**Goal**: Add cloud API providers (OpenAI, Anthropic, Google)

**Tasks**:
- [ ] Create API clients for each provider
- [ ] Add APIs tab with key management
- [ ] Implement secure API key storage
- [ ] Add cost estimation features
- [ ] Connection testing functionality

**Success Criteria**:
- ✅ Can use cloud models without local GPU
- ✅ Secure API key management
- ✅ Cost tracking and estimation

### **Phase 4: HuggingFace Integration** (Week 4)
**Goal**: Add HuggingFace model support

**Tasks**:
- [ ] Create HuggingFace client
- [ ] Implement model search and discovery
- [ ] Add proper GPU memory management
- [ ] Handle model downloading and caching

**Success Criteria**:
- ✅ Can discover and use HuggingFace models
- ✅ No GPU conflicts with existing providers
- ✅ Smooth model switching experience

## User Experience Flow

### Model Selection Flow:
1. **User opens Models page**
2. **Sees current model highlighted** (last used)
3. **Browses available models by category**
4. **Clicks "Switch to This" on desired model**
5. **System switches GPU resources if needed**
6. **New model ready for chat**
7. **Selection persisted for next session**

### Chat Integration:
```javascript
// In chat message sending
const modelString = this.modelSettings.getCurrentModel(); // "ollama:captaineris-nebula"
this.websocket.send(JSON.stringify({
    type: 'chat',
    message: userMessage,
    model: modelString
}));
```

### Model Status Display:
- **●** Currently Active (only one at a time)
- **○** Available but not loaded  
- **⏳** Loading/Switching
- **❌** Error/Unavailable
- **💾** Downloaded and cached

## Configuration Management

### Configuration Files (Lightweight):

#### Last Used Model Storage (~1KB):
```json
{
    "last_used_model": "ollama:captaineris-nebula:latest",
    "model_usage_history": [
        {"model": "ollama:captaineris-nebula", "timestamp": "2025-09-01T17:30:00Z"},
        {"model": "nim:llama3-8b", "timestamp": "2025-09-01T16:15:00Z"}
    ],
    "preferences": {
        "default_provider": "ollama",
        "auto_switch_delay": 15,
        "show_model_sizes": true
    }
}
```

#### Model Discovery Results (Runtime Cache):
```json
{
    "last_discovery": "2025-09-01T17:30:00Z",
    "available_models": {
        "ollama": [
            {"name": "captaineris-nebula:latest", "size": "7.5GB", "category": "creative"},
            {"name": "qwen2.5-coder-32b:latest", "size": "65GB", "category": "coding"}
        ],
        "nim": [],
        "apis": ["gpt-4o", "claude-3.5-sonnet"]
    }
}
```

### GPU Assignment Protection:
```python
# Critical safety check
VOICE_GPU = 0  # RTX 4070 - NEVER TOUCH
LLM_GPU = 1    # RTX 4060 - Our workspace

def validate_gpu_safety():
    if os.environ.get('CUDA_VISIBLE_DEVICES') == '0':
        raise CriticalError("Attempted to use Voice GPU for LLM!")
```

## Success Metrics

### Technical Success:
- ✅ Dynamic discovery of all available Ollama models
- ✅ Model switching works reliably via API
- ✅ Last used model persistence
- ✅ Voice system completely unaffected
- ✅ Clean GPU resource management
- ✅ No memory leaks or conflicts
- ✅ Clean git repository (no model binaries)
- ✅ Shared model access with other apps
- ✅ Graceful handling of missing models

### User Experience Success:
- ✅ Intuitive model browsing and selection
- ✅ Clear model status and information
- ✅ Fast model switching (< 30 seconds)
- ✅ Seamless chat integration
- ✅ Professional, polished interface

### Future Expandability:
- ✅ Easy to add new providers
- ✅ Scalable architecture
- ✅ Plugin-like model support
- ✅ Configuration management system

---

**Storage Strategy**: Models remain in system locations (not in JBrain git repository). JBrain acts as API client to existing Ollama service.

**Git Repository**: Only contains code, configurations, and UI - no model binaries. Total JBrain overhead: ~50KB of new files.

**Shared Models**: Same models used by OpenWebUI and other applications. No duplication or conflicts.

**Implementation Priority**: Start with Phase 1 (Ollama Foundation) using dynamic model discovery to get immediate value from existing 76+ GB model collection, then incrementally add providers based on user needs and technical stability.

**Architecture Philosophy**: Simple, clean model routing without hidden fallbacks or complexity. If a model works, it should always work. Clear failure states and user transparency.

**Safety First**: Absolute protection of RTX 4070 voice system. All LLM operations confined to RTX 4060 with multiple validation layers.