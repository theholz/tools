# ChainStream

### Basic Information

- **Package Name:** `n8n-nodes-chainstream`
- **Category:** 🤖 AI & LLMs
- **Primary Use Case:** Build and execute LLM chains with streaming support
- **Maintainer:** Community
- **npm Repository:** [n8n-nodes-chainstream](https://www.npmjs.com/package/n8n-nodes-chainstream)

### Installation Command

```bash
npm install n8n-nodes-chainstream
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| ChainStream | `n8n-nodes-chainstream.chainStream` | 1 | AI Tool |

### Node Description

Enables the creation of sequential LLM chains where the output of one step streams into the next. Designed for low-latency AI applications where user experience depends on seeing partial results immediately.

### Available Operations

1. **Stream Chain** (`streamChain`)
   - Execute a defined chain of prompts
   - Parameters: Prompts, Model config
   - Returns: Streamed chunks or final text

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompts` | array | Yes | `[]` | List of prompts in sequence |
| `model` | string | Yes | `gpt-3.5-turbo` | Model to use |
| `stream` | boolean | No | `true` | Enable streaming output |

### Credentials Required

**Credential Type:** `openAiApi` (or compatible)

| Field | Required | Description |
|-------|----------|-------------|
| `API Key` | Yes | LLM Provider API Key |

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | Trigger data |
| **Output Fields** | `text` (string) |

### Example Usage

```json
{
  "name": "Story Writer",
  "type": "n8n-nodes-chainstream.chainStream",
  "typeVersion": 1,
  "position": [400, 400],
  "parameters": {
    "prompts": [
      "Generate a character name",
      "Write a backstory for {{ $prev }}"
    ],
    "stream": true
  },
  "credentials": {
    "openAiApi": "openai_creds"
  }
}
```

### Common Use Cases

- Real-time chat interfaces
- Multi-step reasoning tasks
- Interactive storytelling
- summarizing long documents in chunks

### Important Notes

- Streaming requires n8n webhook compatibility
- Designed for speed and interactivity
