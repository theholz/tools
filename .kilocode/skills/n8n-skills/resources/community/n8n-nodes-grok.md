# Grok (xAI)

### Basic Information

- **Package Name:** `n8n-nodes-grok`
- **Category:** 🤖 AI & LLMs
- **Primary Use Case:** Access xAI's Grok language models for text generation and analysis
- **Maintainer:** Community
- **npm Repository:** [n8n-nodes-grok](https://www.npmjs.com/package/n8n-nodes-grok)

### Installation Command

```bash
npm install n8n-nodes-grok
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| Grok Chat | `n8n-nodes-grok.grokChat` | 1 | AI Model |

### Node Description

Integrates xAI's Grok models into n8n. Known for its "wit" and real-time knowledge access (via the underlying model training/retrieval), this node allows you to use Grok for chat completions, content generation, and data analysis tasks.

### Available Operations

1. **Chat Completion** (`chatCompletion`)
   - Send messages to Grok and get a response
   - Parameters: User message, system message
   - Returns: AI response

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `model` | options | Yes | `grok-1` | Model selection (`grok-1`, `grok-beta`, etc.) |
| `prompt` | string | Yes | - | User input message |
| `systemMessage` | string | No | - | System instructions for behavior |
| `temperature` | number | No | `0.7` | Randomness of output |
| `maxTokens` | number | No | `1024` | Maximum tokens to generate |

### Credentials Required

**Credential Type:** `grokApi`

| Field | Required | Description |
|-------|----------|-------------|
| `API Key` | Yes | xAI API Key |

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | `prompt` |
| **Output Fields** | `content` (string), `role`, `usage` |

### Example Usage

```json
{
  "name": "Ask Grok",
  "type": "n8n-nodes-grok.grokChat",
  "typeVersion": 1,
  "position": [450, 450],
  "parameters": {
    "model": "grok-1",
    "prompt": "Explain quantum computing like I'm 5",
    "systemMessage": "You are a helpful physics teacher."
  },
  "credentials": {
    "grokApi": "xai_key"
  }
}
```

### Common Use Cases

- Alternative LLM for creative writing and brainstorming
- Analyzing current events (depending on model version capabilities)
- Chatbots with a distinct personality
- comparing model outputs against OpenAI/Anthropic

### Important Notes

- Requires an API key from xAI console
- Check xAI documentation for latest model names and pricing
- Function calling support may depend on model version
