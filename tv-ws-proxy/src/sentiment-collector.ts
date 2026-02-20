/**
 * Sentiment Collector
 * 
 * Fetches crypto news from Finnhub and scores sentiment using:
 * 1. Keyword-based scoring (fast, free, always works)
 * 2. Optional LLM enrichment via Perplexity (best-effort, skipped if unavailable)
 * 
 * Stores results in Supabase market_data table as data_type = 'sentiment'
 * Runs every 15 minutes.
 */

import axios from "axios";

const FINNHUB_KEY   = process.env.FINNHUB_API_KEY || "";
const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY || "";
const SUPABASE_URL  = process.env.SUPABASE_URL || "http://supabase-kong:8000";
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY || "";

// ── Keyword sentiment dictionaries ──────────────────────────────────────────

const BULLISH_WORDS = new Set([
  "bull", "bullish", "surge", "surged", "surging", "rally", "rallied", "rallying",
  "breakout", "break out", "ath", "all-time high", "all time high", "record high",
  "buy", "bought", "accumulate", "accumulation", "adoption", "approve", "approved",
  "launch", "launched", "partnership", "upgrade", "etf", "inflow", "inflows",
  "institutional", "gains", "gain", "gained", "moon", "pump", "pumping",
  "outperform", "recovery", "recover", "bounce", "strong", "strength",
  "positive", "growth", "expanding", "win", "wins", "winning", "milestone",
  "upgrade", "bullrun", "demand", "support", "holding", "hodl", "long",
  "beat", "beats", "exceeds", "exceeded", "higher", "rise", "rising", "rose",
]);

const BEARISH_WORDS = new Set([
  "bear", "bearish", "crash", "crashed", "crashing", "dump", "dumping", "dumped",
  "sell", "selling", "selloff", "sell-off", "fear", "panic", "plunge", "plunged",
  "plunging", "drop", "dropped", "dropping", "decline", "declined", "declining",
  "hack", "hacked", "exploit", "exploited", "vulnerability", "scam", "fraud",
  "ban", "banned", "regulate", "regulation", "lawsuit", "sec", "enforcement",
  "outflow", "outflows", "liquidation", "liquidated", "margin call", "bankrupt",
  "insolvency", "insolvent", "collapse", "collapsed", "collapses", "rug", "rug pull",
  "negative", "loss", "losses", "down", "lower", "worst", "weak", "weakness",
  "concern", "warning", "risk", "uncertainty", "uncertain", "volatile", "volatility",
  "miss", "missed", "below", "falls", "fell", "fallen", "sink", "sinking",
]);

const CRYPTO_KEYWORDS: Record<string, string[]> = {
  SOLUSDT:  ["sol", "solana"],
  BTCUSDT:  ["btc", "bitcoin"],
  ETHUSDT:  ["eth", "ethereum"],
  JUPUSDT:  ["jup", "jupiter"],
  MARKET:   ["crypto", "cryptocurrency", "defi", "web3", "blockchain", "altcoin", "altcoins"],
};

/**
 * Score a headline/text on a -1.0 to +1.0 scale.
 * Returns { score, bullishHits, bearishHits }
 */
function scoreText(text: string): { score: number; bullishHits: string[]; bearishHits: string[] } {
  const lower = text.toLowerCase();
  const words = lower.split(/\W+/);
  const wordSet = new Set(words);

  const bullishHits: string[] = [];
  const bearishHits: string[] = [];

  // Single-word matches
  for (const w of wordSet) {
    if (BULLISH_WORDS.has(w)) bullishHits.push(w);
    if (BEARISH_WORDS.has(w)) bearishHits.push(w);
  }

  // Multi-word phrases
  for (const phrase of BULLISH_WORDS) {
    if (phrase.includes(" ") && lower.includes(phrase)) bullishHits.push(phrase);
  }
  for (const phrase of BEARISH_WORDS) {
    if (phrase.includes(" ") && lower.includes(phrase)) bearishHits.push(phrase);
  }

  const b = bullishHits.length;
  const s = bearishHits.length;
  const total = b + s;

  const score = total === 0 ? 0 : (b - s) / total;

  return { score, bullishHits, bearishHits };
}

/**
 * Determine which tracked symbols a headline is relevant to.
 */
function relevantSymbols(text: string): string[] {
  const lower = text.toLowerCase();
  const relevant: string[] = [];

  for (const [symbol, keywords] of Object.entries(CRYPTO_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      relevant.push(symbol);
    }
  }

  // If no specific symbol matched, tag as market-wide
  if (relevant.length === 0 && (lower.includes("crypto") || lower.includes("bitcoin"))) {
    relevant.push("MARKET");
  }

  return relevant;
}

// ── Optional: Perplexity enrichment for top headlines ────────────────────────

