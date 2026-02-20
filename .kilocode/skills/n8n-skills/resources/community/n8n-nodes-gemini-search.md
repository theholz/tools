# Gemini Search

### Basic Information

- **Package Name:** `n8n-nodes-gemini-search`
- **Category:** 🤖 AI & LLMs
- **Primary Use Case:** Perform grounded searches using Google's Gemini models
- **Maintainer:** Community
- **npm Repository:** [n8n-nodes-gemini-search](https://www.npmjs.com/package/n8n-nodes-gemini-search)

### Installation Command

```bash
npm install n8n-nodes-gemini-search
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| Gemini Search | `n8n-nodes-gemini-search.geminiSearch` | 1 | AI Tool |

### Node Description

Provides access to Google's Gemini models with specific capabilities for search grounding. This allows the model to retrieve real-time information from Google Search to answer queries with up-to-date context, reducing hallucinations.

### Available Operations

1. **Search** (`search`)
   - Query Gemini with search grounding enabled
   - Parameters: Prompt, model selection
   - Returns: Generated text with citations

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | Yes | - | The user query or prompt |
| `model` | options | Yes | `gemini-pro` | Model to use (`gemini-pro`, `gemini-1.5-flash`, etc.) |
| `temperature` | number | No | `0.7` | Creativity of response (0.0 - 1.0) |
| `maxTokens` | number | No | - | Maximum output tokens |

### Credentials Required

**Credential Type:** `googleGeminiApi`

| Field | Required | Description |
|-------|----------|-------------|
| `API Key` | Yes | Google AI Studio API Key |

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | `prompt` |
| **Output Fields** | `text` (string), `citations` (array) |

### Example Usage

```json
{
  "name": "Research Topic",
  "type": "n8n-nodes-gemini-search.geminiSearch",
  "typeVersion": 1,
  "position": [600, 300],
  "parameters": {
    "prompt": "What are the latest developments in fusion energy as of {{ $now.format('YYYY') }}?",
    "model": "gemini-1.5-flash"
  },
  "credentials": {
    "googleGeminiApi": "google_api_key"
  }
}
```

### Common Use Cases

- Generating up-to-date market research summaries
- Fact-checking content against live web data
- Answering questions about recent events
- Creating search-augmented AI assistants

### Important Notes

- Search grounding may increase latency compared to standard inference
- Citations returned in metadata verify source reliability
- Usage counts towards Google AI API quotas
