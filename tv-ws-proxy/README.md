# TV WebSocket Proxy

Real-time TradingView data via WebSocket push feed. Replaces polling browser automation (60 req/min limit) with sub-second updates.

## Architecture

```
TradingView WS Feed → tv-ws-proxy → [n8n webhook (Supabase), Grok MCP relay]
```

## What it does

1. Authenticates with TradingView (username/password)
2. Opens WebSocket to `wss://data.tradingview.com/socket.io/websocket`
3. Subscribes to configured symbols (SOL, JUP, etc.)
4. Requests quote fields including RSI, MACD, Stochastic, ADX, Bollinger Bands, Ichimoku
5. On every data update, classifies signals:
   - **PTOS**: RSI(14), MACD crossover, volume spike
   - **IADSS**: BB squeeze/breakout, Ichimoku cross, Stochastic, ADX
   - **ADX rules**: >25 strong trend, <20 choppy (skip), >40 exhaustion risk
6. Fans out payload in parallel to:
   - n8n webhook → Supabase (production execution path, unchanged)
   - Grok MCP relay (second opinion: Agree/Disagree + why)

## Confluence Rule

Strict 2-of-3 required: PTOS + IADSS + James Score layers must agree before action.

## Running

```bash
# In tools stack
docker compose --profile trading up tv-ws-proxy -d

# Health check
curl http://localhost:8085/health
```

## Environment

See docker-compose.yml `tv-ws-proxy` service or `.env.example`.

## Token Refresh

Auto-refreshes TradingView auth token every 50 minutes. Auto-reconnects on disconnect with exponential backoff.
