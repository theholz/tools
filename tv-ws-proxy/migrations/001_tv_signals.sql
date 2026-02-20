-- tv_signals: real-time indicator data from TradingView WebSocket proxy
CREATE TABLE IF NOT EXISTS tv_signals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  symbol TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scores JSONB DEFAULT '{}',
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tv_signals_symbol_ts ON tv_signals (symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tv_signals_scores ON tv_signals USING GIN (scores);

-- Enable RLS
ALTER TABLE tv_signals ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "service_role_all" ON tv_signals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
