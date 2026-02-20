import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT ?? 8086);
const ELEVENLABS_API_KEY = (() => {
  const raw = process.env.ELEVENLABS_API_KEY ?? "";
  const match = raw.match(/sk_[a-f0-9]+/);
  return match ? match[0] : raw;
})();
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io";
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "SAz9YHcvj6GT2YYXdXww"; // River
const DEFAULT_MODEL_ID = process.env.ELEVENLABS_MODEL_ID ?? "eleven_turbo_v2_5";
const PROXY_TOKEN = process.env.TTS_PROXY_TOKEN ?? process.env.OPENCLAW_GATEWAY_TOKEN ?? "";
// OpenClaw gateway — for the CopilotKit bridge
const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL ?? "http://host.docker.internal:18789";
const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? PROXY_TOKEN;
const OPENCLAW_MODEL = process.env.OPENCLAW_MODEL ?? "sonnet";

// ── helpers ────────────────────────────────────────────────────────────────

function addCors(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function getBearerToken(req: IncomingMessage): string {
  const auth = req.headers["authorization"] ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/---+/g, "")
    .trim();
}

// ── CopilotKit ↔ OpenClaw bridge ───────────────────────────────────────────
// CopilotKit sends AG-UI protocol; OpenClaw exposes OpenResponses (/v1/responses).
// This adapter translates between the two.

interface CKMessage {
  id?: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string | { type: string; text?: string }[];
}

interface CKContext {
  description?: string;
  value?: unknown;
}

interface CKRunRequest {
  threadId?: string;
  runId?: string;
  messages?: CKMessage[];
  context?: CKContext[];
  forwardedParameters?: { model?: string; [k: string]: unknown };
  instructions?: string;
}

function extractText(content: string | { type: string; text?: string }[]): string {
  if (typeof content === "string") return content;
  return content.map((c) => (c.type === "text" ? (c.text ?? "") : "")).join("");
}

