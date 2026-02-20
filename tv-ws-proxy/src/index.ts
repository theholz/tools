/**
 * TradingView WebSocket Proxy v2.1
 *
 * Flow:
 *   1. Login to TradingView via REST → get auth token
 *   2. Connect to wss://data.tradingview.com/socket.io/websocket
 *   3. Subscribe to configured symbols + request indicator fields
 *   4. On qsd/du → classify signals (PTOS, IADSS, ADX) → fan out in parallel:
 *        a. Production: POST to n8n webhook (→ Supabase tv_signals)
 *        b. Grok fork:  POST to MCP relay (→ second opinion → Supabase signal_opinions)
 *   5. Auto-refresh auth token every ~50 min (reconnects WS)
 *   6. Health / latest endpoints on :8085
 *
 * Signal rules (strict 2-of-3 confluence required):
 *   PTOS  : RSI(14), MACD crossover, volume spike
 *   IADSS : BB squeeze/breakout, Ichimoku cross, Stochastic, ADX
 *   James : funding rate, BTC dominance, OI  (scored externally by james-score-service)
 *   ADX   : >25 = strong trend | <20 = choppy (skip) | >40 = exhaustion risk
 */

import axios from "axios";
import express from "express";
import WebSocket from "ws";
import http from "http";
import * as OTPAuth from "otpauth";
import { startCollector } from "./coinglass-collector.js";
import { startSentimentCollector } from "./sentiment-collector.js";

// ── Config ──────────────────────────────────────────────────────────────────
const TV_USERNAME       = process.env.TRADINGVIEW_USERNAME ?? "";
const TV_PASSWORD       = process.env.TRADINGVIEW_PASSWORD ?? "";
const TV_TOTP_SECRET    = process.env.TRADINGVIEW_TOTP_SECRET ?? "";

const SUPABASE_URL      = process.env.SUPABASE_URL ?? "http://supabase-kong:8000";
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_KEY ?? "";

const N8N_WEBHOOK_URL   = process.env.N8N_WEBHOOK_URL ?? "";   // production path (→ Supabase tv_signals)
const GROK_RELAY_URL    = process.env.GROK_WEBHOOK_URL ?? "";  // MCP relay for second opinion

const SYMBOLS           = (process.env.SYMBOLS ?? "BINANCE:SOLUSDT,BYBIT:JUPUSDT").split(",").map(s => s.trim());
const HEALTH_PORT       = parseInt(process.env.HEALTH_PORT ?? "8085");
const TOKEN_REFRESH_MS  = 50 * 60 * 1000;
const LOG_LEVEL         = process.env.LOG_LEVEL ?? "info";
const MAX_RECONNECT_MS  = 60_000;

// ── Logging ─────────────────────────────────────────────────────────────────
const ts  = () => new Date().toISOString();
const log = {
  info:  (...a: unknown[]) => console.log( `[${ts()}] [INFO]`, ...a),
  debug: (...a: unknown[]) => LOG_LEVEL === "debug" && console.log(`[${ts()}] [DEBUG]`, ...a),
  warn:  (...a: unknown[]) => console.warn( `[${ts()}] [WARN]`, ...a),
  error: (...a: unknown[]) => console.error(`[${ts()}] [ERROR]`, ...a),
};

// ── Types ────────────────────────────────────────────────────────────────────
interface QuoteFields {
  lp?: number;          // last price
  volume?: number;
  ch?: number;          // change
  chp?: number;         // change pct
  high_price?: number;
  low_price?: number;
  open_price?: number;
  RSI?: number;
  "MACD.macd"?: number;
  "MACD.signal"?: number;
  "Stoch.K"?: number;
  "Stoch.D"?: number;
  ADX?: number;
  "BB.upper"?: number;
  "BB.lower"?: number;
  "BB.basis"?: number;
  "Ichimoku.conversion"?: number;
  "Ichimoku.base"?: number;
  [key: string]: unknown;
}

