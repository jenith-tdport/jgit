# Context Engineering Plan for JBrain

## 🧠 COMPREHENSIVE CONTEXT MANAGEMENT SYSTEM

### Status: **DESIGN PHASE** 📋
Multi-layered context engineering system for optimal AI interactions across different model providers.

**Objective**: Create intelligent context management that adapts to different models, maintains conversation coherence, and optimizes for performance and relevance.

## Context Engineering Philosophy

### **Core Principles:**
1. **Model-Adaptive Context**: Different models need different context strategies
2. **Hierarchical Relevance**: Not all context is equally important
3. **Dynamic Context Windows**: Adjust context length based on model capabilities
4. **Conversation Coherence**: Maintain thread continuity across model switches
5. **Performance Optimization**: Balance context richness with response speed

## Multi-Model Context Strategy

### **Context Requirements by Provider:**

#### **Ollama Models (Local)**
```python
OLLAMA_CONTEXT_SPECS = {
    'captaineris-nebula': {
        'context_window': 4096,
        'optimal_context': 2048,
        'context_style': 'narrative',
        'memory_priority': 'creative_continuity'
    },
    'qwen2.5-coder-32b': {
        'context_window': 8192,
        'optimal_context': 4096,
        'context_style': 'structured_code',
        'memory_priority': 'technical_accuracy'
    },
    'deepseek-r1': {
        'context_window': 4096,
        'optimal_context': 2048,
        'context_style': 'analytical',
        'memory_priority': 'reasoning_chain'
    }
}
```

#### **NIM Models (Optimized)**
```python
NIM_CONTEXT_SPECS = {
    'llama3-8b': {
        'context_window': 8192,
        'optimal_context': 6144,
        'context_style': 'conversational',
        'memory_priority': 'recent_interaction'
    },
    'phi3-mini': {
        'context_window': 4096,
        'optimal_context': 3072,
        'context_style': 'concise',
        'memory_priority': 'task_focused'
    }
}
```

#### **API Models (Cloud)**
```python
API_CONTEXT_SPECS = {
    'gpt-4o': {
        'context_window': 128000,
        'optimal_context': 32000,
        'context_style': 'comprehensive',
        'memory_priority': 'full_conversation'
    },
    'claude-3.5-sonnet': {
        'context_window': 200000,
        'optimal_context': 50000,
        'context_style': 'analytical_detailed',
        'memory_priority': 'document_analysis'
    },
    'gemini-1.5-pro': {
        'context_window': 2000000,
        'optimal_context': 100000,
        'context_style': 'multimodal',
        'memory_priority': 'long_term_memory'
    }
}
```

## Context Architecture

### **Hierarchical Context Layers:**

#### **Layer 1: System Context (Always Present)**
```python
class SystemContext:
    def __init__(self, model_provider, model_name):
        self.model_provider = model_provider
        self.model_name = model_name
        self.user_preferences = self.load_user_preferences()
        self.session_metadata = self.get_session_info()
        
    def get_system_prompt(self):
        base_prompt = self.get_base_personality()
        model_specific = self.get_model_optimizations()
        user_preferences = self.get_user_context()
        
        return f"{base_prompt}\n\n{model_specific}\n\n{user_preferences}"
```

#### **Layer 2: Conversation Memory (Sliding Window)**
```python
class ConversationMemory:
    def __init__(self, context_window_size):
        self.context_window = context_window_size
        self.messages = deque(maxlen=1000)  # Full history
        self.importance_scores = {}
        
    def get_relevant_context(self, current_query):
        # Intelligent context selection
        recent_messages = self.get_recent_messages(0.4)  # 40% recent
        important_messages = self.get_important_messages(0.3)  # 30% important
        relevant_messages = self.get_semantic_relevant(current_query, 0.3)  # 30% relevant
        
        return self.merge_and_prioritize([recent_messages, important_messages, relevant_messages])
```

