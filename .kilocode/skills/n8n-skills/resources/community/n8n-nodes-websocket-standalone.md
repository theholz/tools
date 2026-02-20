# WebSocket Standalone

### Basic Information

- **Package Name:** `n8n-nodes-websocket-standalone`
- **Category:** 🌐 Network & Protocol
- **Primary Use Case:** Connect to WebSocket servers for real-time bi-directional communication
- **Maintainer:** Community
- **npm Repository:** [n8n-nodes-websocket-standalone](https://www.npmjs.com/package/n8n-nodes-websocket-standalone)

### Installation Command

```bash
npm install n8n-nodes-websocket-standalone
# or in n8n UI: Manage > Community Nodes > Install
```

### Supported Node Types

| Node Name | Node ID | Version | Type |
|-----------|---------|---------|------|
| WebSocket Client | `n8n-nodes-websocket-standalone.websocketClient` | 1 | Protocol Client |

### Node Description

A dedicated node for establishing WebSocket connections. Unlike standard HTTP requests, this allows for persistent connections to send and receive real-time messages, making it suitable for streaming APIs, chat applications, and live data feeds.

### Available Operations

1. **Send Message** (`send`)
   - Send data to a WebSocket server
   - Parameters: URL, Data
   - Returns: Server response (if immediate) or status

2. **Listen** (`listen`)
   - Connect and wait for incoming messages (Trigger-like behavior)
   - Parameters: URL, Events
   - Returns: Stream of messages

### Core Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | options | Yes | `send` | Operation (`send`, `listen`) |
| `url` | string | Yes | - | WebSocket Server URL (`ws://` or `wss://`) |
| `data` | string | Yes* | - | Payload to send (*for send op) |
| `jsonParse` | boolean | No | `true` | Attempt to parse incoming JSON |

### Credentials Required

**No credentials required** (Optional headers can be added for auth)

### Input & Output

| Aspect | Details |
|--------|---------|
| **Input Types** | `main` |
| **Output Types** | `main` |
| **Expected Input Fields** | `data` |
| **Output Fields** | `message`, `data` |

### Example Usage

```json
{
  "name": "Market Stream",
  "type": "n8n-nodes-websocket-standalone.websocketClient",
  "typeVersion": 1,
  "position": [400, 400],
  "parameters": {
    "url": "wss://stream.binance.com:9443/ws/btcusdt@trade",
    "operation": "listen"
  }
}
```

### Common Use Cases

- Monitoring live cryptocurrency or stock prices
- Integrating with real-time chat services (Slack RTM, Discord Gateway)
- Receiving instant notifications from IoT devices
- Debugging WebSocket APIs

### Important Notes

- `listen` operation acts as a trigger and keeps the workflow running
- Ensure network firewalls allow outgoing WebSocket connections
- SSL (`wss://`) is supported and recommended