interface AdxResult {
  value: number | null;
  trend_strength: "strong" | "weak" | "choppy" | "exhaustion_risk" | "unknown";
}

interface IndicatorGroup {
  indicators: Record<string, unknown>;
  direction: "bullish" | "bearish" | "neutral";
  score: number;
}

interface SignalClassification {
  ptos: IndicatorGroup;
  iadss: IndicatorGroup;
  adx: AdxResult;
  confluence: boolean;
  action: "BUY" | "SELL" | "HOLD";
}

interface SignalPayload {
  source: "tv-ws-proxy";
  symbol: string;
  asset: string;
  exchange: string;
  price: number;
  volume: number;
  change: number;
  change_pct: number;
  high: number;
  low: number;
  open: number;
  signals: SignalClassification;
  timestamp: string;
}

// ── State ────────────────────────────────────────────────────────────────────
let ws:               WebSocket | null = null;
let authToken:        string = "";
let connected:        boolean = false;
let reconnectAttempts = 0;
let tokenRefreshTimer: ReturnType<typeof setInterval> | null = null;
const lastPayloads    = new Map<string, SignalPayload>();

const stats = {
  messagesReceived: 0,
  dataUpdates:      0,
  webhooksSent:     0,
  grokSent:         0,
  errors:           0,
  startedAt:        new Date().toISOString(),
};

// ── TradingView Auth ─────────────────────────────────────────────────────────

/** Generate a 6-digit TOTP from a base32 secret (RFC 6238) */
function generateTOTP(secret: string): string {
  const totp = new OTPAuth.TOTP({
    secret:    OTPAuth.Secret.fromBase32(secret.replace(/\s+/g, "")),
    algorithm: "SHA1",
    digits:    6,
    period:    30,
  });
  return totp.generate();
}

async function login(): Promise<string> {
  log.info("Authenticating with TradingView...");

  const ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const baseHeaders = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent":   ua,
    "Referer":      "https://www.tradingview.com/",
    "Origin":       "https://www.tradingview.com",
  };

  // Step 1: password login
  const resp = await axios.post(
    "https://www.tradingview.com/accounts/signin/",
    new URLSearchParams({ username: TV_USERNAME, password: TV_PASSWORD, remember: "on" }),
    { headers: baseHeaders, validateStatus: s => s < 500 }
  );

  // Carry cookies forward for 2FA step
  const cookies = ((resp.headers["set-cookie"] as string[] | undefined) ?? [])
    .map(c => c.split(";")[0])
    .join("; ");

  let data = resp.data;

  // Step 2: TOTP if required
  if (data.error === "2FA_required" || data.error === "two_factor_auth_required") {
    if (!TV_TOTP_SECRET) throw new Error("2FA required but TRADINGVIEW_TOTP_SECRET not set");

    const code = generateTOTP(TV_TOTP_SECRET);
    log.info(`2FA required — submitting TOTP code ${code}`);

    const tfaResp = await axios.post(
      "https://www.tradingview.com/accounts/two-factor/signin/totp/",
      new URLSearchParams({ code }),
      { headers: { ...baseHeaders, Cookie: cookies }, validateStatus: s => s < 500 }
    );
    data = tfaResp.data;
    if (data.error) throw new Error(`TV 2FA failed (${tfaResp.status}): ${JSON.stringify(data.error)}`);
    log.info("2FA verified ✓");
  } else if (data.error) {
    throw new Error(`TV login failed: ${data.error}`);
  }

  const token: string = data?.user?.auth_token ?? "";
  if (!token) throw new Error("No auth_token in TV response after login");

  log.info(`Authenticated as: ${data?.user?.username ?? "unknown"}`);
  return token;
}

async function refreshToken(): Promise<void> {
  try {
    authToken = await login();
    log.info("Token refreshed — reconnecting WS");
    ws?.close();
  } catch (err: unknown) {
    log.error("Token refresh failed:", (err as Error).message);
  }
}

