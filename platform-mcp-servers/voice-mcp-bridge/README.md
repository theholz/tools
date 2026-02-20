# Voice MCP Bridge (Ara + chrome-devtools / desktop-commander)

Lightweight Python listener that sits between **voice with Grok (Ara)** and the MCP tools. When chrome-devtools or desktop-commander is used, it forwards the call (or runs it via HTTP), captures stdout or base64 image, and can expose the raw result for pasting into the chat buffer.

**Glue only:** no UI, stdlib-only for the bridge; optional HTTP server for “run tool and get result” so a browser script can paste.

## Why not the existing python-runner in Docker?

The **python-runner** container (`profiles: ["python-runner"]`) is for custom Python code under `./python-runner` and does **not** expose a port or include Node. The MCP proxy needs to **spawn** the tool process (stdio); chrome-devtools and desktop-commander are **npx** packages, so they must run where **npx** is available (your **host**). So:

- **Bridge runs on the host** (same machine as the proxy), using the system Python and npx. No Docker needed for the bridge.
- If you really want it inside Docker, you’d need to add Node to the python-runner image, expose a port for the optional HTTP mode, and have the proxy run `docker exec python-runner python /app/mcp_bridge.py …`; that’s heavier and still requires the proxy to talk stdio to the container. Recommended: run the bridge on the host.

## Modes

### 1. Stdio bridge (proxy uses Python instead of npx)

Point the SuperAssistant config at the bridge so the proxy spawns Python, and Python spawns npx and forwards stdio. Optional: write the last tool result to a file for paste/voice.

1. **Config change** – In `config-superassistant.grok.json`, replace the `command` for `chrome-devtools` and/or `desktop-commander` with the bridge:

   ```json
   "chrome-devtools": {
     "command": "python3",
     "args": ["/home/tait/Projects/localai/platform-mcp-servers/voice-mcp-bridge/mcp_bridge.py", "chrome-devtools"]
   }
   ```

   (Same for `desktop-commander` with the second arg `desktop-commander`.)

2. **Optional capture** – To write the last tool result to a file (e.g. for a script or extension to paste into chat):

   ```bash
   export MCP_BRIDGE_CAPTURE_PATH=/tmp/mcp_last_result.json
   ```

   Or pass `--capture /tmp/mcp_last_result.json` in `args` (if you add it to the bridge invocation in config). The bridge appends the last JSON-RPC `result` to that file when a tool returns.

3. Restart the proxy; use Grok/Ara as usual. Results still go back through the proxy into the chat; the capture file is an extra copy for paste/readout.

### 2. HTTP server (run tool and get result for paste)

Run the bridge as an HTTP server. A browser userscript or extension can POST to `/run_tool`, get the raw result (including base64 image), and paste it into the chat buffer.

```bash
# On host (needs npx)
python3 /path/to/voice-mcp-bridge/mcp_bridge.py --http 8765
# Optional: also write last result to file
MCP_BRIDGE_CAPTURE_PATH=/tmp/mcp_last_result.json python3 mcp_bridge.py --http 8765
```

- **Endpoint:** `POST http://localhost:8765/run_tool`
- **Body (JSON):** `{ "server": "chrome-devtools" | "desktop-commander", "tool": "take_screenshot", "params": { ... } }`
- **Response:** JSON with the tool result (e.g. `content` with base64 image or text).

Your browser script would: detect that Ara asked for a screenshot (or a specific tool), POST to `/run_tool`, then paste the response (or the `content` part) into the chat input. No UI in this repo; just the API.

## Requirements

- **Host:** Python 3.10+, Node/npx (for chrome-devtools-mcp and desktop-commander).
- **Bridge:** stdlib only (no pip deps). Optional HTTP uses `http.server`.

## Summary

| Goal                         | Approach                                                |
|-----------------------------|---------------------------------------------------------|
| Proxy still runs the tools  | Use stdio bridge in config (proxy → Python → npx).     |
| Get last result for paste   | Set `MCP_BRIDGE_CAPTURE_PATH` or use HTTP `/run_tool`.  |
| Paste into chat from browser| Script POSTs to `http://localhost:8765/run_tool`, then pastes response. |
| Run in Docker               | Not recommended; bridge needs npx on host.              |