#### **Layer 3: Task-Specific Context (Dynamic)**
```python
class TaskContext:
    def detect_task_type(self, query):
        task_patterns = {
            'coding': ['code', 'function', 'debug', 'implement'],
            'creative': ['story', 'character', 'write', 'creative'],
            'analysis': ['analyze', 'research', 'explain', 'compare'],
            'conversation': ['chat', 'talk', 'discuss', 'opinion']
        }
        
        for task, keywords in task_patterns.items():
            if any(keyword in query.lower() for keyword in keywords):
                return task
        return 'conversation'
    
    def get_task_context(self, task_type):
        return TASK_SPECIFIC_CONTEXT[task_type]
```

#### **Layer 4: Domain Knowledge (Retrievable)**
```python
class DomainKnowledge:
    def __init__(self):
        self.knowledge_base = {
            'coding_patterns': self.load_coding_patterns(),
            'creative_elements': self.load_creative_elements(),
            'technical_docs': self.load_technical_docs(),
            'conversation_styles': self.load_conversation_styles()
        }
    
    def retrieve_relevant_knowledge(self, query, task_type):
        # Vector similarity search or keyword matching
        return self.knowledge_base[task_type].search(query, top_k=5)
```

## Context Engineering Implementation

### **Folder Structure:**
```
/home/jenith/Brain/
├── backend/
│   ├── context/                    # 🆕 NEW - Context management
│   │   ├── __init__.py
│   │   ├── context_manager.py      # Main context orchestrator
│   │   ├── memory_manager.py       # Conversation memory
│   │   ├── task_detector.py        # Task classification
│   │   ├── model_optimizer.py      # Model-specific optimization
│   │   └── knowledge_retriever.py  # Domain knowledge
│   │
│   ├── context_data/               # 🆕 NEW - Context storage
│   │   ├── system_prompts/         # Base personality prompts
│   │   ├── task_templates/         # Task-specific templates
│   │   ├── model_configs/          # Model-specific configurations
│   │   └── conversation_history/   # Persistent memory
│   │
│   └── main.py                     # ✅ Updated with context integration
```

### **Core Context Manager:**
```python
class ContextManager:
    def __init__(self):
        self.memory_manager = ConversationMemory()
        self.task_detector = TaskDetector()
        self.model_optimizer = ModelOptimizer()
        self.knowledge_retriever = KnowledgeRetriever()
        
    async def build_context(self, user_query, model_provider, model_name, conversation_id):
        # 1. Detect task type
        task_type = self.task_detector.detect_task_type(user_query)
        
        # 2. Get model specifications
        model_specs = self.model_optimizer.get_model_specs(model_provider, model_name)
        
        # 3. Build layered context
        system_context = self.build_system_context(model_specs, task_type)
        conversation_context = self.memory_manager.get_relevant_context(
            user_query, model_specs['optimal_context']
        )
        task_context = self.get_task_specific_context(task_type)
        knowledge_context = self.knowledge_retriever.get_relevant_knowledge(
            user_query, task_type
        )
        
        # 4. Optimize for model
        optimized_context = self.model_optimizer.optimize_context(
            system_context, conversation_context, task_context, knowledge_context,
            model_specs
        )
        
        return optimized_context
```

## Context Templates by Model Type

### **Creative Models (Roleplay/Story)**
```python
CREATIVE_SYSTEM_PROMPT = """
You are {character_name}, a creative AI assistant specialized in storytelling and roleplay.

Current Context:
- Writing Style: {preferred_style}
- Genre Focus: {genre_preferences}
- Character Consistency: Maintain established personalities
- Narrative Continuity: Remember plot elements and character development

Previous Creative Elements:
{creative_memory}

Writing Guidelines:
- Show, don't tell
- Maintain consistent voice and tone
- Build on established world/characters
- Use vivid, immersive descriptions
"""
```