// ── TV Wire Protocol ─────────────────────────────────────────────────────────
function tvEncode(msg: string): string {
  return `~m~${msg.length}~m~${msg}`;
}

function tvDecode(raw: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < raw.length) {
    const match = raw.substring(i).match(/^~m~(\d+)~m~/);
    if (!match) break;
    const len = parseInt(match[1]);
    const hLen = match[0].length;
    out.push(raw.substring(i + hLen, i + hLen + len));
    i += hLen + len;
  }
  return out;
}

function genSession(prefix = "qs"): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = prefix + "_";
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function tvSend(func: string, args: unknown[] = []): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  const msg = JSON.stringify({ m: func, p: args });
  log.debug("TX:", func);
  ws.send(tvEncode(msg));
}

// ── Signal Classification ────────────────────────────────────────────────────
function classifySignals(v: QuoteFields): SignalClassification {
  const ptos: IndicatorGroup  = { indicators: {}, direction: "neutral", score: 0 };
  const iadss: IndicatorGroup = { indicators: {}, direction: "neutral", score: 0 };
  const adx: AdxResult        = { value: v.ADX ?? null, trend_strength: "unknown" };

  // ADX strength tier
  if (v.ADX != null) {
    if      (v.ADX > 40) adx.trend_strength = "exhaustion_risk";
    else if (v.ADX > 25) adx.trend_strength = "strong";
    else if (v.ADX > 20) adx.trend_strength = "weak";
    else                 adx.trend_strength = "choppy";
  }

  // ── PTOS ───────────────────────────────────────────────────────────────────
  // RSI(14)
  if (v.RSI != null) {
    const sig = v.RSI > 70 ? "bearish" : v.RSI < 30 ? "bullish" : "neutral";
    ptos.indicators["rsi"] = { value: v.RSI, signal: sig };
    if (sig !== "neutral") ptos.score += sig === "bullish" ? 1 : -1;
  }

  // MACD crossover
  if (v["MACD.macd"] != null && v["MACD.signal"] != null) {
    const bull = v["MACD.macd"] > v["MACD.signal"];
    ptos.indicators["macd"] = {
      value:       v["MACD.macd"],
      signal_line: v["MACD.signal"],
      signal:      bull ? "bullish" : "bearish",
    };
    ptos.score += bull ? 1 : -1;
  }

  // Volume spike: expose raw volume, caller can compare to baseline externally
  if (v.volume != null) {
    ptos.indicators["volume"] = { value: v.volume };
  }

  // ── IADSS ──────────────────────────────────────────────────────────────────
  // Bollinger Bands squeeze/breakout
  if (v["BB.upper"] != null && v["BB.lower"] != null && v.lp != null) {
    const bbWidth  = v["BB.upper"] - v["BB.lower"];
    const position = v.lp > v["BB.upper"] ? "breakout_up"
                   : v.lp < v["BB.lower"] ? "breakout_down"
                   : "inside";
    iadss.indicators["bollinger"] = { width: bbWidth, position, signal: position === "breakout_up" ? "bullish" : position === "breakout_down" ? "bearish" : "neutral" };
    if (position !== "inside") iadss.score += position === "breakout_up" ? 1 : -1;
  }

  // Ichimoku TK cross
  if (v["Ichimoku.conversion"] != null && v["Ichimoku.base"] != null) {
    const bull = v["Ichimoku.conversion"] > v["Ichimoku.base"];
    iadss.indicators["ichimoku"] = {
      conversion: v["Ichimoku.conversion"],
      base:       v["Ichimoku.base"],
      signal:     bull ? "bullish" : "bearish",
    };
    iadss.score += bull ? 1 : -1;
  }

  // Stochastic
  if (v["Stoch.K"] != null && v["Stoch.D"] != null) {
    const bull = v["Stoch.K"] > v["Stoch.D"] && v["Stoch.K"] < 80;
    const bear = v["Stoch.K"] < v["Stoch.D"] && v["Stoch.K"] > 20;
    iadss.indicators["stochastic"] = {
      k:      v["Stoch.K"],
      d:      v["Stoch.D"],
      signal: bull ? "bullish" : bear ? "bearish" : "neutral",
    };
    if (bull)       iadss.score += 1;
    else if (bear)  iadss.score -= 1;
  }

  // ADX (trend confirmation inside IADSS)
  if (v.ADX != null) {
    iadss.indicators["adx"] = { value: v.ADX, signal: v.ADX > 25 ? "trending" : "choppy" };
  }

  // Direction summaries
  ptos.direction  = ptos.score  > 0 ? "bullish" : ptos.score  < 0 ? "bearish" : "neutral";
  iadss.direction = iadss.score > 0 ? "bullish" : iadss.score < 0 ? "bearish" : "neutral";

  // Confluence: 2-of-3 layers agree (James Score is the third, evaluated externally)
  // Here we check PTOS + IADSS internal agreement; James Score added downstream
  const ptosAgrees  = ptos.direction  !== "neutral";
  const iadssAgrees = iadss.direction !== "neutral";
  const agree       = ptosAgrees && iadssAgrees && ptos.direction === iadss.direction;

  // Skip if ADX < 20 (choppy) regardless of confluence
  const tooChoppy   = adx.trend_strength === "choppy";

  const confluence = agree && !tooChoppy;
  const action: "BUY" | "SELL" | "HOLD" = !confluence
    ? "HOLD"
    : ptos.direction === "bullish" ? "BUY" : "SELL";

  return { ptos, iadss, adx, confluence, action };
}

