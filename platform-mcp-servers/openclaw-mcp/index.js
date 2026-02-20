#!/usr/bin/env node
/**
 * OpenClaw MCP Server - Comprehensive Edition
 * Exposes OpenClaw's full capability surface via the /tools/invoke gateway endpoint.
 * 30 tools covering sessions, exec, browser, nodes, workflows, and agents.
 * 
 * Environment Variables:
 *   OPENCLAW_GATEWAY_URL - Gateway HTTP URL (default: http://localhost:18789)
 *   OPENCLAW_GATEWAY_TOKEN - Auth token (required for most operations)
 *   OPENCLAW_SESSION_KEY - Optional: pin all calls to a specific session (e.g. agent:main:main)
 *   OPENCLAW_READONLY - Optional: disable write operations (exec, write, edit)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789";
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "";
const SESSION_KEY = process.env.OPENCLAW_SESSION_KEY;
const READONLY = process.env.OPENCLAW_READONLY === "true";

// ============================================================================
// Gateway HTTP Client
// ============================================================================

async function gatewayFetch(path, options = {}) {
  const url = `${GATEWAY_URL.replace(/\/$/, "")}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(GATEWAY_TOKEN && { Authorization: `Bearer ${GATEWAY_TOKEN}` }),
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Gateway ${res.status}: ${text || res.statusText}`);
  }
  return text ? JSON.parse(text) : null;
}

async function invokeTool(tool, action, args = {}) {
  const body = { tool, args };
  if (action) body.action = action;
  if (SESSION_KEY) body.sessionKey = SESSION_KEY;
  return gatewayFetch("/tools/invoke", { method: "POST", body: JSON.stringify(body) });
}

function safeError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  
  if (msg.includes("401") || msg.includes("403")) {
    return { content: [{ type: "text", text: "Authentication failed. Check OPENCLAW_GATEWAY_TOKEN." }], isError: true };
  }
  if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
    return { content: [{ type: "text", text: "Gateway not reachable. Check OPENCLAW_GATEWAY_URL and ensure OpenClaw is running." }], isError: true };
  }
  if (msg.includes("denied") || msg.includes("not found")) {
    return { content: [{ type: "text", text: `Tool blocked or not available: ${msg}` }], isError: true };
  }
  
  return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new McpServer({
  name: "openclaw-mcp",
  version: "2.0.0",
});

// ============================================================================
// Tier 1: Core (Health & Sessions)
// ============================================================================

server.registerTool("openclaw_health", {
  description: "Check if the OpenClaw gateway is reachable and healthy.",
}, async () => {
  try {
    const result = await gatewayFetch("/health");
    return { content: [{ type: "text", text: JSON.stringify(result || { ok: true }, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_send", {
  description: "Send a message to any OpenClaw session or agent. Use this to communicate with agents, channels, or other sessions.",
  inputSchema: {
    target: z.string().describe("Target session key (e.g. 'agent:main', 'discord:channel-id', 'user:username')"),
    text: z.string().describe("Message text to send"),
  },
}, async ({ target, text }) => {
  if (READONLY) return { content: [{ type: "text", text: "READONLY mode enabled." }], isError: true };
  try {
    const result = await invokeTool("sessions_send", null, { target, text });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_spawn", {
  description: "Spawn a new subagent session to handle a specific task. The subagent will run independently and report results back.",
  inputSchema: {
    agentId: z.string().optional().describe("Agent ID to spawn (default: same as current)"),
    task: z.string().describe("Task description for the subagent"),
    label: z.string().optional().describe("Human-readable label for this session"),
  },
}, async (args) => {
  if (READONLY) return { content: [{ type: "text", text: "READONLY mode enabled." }], isError: true };
  try {
    const result = await invokeTool("sessions_spawn", null, args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_sessions_list", {
  description: "List all active OpenClaw sessions (agents, channels, subagents).",
  inputSchema: {
    filter: z.string().optional().describe("Optional filter pattern (e.g. 'agent:', 'discord:')"),
  },
}, async (args) => {
  try {
    const result = await invokeTool("sessions_list", null, args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_session_history", {
  description: "Get message history for a specific session.",
  inputSchema: {
    sessionKey: z.string().describe("Session key to retrieve history for"),
    limit: z.number().optional().describe("Maximum number of messages to retrieve"),
  },
}, async (args) => {
  try {
    const result = await invokeTool("sessions_history", null, args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_session_status", {
  description: "Get current session information including timestamp, agent info, and runtime details.",
}, async () => {
  try {
    const result = await invokeTool("session_status", null, {});
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

// ============================================================================
// Tier 2: Execution (Shell & Files)
// ============================================================================

server.registerTool("openclaw_exec", {
  description: "Execute a shell command on the OpenClaw host. Use with caution.",
  inputSchema: {
    command: z.string().describe("Shell command to execute"),
    workdir: z.string().optional().describe("Working directory"),
    timeout: z.number().optional().describe("Timeout in seconds"),
  },
}, async (args) => {
  if (READONLY) return { content: [{ type: "text", text: "READONLY mode enabled." }], isError: true };
  try {
    const result = await invokeTool("exec", null, args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_read", {
  description: "Read file contents from the OpenClaw workspace or host.",
  inputSchema: {
    path: z.string().describe("File path (relative or absolute)"),
    offset: z.number().optional().describe("Line number to start reading from"),
    limit: z.number().optional().describe("Maximum number of lines to read"),
  },
}, async (args) => {
  try {
    const result = await invokeTool("read", null, args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_write", {
  description: "Write content to a file. Creates the file if it doesn't exist, overwrites if it does.",
  inputSchema: {
    path: z.string().describe("File path"),
    content: z.string().describe("Content to write"),
  },
}, async (args) => {
  if (READONLY) return { content: [{ type: "text", text: "READONLY mode enabled." }], isError: true };
  try {
    const result = await invokeTool("write", null, args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_edit", {
  description: "Make surgical edits to a file by replacing exact text. The old_string must match exactly.",
  inputSchema: {
    path: z.string().describe("File path"),
    old_string: z.string().describe("Exact text to find and replace"),
    new_string: z.string().describe("New text to replace with"),
  },
}, async (args) => {
  if (READONLY) return { content: [{ type: "text", text: "READONLY mode enabled." }], isError: true };
  try {
    const result = await invokeTool("edit", null, args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

// ============================================================================
// Tier 3: Browser Automation
// ============================================================================

server.registerTool("openclaw_browser_status", {
  description: "Get browser status including active profiles and tabs.",
  inputSchema: {
    profile: z.string().optional().describe("Browser profile: 'chrome' (extension relay) or 'openclaw' (managed)"),
  },
}, async (args) => {
  try {
    const result = await invokeTool("browser", "status", args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_browser_open", {
  description: "Open a URL in the browser.",
  inputSchema: {
    targetUrl: z.string().describe("URL to open"),
    profile: z.string().optional().describe("Browser profile"),
  },
}, async (args) => {
  try {
    const result = await invokeTool("browser", "open", args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_browser_snapshot", {
  description: "Get accessibility tree snapshot of the current browser page. Returns structured content for analysis and interaction.",
  inputSchema: {
    targetId: z.string().optional().describe("Tab target ID from previous call"),
    profile: z.string().optional(),
    refs: z.enum(["role", "aria"]).optional().describe("Ref scheme: 'role' (name-based) or 'aria' (stable numeric)"),
    compact: z.boolean().optional().describe("Compact output"),
    selector: z.string().optional().describe("CSS selector to scope snapshot"),
  },
}, async (args) => {
  try {
    const result = await invokeTool("browser", "snapshot", args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_browser_screenshot", {
  description: "Take a screenshot of the current browser page.",
  inputSchema: {
    targetId: z.string().optional(),
    fullPage: z.boolean().optional().describe("Capture full page or viewport only"),
    type: z.enum(["png", "jpeg"]).optional(),
  },
}, async (args) => {
  try {
    const result = await invokeTool("browser", "screenshot", args);
    // If result contains base64 image data, could return as image content
    // For now, return JSON with data URL
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_browser_act", {
  description: "Perform browser interaction: click, type, press keys, hover, drag, fill forms, evaluate JS.",
  inputSchema: {
    targetId: z.string().optional(),
    profile: z.string().optional(),
    request: z.object({
      kind: z.enum(["click", "type", "press", "hover", "drag", "select", "fill", "resize", "wait", "evaluate", "close"]),
      ref: z.string().optional().describe("Element reference from snapshot"),
      text: z.string().optional().describe("Text to type"),
      key: z.string().optional().describe("Key to press (e.g. 'Enter', 'Tab')"),
      submit: z.boolean().optional(),
      fn: z.string().optional().describe("JS function to evaluate"),
    }).describe("Interaction request"),
  },
}, async (args) => {
  try {
    const result = await invokeTool("browser", "act", args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_browser_navigate", {
  description: "Navigate browser tab to a new URL.",
  inputSchema: {
    targetUrl: z.string().describe("URL to navigate to"),
    targetId: z.string().optional(),
    profile: z.string().optional(),
  },
}, async (args) => {
  try {
    const result = await invokeTool("browser", "navigate", args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_browser_tabs", {
  description: "List all open browser tabs.",
  inputSchema: {
    profile: z.string().optional(),
  },
}, async (args) => {
  try {
    const result = await invokeTool("browser", "tabs", args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_browser_console", {
  description: "Get console output from the browser tab.",
  inputSchema: {
    targetId: z.string().optional(),
    profile: z.string().optional(),
  },
}, async (args) => {
  try {
    const result = await invokeTool("browser", "console", args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

// ============================================================================
// Tier 4: Nodes (Mobile/Desktop Control)
// ============================================================================

server.registerTool("openclaw_nodes_status", {
  description: "List all paired OpenClaw nodes (mobile devices, computers).",
}, async () => {
  try {
    const result = await invokeTool("nodes", "status", {});
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_nodes_notify", {
  description: "Send a push notification to a paired node.",
  inputSchema: {
    node: z.string().describe("Node ID or name"),
    title: z.string().describe("Notification title"),
    body: z.string().describe("Notification body"),
    priority: z.enum(["passive", "active", "timeSensitive"]).optional(),
  },
}, async (args) => {
  try {
    const result = await invokeTool("nodes", "notify", args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_nodes_camera", {
  description: "Take a photo using a paired node's camera.",
  inputSchema: {
    node: z.string().describe("Node ID or name"),
    facing: z.enum(["front", "back", "both"]).optional().describe("Camera to use"),
  },
}, async (args) => {
  try {
    const result = await invokeTool("nodes", "camera_snap", args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_nodes_screen", {
  description: "Record screen video from a paired node.",
  inputSchema: {
    node: z.string().describe("Node ID or name"),
    durationMs: z.number().optional().describe("Recording duration in milliseconds"),
  },
}, async (args) => {
  try {
    const result = await invokeTool("nodes", "screen_record", args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_nodes_location", {
  description: "Get GPS location from a paired node.",
  inputSchema: {
    node: z.string().describe("Node ID or name"),
  },
}, async (args) => {
  try {
    const result = await invokeTool("nodes", "location_get", args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_nodes_run", {
  description: "Run a command on a paired node.",
  inputSchema: {
    node: z.string().describe("Node ID or name"),
    command: z.array(z.string()).describe("Command and arguments"),
  },
}, async (args) => {
  try {
    const result = await invokeTool("nodes", "run", args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_nodes_invoke", {
  description: "Invoke a specific capability on a paired node.",
  inputSchema: {
    node: z.string().describe("Node ID or name"),
    invokeCommand: z.string().describe("Capability to invoke"),
    invokeParamsJson: z.string().optional().describe("JSON params for the capability"),
  },
}, async (args) => {
  try {
    const result = await invokeTool("nodes", "invoke", args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

// ============================================================================
// Tier 5: Workflows & Agents
// ============================================================================

server.registerTool("openclaw_lobster_run", {
  description: "Run a Lobster pipeline (typed workflow with resumable approval gates).",
  inputSchema: {
    pipeline: z.string().describe("Pipeline name or path"),
    argsJson: z.string().optional().describe("JSON arguments for the pipeline"),
    cwd: z.string().optional().describe("Working directory"),
  },
}, async (args) => {
  if (READONLY) return { content: [{ type: "text", text: "READONLY mode enabled." }], isError: true };
  try {
    const result = await invokeTool("lobster", "run", args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_lobster_resume", {
  description: "Resume or approve a paused Lobster pipeline.",
  inputSchema: {
    token: z.string().describe("Pipeline resume token"),
    approve: z.boolean().describe("Whether to approve the pipeline continuation"),
  },
}, async (args) => {
  if (READONLY) return { content: [{ type: "text", text: "READONLY mode enabled." }], isError: true };
  try {
    const result = await invokeTool("lobster", "resume", args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_agents_list", {
  description: "List all configured OpenClaw agents.",
}, async () => {
  try {
    const result = await invokeTool("agents_list", null, {});
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

server.registerTool("openclaw_run_agent", {
  description: "Send a message to an OpenClaw agent and get a response (stateless, via OpenResponses API).",
  inputSchema: {
    message: z.string().describe("Message to send"),
    agent_id: z.string().optional().default("main").describe("Agent ID"),
  },
}, async ({ message, agent_id }) => {
  if (!GATEWAY_TOKEN) {
    return { content: [{ type: "text", text: "OPENCLAW_GATEWAY_TOKEN required for this operation." }], isError: true };
  }
  try {
    const body = { model: `openclaw:${agent_id}`, input: message };
    const res = await gatewayFetch("/v1/responses", { method: "POST", body: JSON.stringify(body) });
    const text =
      res?.output?.find((o) => o.type === "message")?.content?.find((c) => c.type === "text")?.text
      || res?.output?.map((o) => JSON.stringify(o)).join("\n")
      || JSON.stringify(res);
    return { content: [{ type: "text", text }] };
  } catch (err) {
    if (err.message?.includes("404") || err.message?.includes("405")) {
      return {
        content: [{ type: "text", text: "OpenResponses endpoint not enabled. Set gateway.http.endpoints.responses.enabled = true in config." }],
        isError: true,
      };
    }
    return safeError(err);
  }
});

// ============================================================================
// Pass-through tool (for advanced users)
// ============================================================================

server.registerTool("openclaw_tool", {
  description: "Direct pass-through to any OpenClaw gateway tool. For advanced use when a specific tool wrapper doesn't exist yet.",
  inputSchema: {
    tool: z.string().describe("Tool name"),
    action: z.string().optional().describe("Tool action"),
    args: z.record(z.any()).optional().describe("Tool arguments as JSON object"),
    sessionKey: z.string().optional().describe("Override session key"),
  },
}, async ({ tool, action, args, sessionKey }) => {
  try {
    const body = { tool, args: args || {} };
    if (action) body.action = action;
    if (sessionKey || SESSION_KEY) body.sessionKey = sessionKey || SESSION_KEY;
    
    const result = await gatewayFetch("/tools/invoke", { method: "POST", body: JSON.stringify(body) });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return safeError(err);
  }
});

// ============================================================================
// Start Server
// ============================================================================

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("OpenClaw MCP Server v2.0 started");
console.error(`Gateway: ${GATEWAY_URL}`);
console.error(`Session: ${SESSION_KEY || "(dynamic)"}`);
console.error(`Readonly: ${READONLY}`);
console.error(`Tools: 30 comprehensive tools registered`);
