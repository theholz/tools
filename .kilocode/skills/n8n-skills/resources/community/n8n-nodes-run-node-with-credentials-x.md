# Run Node with Credentials X

### Basic Information

- **Package Name:** `n8n-nodes-run-node-with-credentials-x`
- **Category:** 🛠️ Utility & Maintenance
- **Primary Use Case:** Dynamically inject credentials into nodes at runtime
- **Maintainer:** Community
- **npm Repository:** [n8n-nodes-run-node-with-credentials-x](https://www.npmjs.com/package/n8n-nodes-run-node-with-credentials-x)

### Installation Command

```bash
npm install n8n-nodes-run-node-with-credentials-x
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| Run Node Auth | `n8n-nodes-run-node-with-credentials-x.runNodeWithCredentials` | 1 | Utility |

### Node Description

Allows advanced workflows to select which credential to use for a subsequent node dynamically. This is useful for multi-tenant architectures or managed service providers (MSPs) where a single workflow needs to iterate over multiple client accounts using different credentials.

### Available Operations

1. **Inject Credential** (`inject`)
   - Pass a credential ID dynamically to the next node
   - Parameters: Credential ID, Node Type
   - Returns: Passthrough data with auth context

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `credentialId` | string | Yes | - | ID of the credential to use |
| `nodeType` | string | Yes | - | Type of node to execute (e.g., `n8n-nodes-base.httpRequest`) |
| `parameters` | json | No | `{}` | Parameters for the target node |

### Credentials Required

**No credentials required** (Uses the injected credential ID)

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | `credentialId` (from previous node usually) |
| **Output Fields** | Result of the executed node |

### Example Usage

```json
{
  "name": "Dynamic API Call",
  "type": "n8n-nodes-run-node-with-credentials-x.runNodeWithCredentials",
  "typeVersion": 1,
  "position": [600, 600],
  "parameters": {
    "credentialId": "={{ $json.clientId }}",
    "nodeType": "n8n-nodes-base.httpRequest",
    "parameters": {
      "url": "https://api.example.com/data",
      "method": "GET"
    }
  }
}
```

### Common Use Cases

- Processing data for 50+ clients with one workflow loop
- Dynamically selecting API keys based on environment (dev/prod)
- Building "meta-workflows" that manage other services
- rotating credentials programmatically

### Important Notes

- Advanced node: Misconfiguration can cause workflow errors
- Requires knowing the internal Node Type ID (e.g., `n8n-nodes-base.googleSheets`)
- Security implication: Ensure credential IDs are not exposed to untrusted inputs