function writeSse(res: ServerResponse, data: unknown) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function handleCopilotKitBridge(req: IncomingMessage, res: ServerResponse) {
  // Auth
  if (PROXY_TOKEN && getBearerToken(req) !== PROXY_TOKEN) {
    send(res, 401, { error: "Unauthorized" });
    return;
  }

  let body: CKRunRequest;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    send(res, 400, { error: "Invalid JSON body" });
    return;
  }

  const threadId = body.threadId ?? randomUUID();
  const runId = body.runId ?? randomUUID();
  const msgId = randomUUID();

  // Build OpenResponses input from CopilotKit messages + injected context
  const contextBlocks: string[] = [];
  for (const ctx of body.context ?? []) {
    if (ctx.description && ctx.value != null) {
      contextBlocks.push(`<context description="${ctx.description}">\n${
        typeof ctx.value === "string" ? ctx.value : JSON.stringify(ctx.value, null, 2)
      }\n</context>`);
    }
  }

  const systemParts: string[] = [];
  if (body.instructions) systemParts.push(body.instructions);
  if (contextBlocks.length) systemParts.push(contextBlocks.join("\n\n"));

  const orInput: { type: "message"; role: string; content: string }[] = [];
  if (systemParts.length) {
    orInput.push({ type: "message", role: "system", content: systemParts.join("\n\n") });
  }
  for (const m of body.messages ?? []) {
    if (m.role === "tool") continue; // skip tool results for now
    orInput.push({ type: "message", role: m.role, content: extractText(m.content) });
  }

  // Set SSE headers before streaming
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Transfer-Encoding", "chunked");
  addCors(res);

  // Emit RUN_STARTED
  writeSse(res, { type: "RUN_STARTED", threadId, runId });

  let orRes: Response;
  try {
    orRes = await fetch(`${OPENCLAW_GATEWAY_URL}/v1/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model: body.forwardedParameters?.model ?? OPENCLAW_MODEL,
        input: orInput,
        stream: true,
      }),
    });
  } catch (err) {
    console.error("[bridge] OpenClaw gateway unreachable:", err);
    writeSse(res, { type: "RUN_ERROR", message: "Gateway unreachable", threadId, runId });
    res.end();
    return;
  }

  if (!orRes.ok) {
    const errText = await orRes.text().catch(() => "");
    console.error(`[bridge] Gateway error ${orRes.status}:`, errText);
    writeSse(res, { type: "RUN_ERROR", message: `Gateway returned ${orRes.status}`, threadId, runId });
    res.end();
    return;
  }

  // Emit TEXT_MESSAGE_START
  writeSse(res, { type: "TEXT_MESSAGE_START", messageId: msgId, role: "assistant" });

  // Stream and translate OpenResponses SSE → AG-UI SSE
  if (!orRes.body) {
    writeSse(res, { type: "TEXT_MESSAGE_END", messageId: msgId });
    writeSse(res, { type: "RUN_FINISHED", threadId, runId });
    res.end();
    return;
  }

  const reader = orRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let hasContent = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue;

        let jsonStr = "";
        if (trimmed.startsWith("data: ")) {
          jsonStr = trimmed.slice(6);
        } else if (trimmed.startsWith("data:")) {
          jsonStr = trimmed.slice(5);
        } else {
          continue;
        }

        if (jsonStr === "[DONE]") continue;

        let evt: Record<string, unknown>;
        try {
          evt = JSON.parse(jsonStr);
        } catch {
          continue;
        }

        const evtType = evt.type as string | undefined;

        // Map OpenResponses delta events → AG-UI TEXT_MESSAGE_CONTENT
        if (
          evtType === "response.output_text.delta" ||
          evtType === "response.text.delta" ||
          evtType === "content_block_delta"
        ) {
          const delta = (evt.delta as string | { text?: string } | undefined);
          let text = "";
          if (typeof delta === "string") text = delta;
          else if (delta && typeof delta === "object") text = (delta as { text?: string }).text ?? "";
          if (text) {
            hasContent = true;
            writeSse(res, { type: "TEXT_MESSAGE_CONTENT", messageId: msgId, delta: text });
          }
        }
        // OpenAI chat completions delta
        else if (evtType === "response.chunk" || !evtType) {
          const choices = evt.choices as Array<{ delta?: { content?: string } }> | undefined;
          if (choices?.[0]?.delta?.content) {
            hasContent = true;
            writeSse(res, { type: "TEXT_MESSAGE_CONTENT", messageId: msgId, delta: choices[0].delta.content });
          }
        }
        // Ignore other event types (response.created, response.completed, etc.)
      }
    }
  } catch (err) {
    console.error("[bridge] stream error:", err);
  }

  writeSse(res, { type: "TEXT_MESSAGE_END", messageId: msgId });
  writeSse(res, { type: "RUN_FINISHED", threadId, runId });

  if (!hasContent) {
    console.warn("[bridge] no content received from gateway — check model/auth");
  }

  res.end();
}

// ── TTS handler ────────────────────────────────────────────────────────────

async function handleTts(req: IncomingMessage, res: ServerResponse) {
  if (PROXY_TOKEN && getBearerToken(req) !== PROXY_TOKEN) {
    send(res, 401, { error: "Unauthorized" });
    return;
  }

  if (!ELEVENLABS_API_KEY) {
    send(res, 503, { error: "ELEVENLABS_API_KEY not configured" });
    return;
  }

  let body: { text?: string; voice_id?: string; model_id?: string };
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    send(res, 400, { error: "Invalid JSON body" });
    return;
  }

  const text = body.text?.trim();
  if (!text) {
    send(res, 400, { error: "text is required" });
    return;
  }

  const voiceId = body.voice_id ?? DEFAULT_VOICE_ID;
  const modelId = body.model_id ?? DEFAULT_MODEL_ID;
  const cleanText = stripMarkdown(text);

  const elUrl = `${ELEVENLABS_BASE_URL}/v1/text-to-speech/${voiceId}/stream`;
  let elRes: Response;
  try {
    elRes = await fetch(elUrl, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: modelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, speed: 1.0 },
      }),
    });
  } catch (err) {
    console.error("[tts] ElevenLabs fetch error:", err);
    send(res, 502, { error: "ElevenLabs unreachable" });
    return;
  }

  if (!elRes.ok) {
    const errText = await elRes.text().catch(() => "");
    console.error(`[tts] ElevenLabs error ${elRes.status}:`, errText);
    send(res, 502, { error: `ElevenLabs returned ${elRes.status}` });
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("Cache-Control", "no-cache");

  const reader = elRes.body!.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } catch (err) {
    console.error("[tts] stream error:", err);
  }
  res.end();
}

// ── main handler ───────────────────────────────────────────────────────────

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  addCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (url.pathname === "/health" && req.method === "GET") {
    send(res, 200, {
      ok: true,
      service: "tts-proxy",
      tts: Boolean(ELEVENLABS_API_KEY),
      bridge: Boolean(OPENCLAW_GATEWAY_URL),
    });
    return;
  }

  if (url.pathname === "/v1/tts" && req.method === "POST") {
    await handleTts(req, res);
    return;
  }

  // CopilotKit ↔ OpenClaw bridge — this is the runtimeUrl target
  if (url.pathname === "/v1/copilotkit" && req.method === "POST") {
    await handleCopilotKitBridge(req, res);
    return;
  }

  send(res, 404, { error: "Not Found" });
}

// ── server ─────────────────────────────────────────────────────────────────

const server = createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error("[tts-proxy] unhandled error:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[tts-proxy] listening on :${PORT}`);
  console.log(`[tts-proxy] TTS voice=${DEFAULT_VOICE_ID} model=${DEFAULT_MODEL_ID}`);
  console.log(`[tts-proxy] ElevenLabs key: ${ELEVENLABS_API_KEY ? "✓" : "✗ MISSING"}`);
  console.log(`[tts-proxy] OpenClaw bridge: ${OPENCLAW_GATEWAY_URL}/v1/responses`);
  console.log(`[tts-proxy] Auth token: ${PROXY_TOKEN ? "✓" : "⚠ none (open)"}`);
});
