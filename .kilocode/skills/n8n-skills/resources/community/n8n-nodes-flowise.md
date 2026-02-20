# Flowise

### Basic Information

- **Package Name:** `n8n-nodes-flowise`
- **Category:** 🤖 AI & LLMs
- **Primary Use Case:** Execute FlowiseAI chains and chatflows from n8n
- **Maintainer:** Community
- **npm Repository:** [n8n-nodes-flowise](https://www.npmjs.com/package/n8n-nodes-flowise)
- **GitHub Repository:** [Check npm for latest link]

### Installation Command

```bash
npm install n8n-nodes-flowise
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| Flowise | `n8n-nodes-flowise.flowise` | 1 | AI Integration |

### Node Description

Integrates n8n with FlowiseAI, a drag-and-drop UI for building LLM flows. This node allows you to trigger Flowise chatflows and prediction chains, enabling complex AI agent orchestration within n8n workflows.

### Available Operations

1. **Execute Prediction** (`executePrediction`)
   - Send input to a Flowise prediction API
   - Parameters: API URL, input message
   - Returns: AI response

2. **Execute Vector Store** (`executeVectorStore`)
   - Interact with Flowise vector store operations (if supported)
   - Parameters: varies
   - Returns: Operation result

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | options | Yes | `executePrediction` | Operation to perform |
| `url` | string | Yes | `http://localhost:3000` | Flowise instance URL |
| `chatflowId` | string | Yes | - | ID of the Chatflow to trigger |
| `input` | string | Yes | - | Input question or prompt |
| `overrideConfig` | json | No | - | Override chatflow configuration (e.g., model parameters) |
| `history` | json | No | - | Chat history array for context |

### Credentials Required

**No credentials required** (Flowise APIs are typically open or token-based via headers if configured)

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | `input` (string) |
| **Output Fields** | `response` (string), `sourceDocuments` (array) |

### Example Usage

```json
{
  "name": "Query Support Bot",
  "type": "n8n-nodes-flowise.flowise",
  "typeVersion": 1,
  "position": [500, 500],
  "parameters": {
    "url": "https://flowise.mycompany.com",
    "chatflowId": "c8f3-42e1-...",
    "input": "{{$node['Webhook'].json.question}}"
  }
}
```

### Common Use Cases

- Triggering complex RAG pipelines built in Flowise
- Delegating specialized AI tasks to Flowise agents
- Hybrid workflows using n8n for logic and Flowise for LLM reasoning
- prototyping AI chains in Flowise and consuming them in n8n automations

### Important Notes

- Ensure Flowise API is accessible from the n8n instance
- Chatflow ID can be found in the Flowise UI (API Endpoint section)
- Supports streaming responses (handled as final text in n8n)
- Can pass overrides to change models or temperature dynamically
