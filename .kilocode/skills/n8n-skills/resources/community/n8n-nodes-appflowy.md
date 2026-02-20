# AppFlowy

### Basic Information

- **Package Name:** `n8n-nodes-appflowy`
- **Category:** 📝 Productivity & Knowledge
- **Primary Use Case:** Manage databases and documents in AppFlowy
- **Maintainer:** Community
- **npm Repository:** [n8n-nodes-appflowy](https://www.npmjs.com/package/n8n-nodes-appflowy)

### Installation Command

```bash
npm install n8n-nodes-appflowy
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| AppFlowy | `n8n-nodes-appflowy.appFlowy` | 1 | App Integration |

### Node Description

Integrates n8n with AppFlowy, an open-source alternative to Notion. Allows reading and writing to AppFlowy databases and documents, enabling the creation of automated knowledge bases and project management workflows.

### Available Operations

1. **Create Page** (`createPage`)
   - Create a new document/page
   - Parameters: Parent ID, Title
   - Returns: Page object

2. **Get Database** (`getDatabase`)
   - Retrieve rows from a database
   - Parameters: Database ID, filters
   - Returns: Database rows

3. **Create Row** (`createRow`)
   - Add a new record to a database
   - Parameters: Database ID, properties
   - Returns: Created row

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | options | Yes | `getDatabase` | Operation to perform |
| `resource` | options | Yes | `database` | Resource type (`database`, `page`) |
| `id` | string | Yes | - | Database or Page ID |
| `data` | json | No | - | Data fields for creation |

### Credentials Required

**Credential Type:** `appFlowyApi`

| Field | Required | Description |
|-------|----------|-------------|
| `Access Token` | Yes | AppFlowy Cloud Access Token |

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | `id`, `data` |
| **Output Fields** | JSON representation of AppFlowy objects |

### Example Usage

```json
{
  "name": "Log Task",
  "type": "n8n-nodes-appflowy.appFlowy",
  "typeVersion": 1,
  "position": [450, 450],
  "parameters": {
    "resource": "database",
    "operation": "createRow",
    "id": "db_12345",
    "data": {
      "Name": "New Task",
      "Status": "To Do"
    }
  },
  "credentials": {
    "appFlowyApi": "appflowy_creds"
  }
}
```

### Common Use Cases

- Syncing Linear/Jira tasks to AppFlowy
- Archiving emails or messages into a knowledge base
- Automated daily journaling
- Project tracking dashboard updates

### Important Notes

- Supports AppFlowy Cloud; self-hosted support depends on API compatibility
- Rich text content may require specific formatting
