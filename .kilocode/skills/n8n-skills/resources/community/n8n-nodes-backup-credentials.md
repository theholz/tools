# Backup Credentials

### Basic Information

- **Package Name:** `n8n-nodes-backup-credentials`
- **Category:** 🛠️ Utility & Maintenance
- **Primary Use Case:** Securely export and backup n8n credentials
- **Maintainer:** Community
- **npm Repository:** [n8n-nodes-backup-credentials](https://www.npmjs.com/package/n8n-nodes-backup-credentials)

### Installation Command

```bash
npm install n8n-nodes-backup-credentials
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| Backup Credentials | `n8n-nodes-backup-credentials.backupCredentials` | 1 | Utility |

### Node Description

A critical utility for n8n administrators, enabling the automated export of credentials. This allows for scheduled backups of sensitive configuration data, which is essential for disaster recovery and environment migration.

### Available Operations

1. **Backup All** (`backupAll`)
   - Export all credentials in encrypted or decrypted format
   - Parameters: Output format
   - Returns: JSON object containing credential data

2. **Backup Specific** (`backupSpecific`)
   - Export specific credentials by ID or name
   - Parameters: Credential IDs/Names
   - Returns: JSON object

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | options | Yes | `backupAll` | Operation to perform |
| `format` | options | Yes | `decrypted` | Export format (`encrypted`, `decrypted`) |
| `includeNames` | boolean | No | `true` | Include credential names in export |

### Credentials Required

**No credentials required** (Uses internal n8n permissions; may require owner role execution)

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | Trigger (e.g., Schedule) |
| **Output Fields** | `credentials` (JSON object) |

### Example Usage

```json
{
  "name": "Weekly Credential Backup",
  "type": "n8n-nodes-backup-credentials.backupCredentials",
  "typeVersion": 1,
  "position": [300, 300],
  "parameters": {
    "operation": "backupAll",
    "format": "decrypted"
  }
}
```

### Common Use Cases

- Automated weekly backups of n8n configuration
- Migrating credentials between development and production instances
- Auditing credential usage and existence
- Syncing credentials to a secure vault (e.g., Vault, 1Password)

### Important Notes

- **SECURITY WARNING:** Decrypted exports contain plain-text secrets. Handle output with extreme care.
- Ensure the destination (e.g., S3 bucket, encrypted file) is secure.
- May require `N8N_ENCRYPTION_KEY` to decrypt if exporting decrypted.
