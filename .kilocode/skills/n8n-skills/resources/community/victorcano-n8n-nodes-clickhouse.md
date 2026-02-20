# ClickHouse

### Basic Information

- **Package Name:** `@victorcano/n8n-nodes-clickhouse`
- **Category:** 🗄️ Database & Analytics
- **Primary Use Case:** Execute high-performance analytical queries and manage data in ClickHouse
- **Maintainer:** Victor Cano
- **npm Repository:** [@victorcano/n8n-nodes-clickhouse](https://www.npmjs.com/package/@victorcano/n8n-nodes-clickhouse)
- **GitHub Repository:** [victorcano/n8n-nodes-clickhouse](https://github.com/victorcano/n8n-nodes-clickhouse)

### Installation Command

```bash
npm install @victorcano/n8n-nodes-clickhouse
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| ClickHouse | `@victorcano/n8n-nodes-clickhouse.clickhouse` | 1 | Database |

### Node Description

ClickHouse is a columnar OLAP database optimized for analytical queries on large datasets. This node executes queries against ClickHouse clusters for fast aggregation, real-time analytics, and time-series data analysis.

### Available Operations

1. **Execute Query** (`executeQuery`)
   - Run ClickHouse SQL query
   - Parameters: SQL query, query settings
   - Returns: Query results

2. **Insert Data** (`insertData`)
   - Bulk insert rows into table
   - Parameters: Table name, data rows
   - Returns: Insert confirmation

3. **Describe Table** (`describeTable`)
   - Get table schema and metadata
   - Parameters: Table name
   - Returns: Column definitions and types

4. **List Tables** (`listTables`)
   - Retrieve tables in database
   - Parameters: Optional filter
   - Returns: Table list

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | options | Yes | `executeQuery` | Operation to perform |
| `host` | string | Yes | `localhost` | ClickHouse host |
| `port` | number | No | `8123` | ClickHouse HTTP port |
| `database` | string | Yes | `default` | Database name |
| `username` | string (credential) | No | `default` | Database username |
| `password` | string (credential) | No | - | Database password |
| `query` | string (textarea) | Yes* | - | SQL query (*for executeQuery) |
| `table` | string | Yes* | - | Table name (*for insert/describe) |
| `data` | array | Yes* | `[]` | Data rows to insert (*for insertData) |
| `format` | options | No | `JSON` | Response format: `JSON`, `CSV`, `TabSeparated` |
| `timeout` | number | No | `30000` | Query timeout (ms) |
| `ssl` | boolean | No | `false` | Use HTTPS connection |

### Credentials Required

**ClickHouse Credential Type:** `ClickHouse`

| Field | Required | Description |
|-------|----------|-------------|
| `Host` | Yes | ClickHouse server hostname |
| `Port` | No | HTTP port (default: 8123) |
| `Database` | Yes | Default database name |
| `Username` | No | Authentication username |
| `Password` | No | Authentication password |
| `SSL` | No | Enable SSL/HTTPS |

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | `query` (for queries), `table` and `data` (for inserts) |
| **Output Fields** | `data` (array), `rowsRead`, `rowsWritten`, `executionTime` |

### Example Usage

```json
{
  "name": "ClickHouse Analytics",
  "type": "@victorcano/n8n-nodes-clickhouse.clickhouse",
  "typeVersion": 1,
  "position": [900, 1000],
  "parameters": {
    "operation": "executeQuery",
    "host": "localhost",
    "database": "analytics",
    "query": "SELECT timestamp, COUNT(*) as events FROM events WHERE timestamp >= now() - INTERVAL 1 DAY GROUP BY toDate(timestamp) ORDER BY timestamp DESC"
  },
  "credentials": {
    "clickhouse": "clickhouse_credential"
  }
}
```

### Common Use Cases

- Real-time analytics dashboards
- Log aggregation and analysis
- Time-series data processing
- Large-scale data reporting
- Event tracking and user behavior analysis
- Financial data analysis

### Important Notes

- Ensure ClickHouse server is accessible from n8n
- Use bulk inserts for better performance
- Queries are executed asynchronously
- Supported formats: JSON, CSV, TabSeparated
- SSL support available for secure connections
