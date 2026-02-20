#!/usr/bin/env python3
"""
Lightweight MCP stdio bridge: sits between the SuperAssistant proxy and
chrome-devtools / desktop-commander. Forwards all traffic; optionally captures
tool results (stdout or base64 image) to a file for paste-into-chat or voice.

Run on the HOST (needs npx). Usage:
  python mcp_bridge.py chrome-devtools
  python mcp_bridge.py desktop-commander
  python mcp_bridge.py --http [host:]port   # optional: HTTP /run_tool for paste

Env:
  MCP_BRIDGE_CAPTURE_PATH  If set, last tool result JSON is written here (for paste).
"""
import argparse
import json
import os
import subprocess
import sys
import threading

# Subprocess commands for each server (run on host; needs Node/npx)
SERVERS = {
    "chrome-devtools": ["npx", "-y", "chrome-devtools-mcp@latest"],
    "desktop-commander": ["npx", "-y", "@wonderwhy-er/desktop-commander@latest"],
}


def forward_stdio(proc, capture_path: str | None):
    """Forward stdin -> proc.stdin, proc.stdout -> stdout; capture result lines to file."""
    def read_stdin():
        try:
            while True:
                line = sys.stdin.readline()
                if not line:
                    break
                try:
                    proc.stdin.write(line)
                    proc.stdin.flush()
                except BrokenPipeError:
                    break
        except Exception:
            pass
        try:
            proc.stdin.close()
        except Exception:
            pass

    def read_proc_stdout():
        try:
            while True:
                line = proc.stdout.readline()
                if not line:
                    break
                sys.stdout.write(line)
                sys.stdout.flush()
                if capture_path:
                    try:
                        obj = json.loads(line.strip())
                        if isinstance(obj, dict) and "result" in obj:
                            with open(capture_path, "w", encoding="utf-8") as f:
                                json.dump(obj, f, indent=0, ensure_ascii=False)
                    except (json.JSONDecodeError, OSError):
                        pass
        except Exception:
            pass

    t1 = threading.Thread(target=read_stdin, daemon=True)
    t2 = threading.Thread(target=read_proc_stdout, daemon=True)
    t1.start()
    t2.start()
    t1.join()
    t2.join()


def run_bridge(server: str, capture_path: str | None):
    if server not in SERVERS:
        print(f"Unknown server: {server}. Use one of: {list(SERVERS)}", file=sys.stderr)
        sys.exit(1)
    cmd = SERVERS[server]
    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=sys.stderr,
        text=True,
        bufsize=1,
    )
    forward_stdio(proc, capture_path)
    proc.wait()
    sys.exit(proc.returncode or 0)


def run_http_server(bind: str, port: int, capture_path: str | None):
    """Minimal HTTP server: POST /run_tool with JSON {server, tool, params} -> run tool, return result."""
    try:
        from http.server import HTTPServer, BaseHTTPRequestHandler
    except ImportError:
        print("HTTP server requires Python stdlib only.", file=sys.stderr)
        sys.exit(1)

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path != "/run_tool":
                self.send_error(404)
                return
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                data = json.loads(body)
                server = data.get("server")
                tool = data.get("tool")
                params = data.get("params") or {}
            except (ValueError, json.JSONDecodeError, KeyError) as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
                return

            if server not in SERVERS:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Unknown server: {server}"}).encode())
                return

            # Minimal MCP client: spawn server, send initialize + tools/call, read result
            result = _run_tool_via_stdio(server, tool, params)
            if capture_path and result is not None:
                try:
                    with open(capture_path, "w", encoding="utf-8") as f:
                        json.dump(result, f, indent=0, ensure_ascii=False)
                except OSError:
                    pass

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(result or {}).encode())

        def log_message(self, format, *args):
            pass

    host = bind if ":" in bind else (bind or "127.0.0.1")
    port = port or 8765
    with HTTPServer((host, port), Handler) as httpd:
        print(f"Voice MCP bridge HTTP: http://{host}:{port}/run_tool", file=sys.stderr)
        httpd.serve_forever()


def _run_tool_via_stdio(server: str, tool: str, params: dict) -> dict | None:
    """Spawn MCP server, send initialize then tools/call, return result. Sync for simplicity."""
    cmd = SERVERS[server]
    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
        bufsize=1,
    )
    try:
        # MCP initialize
        init_req = {
            "jsonrpc": "2.0",
            "id": 0,
            "method": "initialize",
            "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "voice-bridge", "version": "0.1.0"}},
        }
        proc.stdin.write(json.dumps(init_req) + "\n")
        proc.stdin.flush()
        while True:
            line = proc.stdout.readline()
            if not line:
                return None
            try:
                obj = json.loads(line.strip())
                if obj.get("id") == 0 and "result" in obj:
                    break
            except json.JSONDecodeError:
                pass

        # tools/call
        call_id = 1
        call_req = {
            "jsonrpc": "2.0",
            "id": call_id,
            "method": "tools/call",
            "params": {"name": tool, "arguments": params},
        }
        proc.stdin.write(json.dumps(call_req) + "\n")
        proc.stdin.flush()
        proc.stdin.close()

        while True:
            line = proc.stdout.readline()
            if not line:
                return None
            try:
                obj = json.loads(line.strip())
                if obj.get("id") == call_id and "result" in obj:
                    return obj.get("result")
            except json.JSONDecodeError:
                pass
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=2)
        except Exception:
            proc.kill()
    return None


def main():
    ap = argparse.ArgumentParser(description="MCP stdio bridge for voice/Ara + chrome-devtools or desktop-commander")
    ap.add_argument("server", nargs="?", help="chrome-devtools or desktop-commander")
    ap.add_argument("--http", metavar="[host:]port", help="Optional: run HTTP server for /run_tool (e.g. 8765 or 0.0.0.0:8765)")
    ap.add_argument("--capture", default=os.environ.get("MCP_BRIDGE_CAPTURE_PATH"), help="Path to write last tool result JSON (for paste)")
    args = ap.parse_args()

    capture_path = args.capture

    if args.http is not None:
        part = args.http.strip()
        if ":" in part:
            bind, p = part.rsplit(":", 1)
            port = int(p)
        else:
            bind = "127.0.0.1"
            port = int(part)
        run_http_server(bind, port, capture_path)
        return

    if not args.server:
        ap.error("Specify server (chrome-devtools or desktop-commander) or use --http")
    run_bridge(args.server, capture_path)


if __name__ == "__main__":
    main()
