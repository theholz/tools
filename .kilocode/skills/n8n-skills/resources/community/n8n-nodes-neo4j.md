# Neo4j

### Basic Information

- **Package Name:** `n8n-nodes-neo4j`
- **Category:** 🗂️ Graph Database & Knowledge Base
- **Primary Use Case:** Create, query, and manage graph databases for complex relationship mapping and pattern discovery
- **Maintainer:** Neo4j Team
- **npm Repository:** [n8n-nodes-neo4j](https://www.npmjs.com/package/n8n-nodes-neo4j)
- **GitHub Repository:** [neo4j/neo4j-javascript-driver](https://github.com/neo4j/neo4j-javascript-driver)

### Installation Command

```bash
npm install n8n-nodes-neo4j
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| Neo4j | `n8n-nodes-neo4j.neo4j` | 1 | Graph Database |

### Node Description

Neo4j node enables interaction with Neo4j graph database. Execute Cypher queries, create nodes and relationships, traverse graphs, and discover patterns in highly connected data structures.

### Available Operations

1. **Execute Query** (`executeQuery`)
   - Run Cypher query
   - Parameters: Cypher query, parameters
   - Returns: Query results

2. **Create Node** (`createNode`)
   - Create new graph node
   - Parameters: Node labels, properties
   - Returns: Created node data

3. **Create Relationship** (`createRelationship`)
   - Create edge between nodes
   - Parameters: From node, to node, relationship type, properties
   - Returns: Relationship confirmation

4. **Update Node** (`updateNode`)
   - Modify node properties
   - Parameters: Node ID, properties to update
   - Returns: Updated node

5. **Delete** (`delete`)
   - Remove nodes or relationships
   - Parameters: Target identifiers, criteria
   - Returns: Deletion confirmation

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | options | Yes | `executeQuery` | Operation to perform |
| `url` | string | Yes | `bolt://localhost:7687` | Neo4j connection URL |
| `username` | string (credential) | Yes | `neo4j` | Database username |
| `password` | string (credential) | Yes | `""` | Database password |
| `database` | string | No | `neo4j` | Database name |
| `query` | string (textarea) | Yes* | `""` | Cypher query (*for executeQuery) |
| `parameters` | object | No | `{}` | Query parameters |
| `labels` | array | No | `[]` | Node labels (*for createNode) |
| `properties` | object | No | `{}` | Node/relationship properties |
| `fromNodeId` | string | Yes* | `""` | Source node ID (*for relationships) |
| `toNodeId` | string | Yes* | `""` | Target node ID (*for relationships) |
| `relationshipType` | string | Yes* | `""` | Relationship type (*for relationships) |
| `timeout` | number | No | `30000` | Query timeout (ms) |

### Credentials Required

**Neo4j Credential Type:** `Neo4j`

| Field | Required | Description |
|-------|----------|-------------|
| `Connection URL` | Yes | Neo4j bolt/http URL |
| `Username` | Yes | Database username (default: neo4j) |
| `Password` | Yes | Database password |
| `Database` | No | Target database (default: neo4j) |

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | `query`, optional `parameters` |
| **Output Fields** | `records`, `summary`, `success`, `error` |

### Example Usage

```json
{
  "name": "Neo4j Query",
  "type": "n8n-nodes-neo4j.neo4j",
  "typeVersion": 1,
  "position": [850, 950],
  "parameters": {
    "operation": "executeQuery",
    "query": "MATCH (p:Person)-[r:KNOWS]-(friend) WHERE p.name = $name RETURN friend.name, r.since",
    "parameters": {
      "name": "{{$node['Input'].json.personName}}"
    }
  },
  "credentials": {
    "neo4j": "neo4j_credential"
  }
}
```

### Common Use Cases

- Social network analysis and recommendation
- Knowledge graph management
- Master data management with relationships
- Fraud detection through relationship patterns
- Organization hierarchy and access control
- Supply chain mapping and analysis

### Important Notes

- Cypher language is essential for queries
- Relationships are first-class entities
- Indexes improve query performance
- Transactions ensure data consistency
- Connection pooling for performance

### Cypher Examples

- **Match all:** `MATCH (n) RETURN n LIMIT 100`
- **Create node:** `CREATE (n:Person {name: $name}) RETURN n`
- **Find relationships:** `MATCH (a)-[r]->(b) RETURN a, r, b`
- **Shortest path:** `MATCH p=shortestPath((a)-[*]-(b)) WHERE a.name=$start RETURN p`
