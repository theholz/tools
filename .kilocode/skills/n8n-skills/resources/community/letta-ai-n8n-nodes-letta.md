# Letta

### Basic Information

- **Package Name:** `@letta-ai/n8n-nodes-letta`
- **Category:** 🤖 AI & Agentic Platforms
- **Primary Use Case:** Integrate Letta AI agents for autonomous conversations and multi-turn interactions
- **Maintainer:** Letta AI Team
- **npm Repository:** [@letta-ai/n8n-nodes-letta](https://www.npmjs.com/package/@letta-ai/n8n-nodes-letta)
- **GitHub Repository:** [letta-ai/n8n-nodes-letta](https://github.com/letta-ai/n8n-nodes-letta)

### Installation Command

```bash
npm install @letta-ai/n8n-nodes-letta
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| Letta Agent | `@letta-ai/n8n-nodes-letta.lettaAgent` | 1 | Agent/LLM |

### Node Description

Letta (formerly MemGPT) provides persistent AI agents with extended memory capabilities. This node enables you to create, manage, and interact with Letta agents directly within n8n workflows, supporting stateful conversations across multiple workflow executions.

### Available Operations

1. **Create Agent** (`createAgent`)
   - Create new Letta agent instance
   - Parameters: Agent name, model, system prompt, memory configuration
   - Returns: Agent ID and metadata

2. **Send Message** (`sendMessage`)
   - Send user message to existing agent
   - Parameters: Agent ID, user message, optional context
   - Returns: Agent response, memory state updates

3. **List Agents** (`listAgents`)
   - Retrieve all agents or filter by criteria
   - Parameters: Optional filters (user, status)
   - Returns: Array of agent summaries

4. **Get Agent Details** (`getAgentDetails`)
   - Retrieve full agent configuration and state
   - Parameters: Agent ID
   - Returns: Complete agent data including memory, tools, settings

5. **Update Agent** (`updateAgent`)
   - Modify agent configuration
   - Parameters: Agent ID, fields to update
   - Returns: Updated agent configuration

6. **Delete Agent** (`deleteAgent`)
   - Remove agent and associated data
   - Parameters: Agent ID
   - Returns: Confirmation status

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | options | Yes | `sendMessage` | Operation to perform |
| `apiKey` | string (credential) | Yes | `""` | Letta API key |
| `baseUrl` | string | No | `https://api.letta.com` | Letta API endpoint |
| `agentId` | string | Yes* | `""` | Agent identifier (*required for most operations) |
| `message` | string (textarea) | Yes* | `""` | User message (*required for sendMessage) |
| `agentName` | string | Yes* | `""` | Name for new agent (*required for createAgent) |
| `systemPrompt` | string (textarea) | No | `""` | Custom system prompt for agent |
| `model` | options | No | `gpt-4` | LLM model to use: `gpt-4`, `gpt-3.5-turbo`, `claude-3-opus`, `claude-3-sonnet` |
| `temperature` | number | No | `0.7` | Model temperature (0-1) for response randomness |
| `maxTokens` | number | No | `2048` | Maximum tokens in agent response |
| `memoryConfig` | object | No | `{}` | Memory settings including size, retention |

### Credentials Required

**Letta API Credential Type:** `Letta API`

| Field | Required | Description |
|-------|----------|-------------|
| `API Key` | Yes | Letta API key (obtain from Letta dashboard) |
| `API Endpoint` | No | Custom API endpoint (default: api.letta.com) |

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | `message`, `agentId` (depending on operation) |
| **Output Fields** | `response`, `agentId`, `memoryUpdates`, `toolCalls`, `tokenUsage` |

### Example Usage

```json
{
  "name": "Letta Agent",
  "type": "@letta-ai/n8n-nodes-letta.lettaAgent",
  "typeVersion": 1,
  "position": [350, 450],
  "parameters": {
    "operation": "sendMessage",
    "agentId": "agent_abc123def456",
    "message": "What's in my memory about previous projects?",
    "temperature": 0.7,
    "maxTokens": 2048
  },
  "credentials": {
    "lettaApi": "letta_api_credential_name"
  }
}
```

### Common Use Cases

- Multi-turn conversations with persistent memory
- Customer support agents that remember interaction history
- Research assistants that retain context across queries
- Autonomous task execution with stateful decision-making
- Interactive debugging and problem-solving workflows

### Important Notes

- Agent memory persists across workflow executions
- Memory configuration impacts agent response quality
- API rate limits apply based on Letta subscription tier
- Agents can be configured with custom tools and knowledge
- **Use instead of:** Custom memory management in Code, Storing context in databases manually

### Key Features

- **Persistent Memory:** Memory blocks that persist across all interactions
- **Agent Managed Memory:** Agents can autonomously organize and update their memory
- **Shareable Memory:** Multiple agents can access and coordinate through shared memory blocks
- **Always in Context:** No retrieval needed - memory stays in context

### Memory Block Types

- `knowledge` - Factual information and knowledge
- `guidelines` - Instructions and rules for agent behavior
- `state_tracking` - Current state and progress tracking
- `scratchpad` - Temporary working memory