// ── Downstream Fan-out ───────────────────────────────────────────────────────
async function forwardToN8N(payload: SignalPayload): Promise<void> {
  if (!N8N_WEBHOOK_URL) return;
  try {
    await axios.post(N8N_WEBHOOK_URL, payload, {
      headers:  { "Content-Type": "application/json" },
      timeout:  5_000,
    });
    stats.webhooksSent++;
  } catch (err: unknown) {
    log.warn("n8n forward failed:", (err as Error).message);
    stats.errors++;
  }
}

async function forwardToGrok(payload: SignalPayload): Promise<void> {
  if (!GROK_RELAY_URL) return;

  const adxLabel = payload.signals.adx.value != null
    ? `${payload.signals.adx.value.toFixed(1)} (${payload.signals.adx.trend_strength})`
    : "n/a";

  const promptText = [
    `TRADING SIGNAL — Second Opinion Required`,
    ``,
    `Symbol:    ${payload.symbol}`,
    `Price:     $${payload.price} (${payload.change_pct >= 0 ? "+" : ""}${payload.change_pct?.toFixed(2)}%)`,
    `Timestamp: ${payload.timestamp}`,
    ``,
    `PTOS  → ${payload.signals.ptos.direction.toUpperCase()}  (score ${payload.signals.ptos.score})`,
    `IADSS → ${payload.signals.iadss.direction.toUpperCase()} (score ${payload.signals.iadss.score})`,
    `ADX   → ${adxLabel}`,
    `Action (pre-James): ${payload.signals.action}`,
    ``,
    `Indicator detail:`,
    JSON.stringify(payload.signals, null, 2),
    ``,
    `Rules (strict):`,
    `- 2-of-3 confluence required (PTOS + IADSS + James Score — you represent James Score)`,
    `- ADX >25 = strong trend (confirmed) | <20 = choppy, SKIP | >40 = exhaustion warning`,
    `- PTOS: RSI(14), MACD crossover, volume spike`,
    `- IADSS: BB squeeze/breakout, Ichimoku TK cross, Stochastic, ADX`,
    `- James Score: funding rate, BTC dominance, OI`,
    ``,
    `Reply: AGREE or DISAGREE + 1-2 sentence reason. No fluff.`,
  ].join("\n");

  const body = {
    model: "grok-3",
    input: [{ role: "user", content: promptText }],
    instructions: "You are a trading signal validator enforcing a strict 2-of-3 confluence rule. Be direct and brief.",
  };

  try {
    const resp = await axios.post(GROK_RELAY_URL, body, {
      headers: { "Content-Type": "application/json" },
      timeout: 15_000,
    });
    const opinion = resp.data?.output?.[0]?.content?.[0]?.text
      ?? resp.data?.output
      ?? "No response";
    const opinionStr = typeof opinion === "string" ? opinion : JSON.stringify(opinion);
    log.info(`Grok on ${payload.symbol}: ${opinionStr.substring(0, 250)}`);
    stats.grokSent++;
  } catch (err: unknown) {
    log.warn("Grok relay failed:", (err as Error).message);
  }
}

