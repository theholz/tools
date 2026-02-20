# TriggerCMD

### Basic Information

- **Package Name:** `n8n-nodes-triggercmd`
- **Category:** 🖥️ System & IoT
- **Primary Use Case:** Execute commands on remote computers via TriggerCMD
- **Maintainer:** Community
- **npm Repository:** [n8n-nodes-triggercmd](https://www.npmjs.com/package/n8n-nodes-triggercmd)

### Installation Command

```bash
npm install n8n-nodes-triggercmd
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| TriggerCMD | `n8n-nodes-triggercmd.triggerCmd` | 1 | App Integration |

### Node Description

Integrates with TriggerCMD, a service that allows you to run commands on your computers securely from the cloud. This node enables n8n to act as an orchestration layer for physical or remote desktop automation.

### Available Operations

1. **Trigger Command** (`trigger`)
   - Run a pre-configured command on a specific computer
   - Parameters: Computer Name, Trigger Name, Params
   - Returns: Execution ID / Result

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `computer` | string | Yes | - | Name of the target computer |
| `trigger` | string | Yes | - | Name of the command trigger |
| `params` | string | No | - | Arguments to pass to the command |

### Credentials Required

**Credential Type:** `triggerCmdApi`

| Field | Required | Description |
|-------|----------|-------------|
| `Token` | Yes | TriggerCMD API Token (from user profile) |

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | `computer`, `trigger` |
| **Output Fields** | `message`, `dispatchId` |

### Example Usage

```json
{
  "name": "Wake PC",
  "type": "n8n-nodes-triggercmd.triggerCmd",
  "typeVersion": 1,
  "position": [300, 500],
  "parameters": {
    "computer": "Home-PC",
    "trigger": "Calculator"
  },
  "credentials": {
    "triggerCmdApi": "triggercmd_token"
  }
}
```

### Common Use Cases

- Smart home automation (e.g., turning off PC at night)
- Remote server management scripts
- Launching desktop applications from a webhook
- IoT integration without complex networking

### Important Notes

- Requires the TriggerCMD agent to be installed and running on the target machine
- Commands must be defined in the local agent's `commands.json` or GUI
- Secure way to bridge cloud workflows with local hardware