### **Coding Models (Development)**
```python
CODING_SYSTEM_PROMPT = """
You are a senior software developer and code review expert.

Current Context:
- Programming Languages: {detected_languages}
- Project Context: {project_type}
- Code Style: {coding_standards}
- Architecture Patterns: {architectural_context}

Recent Code Context:
{code_memory}

Development Guidelines:
- Write clean, maintainable code
- Follow established patterns and conventions
- Include appropriate error handling
- Provide clear explanations for complex logic
- Consider performance and security implications
"""
```

### **Research Models (Analysis)**
```python
RESEARCH_SYSTEM_PROMPT = """
You are a research analyst and critical thinking expert.

Current Context:
- Research Domain: {research_area}
- Analysis Level: {depth_requirement}
- Evidence Standards: {evidence_criteria}
- Reasoning Style: {reasoning_preference}

Research Context:
{research_memory}

Analysis Guidelines:
- Provide evidence-based reasoning
- Consider multiple perspectives
- Identify assumptions and limitations
- Structure arguments logically
- Cite relevant information when available
"""
```

## Dynamic Context Optimization

### **Context Window Management:**
```python
class ContextWindowManager:
    def optimize_context_length(self, full_context, model_specs):
        max_context = model_specs['context_window']
        optimal_context = model_specs['optimal_context']
        
        if len(full_context) <= optimal_context:
            return full_context
            
        # Intelligent truncation strategy
        prioritized_sections = self.prioritize_context_sections(full_context)
        
        # Keep system prompt (highest priority)
        system_section = prioritized_sections['system']
        remaining_budget = optimal_context - len(system_section)
        
        # Allocate remaining budget by importance
        final_context = system_section
        for section_name, content in prioritized_sections.items():
            if section_name == 'system':
                continue
                
            if len(content) <= remaining_budget:
                final_context += content
                remaining_budget -= len(content)
            else:
                # Truncate less important sections
                truncated = self.smart_truncate(content, remaining_budget)
                final_context += truncated
                break
                
        return final_context
```

### **Context Relevance Scoring:**
```python
class ContextRelevanceScorer:
    def score_message_relevance(self, message, current_query, task_type):
        relevance_score = 0.0
        
        # Recency score (more recent = higher score)
        time_decay = self.calculate_time_decay(message.timestamp)
        relevance_score += time_decay * 0.3
        
        # Semantic similarity score
        semantic_score = self.calculate_semantic_similarity(message.content, current_query)
        relevance_score += semantic_score * 0.4
        
        # Task alignment score
        task_alignment = self.calculate_task_alignment(message.content, task_type)
        relevance_score += task_alignment * 0.2
        
        # User engagement score (if user responded positively)
        engagement_score = self.calculate_engagement_score(message)
        relevance_score += engagement_score * 0.1
        
        return relevance_score
```

## Model Switch Context Continuity

### **Context Transfer Strategy:**
```python
class ModelSwitchManager:
    async def handle_model_switch(self, old_model, new_model, conversation_id):
        # 1. Extract current conversation state
        current_state = await self.extract_conversation_state(conversation_id)
        
        # 2. Convert context format for new model
        adapted_context = self.adapt_context_for_model(current_state, new_model)
        
        # 3. Generate transition prompt
        transition_prompt = self.generate_transition_prompt(old_model, new_model)
        
        # 4. Merge contexts
        final_context = self.merge_contexts(adapted_context, transition_prompt)
        
        return final_context
    
    def generate_transition_prompt(self, old_model, new_model):
        return f"""
        [CONTEXT TRANSITION]
        Previous model: {old_model}
        Current model: {new_model}
        
        Please continue the conversation maintaining the same context and tone.
        The user has switched models but expects seamless continuity.
        """
```

## Context Persistence and Memory