async function fanOut(payload: SignalPayload): Promise<void> {
  await Promise.allSettled([
    forwardToN8N(payload),
    forwardToGrok(payload),
  ]);
}

// ── Message Handlers ─────────────────────────────────────────────────────────
async function handleQuoteData(params: unknown[]): Promise<void> {
  if (!Array.isArray(params) || params.length < 2) return;
  const data = params[1] as { n?: string; v?: QuoteFields };
  if (!data?.n || !data?.v) return;

  const fullSymbol = data.n;
  const v          = data.v;
  stats.dataUpdates++;

  const payload: SignalPayload = {
    source:     "tv-ws-proxy",
    symbol:     fullSymbol.split(":").pop()?.replace("USDT", "").replace("USD", "") ?? fullSymbol,
    asset:      fullSymbol.split(":").pop() ?? fullSymbol,
    exchange:   fullSymbol.split(":")[0] ?? "unknown",
    price:      v.lp        ?? 0,
    volume:     v.volume    ?? 0,
    change:     v.ch        ?? 0,
    change_pct: v.chp       ?? 0,
    high:       v.high_price ?? 0,
    low:        v.low_price  ?? 0,
    open:       v.open_price ?? 0,
    signals:    classifySignals(v),
    timestamp:  new Date().toISOString(),
  };

  lastPayloads.set(fullSymbol, payload);
  log.debug(`${fullSymbol} $${payload.price} → ${payload.signals.action} (confluence=${payload.signals.confluence})`);

  await fanOut(payload);
}

function handleMessage(msg: { m: string; p?: unknown[] }): void {
  switch (msg.m) {
    case "qsd":
      handleQuoteData(msg.p ?? []).catch(e => log.error("handleQuoteData:", e.message));
      break;
    case "du":
      stats.dataUpdates++;
      log.debug("Chart data update:", (msg.p as unknown[])?.[0]);
      break;
    case "symbol_resolved":
      log.info("Symbol resolved:", (msg.p as unknown[])?.[2]);
      break;
    case "series_completed":
    case "study_completed":
      log.debug(msg.m, (msg.p as unknown[])?.[1]);
      break;
    case "critical_error":
    case "protocol_error":
      log.error(`${msg.m}:`, msg.p);
      stats.errors++;
      break;
    default:
      log.debug("Unhandled:", msg.m);
  }
}

