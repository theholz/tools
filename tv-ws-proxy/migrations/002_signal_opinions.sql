-- signal_opinions: Grok second-opinion verdicts on trading signals
-- Populated by the Letta payload fork n8n workflow
CREATE TABLE IF NOT EXISTS signal_opinions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  signal_timestamp TIMESTAMPTZ,
  symbol TEXT NOT NULL,
  original_signal JSONB DEFAULT '{}',
  grok_opinion JSONB DEFAULT '{}',
  verdict TEXT GENERATED ALWAYS AS (
    CASE
      WHEN grok_opinion->>'output' ILIKE '%agree%' THEN 'AGREE'
      WHEN grok_opinion->>'output' ILIKE '%disagree%' THEN 'DISAGREE'
      ELSE 'UNKNOWN'
    END
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signal_opinions_symbol_ts ON signal_opinions (symbol, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_opinions_verdict ON signal_opinions (verdict);
CREATE INDEX IF NOT EXISTS idx_signal_opinions_payload ON signal_opinions USING GIN (original_signal);

ALTER TABLE signal_opinions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON signal_opinions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE signal_opinions IS 'Grok second-opinion verdicts. verdict column auto-extracted from LLM response text.';
COMMENT ON COLUMN signal_opinions.verdict IS 'AGREE | DISAGREE | UNKNOWN — derived from grok_opinion.output text';
