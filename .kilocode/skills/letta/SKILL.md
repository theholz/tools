---
name: letta
description: Guide for using Letta (formerly MemGPT) for stateful agent memory and context management. Covers agent creation, memory block management, MCP tool integration, and RAG patterns.
version: 1.0.0
last_updated: 2025-01-30
---

# Letta (MemGPT) Skill

## Overview

Letta (formerly MemGPT) is a framework for building stateful agents with long-term memory. It allows agents to maintain context across extended conversations and manage large amounts of information by paging data in and out of the context window.

## Core Concepts

- **Agents**: Stateful entities that persist across sessions.
- **Memory**: Divided into:
  - **Core Memory**: Always in context (User & Persona blocks).
  - **Archival Memory**: Long-term storage (Database/Vector Store).
  - **Recall Memory**: Conversation history.
- **Tools**: Functions or MCP tools the agent can execute.
- **Sources**: External data loaded into archival memory (e.g., documents, PDFs).

## Quick Start (Python SDK)

### Installation
```bash
pip install letta
```

### Basic Agent Creation
```python
from letta import create_client

client = create_client()

agent_state = client.create_agent(
    name="rag_researcher",
    memory_blocks=[
        {"label": "persona", "value": "You are a specialized research assistant."},
        {"label": "human", "value": "User is a data scientist."}
    ],
    llm_config={"model": "gpt-4o", "model_endpoint_type": "openai"},
    embedding_config={"embedding_model": "text-embedding-3-small", "embedding_endpoint_type": "openai"}
)

print(f"Agent created with ID: {agent_state.id}")
```

## RAG Patterns with Letta

### 1. Loading Data (Sources)
To perform RAG, you load data into a "Source" and attach it to an agent.

```python
# Create a source
source = client.create_source(name="financial_docs")

# Load file into source
client.load_file_into_source(
    filename="quarterly_report.pdf",
    source_id=source.id
)

# Attach source to agent
client.attach_source_to_agent(
    source_id=source.id,
    agent_id=agent_state.id
)
```

### 2. Archival Memory Search
The agent automatically searches archival memory (attached sources) when it needs information not in core memory. You can also explicitly query it.

```python
# Explicit query (useful for debugging or pre-fetching)
results = client.archival_memory_search(
    agent_id=agent_state.id,
    query="Q3 revenue growth",
    limit=5
)
```

## Integration with MCP

Letta supports the Model Context Protocol (MCP) to extend agent capabilities.

### Adding MCP Tools
```python
# List tools from a connected MCP server
tools = client.list_mcp_tools_by_server("weather-server")

# Add a specific tool to Letta
weather_tool = client.add_mcp_tool(
    mcp_server_name="weather-server",
    mcp_tool_name="get_weather"
)

# Attach tool to agent
client.add_tool_to_agent(
    agent_id=agent_state.id,
    tool_id=weather_tool.id
)
```

## Integration with n8n

Use the **Letta Node** (Community Node) in n8n for orchestration.

### Common n8n Operations
1.  **Create Agent**: Initialize a new researcher for a specific task.
2.  **Send Message**: Send user queries or crawl results to the agent.
    -   *Input*: "Analyze this text: [Content from Crawl4AI]"
3.  **Update Memory**: specific n8n flows can update the Core Memory (e.g., "Current Goal: Writing Report").
4.  **Manage Sources**: Trigger a Letta source update when new files appear in Google Drive.

## Best Practices

1.  **Memory Management**:
    -   Keep **Core Memory** small and focused (Persona + Current Context).
    -   Use **Archival Memory** for knowledge base (RAG).
    -   Use **Recall Memory** for conversation history.

2.  **Tool Use**:
    -   Give agents precise tools for specific tasks (e.g., `save_to_neo4j` instead of generic `db_write`).
    -   Use descriptions in tools to guide the agent on *when* to use them.

3.  **RAG Optimization**:
    -   Chunk data effectively before loading into Sources.
    -   Use specific source names so agents know what they are searching.

## Troubleshooting

-   **Context Window Full**: The agent handles this by moving older messages to Recall Memory. If Core Memory is too full, you must manually edit/summarize it.
-   **Hallucinations**: Ensure the agent checks Archival Memory. adding a system prompt instruction "Always check archival memory for facts" helps.
