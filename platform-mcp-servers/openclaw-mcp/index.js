#!/usr/bin/env node
/**
 * OpenClaw MCP Server (stdio)
 * Exposes OpenClaw gateway to MCP clients (e.g. MCP SuperAssistant → Grok).
 * Requires: OPENCLAW_GATEWAY_URL (default http://localhost:18789), OPENCLAW_GATEWAY_TOKEN
 * Enable gateway HTTP endpoint: gateway.http.endpoints.responses.enabled = true
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789";
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "";

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
    throw new Error(`OpenClaw gateway ${res.status}: ${text || res.statusText}`);
  }
  return text ? JSON.parse(text) : null;
}

const server = new McpServer({
  name: "openclaw-mcp",
  version: "1.0.0",
});

// Health check
server.registerTool("openclaw_health", {
  description: "Check if the OpenClaw gateway is reachable and healthy.",
}, async () => {
  try {
    const out = await gatewayFetch("/health").catch((e) => { throw e; });
    return { content: [{ type: "text", text: JSON.stringify(out || { ok: true }, null, 2) }] };
  } catch (err) {
    return { content: [{ type: "text", text: `Health check failed: ${err.message}` }], isError: true };
  }
});

// Run agent (OpenResponses API) - requires gateway.http.endpoints.responses.enabled = true
server.registerTool("openclaw_run_agent", {
  description: "Send a message to the OpenClaw main agent and get a response. Uses the gateway OpenResponses API. Good for asking the agent to do something or answer a question.",
  inputSchema: {
    message: z.string().describe("The user message to send to the agent."),
    agent_id: z.string().optional().default("main").describe("Agent id (default: main)."),
  },
}, async ({ message, agent_id }) => {
  if (!GATEWAY_TOKEN) {
    return { content: [{ type: "text", text: "OPENCLAW_GATEWAY_TOKEN is not set." }], isError: true };
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
        content: [{ type: "text", text: "OpenResponses endpoint not enabled. In openclaw config set: gateway.http.endpoints.responses.enabled = true, then restart OpenClaw." }],
        isError: true,
      };
    }
    return { content: [{ type: "text", text: `Run agent failed: ${err.message}` }], isError: true };
  }
});

// List models hint
server.registerTool("openclaw_list_models", {
  description: "List configured OpenClaw models (primary and allowlist). Returns a short summary if the gateway does not expose this via HTTP.",
}, async () => {
  try {
    await gatewayFetch("/health");
    return { content: [{ type: "text", text: "OpenClaw gateway is up. Model list is in Control UI (Agents → main → Overview). Use openclaw_run_agent to talk to the agent." }] };
  } catch (err) {
    return { content: [{ type: "text", text: `Gateway not reachable: ${err.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
