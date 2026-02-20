# Langfuse

### Basic Information

- **Package Name:** `@langfuse/n8n-nodes-langfuse`
- **Category:** 📊 LLM Observability & Monitoring
- **Primary Use Case:** Log and monitor LLM interactions for cost tracking, performance analysis, and debugging
- **Maintainer:** Langfuse Team
- **npm Repository:** [@langfuse/n8n-nodes-langfuse](https://www.npmjs.com/package/@langfuse/n8n-nodes-langfuse)
- **GitHub Repository:** [langfuse/langfuse](https://github.com/langfuse/langfuse)

### Installation Command

```bash
npm install @langfuse/n8n-nodes-langfuse
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| Langfuse | `@langfuse/n8n-nodes-langfuse.langfuse` | 1 | Utility/Logging |

### Node Description

Langfuse provides comprehensive observability for LLM applications. This node enables you to capture, log, and analyze every interaction with LLMs, including token usage, costs, latency, and quality metrics across your entire workflow.

### Available Operations

1. **Log Generation** (`logGeneration`)
   - Log LLM generation/completion event
   - Parameters: Model, prompt, completion, tokens, timestamp
   - Returns: Event ID and confirmation

2. **Log Trace** (`logTrace`)
   - Create a trace session for workflow execution
   - Parameters: Name, metadata, user ID
   - Returns: Trace ID

3. **Log Span** (`logSpan`)
   - Log a nested operation within a trace
   - Parameters: Trace ID, span name, inputs, outputs, duration
   - Returns: Span ID

4. **Score Event** (`scoreEvent`)
   - Add evaluation score to logged event
   - Parameters: Event ID, score value, name
   - Returns: Score confirmation

5. **Get Analytics** (`getAnalytics`)
   - Retrieve analytics data for logged events
   - Parameters: Date range, filters
   - Returns: Analytics summary

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | options | Yes | `logGeneration` | Operation to perform |
| `apiKey` | string (credential) | Yes | `""` | Langfuse API key |
| `publicKey` | string | Yes | `""` | Langfuse public key |
| `baseUrl` | string | No | `https://cloud.langfuse.com` | Langfuse API endpoint |
| `model` | string | Yes* | `""` | LLM model name (*for logGeneration) |
| `prompt` | string (textarea) | Yes* | `""` | Input prompt (*for logGeneration) |
| `completion` | string (textarea) | No | `""` | Model completion/response |
| `promptTokens` | number | No | `0` | Tokens used for prompt |
| `completionTokens` | number | No | `0` | Tokens used for completion |
| `totalTokens` | number | No | `0` | Total tokens for event |
| `traceName` | string | Yes* | `""` | Name for trace session (*for logTrace) |
| `traceId` | string | Yes* | `""` | Trace ID reference (*for spans) |
| `spanName` | string | Yes* | `""` | Name for span operation (*for logSpan) |
| `duration` | number | No | `0` | Operation duration in milliseconds |
| `metadata` | object | No | `{}` | Custom metadata object |
| `userId` | string | No | `""` | Associated user identifier |
| `sessionId` | string | No | `""` | Associated session identifier |
| `tags` | array | No | `[]` | Tag labels for categorization |
| `input` | object | No | `{}` | Structured input data |
| `output` | object | No | `{}` | Structured output data |

### Credentials Required

**Langfuse API Credential Type:** `Langfuse API`

| Field | Required | Description |
|-------|----------|-------------|
| `API Key` | Yes | Langfuse secret API key |
| `Public Key` | Yes | Langfuse public key |
| `Base URL` | No | Custom Langfuse endpoint (default: cloud.langfuse.com) |

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | Varies by operation; generally `model`, `prompt`, `completion` |
| **Output Fields** | `eventId`, `traceId`, `spanId`, `success`, `timestamp` |

### Example Usage

```json
{
  "name": "Langfuse Logger",
  "type": "@langfuse/n8n-nodes-langfuse.langfuse",
  "typeVersion": 1,
  "position": [450, 550],
  "parameters": {
    "operation": "logGeneration",
    "model": "gpt-4",
    "prompt": "{{$node['AI'].json.prompt}}",
    "completion": "{{$node['AI'].json.response}}",
    "promptTokens": "{{$node['AI'].json.promptTokens}}",
    "completionTokens": "{{$node['AI'].json.completionTokens}}",
    "metadata": {
      "workflow": "{{$workflow.name}}",
      "executionId": "{{$execution.id}}"
    }
  },
  "credentials": {
    "langfuseApi": "langfuse_credential_name"
  }
}
```

### Common Use Cases

- Monitor LLM costs and token usage
- Track performance metrics across workflows
- Identify expensive or slow LLM operations
- Score and evaluate LLM outputs
- Generate reports on LLM usage patterns
- Debug LLM behavior with detailed traces

### Important Notes

- Token counting must be accurate for cost tracking
- Trace hierarchy: Trace > Spans > Generations for organization
- Analytics data may take few seconds to be available
- Retention policies vary based on plan tier
