# Platform Financial MCP

A unified MCP server consolidating financial data APIs and trading tools into a single efficient process. Used by James Score Calculator and MAYA Scout.

## 🛠️ Included Tools

### Crypto Price Data (Multi-Source with Fallback)
*   **CoinGecko:** `get_crypto_price` - Primary source
*   **Coinbase Exchange:** Fallback price source
*   **Bitstamp:** Fallback price source
*   **Kraken:** Fallback price source

### Derivatives & On-Chain Data
*   **Coinglass:** `get_funding_rate` - Perpetual funding rates across exchanges
*   **Coinglass:** `get_open_interest` - Open interest data
*   **Glassnode:** `get_exchange_netflow` - Exchange netflow (on-chain metric)
*   **Glassnode:** `get_realized_price` - Realized price (on-chain metric)

### Market Sentiment
*   **Alternative.me:** `get_fear_greed_index` - Crypto Fear & Greed Index
*   **Market Sentiment:** `get_market_sentiment` - Unified sentiment interface

### Stock Market Data
*   **Yahoo Finance:** `get_stock_price` - Stock prices, fundamentals, historical data
*   **Yahoo Finance:** `get_options_chain` - Options chains with Greeks
*   **Alpha Vantage:** `get_stock_quote_av` - Real-time stock quotes
*   **Alpha Vantage:** `get_technical_indicator_av` - Technical indicators (RSI, SMA, EMA, MACD, etc.)

### Macro Indicators
*   **DXY Index:** `get_dxy_index` - US Dollar Index for macro analysis

### Technical Analysis
*   **TA-Lib:** `calculate_technical_indicators` - RSI, SMA, EMA, MACD, BBANDS, etc.

## 🚀 Setup

### Docker (Recommended)

```bash
docker build -t platform-financial-mcp .
docker run -i platform-financial-mcp
```

### Local Development

1.  Install TA-Lib C Library (System dependency).
2.  Install Python dependencies:
    ```bash
    pip install .
    ```
3.  Run:
    ```bash
    python src/server.py
    ```

## 🔑 API Keys Required

Add these to your `.env` or `.env.local` file:

```bash
# Coinglass API (optional - for funding rates & open interest)
COINGLASS_API_KEY=your_key_here

# Glassnode API (optional - for on-chain metrics)
GLASSNODE_API_KEY=your_key_here

# Alpha Vantage API (optional - for stock data & indicators)
ALPHA_VANTAGE_API_KEY=your_key_here
```

**Note:** Most tools work without API keys (using free public APIs). API keys unlock premium features:
- **Coinglass:** Aggregated funding rates across all exchanges ($18/mo)
- **Glassnode:** On-chain metrics like exchange netflow ($39+/mo)
- **Alpha Vantage:** Stock technical indicators (FREE tier: 500 calls/day)

## 🏗️ Architecture

This server uses `fastmcp` and consolidates:
- **Free APIs:** CoinGecko, Yahoo Finance, Alternative.me, Coinbase, Bitstamp, Kraken
- **Premium APIs:** Coinglass, Glassnode, Alpha Vantage (optional)
- **Technical Analysis:** TA-Lib for indicators
- **Data Processing:** pandas, numpy for data manipulation

## 📚 Related Documentation

- [Open WebUI Configuration](../docs/services/platform-financial-mcp/open-webui-configuration.md)
- [n8n Configuration](../docs/services/platform-financial-mcp/n8n-configuration.md)
- [Unified MCP Strategy](../docs/architecture/unified-mcp-strategy.md)


