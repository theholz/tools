# OpenClaw MCP Server v2.0

**Comprehensive MCP server exposing OpenClaw's full capability surface to Claude Desktop, Grok (via MCP SuperAssistant), and other MCP clients.**

---

## 🎯 Overview

The OpenClaw MCP Server provides **30 typed tools** that give MCP clients complete control over:

- **Sessions & Agents**: Spawn subagents, send messages, manage sessions
- **File Operations**: Read, write, edit files on the OpenClaw host
- **Shell Execution**: Run commands with full output capture
- **Browser Automation**: Control Chrome/Firefox via Playwright (8 tools)
- **Node Control**: Send notifications, capture photos, get location from paired devices (7 tools)
- **Workflows**: Run Lobster pipelines with approval gates
- **Raw Access**: Pass-through tool for any gateway capability

All tools use the OpenClaw gateway's `/tools/invoke` endpoint, ensuring full security, policy enforcement, and session management handled by the gateway.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd /home/node/Projects/tools/platform-mcp-servers/openclaw-mcp
npm install
```

### 2. Get Your Gateway Token

Check your OpenClaw config:
```bash
cat ~/.openclaw/config.toml | grep -A5 'gateway.http.auth'
```

Or get one from the OpenClaw Control UI.

### 3. Configure Claude Desktop

Copy `claude_desktop_config_clean.json` to your Claude config:

**macOS:**
```bash
cp claude_desktop_config_clean.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Linux:**
```bash
cp claude_desktop_config_clean.json ~/.config/Claude/claude_desktop_config.json
```

**Windows:**
```powershell
copy claude_desktop_config_clean.json %APPDATA%\Claude\claude_desktop_config.json
```

Then edit the file and replace `YOUR_TOKEN_HERE` with your actual token.

### 4. Restart Claude Desktop

Quit and restart Claude Desktop. You should now see 30 OpenClaw tools available.

### 5. Test It

In Claude Desktop, ask:
> "Use the openclaw_health tool to check if the gateway is running"

---

## 📋 Available Tools (30)

### Core (6 tools)
- `openclaw_health` - Check gateway health
- `openclaw_send` - Send message to session/agent
- `openclaw_spawn` - Spawn subagent for task
- `openclaw_sessions_list` - List active sessions
- `openclaw_session_history` - Get session history
- `openclaw_session_status` - Current session info

### Execution (4 tools)
- `openclaw_exec` - Run shell commands
- `openclaw_read` - Read file contents
- `openclaw_write` - Write to files
- `openclaw_edit` - Surgical file edits

### Browser (8 tools)
- `openclaw_browser_status` - Browser status
- `openclaw_browser_open` - Open URL
- `openclaw_browser_snapshot` - Get page structure
- `openclaw_browser_screenshot` - Capture screenshot
- `openclaw_browser_act` - Click/type/interact
- `openclaw_browser_navigate` - Navigate to URL
- `openclaw_browser_tabs` - List open tabs
- `openclaw_browser_console` - Get console output

### Nodes (7 tools)
- `openclaw_nodes_status` - List paired devices
- `openclaw_nodes_notify` - Send notifications
- `openclaw_nodes_camera` - Take photos
- `openclaw_nodes_screen` - Record screen
- `openclaw_nodes_location` - Get GPS location
- `openclaw_nodes_run` - Run commands on device
- `openclaw_nodes_invoke` - Invoke device capability

### Workflows & Agents (4 tools)
- `openclaw_lobster_run` - Run workflow pipeline
- `openclaw_lobster_resume` - Resume/approve pipeline
- `openclaw_agents_list` - List configured agents
- `openclaw_run_agent` - Query agent (stateless)

### Advanced (1 tool)
- `openclaw_tool` - Raw pass-through to any gateway tool

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENCLAW_GATEWAY_URL` | Gateway HTTP URL | `http://localhost:18789` |
| `OPENCLAW_GATEWAY_TOKEN` | Auth token | (required) |
| `OPENCLAW_SESSION_KEY` | Pin to specific session | (optional) |
| `OPENCLAW_READONLY` | Disable write operations | `false` |

### Connection Options

**Local:**
```bash
OPENCLAW_GATEWAY_URL=http://localhost:18789
```

**LAN:**
```bash
OPENCLAW_GATEWAY_URL=http://192.168.50.24:18789
```

**Tailscale:**
```bash
OPENCLAW_GATEWAY_URL=http://100.66.222.31:18789
```

**Cloudflare Tunnel:**
```bash
OPENCLAW_GATEWAY_URL=https://bot.holbrook.app
```

---

## 🧪 Testing

Run the test suite:

```bash
npm test
# or
node test.js
```

