# Perplexity

### Basic Information

- **Package Name:** `@watzon/n8n-nodes-perplexity`
- **Category:** 🤖 AI & Search Integration
- **Primary Use Case:** Leverage Perplexity AI's search and reasoning capabilities for real-time information retrieval and synthesis
- **Maintainer:** watzon
- **npm Repository:** [@watzon/n8n-nodes-perplexity](https://www.npmjs.com/package/@watzon/n8n-nodes-perplexity)
- **GitHub Repository:** [watzon/n8n-nodes-perplexity](https://github.com/watzon/n8n-nodes-perplexity)

### Installation Command

```bash
npm install @watzon/n8n-nodes-perplexity
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| Perplexity | `@watzon/n8n-nodes-perplexity.perplexity` | 1 | LLM/Search |

### Node Description

Perplexity AI node integrates advanced search and reasoning capabilities. Unlike traditional LLMs, Perplexity can search the web in real-time and provide factual, current information with citations, making it ideal for research, fact-checking, and data gathering workflows.

### Available Operations

1. **Search** (`search`)
   - Perform web search with AI synthesis
   - Parameters: Query, search options, response format
   - Returns: Answer with citations and sources

2. **Chat** (`chat`)
   - Multi-turn conversation with context
   - Parameters: Messages, model, settings
   - Returns: Response with reasoning visible

3. **Research** (`research`)
   - Deep research on topic
   - Parameters: Topic, depth, sources
   - Returns: Comprehensive report with sources

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | options | Yes | `search` | Operation to perform |
| `apiKey` | string (credential) | Yes | `""` | Perplexity API key |
| `query` | string (textarea) | Yes | `""` | Search query or prompt |
| `model` | options | No | `sonar` | Model: `sonar`, `sonar-pro`, `sonar-chat` |
| `temperature` | number | No | `0.7` | Response creativity (0-1) |
| `topP` | number | No | `0.9` | Diversity control |
| `topK` | number | No | `0` | Top-k sampling (0=disabled) |
| `maxTokens` | number | No | `2048` | Maximum response tokens |
| `returnCitations` | boolean | No | `true` | Include citation sources |
| `searchRecency` | options | No | `week` | Recency filter: `day`, `week`, `month`, `year` |
| `language` | string | No | `en` | Response language code |
| `messages` | array | No | `[]` | Chat message history |
| `systemPrompt` | string (textarea) | No | `""` | System instruction |
| `followUp` | boolean | No | `false` | Generate follow-up questions |

### Credentials Required

**Perplexity API Credential Type:** `Perplexity API`

| Field | Required | Description |
|-------|----------|-------------|
| `API Key` | Yes | Perplexity API key (from console.perplexity.ai) |
| `Base URL` | No | Custom endpoint (default: api.perplexity.ai) |

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | `query`, optional `messages` for chat |
| **Output Fields** | `answer`, `citations`, `sources`, `searchResults`, `followUpQuestions` |

### Example Usage

```json
{
  "name": "Perplexity Search",
  "type": "@watzon/n8n-nodes-perplexity.perplexity",
  "typeVersion": 1,
  "position": [550, 650],
  "parameters": {
    "operation": "search",
    "query": "Latest developments in artificial intelligence 2026",
    "model": "sonar-pro",
    "returnCitations": true,
    "searchRecency": "week",
    "maxTokens": 1024
  },
  "credentials": {
    "perplexityApi": "perplexity_credential"
  }
}
```

### Common Use Cases

- Real-time market research and competitive analysis
- News aggregation and summarization
- Fact-checking and verification workflows
- Customer question answering with current information
- Research reports with automatic citations
- Current event tracking and alerts

### Important Notes

- Web search results vary by query specificity
- Citations provide accountability for answers
- Rate limits depend on subscription tier
- Some queries may take longer due to search time
- Follow-up questions help guide further research