async function enrichWithPerplexity(headlines: string[]): Promise<string | null> {
  if (!PERPLEXITY_KEY || headlines.length === 0) return null;

  try {
    const prompt = `You are a crypto market analyst. In 2-3 sentences, summarize the overall market sentiment from these recent headlines and rate it: BULLISH, BEARISH, or NEUTRAL. Be concise.\n\nHeadlines:\n${headlines.slice(0, 8).map((h, i) => `${i + 1}. ${h}`).join("\n")}`;

    const resp = await axios.post(
      "https://api.perplexity.ai/chat/completions",
      {
        model: "sonar",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
      },
      {
        headers: {
          Authorization: `Bearer ${PERPLEXITY_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    return resp.data?.choices?.[0]?.message?.content || null;
  } catch {
    return null; // silently skip if unavailable
  }
}

// ── Finnhub news fetch ───────────────────────────────────────────────────────

interface NewsItem {
  headline: string;
  summary?: string;
  datetime: number;
  source?: string;
  url?: string;
}

async function fetchCryptoNews(): Promise<NewsItem[]> {
  if (!FINNHUB_KEY) return [];

  try {
    const resp = await axios.get(
      "https://finnhub.io/api/v1/news?category=crypto",
      {
        params: { token: FINNHUB_KEY },
        timeout: 8000,
      }
    );

    const items: NewsItem[] = (resp.data || []).slice(0, 30).map((item: any) => ({
      headline: item.headline || "",
      summary: item.summary || "",
      datetime: item.datetime || Date.now() / 1000,
      source: item.source || "",
      url: item.url || "",
    }));

    return items.filter(i => i.headline.length > 10);
  } catch (err: any) {
    console.error("[sentiment] Finnhub fetch failed:", err.message);
    return [];
  }
}

// ── Storage ──────────────────────────────────────────────────────────────────

async function storeSentiment(dataPoints: any[]): Promise<void> {
  if (!SUPABASE_KEY || dataPoints.length === 0) return;

  try {
    await axios.post(
      `${SUPABASE_URL}/rest/v1/market_data`,
      dataPoints,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        timeout: 10000,
      }
    );
  } catch (err: any) {
    console.error("[sentiment] Store failed:", err.message);
  }
}

// ── Main collection ──────────────────────────────────────────────────────────

async function collectSentiment(): Promise<void> {
  console.log("[sentiment] Starting sentiment collection...");

  const news = await fetchCryptoNews();
  if (news.length === 0) {
    console.log("[sentiment] No news fetched, skipping cycle");
    return;
  }

  console.log(`[sentiment] Fetched ${news.length} headlines`);

  // Score each headline and group by symbol
  const symbolScores: Record<string, { scores: number[]; headlines: { text: string; score: number; signals: string[] }[] }> = {};

  for (const item of news) {
    const text = item.headline + " " + (item.summary || "");
    const { score, bullishHits, bearishHits } = scoreText(text);
    const symbols = relevantSymbols(text);
    const signals = [...bullishHits, ...bearishHits.map(s => `-${s}`)];

    for (const sym of symbols) {
      if (!symbolScores[sym]) symbolScores[sym] = { scores: [], headlines: [] };
      symbolScores[sym].scores.push(score);
      symbolScores[sym].headlines.push({ text: item.headline, score, signals });
    }
  }

  // Get AI summary for top headlines (best-effort)
  const topHeadlines = news.slice(0, 10).map(n => n.headline);
  const aiSummary = await enrichWithPerplexity(topHeadlines);
  if (aiSummary) {
    console.log("[sentiment] AI summary:", aiSummary.substring(0, 100) + "...");
  }

  // Build data points for Supabase
  const dataPoints: any[] = [];
  const now = new Date().toISOString();

  for (const [symbol, data] of Object.entries(symbolScores)) {
    if (data.scores.length === 0) continue;

    const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    const sentiment = avgScore > 0.15 ? "bullish" : avgScore < -0.15 ? "bearish" : "neutral";
    const topHeadlines = data.headlines
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 5);

    dataPoints.push({
      symbol,
      data_type: "sentiment",
      value: {
        score: Math.round(avgScore * 1000) / 1000,
        sentiment,
        headline_count: data.scores.length,
        top_headlines: topHeadlines,
        ai_summary: symbol === "MARKET" ? (aiSummary || null) : null,
      },
      source: "finnhub+keyword",
      timestamp: now,
    });
  }

  await storeSentiment(dataPoints);
  console.log(`[sentiment] Stored sentiment for: ${Object.keys(symbolScores).join(", ")} (${dataPoints.length} records)`);
}

// ── Timer ─────────────────────────────────────────────────────────────────────

const INTERVAL_MS = 15 * 60 * 1000; // Every 15 minutes

export function startSentimentCollector(): void {
  if (!FINNHUB_KEY) {
    console.log("[sentiment] No FINNHUB_API_KEY set, sentiment collection disabled");
    return;
  }

  console.log(`[sentiment] Starting sentiment collector (every ${INTERVAL_MS / 60000}min)`);

  collectSentiment().catch(console.error);

  setInterval(() => {
    collectSentiment().catch(console.error);
  }, INTERVAL_MS);
}