Expected output:
```
=== Test Summary ===
Gateway Health: ✅ PASS
Tool Invoke: ✅ PASS
MCP Server: ✅ PASS

Overall: ✅ ALL TESTS PASSED
```

---

## 📚 Usage Examples

### Example 1: Browser Automation (Trading Workflow)

```typescript
// Open TradingView chart
await openclaw_browser_open({
  targetUrl: "https://tradingview.com/chart/BTCUSD"
});

// Get page structure
const snapshot = await openclaw_browser_snapshot({
  refs: "aria",
  compact: true
});

// Click on indicator
await openclaw_browser_act({
  request: {
    kind: "click",
    ref: "e12"  // from snapshot
  }
});

// Capture evidence
const screenshot = await openclaw_browser_screenshot({
  fullPage: true
});
```

### Example 2: Multi-Agent Workflow

```typescript
// Spawn research subagent
const session = await openclaw_spawn({
  agentId: "researcher",
  task: "Research IADSS indicator parameters",
  label: "research-iadss"
});

// Get session history later
const history = await openclaw_session_history({
  sessionKey: session.sessionKey,
  limit: 50
});
```

### Example 3: Node Control

```typescript
// List paired devices
const nodes = await openclaw_nodes_status();

// Send notification to phone
await openclaw_nodes_notify({
  node: "iphone",
  title: "Trade Signal",
  body: "IADSS: BUY detected on BTC/USD",
  priority: "timeSensitive"
});

// Capture photo
const photo = await openclaw_nodes_camera({
  node: "iphone",
  facing: "back"
});
```

---

## 🔒 Security

- **Gateway-side auth**: All requests use `OPENCLAW_GATEWAY_TOKEN`
- **Tool policy enforcement**: Gateway enforces per-agent allow/deny lists
- **Session isolation**: Optional `OPENCLAW_SESSION_KEY` pins operations to one session
- **Read-only mode**: Set `OPENCLAW_READONLY=true` for untrusted clients
- **No credential leaks**: Error messages sanitized

---

## 📖 Documentation

- `IMPLEMENTATION.md` - Full implementation details, architecture, testing results
- `claude_desktop_config.json` - Annotated config with examples
- `claude_desktop_config_clean.json` - Ready-to-use minimal config
- `docs/mcp-server-architecture.md` - Original architecture design (in workspace)

---

## 🐛 Troubleshooting

### "Authentication failed"
- Check `OPENCLAW_GATEWAY_TOKEN` is set correctly
- Verify token is valid in `~/.openclaw/config.toml`

### "Gateway not reachable"
- Ensure OpenClaw gateway is running
- Check `OPENCLAW_GATEWAY_URL` matches your setup
- Test with: `curl http://localhost:18789/health`

### "Tool blocked by gateway policy"
- Tool may be in gateway's deny list
- Check gateway logs for policy violations
- Some tools require specific agent permissions

### MCP client doesn't see tools
- Restart MCP client after config changes
- Check config file syntax is valid JSON
- Verify `command` path is absolute and correct

---

## 🛠️ Development

### Project Structure

```
openclaw-mcp/
├── index.js                        # Main MCP server (30 tools)
├── test.js                         # Test suite
├── package.json                    # Dependencies
├── README.md                       # This file
├── IMPLEMENTATION.md               # Implementation details
├── claude_desktop_config.json      # Annotated config
└── claude_desktop_config_clean.json # Minimal config
```

### Adding New Tools

1. Add tool registration in `index.js`
2. Use `invokeTool(tool, action, args)` helper
3. Add Zod schema for type safety
4. Handle errors with `safeError(err)`
5. Update README and IMPLEMENTATION.md
6. Test with `node test.js`

---

## 📝 Changelog

### v2.0.0 (2025-02-20)
- **Complete rewrite** with 30 comprehensive tools
- Browser automation (8 tools)
- Node control (7 tools)
- Session management (6 tools)
- File operations (4 tools)
- Workflows & agents (4 tools)
- Pass-through tool for raw access
- Comprehensive error handling
- Security features (readonly mode, session pinning)
- Full test suite
- Production-ready documentation

### v1.0.0 (2025-02-16)
- Initial release with 3 tools
- Basic health check and agent query

---

## 🤝 Contributing

This is part of the OpenClaw project. For issues or contributions, see the main OpenClaw repository.

---

## 📄 License

Same license as OpenClaw project.

---

## 🙏 Acknowledgments

Built following the architecture design from `docs/mcp-server-architecture.md` by the OpenClaw team.

Implements the **MCP (Model Context Protocol)** standard by Anthropic.

---

**Version:** 2.0.0  
**Author:** OpenClaw Team  
**Last Updated:** 2025-02-20
