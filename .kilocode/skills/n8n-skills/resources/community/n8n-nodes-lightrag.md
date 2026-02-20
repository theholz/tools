# LightRAG

### Basic Information

- **Package Name:** `n8n-nodes-lightrag`
- **Category:** 🧠 Knowledge Graphs & RAG
- **Primary Use Case:** Build and query knowledge graphs for advanced Retrieval-Augmented Generation with structured knowledge
- **Maintainer:** LightRAG Team
- **npm Repository:** [n8n-nodes-lightrag](https://www.npmjs.com/package/n8n-nodes-lightrag)
- **GitHub Repository:** [GAIR-NLP/LightRAG](https://github.com/GAIR-NLP/LightRAG)

### Installation Command

```bash
npm install n8n-nodes-lightrag
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| LightRAG | `n8n-nodes-lightrag.lightrag` | 1 | Knowledge Graph/RAG |

### Node Description

LightRAG is a lightweight knowledge graph system for RAG applications. This node enables you to add documents to a knowledge base, build structured knowledge graphs, and query them for context-aware responses that leverage the underlying knowledge structure.

### Available Operations

1. **Add Document** (`addDocument`)
   - Ingest document into knowledge graph
   - Parameters: Document content, metadata
   - Returns: Document ID and indexing status

2. **Query** (`query`)
   - Search knowledge graph and get relevant context
   - Parameters: Query text, retrieval options
   - Returns: Relevant documents and entities

3. **Query Structured** (`queryStructured`)
   - Query with structured filters
   - Parameters: Query, filters, entity types
   - Returns: Structured query results

4. **Get Entities** (`getEntities`)
   - Retrieve entities from knowledge graph
   - Parameters: Filter criteria, limit
   - Returns: Entity list with relationships

5. **Get Relations** (`getRelations`)
   - Retrieve relationships between entities
   - Parameters: Entity filters
   - Returns: Relationship list

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | options | Yes | `query` | Operation to perform |
| `apiKey` | string (credential) | Yes | `""` | LightRAG API key |
| `workspaceId` | string | Yes | `""` | Workspace/project identifier |
| `document` | string (textarea) | Yes* | `""` | Document content (*for addDocument) |
| `documentMetadata` | object | No | `{}` | Document metadata (title, source, etc) |
| `query` | string (textarea) | Yes* | `""` | Query text (*for query operations) |
| `mode` | options | No | `hybrid` | Query mode: `local`, `global`, `hybrid` |
| `limit` | number | No | `10` | Maximum results to return |
| `threshold` | number | No | `0.5` | Relevance threshold (0-1) |
| `includeEntities` | boolean | No | `true` | Include entity information |
| `includeRelations` | boolean | No | `true` | Include relationship information |
| `entityTypes` | array | No | `[]` | Filter by entity type |
| `relationshipTypes` | array | No | `[]` | Filter by relationship type |

### Credentials Required

**LightRAG API Credential Type:** `LightRAG API`

| Field | Required | Description |
|-------|----------|-------------|
| `API Key` | Yes | LightRAG authentication key |
| `Base URL` | No | Custom LightRAG endpoint |

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | `document` (for adding) or `query` (for querying) |
| **Output Fields** | `results`, `entities`, `relations`, `relevanceScore`, `sources` |

### Example Usage

```json
{
  "name": "LightRAG Query",
  "type": "n8n-nodes-lightrag.lightrag",
  "typeVersion": 1,
  "position": [750, 850],
  "parameters": {
    "operation": "query",
    "workspaceId": "workspace_abc123",
    "query": "What are the main topics discussed in documents?",
    "mode": "hybrid",
    "limit": 5,
    "includeEntities": true
  },
  "credentials": {
    "lightragApi": "lightrag_credential"
  }
}
```

### Common Use Cases

- Enterprise knowledge base with entity-relationship understanding
- Research paper analysis and synthesis
- FAQ systems with structured knowledge
- Competitive intelligence with knowledge graphs
- Document question-answering with relationships
- Knowledge discovery and pattern finding

### Important Notes

- Knowledge graphs improve over time with more documents
- Entity extraction and relation discovery are automatic
- Hybrid query mode combines local and global search
- Metadata helps with filtering and categorization
- Large documents may be chunked automatically
