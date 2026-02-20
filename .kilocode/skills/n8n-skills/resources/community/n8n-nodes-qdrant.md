# Qdrant

### Basic Information

- **Package Name:** `n8n-nodes-qdrant`
- **Category:** 🧠 Vector Database & Embeddings
- **Primary Use Case:** Manage vector embeddings and perform semantic search using Qdrant vector database
- **Maintainer:** Qdrant Team
- **npm Repository:** [n8n-nodes-qdrant](https://www.npmjs.com/package/n8n-nodes-qdrant)
- **GitHub Repository:** [qdrant/qdrant](https://github.com/qdrant/qdrant)

### Installation Command

```bash
npm install n8n-nodes-qdrant
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| Qdrant | `n8n-nodes-qdrant.qdrant` | 1 | Vector Database |

### Node Description

Qdrant is a vector database for similarity search and RAG. This node enables CRUD operations on vector collections, semantic search, and filtering, making it ideal for building AI applications that require fast vector similarity matching.

### Available Operations

1. **Upsert Vector** (`upsert`)
   - Add or update vector embeddings
   - Parameters: Collection, vectors, metadata
   - Returns: Upsert status and operation details

2. **Search** (`search`)
   - Perform semantic similarity search
   - Parameters: Collection, query vector, limit, filters
   - Returns: Similar items with scores

3. **Get Point** (`getPoint`)
   - Retrieve specific vector by ID
   - Parameters: Collection, point ID
   - Returns: Vector and metadata

4. **Delete Points** (`delete`)
   - Remove vectors from collection
   - Parameters: Collection, point IDs or filter
   - Returns: Deletion confirmation

5. **List Collections** (`listCollections`)
   - Retrieve available collections
   - Parameters: Optional filters
   - Returns: Collection list and metadata

6. **Create Collection** (`createCollection`)
   - Initialize new vector collection
   - Parameters: Collection name, vector size, distance metric
   - Returns: Collection creation confirmation

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | options | Yes | `search` | Operation to perform |
| `apiKey` | string (credential) | Yes | `""` | Qdrant API key |
| `url` | string | Yes | `http://localhost:6333` | Qdrant instance URL |
| `collection` | string | Yes* | `""` | Collection name (*required for most operations) |
| `vectorSize` | number | Yes* | `768` | Vector dimension (*for createCollection) |
| `distanceMetric` | options | No | `cosine` | Distance metric: `cosine`, `euclidean`, `manhattan` |
| `pointId` | string | No | `""` | Point/vector ID |
| `vector` | array | Yes* | `[]` | Vector array (*for upsert) |
| `payload` | object | No | `{}` | Metadata to store with vector |
| `queryVector` | array | Yes* | `[]` | Query vector (*for search) |
| `topK` | number | No | `10` | Number of results to return |
| `filters` | object | No | `{}` | Filter conditions |
| `limit` | number | No | `10` | Result limit |
| `scoreThreshold` | number | No | `0` | Minimum similarity score |

### Credentials Required

**Qdrant Credential Type:** `Qdrant API`

| Field | Required | Description |
|-------|----------|-------------|
| `API Key` | Yes | Qdrant authentication key |
| `URL` | Yes | Qdrant instance URL |

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | `collection`, `vector` (for upsert), `queryVector` (for search) |
| **Output Fields** | `points`, `score`, `payload`, `id`, `status` |

### Example Usage

```json
{
  "name": "Qdrant Search",
  "type": "n8n-nodes-qdrant.qdrant",
  "typeVersion": 1,
  "position": [800, 900],
  "parameters": {
    "operation": "search",
    "collection": "documents",
    "queryVector": "{{$node['Embeddings'].json.vector}}",
    "topK": 5,
    "scoreThreshold": 0.7,
    "filters": {
      "category": ["documentation", "guides"]
    }
  },
  "credentials": {
    "qdrantApi": "qdrant_credential"
  }
}
```

### Common Use Cases

- Semantic search for similar documents
- RAG system with vector retrieval
- Recommendation systems based on similarity
- Duplicate detection across large datasets
- Image/video search with embeddings
- Product similarity matching

### Important Notes

- Vector size must be consistent within collection
- Distance metric affects similarity calculation
- Filtering happens after similarity search
- Batch operations are more efficient than individual inserts
- Collections are independent search spaces
