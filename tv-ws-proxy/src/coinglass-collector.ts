/**
 * Market Data Collector
 * 
 * Pulls trading-critical data from free APIs:
 * - Coinglass: Fear & Greed Index
 * - Binance: Funding rates, OI, Long/Short ratios
 * 
 * Stores everything in Supabase for the signal pipeline.
 * Runs on a timer inside the tv-ws-proxy container.
 */

import axios from "axios";

const COINGLASS_KEY = process.env.COINGLASS_API_KEY || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "http://supabase-kong:8000";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

// Binance-specific symbols for futures data
const BINANCE_SYMBOLS = (process.env.BINANCE_FUTURES_SYMBOLS || "SOLUSDT,BTCUSDT,ETHUSDT").split(",");
const SYMBOLS = BINANCE_SYMBOLS;

interface MarketDataPoint {
  symbol: string;
  data_type: string;
  value: any;
  source: string;
  timestamp: string;
}

// ── Binance Free API ────────────────────────────────────────────

async function fetchBinanceFundingRate(symbol: string): Promise<MarketDataPoint | null> {
  try {
    const resp = await axios.get(
      `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`
    );
    if (resp.data?.[0]) {
      const d = resp.data[0];
      return {
        symbol,
        data_type: "funding_rate",
        value: { rate: parseFloat(d.fundingRate), time: d.fundingTime },
        source: "binance",
        timestamp: new Date(d.fundingTime).toISOString(),
      };
    }
  } catch (err: any) {
    console.error(`[binance] Funding rate ${symbol}:`, err.message);
  }
  return null;
}

async function fetchBinanceOI(symbol: string): Promise<MarketDataPoint | null> {
  try {
    const resp = await axios.get(
      `https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`
    );
    if (resp.data) {
      return {
        symbol,
        data_type: "open_interest",
        value: { oi: parseFloat(resp.data.openInterest), time: resp.data.time },
        source: "binance",
        timestamp: new Date(resp.data.time).toISOString(),
      };
    }
  } catch (err: any) {
    console.error(`[binance] OI ${symbol}:`, err.message);
  }
  return null;
}

async function fetchBinanceLongShort(symbol: string): Promise<MarketDataPoint | null> {
  try {
    const resp = await axios.get(
      `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`
    );
    if (resp.data?.[0]) {
      const d = resp.data[0];
      return {
        symbol,
        data_type: "long_short_ratio",
        value: {
          longAccount: parseFloat(d.longAccount),
          shortAccount: parseFloat(d.shortAccount),
          longShortRatio: parseFloat(d.longShortRatio),
        },
        source: "binance",
        timestamp: new Date(d.timestamp).toISOString(),
      };
    }
  } catch (err: any) {
    console.error(`[binance] Long/Short ${symbol}:`, err.message);
  }
  return null;
}

async function fetchBinanceTakerBuySell(symbol: string): Promise<MarketDataPoint | null> {
  try {
    const resp = await axios.get(
      `https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=${symbol}&period=1h&limit=1`
    );
    if (resp.data?.[0]) {
      const d = resp.data[0];
      return {
        symbol,
        data_type: "taker_buy_sell",
        value: {
          buySellRatio: parseFloat(d.buySellRatio),
          buyVol: parseFloat(d.buyVol),
          sellVol: parseFloat(d.sellVol),
        },
        source: "binance",
        timestamp: new Date(d.timestamp).toISOString(),
      };
    }
  } catch (err: any) {
    console.error(`[binance] Taker ${symbol}:`, err.message);
  }
  return null;
}

async function fetchBinanceTopTraderRatio(symbol: string): Promise<MarketDataPoint | null> {
  try {
    const resp = await axios.get(
      `https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=1h&limit=1`
    );
    if (resp.data?.[0]) {
      const d = resp.data[0];
      return {
        symbol,
        data_type: "top_trader_ratio",
        value: {
          longAccount: parseFloat(d.longAccount),
          shortAccount: parseFloat(d.shortAccount),
          longShortRatio: parseFloat(d.longShortRatio),
        },
        source: "binance",
        timestamp: new Date(d.timestamp).toISOString(),
      };
    }
  } catch (err: any) {
    console.error(`[binance] Top traders ${symbol}:`, err.message);
  }
  return null;
}

// ── Coinglass Free Endpoints ────────────────────────────────────

async function fetchFearGreed(): Promise<MarketDataPoint | null> {
  if (!COINGLASS_KEY) return null;
  try {
    const resp = await axios.get(
      "https://open-api-v3.coinglass.com/api/index/fear-greed-history?limit=1",
      { headers: { "CG-API-KEY": COINGLASS_KEY } }
    );
    if (resp.data?.data?.values?.[0] !== undefined) {
      return {
        symbol: "MARKET",
        data_type: "fear_greed",
        value: { index: resp.data.data.values[0] },
        source: "coinglass",
        timestamp: new Date().toISOString(),
      };
    }
  } catch (err: any) {
    console.error("[coinglass] Fear/Greed:", err.message);
  }
  return null;
}

// ── Storage ─────────────────────────────────────────────────────

async function storeDataPoints(points: MarketDataPoint[]): Promise<void> {
  if (!SUPABASE_KEY || points.length === 0) return;
  try {
    await axios.post(
      `${SUPABASE_URL}/rest/v1/market_data`,
      points,
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
    console.log(`[collector] Stored ${points.length} data points`);
  } catch (err: any) {
    console.error("[collector] Store failed:", err.message);
  }
}

// ── Main Collection Loop ────────────────────────────────────────

async function collectAll(): Promise<void> {
  console.log("[collector] Starting data collection...");
  const points: MarketDataPoint[] = [];

  // Per-symbol data from Binance
  for (const symbol of SYMBOLS) {
    const results = await Promise.allSettled([
      fetchBinanceFundingRate(symbol),
      fetchBinanceOI(symbol),
      fetchBinanceLongShort(symbol),
      fetchBinanceTakerBuySell(symbol),
      fetchBinanceTopTraderRatio(symbol),
    ]);

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        points.push(r.value);
      }
    }
  }

  // Market-wide from Coinglass
  const fg = await fetchFearGreed();
  if (fg) points.push(fg);

  await storeDataPoints(points);
  console.log(`[collector] Cycle complete: ${points.length} points for ${SYMBOLS.join(", ")}`);
}

// ── Timer ───────────────────────────────────────────────────────

const INTERVAL_MS = 5 * 60 * 1000; // Every 5 minutes

export function startCollector(): void {
  console.log(`[collector] Starting market data collector (every ${INTERVAL_MS / 60000}min)`);
  console.log(`[collector] Symbols: ${SYMBOLS.join(", ")}`);
  console.log(`[collector] Coinglass: ${COINGLASS_KEY ? "configured" : "no key"}`);

  // Initial run
  collectAll().catch(console.error);

  // Recurring
  setInterval(() => {
    collectAll().catch(console.error);
  }, INTERVAL_MS);
}
