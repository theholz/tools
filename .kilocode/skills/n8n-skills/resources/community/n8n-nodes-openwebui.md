# Open WebUI

### Basic Information

- **Package Name:** `n8n-nodes-openwebui`
- **Category:** 🤖 AI & LLM Interfaces
- **Primary Use Case:** Integrate with Open WebUI instances for model management and LLM interactions
- **Maintainer:** Open WebUI Community
- **npm Repository:** [n8n-nodes-openwebui](https://www.npmjs.com/package/n8n-nodes-openwebui)
- **GitHub Repository:** [open-webui/n8n-nodes-openwebui](https://github.com/open-webui/n8n-nodes-openwebui)

### Installation Command

```bash
npm install n8n-nodes-openwebui
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| Open WebUI | `n8n-nodes-openwebui.openWebUI` | 1 | LLM |

### Node Description

Open WebUI node enables integration with Open WebUI instances (self-hosted or cloud). Send prompts to various LLM models, manage chat history, and leverage advanced features like streaming, embeddings, and model switching.

### Available Operations

1. **Send Message** (`chat_completion`)
   - Send prompt to Open WebUI model
   - Parameters: Model selection, prompt, temperature, token limits
   - Returns: Model response

2. **List Models** (`list_models`)
   - Retrieve available models on Open WebUI instance
   - Parameters: Filter criteria (optional)
   - Returns: Array of model metadata

3. **Generate Embeddings** (`generate_embeddings`)
   - Create embeddings for text input
   - Parameters: Text, embedding model
   - Returns: Embedding vector

4. **Chat Completion** (`chat_completion`)
   - Advanced chat with message history
   - Parameters: Messages array, model, system prompt
   - Returns: Chat completion response with metadata

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `baseUrl` | string | Yes | `http://localhost:8080` | Open WebUI instance URL |
| `apiKey` | string (credential) | No | `""` | API key if authentication required |
| `model` | string/options | Yes | `""` | Model name (loaded from instance) |
| `prompt` | string (textarea) | Yes | `""` | User prompt/message |
| `systemPrompt` | string (textarea) | No | `""` | System instruction for model behavior |
| `temperature` | number | No | `0.7` | Response randomness (0-1) |
| `topP` | number | No | `0.95` | Nucleus sampling parameter |
| `topK` | number | No | `40` | Top-k sampling parameter |
| `maxTokens` | number | No | `2048` | Maximum response tokens |
| `stream` | boolean | No | `false` | Stream response tokens in real-time |
| `keepAlive` | number | No | `300000` | Connection keep-alive timeout |
| `messages` | array | No* | `[]` | Message history for chat context (*for chat_completion) |

### Credentials Required

**Optional:** `Open WebUI API Key` (if authentication enabled on instance)

| Field | Required | Description |
|-------|----------|-------------|
| `API Key` | No | Authentication token for Open WebUI instance |
| `Base URL` | No | Override default Open WebUI URL |

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | `prompt`, `model`, optional `systemPrompt` |
| **Output Fields** | `response`, `model`, `tokenUsage`, `finishReason` |

### Example Usage

```json
{
  "name": "Open WebUI",
  "type": "n8n-nodes-openwebui.openWebUI",
  "typeVersion": 1,
  "position": [400, 500],
  "parameters": {
    "baseUrl": "http://localhost:8080",
    "model": "mistral",
    "prompt": "Summarize this text: {{$node['HTTP Request'].json.content}}",
    "systemPrompt": "You are a professional summarizer.",
    "temperature": 0.5,
    "maxTokens": 1024
  }
}
```

### Common Use Cases

- Local/self-hosted LLM inference
- Model comparison across multiple instances
- Cost-effective alternative to cloud LLMs
- Privacy-focused LLM interactions
- Custom model deployment and testing

### Important Notes

- Open WebUI instance must be running and accessible
- Model availability depends on Open WebUI configuration
- Streaming is available but requires client support
- Performance depends on hardware running Open WebUI

### Key Features

- **OpenAI Compatible:** Works with OpenAI API format
- **RAG Support:** Retrieval Augmented Generation for documents
- **Multi-Provider:** Supports OpenAI, Ollama, and other providers