### **Conversation Memory Storage:**
```python
class ConversationMemoryStore:
    def __init__(self):
        self.storage_path = "backend/context_data/conversation_history/"
        
    async def save_conversation_state(self, conversation_id, context_data):
        file_path = f"{self.storage_path}/{conversation_id}.json"
        
        memory_data = {
            'conversation_id': conversation_id,
            'last_updated': datetime.now().isoformat(),
            'messages': context_data.get('messages', []),
            'important_context': context_data.get('important_context', {}),
            'task_history': context_data.get('task_history', []),
            'model_usage': context_data.get('model_usage', [])
        }
        
        await self.async_write_json(file_path, memory_data)
    
    async def load_conversation_state(self, conversation_id):
        file_path = f"{self.storage_path}/{conversation_id}.json"
        if os.path.exists(file_path):
            return await self.async_read_json(file_path)
        return self.create_new_conversation_state()
```

### **Long-term Memory Management:**
```python
class LongTermMemoryManager:
    def extract_important_information(self, conversation_messages):
        important_info = {
            'user_preferences': self.extract_user_preferences(conversation_messages),
            'recurring_topics': self.identify_recurring_topics(conversation_messages),
            'successful_patterns': self.identify_successful_interactions(conversation_messages),
            'user_expertise_areas': self.assess_user_expertise(conversation_messages),
            'preferred_communication_style': self.analyze_communication_style(conversation_messages)
        }
        return important_info
    
    def update_user_profile(self, user_id, important_info):
        # Update persistent user profile for better future interactions
        profile_path = f"backend/context_data/user_profiles/{user_id}.json"
        # ... profile update logic
```

## Context Quality Metrics

### **Context Effectiveness Measurement:**
```python
class ContextQualityMetrics:
    def measure_context_effectiveness(self, context, user_query, model_response, user_feedback):
        metrics = {
            'relevance_score': self.calculate_relevance(context, user_query),
            'completeness_score': self.calculate_completeness(context, user_query),
            'efficiency_score': self.calculate_efficiency(context, model_response),
            'user_satisfaction': self.parse_user_feedback(user_feedback),
            'context_utilization': self.measure_context_usage(context, model_response)
        }
        
        overall_quality = sum(metrics.values()) / len(metrics)
        
        # Log metrics for continuous improvement
        self.log_quality_metrics(metrics, overall_quality)
        
        return overall_quality
```

## Implementation Phases

### **Phase 1: Foundation** (Week 1)
- [ ] Build basic ContextManager class
- [ ] Implement simple conversation memory
- [ ] Create model-specific context templates
- [ ] Add context integration to existing chat flow

### **Phase 2: Intelligence** (Week 2)
- [ ] Add task detection and classification
- [ ] Implement context relevance scoring
- [ ] Build context window optimization
- [ ] Add model switch continuity

### **Phase 3: Persistence** (Week 3)
- [ ] Implement conversation memory storage
- [ ] Add long-term memory management
- [ ] Build user profile system
- [ ] Add context quality metrics

### **Phase 4: Optimization** (Week 4)
- [ ] Implement advanced context retrieval
- [ ] Add semantic similarity search
- [ ] Build context effectiveness learning
- [ ] Add context debugging tools

## Context Engineering Benefits

### **For Users:**
- **Consistent Experience**: Conversations feel natural and coherent
- **Model-Optimized Responses**: Each model gets context in its preferred format
- **Improved Relevance**: Responses are more contextually appropriate
- **Seamless Model Switching**: No jarring transitions between models

### **For System:**
- **Better Performance**: Optimized context reduces processing overhead
- **Higher Quality**: Improved context leads to better responses
- **Scalable Architecture**: Can handle multiple concurrent conversations
- **Continuous Improvement**: Metrics drive context optimization

### **Technical Advantages:**
- **Memory Efficiency**: Smart context windowing prevents memory bloat
- **Adaptive System**: Learns from user interactions and feedback
- **Provider Agnostic**: Works across all model providers
- **Debugging Capability**: Context decisions are traceable and debuggable

---

**Context Strategy**: Intelligent, multi-layered context management that adapts to different models and optimizes for relevance, performance, and user experience.

**Implementation Priority**: Start with foundational context management in Phase 1, then add intelligence and persistence incrementally.

**Quality Focus**: Continuous measurement and improvement of context effectiveness through metrics and user feedback.