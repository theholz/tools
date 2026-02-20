-- market_data: funding rates, OI, long/short ratios, fear/greed, taker flow
-- Populated by coinglass-collector.ts running inside tv-ws-proxy
CREATE TABLE IF NOT EXISTS market_data (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  symbol TEXT NOT NULL,           -- e.g. "SOLUSDT", "BTCUSDT", "MARKET"
  data_type TEXT NOT NULL,        -- "funding_rate" | "open_interest" | "long_short_ratio" | "taker_buy_sell" | "top_trader_ratio" | "fear_greed"
  value JSONB NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'binance',  -- "binance" | "coinglass"
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_data_symbol_type ON market_data (symbol, data_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_type_ts ON market_data (data_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_value ON market_data USING GIN (value);

ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON market_data
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Convenience view: latest value per symbol+type
CREATE OR REPLACE VIEW market_data_latest AS
SELECT DISTINCT ON (symbol, data_type)
  symbol,
  data_type,
  value,
  source,
  timestamp
FROM market_data
ORDER BY symbol, data_type, timestamp DESC;

COMMENT ON TABLE market_data IS 'Time-series market microstructure data: funding rates, OI, L/S ratios, taker flow, fear/greed. Collected every 5min.';
COMMENT ON VIEW market_data_latest IS 'Latest snapshot per symbol+data_type. Use for real-time signal scoring.';