// ── WebSocket Connection ─────────────────────────────────────────────────────
function connect(): void {
  const quoteSession = genSession("qs");
  const chartSession = genSession("cs");

  log.info(`Connecting | quote=${quoteSession} chart=${chartSession}`);

  ws = new WebSocket("wss://data.tradingview.com/socket.io/websocket", {
    headers: {
      Origin:       "https://www.tradingview.com",
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    },
  });

  ws.on("open", () => {
    log.info("WS connected");
    connected         = true;
    reconnectAttempts = 0;

    tvSend("set_auth_token", [authToken || "unauthorized_user_token"]);

    // Quote session — subscribe to price + indicator fields
    tvSend("quote_create_session", [quoteSession]);
    tvSend("quote_set_fields", [
      quoteSession,
      "ch", "chp", "description", "exchange", "lp", "lp_time",
      "open_price", "high_price", "low_price", "volume",
      "ask", "bid", "prev_close_price", "status", "type",
      // Indicators (available on pro accounts; return null on free)
      "RSI", "MACD.macd", "MACD.signal",
      "Stoch.K", "Stoch.D", "ADX",
      "BB.upper", "BB.lower", "BB.basis",
      "Ichimoku.conversion", "Ichimoku.base",
    ]);

    for (const sym of SYMBOLS) {
      log.info(`Subscribing: ${sym}`);
      tvSend("quote_add_symbols", [quoteSession, sym]);
    }

    // Chart session — series data for candles (1H)
    tvSend("chart_create_session", [chartSession, ""]);
    SYMBOLS.forEach((sym, i) => {
      tvSend("resolve_symbol", [
        chartSession,
        `sym_${i}`,
        `={"symbol":"${sym}","adjustment":"splits"}`,
      ]);
      tvSend("create_series", [chartSession, `ser_${i}`, `ser_${i}`, `sym_${i}`, "60", 1]);
    });

    // Token refresh schedule
    if (tokenRefreshTimer) clearInterval(tokenRefreshTimer);
    tokenRefreshTimer = setInterval(refreshToken, TOKEN_REFRESH_MS);
  });

  ws.on("message", (raw: WebSocket.Data) => {
    stats.messagesReceived++;
    const messages = tvDecode(raw.toString());
    for (const msg of messages) {
      if (msg.startsWith("~h~")) {
        ws!.send(tvEncode(msg)); // heartbeat pong
        continue;
      }
      try {
        handleMessage(JSON.parse(msg));
      } catch {
        log.debug("Non-JSON:", msg.substring(0, 80));
      }
    }
  });

  ws.on("close", (code, reason) => {
    log.warn(`WS closed: ${code} ${reason.toString()}`);
    connected = false;
    scheduleReconnect();
  });

  ws.on("error", (err: Error) => {
    log.error("WS error:", err.message);
    stats.errors++;
  });
}

function scheduleReconnect(): void {
  const delay = Math.min(1_000 * 2 ** reconnectAttempts, MAX_RECONNECT_MS);
  reconnectAttempts++;
  log.info(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})...`);
  setTimeout(connect, delay);
}

// ── Health Server ────────────────────────────────────────────────────────────
function startHealthServer(): void {
  const app = express();

  app.get("/health", (_req, res) => {
    res.status(connected ? 200 : 503).json({
      status:   connected ? "connected" : "disconnected",
      uptime:   process.uptime(),
      symbols:  SYMBOLS,
      lastData: Object.fromEntries([...lastPayloads.entries()].map(([k, v]) => [k, v.timestamp])),
      stats,
    });
  });

  app.get("/latest", (_req, res) => {
    res.json(Object.fromEntries(lastPayloads));
  });

  app.get("/stats", (_req, res) => {
    res.json(stats);
  });

  app.listen(HEALTH_PORT, () => {
    log.info(`Health server on :${HEALTH_PORT}`);
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  log.info("=== TradingView WebSocket Proxy v2.1 ===");
  log.info(`Symbols:    ${SYMBOLS.join(", ")}`);
  log.info(`Downstream: n8n=${!!N8N_WEBHOOK_URL} | grok=${!!GROK_RELAY_URL} | supabase=${!!SUPABASE_KEY}`);

  startHealthServer();

  try {
    authToken = await login();
  } catch (err: unknown) {
    log.warn("Login failed, connecting as anonymous:", (err as Error).message);
  }

  connect();
  startCollector();
  startSentimentCollector();
}

process.on("SIGTERM", () => { log.info("SIGTERM — shutting down"); ws?.close(); process.exit(0); });
process.on("SIGINT",  () => { log.info("SIGINT — shutting down");  ws?.close(); process.exit(0); });

main().catch(console.error);
