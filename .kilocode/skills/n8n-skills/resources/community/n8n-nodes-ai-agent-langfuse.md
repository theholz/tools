# AI Agent Langfuse

### Basic Information

- **Package Name:** `n8n-nodes-ai-agent-langfuse`
- **Category:** 📊 AI Agents & Observability
- **Primary Use Case:** Create and monitor AI agents with integrated Langfuse observability for agentic workflows
- **Maintainer:** Community/Integration Specialist
- **npm Repository:** [n8n-nodes-ai-agent-langfuse](https://www.npmjs.com/package/n8n-nodes-ai-agent-langfuse)
- **GitHub Repository:** [n8n-io/community-nodes](https://github.com/n8n-io/community-nodes)

### Installation Command

```bash
npm install n8n-nodes-ai-agent-langfuse
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| AI Agent Langfuse | `n8n-nodes-ai-agent-langfuse.aiAgentLangfuse` | 1 | Agent |

### Node Description

Combines AI agent orchestration with Langfuse observability. This node allows you to create intelligent agents that can use tools, maintain state, and automatically log all interactions to Langfuse for comprehensive monitoring and debugging of agentic behavior.

### Available Operations

1. **Create Agent** (`createAgent`)
   - Initialize new AI agent with Langfuse integration
   - Parameters: Agent configuration, tools, prompts
   - Returns: Agent ID and initial state

2. **Execute Agent** (`executeAgent`)
   - Run agent with input and get output
   - Parameters: Agent ID, user input, context
   - Returns: Agent response with trace metadata

3. **Add Tool** (`addTool`)
   - Register tool/function for agent use
   - Parameters: Tool name, description, schema
   - Returns: Tool registration confirmation

4. **Get Agent State** (`getAgentState`)
   - Retrieve agent's current state and memory
   - Parameters: Agent ID
   - Returns: Agent state object

5. **Update Agent Configuration** (`updateConfig`)
   - Modify agent settings and behavior
   - Parameters: Agent ID, configuration updates
   - Returns: Updated configuration

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | options | Yes | `executeAgent` | Operation to perform |
| `agentName` | string | Yes* | `""` | Name for new agent (*for createAgent) |
| `agentId` | string | Yes* | `""` | Existing agent ID (*for other operations) |
| `systemPrompt` | string (textarea) | No | `""` | System instruction for agent behavior |
| `userInput` | string (textarea) | Yes* | `""` | User message/input (*for executeAgent) |
| `model` | options | No | `gpt-4` | LLM model: `gpt-4`, `gpt-3.5-turbo`, `claude-3` |
| `temperature` | number | No | `0.7` | Model temperature (0-1) |
| `maxIterations` | number | No | `10` | Maximum agent action iterations |
| `tools` | array | No | `[]` | Array of tool configurations |
| `enableLangfuse` | boolean | No | `true` | Enable Langfuse logging |
| `langfuseApiKey` | string (credential) | Yes* | `""` | Langfuse API key (*if logging enabled) |
| `traceName` | string | No | `""` | Langfuse trace name |
| `metadata` | object | No | `{}` | Custom metadata for logging |
| `memory` | object | No | `{}` | Agent memory/context |
| `timeout` | number | No | `300000` | Execution timeout in milliseconds |

### Credentials Required

**Two Credential Types:**

1. **LLM Provider Credential** (OpenAI, Anthropic, etc.)
   - Depends on selected model

2. **Langfuse API Credential Type:** `Langfuse API`
   | Field | Required | Description |
   |-------|----------|-------------|
   | `API Key` | Yes | Langfuse secret API key |
   | `Public Key` | Yes | Langfuse public key |

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | `userInput`, `agentId`, optional `context` |
| **Output Fields** | `response`, `actions`, `traceId`, `tokensUsed`, `iterations` |

### Example Usage

```json
{
  "name": "AI Agent with Langfuse",
  "type": "n8n-nodes-ai-agent-langfuse.aiAgentLangfuse",
  "typeVersion": 1,
  "position": [500, 600],
  "parameters": {
    "operation": "executeAgent",
    "agentId": "agent_research_123",
    "userInput": "Research latest developments in quantum computing",
    "systemPrompt": "You are a research assistant. Use available tools to find information.",
    "maxIterations": 5,
    "enableLangfuse": true,
    "metadata": {
      "taskId": "research_2026_01_30"
    }
  },
  "credentials": {
    "openaiApi": "openai_credential",
    "langfuseApi": "langfuse_credential"
  }
}
```

### Common Use Cases

- Research agents with automatic Langfuse tracking
- Customer support bots with full observability
- Autonomous data processing with monitoring
- Tool-using agents with detailed audit trails
- Complex workflows with multi-step agents

### Important Notes

- Agent execution is automatically traced in Langfuse
- Tool results are logged for debugging
- Memory persists within agent for context
- Each iteration creates a span in Langfuse trace
- Rate limits apply based on LLM provider

### Key Features

- **Automatic Tracing:** Full tracing of LLM reasoning and tool calls
- **Custom Metadata:** Inject sessionId, userId, and custom JSON metadata
- **Tool Calling Support:** Works with LangChain tool-calling agents
