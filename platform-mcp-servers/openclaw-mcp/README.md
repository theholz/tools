# OpenClaw MCP Server

MCP server that exposes your **OpenClaw** gateway to MCP clients. Use it with [MCP SuperAssistant](https://mcpsuperassistant.ai/) so that **Grok** (or ChatGPT, Perplexity, etc.) can talk to your OpenClaw agent from the browser.

Same idea as using Desktop Commander over SSE: the SuperAssistant proxy loads this server (via stdio), and the AI platform gets tools like `openclaw_run_agent` and `openclaw_health`.

## How it works

1. **MCP SuperAssistant** runs a local proxy (`npx @srbhptl39/mcp-superassistant-proxy --config ./config.json`).
2. The proxy spawns this OpenClaw MCP server as a **stdio** subprocess and forwards tool calls to it.
3. This server calls your OpenClaw gateway over HTTP (`OPENCLAW_GATEWAY_URL`, default `http://localhost:18789`).
4. When you use Grok (or another supported AI) with the extension, it can call **openclaw_run_agent** to send a message to your OpenClaw agent and get a response.

## If you need a tool that doesn't exist (for AI assistants)

When helping the user, if you need a **capability that no current MCP tool provides**, do not assume it's impossible. Instead:

1. **Describe the missing tool** in plain language: what it should do, what inputs it needs, and what it should return (e.g. "a tool that lists open browser tabs with their URLs" or "a tool that runs a shell command and returns stdout").
2. **Suggest how to add it**: many capabilities are available as existing MCP servers (npm packages or stdio servers). If you know one (e.g. `@modelcontextprotocol/server-filesystem`, `chrome-devtools-mcp`), name it and say how to add it to the proxy config (new entry in `mcpServers` in `config-superassistant.grok.json`, then restart the proxy).
3. If you don't know an existing server, still describe the desired tool; the user can search for an MCP server that provides it or have one built.

The user can install new tools by adding servers to their SuperAssistant config and restarting the proxy; your job is to explain *what* is needed so they can add it as an option.

## Prerequisites

- **OpenClaw** gateway running (e.g. Docker with port `18789` mapped).
- **HTTP responses endpoint** enabled in OpenClaw (see below).
- **Node.js** v18+ (for the proxy and this server).

## Enable OpenClaw HTTP API

The `openclaw_run_agent` tool uses the OpenResponses endpoint `POST /v1/responses`, which is **disabled by default**. Enable it once:

```bash
# From the machine that can run docker exec on openclaw:
docker exec openclaw node dist/index.js config set gateway.http.endpoints.responses.enabled true
# Restart OpenClaw so the change takes effect
cd /path/to/openclaw && docker compose restart openclaw
```

Or set it in the config file (in the openclaw-data volume) under `gateway.http.endpoints.responses.enabled: true`.

## Install and run

```bash
cd platform-mcp-servers/openclaw-mcp
npm install
```

Environment variables (for the process the proxy spawns):

- **OPENCLAW_GATEWAY_URL** – Gateway base URL (default: `http://localhost:18789`).
- **OPENCLAW_GATEWAY_TOKEN** – Your gateway token (same as in OpenClaw config / `.env`).

## SuperAssistant Instructions (optional)

The file **superassistant-instructions.md** in this directory is a single Instructions document you can paste into the MCP SuperAssistant extension **Instructions** field (the large "Instructions" text area, not Custom Instructions). It includes:

- A short **explanation of the JSONL syntax** (why the AI outputs tool calls in that format and why the format is strict).
- The full **operational rules** (one function at a time, call_id, how to format parameters).
- **Tool descriptions** for OpenClaw and Desktop Commander so the AI knows what each tool does and what parameters to pass.

Keep **Custom Instructions** for your own blurb (e.g. the "MISSING TOOLS" text). The extension may still inject an "Available tools" list from the proxy; having the same tools described in Instructions gives the AI consistent context.

## MCP SuperAssistant config

Use the example config in this repo (copy and customize):

```bash
cp config-superassistant.example.json /path/to/your/config.json
# Edit config.json: set ABSOLUTE_PATH_TO and YOUR_GATEWAY_TOKEN
```

**Example combined config** (OpenClaw + Desktop Commander):

```json
{
  "mcpServers": {
    "openclaw": {
      "command": "node",
      "args": ["/home/tait/Projects/localai/platform-mcp-servers/openclaw-mcp/index.js"],
      "env": {
        "OPENCLAW_GATEWAY_URL": "https://bot.holbrook.app",
        "OPENCLAW_GATEWAY_TOKEN": "cc586fdad2e982e4097952ab53d81ed567ed37058367da98"
      }
    },
    "desktop-commander": {
      "command": "npx",
      "args": ["-y", "@wonderwhy-er/desktop-commander@latest"]
    }
  }
}
```

Replace:

- Path in `args` with your real project path (e.g. `/home/tait/Projects/localai`).
- `YOUR_GATEWAY_TOKEN` with your actual gateway token (or omit and set `OPENCLAW_GATEWAY_TOKEN` in the shell before starting the proxy).

**mcp-infrastructure** (PostgreSQL/pgvector, Qdrant, Redis, Neo4j, GitHub) connects via `url` to the running container. Ensure the mcp-infrastructure container is running (`docker compose --profile mcp up -d`) so it is reachable at `http://localhost:8005/sse`. If the proxy does not support `url` for remote servers, run platform-infrastructure-mcp as a stdio subprocess instead (with `command`/`args` and env vars for POSTGRES_HOST, etc.).

### Desktop Commander – allowed folders

Desktop Commander does not take folder paths in the proxy config. After the first time you connect (e.g. from Grok), set the allowed directories via its **set_config_value** tool so these folders are accessible:

- `/home/tait/Projects/localai`
- `/home/tait/Projects/grok`
- `/home/tait/Documents/obsidian`

In a chat where Desktop Commander tools are available, ask the AI to run:

**Set allowed directories:**  
*"Call set_config_value with key `allowedDirectories` and value this JSON array:  
`[\"/home/tait/Projects/localai\", \"/home/tait/Projects/grok\", \"/home/tait/Documents/obsidian\"]`"*

Or run it yourself via any MCP client that can call tools. The setting is stored in Desktop Commander’s config and persists across restarts.

Then start the proxy (see [Grok / browser setup](#grok--browser-setup) below for the exact command and extension settings).

---

## Grok / browser setup

To use the proxy with **Grok.com** (or other browser-based AI), the extension connects via **SSE** to your local proxy. Do this:

### 1. Free the proxy port (fix EADDRINUSE)

If you see `Error: listen EADDRINUSE: address already in use 127.0.0.1:3006`, something else is using that port (e.g. an old proxy run). Free it:

```bash
# See what is using port 3006
ss -tlnp | grep 3006
# or
lsof -i :3006

# Kill that process (replace PID with the number from the output)
kill PID
```

Or run the proxy on a different port (e.g. 8005) and point the extension to that port in step 3.

### 2. Start the proxy with SSE (required for the browser extension)

From any directory:

```bash
npx @srbhptl39/mcp-superassistant-proxy@latest \
  --config ~/Projects/config-superassistant.grok.json \
  --outputTransport sse
```

- Default port is **3006**. To use another port (e.g. 8005): add `--port 8005`.
- Leave this terminal running while you use Grok.

### 3. Connect the MCP SuperAssistant extension

1. Open **Grok.com** (or another supported site) and open the **MCP SuperAssistant** sidebar.
2. Set **Connection type** to **Server-Sent Events (SSE)**.
3. Set **Server URL** to the proxy’s SSE endpoint:
   - If you used the default port: `http://localhost:3006/sse`
   - If you used `--port 8005`: `http://localhost:8005/sse`
4. Click **Connect** (or Refresh). When connected, you should see tools (e.g. OpenClaw + Desktop Commander) instead of “0 of 0 tools”.

### 4. Use Grok

Chat on Grok; when the model uses tools, the extension will call your local proxy and your OpenClaw/Desktop Commander tools will run.

**Quick reference – full command (default port 3006):**

```bash
npx @srbhptl39/mcp-superassistant-proxy@latest --config ~/Projects/config-superassistant.grok.json --outputTransport sse
```

**If port 3006 is in use, use 8005 instead:**

```bash
npx @srbhptl39/mcp-superassistant-proxy@latest --config ~/Projects/config-superassistant.grok.json --outputTransport sse --port 8005
```

Then in the extension set Server URL to: `http://localhost:8005/sse`.

---

## Run the proxy in the background (systemd)

So you don’t have to keep a terminal open: run the proxy as a **user systemd service**. It can start automatically at login and restart on failure.

### 1. Install the service

```bash
mkdir -p ~/.config/systemd/user
cp platform-mcp-servers/openclaw-mcp/systemd/mcp-superassistant-proxy.service ~/.config/systemd/user/
# If your config or port differ, edit the ExecStart line:
#   --config %h/Projects/config-superassistant.grok.json  (path to your config)
#   --port 8006                                           (must match extension Server URL)
```

If `npx` is not in `/usr/bin` (e.g. you use nvm), edit the service and set the full path:

```bash
which npx   # e.g. /home/tait/.nvm/versions/node/v24.13.0/bin/npx
# In the service file, replace /usr/bin/npx with that path (or ensure PATH in Environment= includes it).
```

### 2. Enable and start

```bash
systemctl --user daemon-reload
systemctl --user enable --now mcp-superassistant-proxy
```

- **Start at login:** `enable` does this; the proxy will run whenever you’re logged in.
- **Extension:** set Server URL to `http://localhost:8006/sse` (or the port you used in the service).

### 3. Useful commands

```bash
systemctl --user status mcp-superassistant-proxy   # see status
systemctl --user stop mcp-superassistant-proxy     # stop when you don’t need it
systemctl --user start mcp-superassistant-proxy    # start again
journalctl --user -u mcp-superassistant-proxy -f   # follow logs
```

### Troubleshooting: “55 tools” but list empty / “No tools available”

**Backend:** In the logs you should see one “Connected to server” and “Successfully initialized server” line **per** MCP server (openclaw, desktop-commander, filesystem, chrome-devtools). If you only see **chrome-devtools**, the other servers are failing to start and the proxy only has that one server’s tools.

1. **Run the proxy manually** (stop the service first so port 8006 is free) to see full startup and any errors:
   ```bash
   systemctl --user stop mcp-superassistant-proxy
   export PATH="$HOME/.nvm/versions/node/v24.13.0/bin:$PATH"   # or your NODE_BIN
   npx @srbhptl39/mcp-superassistant-proxy@latest --config ~/Projects/config-superassistant.grok.json --outputTransport sse --port 8006
   ```
   Watch for “Connected to server: openclaw”, “Connected to server: desktop-commander”, “Connected to server: filesystem”, and “Connected to server: chrome-devtools”. If one never appears, fix that server (e.g. openclaw: ensure `node` in PATH can run the openclaw-mcp `index.js`; desktop-commander/filesystem: ensure `npx` can reach npm and has network).

2. **Extension:** Confirm **Server URL** is exactly `http://localhost:8006/sse` (same port as in the service). Then: **Disconnect** → click the refresh icon next to “Available Tools” → **Connect** again. Try **Enable All**. If the list is still empty, the extension may be showing a cached tool count while the tool list fails to render; report to MCP SuperAssistant and in the meantime use the proxy from a terminal to confirm how many servers and tools actually initialize.

3. **“Available Tools” list empty in UI but proxy is fine:** With many tools (e.g. 69 across 4 servers), the MCP SuperAssistant extension’s “Available Tools” panel sometimes does not render the list (shows “X of 0 tools” or “No tools available”) even though the proxy has all servers connected and the extension is connected. This is an extension UI bug, not a proxy issue. **The model can still call tools**—the list is only for display and per-tool enable/disable. If you need the list to show, try temporarily reducing to one server in the config to see if a smaller tool count renders; then report the behaviour to [MCP SuperAssistant](https://github.com/srbhptl39/MCP-SuperAssistant) (include: many tools, 4 servers, list empty).

4. **"Error compiling schema" / "missingProperty: result" in vivaldi://extensions:** This comes from the MCP SuperAssistant extension's use of Ajv (JSON Schema validator) inside Chrome Manifest V3's service worker. Ajv uses `new Function()` for schema compilation, which MV3's CSP disallows; the MCP SDK also validates tool definitions against schemas that expect a `result` property. The maintainer indicated this should be fixed in v0.6.0. **Workarounds:** (a) Update the extension to the latest version; (b) if still broken, try loading an unpacked build from PR [#173](https://github.com/srbhptl39/MCP-SuperAssistant/pull/173) (ajv shims for MV3); (c) subscribe to [GitHub issue #171](https://github.com/srbhptl39/MCP-SuperAssistant/issues/171) for updates.

### Will it stop when I close Zen/Vivaldi?

**No.** The MCP SuperAssistant extension cannot start or stop the proxy. Browser extensions can’t launch or kill local processes for security reasons. So:

- **Auto-start:** systemd starts the proxy at login (or you start it manually).
- **Auto-stop:** there is no “stop when no tab is open.” You can stop it when you’re done with Grok:  
  `systemctl --user stop mcp-superassistant-proxy`  
  Or leave it running; it’s one small Node process and only does work when the extension connects.

If you really want “stop when no browser,” you’d need a custom script (e.g. a timer that stops the service when no Chrome/Vivaldi process for N minutes); that’s outside this repo.

## Chrome DevTools: tools for screenshots + DOM automation (Robinhood, TradingView, etc.)

When the proxy loads the **chrome-devtools** MCP server, you get browser automation tools. For **reverse engineering a page and building a CLI** (e.g. Robinhood, TradingView), enable these in the MCP SuperAssistant "Available Tools" list:

### Screenshot + DOM discovery (core)

| Tool | Use |
|------|-----|
| **take_screenshot** | Capture viewport, full page, or a single element (by `uid`). Your main "see what's on screen" tool. |
| **take_snapshot** | Get the **accessibility tree** with stable **uids** for every element. Use this first so you know what to click/fill. Prefer over screenshot when you need to target elements. |

### DOM actions (automation)

| Tool | Use |
|------|-----|
| **click** | Click an element by `uid` from the snapshot (buttons, links, chart controls). |
| **fill** | Type into inputs or select `<select>` options by `uid`. |
| **fill_form** | Fill several fields in one call (batch form submit). |
| **hover** | Hover over an element (dropdowns, tooltips, TradingView/Robinhood menus). |
| **press_key** | Keyboard: Enter, shortcuts, Ctrl+A, etc. |
| **handle_dialog** | Accept or dismiss `alert` / `confirm` / `prompt`. |

### Navigation + flow

| Tool | Use |
|------|-----|
| **navigate_page** | Go to URL, reload, back/forward. |
| **list_pages** / **select_page** | Switch between tabs. |
| **new_page** | Open a new tab (e.g. login in one, trading in another). |
| **wait_for** | Wait until given text appears (e.g. after login or chart load). |

### Reverse engineering (for building a CLI)

| Tool | Use |
|------|-----|
| **list_network_requests** | See XHR/fetch/WS requests (Robinhood/TradingView APIs). Filter by resource type to find API calls. |
| **get_network_request** | Get full request/response (headers, body) for a request so you can replicate it in your CLI or scripts. |
| **evaluate_script** | Run JavaScript in the page: read `document` state, extract data, or trigger actions. Use to pull out data that isn't in the snapshot. |

### Optional

- **resize_page** / **emulate** – Fixed viewport or device emulation if layout depends on it.
- **Performance tools** – Only if you care about page performance, not for automation.

**Workflow:** `take_snapshot` → get `uid`s for buttons/inputs → `click` / `fill` / `hover`; use `list_network_requests` + `get_network_request` to copy API calls into your CLI.

**Voice (Ara) + paste:** For a lightweight Python listener between voice/Grok and these tools (capture result, paste into chat), see [Voice MCP Bridge](../voice-mcp-bridge/README.md).

## Tools

| Tool | Description |
|------|-------------|
| **openclaw_health** | Check if the OpenClaw gateway is reachable. |
| **openclaw_run_agent** | Send a message to the OpenClaw agent (default: `main`) and return the response. |
| **openclaw_list_models** | Short status; suggests using the Control UI for the full model list. |

## Exposing the CLI (optional)

This server uses the **gateway HTTP API** only. It does not run `openclaw` CLI commands. If you want Grok to run arbitrary CLI commands (e.g. `openclaw message send --channel telegram ...`), you have two options:

1. **Add more tools** – Implement an MCP tool that calls a specific CLI subcommand (e.g. `openclaw_send_telegram`) and run it via `child_process.exec` or `docker exec openclaw ...`. Keep the token and scope limited.
2. **Use Desktop Commander** – If Desktop Commander can run shell commands on your machine, you could run `openclaw` there; that’s outside this repo.

Exposing the full CLI as one generic “run command” tool is possible but risky (arbitrary commands). Prefer dedicated tools (e.g. send message, list channels) that wrap specific CLI invocations.

## Security

- **OPENCLAW_GATEWAY_TOKEN** is sensitive; don’t commit it. Use env in config or export it in the shell.
- The gateway should be reachable only from trusted hosts (e.g. `localhost`). If the proxy runs on the same machine as OpenClaw, `http://localhost:18789` is fine.
- If OpenClaw is in Docker and the proxy runs on the host, the host can use `http://localhost:18789` because port 18789 is mapped.

## Links

- [MCP SuperAssistant](https://mcpsuperassistant.ai/) – [Chrome](https://chromewebstore.google.com/detail/mcp-superassistant/kngiafgkdnlkgmefdafaibkibegkcaef)
- [OpenClaw Gateway OpenResponses API](https://docs.clawd.bot/gateway/openresponses-http-api)
