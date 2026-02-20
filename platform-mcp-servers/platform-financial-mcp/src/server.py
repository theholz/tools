"""
Platform Financial MCP - Crypto & Stock Market Tools
10 tools for financial data access.
"""
import os
import logging
from typing import Any, List, Dict, Optional
from mcp.server.fastmcp import FastMCP

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("platform-financial-mcp")

mcp = FastMCP("platform-financial-mcp")

# ============================================================================
# CRYPTO PRICE DATA
# ============================================================================

@mcp.tool()
async def get_crypto_price(symbol: str, currency: str = "usd", source: str = "coingecko") -> Dict[str, Any]:
    """Get cryptocurrency price from CoinGecko or Coinbase."""
    import requests
    
    symbol_map = {"BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana"}
    coingecko_symbol = symbol_map.get(symbol.upper(), symbol.lower())
    
    if source == "coingecko" or source == "auto":
        try:
            url = f"https://api.coingecko.com/api/v3/simple/price?ids={coingecko_symbol}&vs_currencies={currency}"
            response = requests.get(url, timeout=5)
            data = response.json()
            if coingecko_symbol in data:
                return {"symbol": symbol, "price": data[coingecko_symbol].get(currency), "currency": currency.upper(), "source": "coingecko", "success": True}
        except Exception as e:
            logger.warning(f"CoinGecko failed: {e}")
    
    if source == "coinbase" or source == "auto":
        try:
            pair = f"{symbol.upper()}-{currency.upper()}"
            url = f"https://api.exchange.coinbase.com/products/{pair}/ticker"
            response = requests.get(url, timeout=5)
            data = response.json()
            return {"symbol": symbol, "price": float(data.get("price", 0)), "currency": currency.upper(), "source": "coinbase", "success": True}
        except Exception as e:
            logger.warning(f"Coinbase failed: {e}")
    
    return {"symbol": symbol, "price": None, "currency": currency.upper(), "source": "none", "success": False, "error": "All price sources failed"}

# ============================================================================
# COINGLASS API (Funding Rates, Open Interest)
# ============================================================================

@mcp.tool()
async def get_funding_rate(symbol: str = "BTC", exchange: Optional[str] = None) -> Dict[str, Any]:
    """Get perpetual funding rates from Coinglass API."""
    import requests
    
    api_key = os.getenv("COINGLASS_API_KEY")
    if not api_key:
        return {"error": "COINGLASS_API_KEY not set", "symbol": symbol, "success": False}
    
    try:
        url = "https://open-api.coinglass.com/public/v2/funding"
        headers = {"coinglassSecret": api_key}
        response = requests.get(url, headers=headers, params={"symbol": symbol}, timeout=10)
        data = response.json()
        
        if "data" in data:
            rates = {item.get("exchange", "unknown"): float(item.get("fundingRate", 0)) * 100 for item in data["data"]}
            avg_rate = sum(rates.values()) / len(rates) if rates else 0
            return {"symbol": symbol, "rates": rates, "average": avg_rate, "is_extreme": abs(avg_rate) > 0.1, "exchange_rate": rates.get(exchange) if exchange else None, "success": True}
        return {"error": "Invalid response from Coinglass", "symbol": symbol, "success": False}
    except Exception as e:
        logger.error(f"Coinglass API error: {e}")
        return {"error": str(e), "symbol": symbol, "success": False}

@mcp.tool()
async def get_open_interest(symbol: str = "BTC", exchange: Optional[str] = None) -> Dict[str, Any]:
    """Get open interest data from Coinglass API."""
    import requests
    
    api_key = os.getenv("COINGLASS_API_KEY")
    if not api_key:
        return {"error": "COINGLASS_API_KEY not set", "symbol": symbol, "success": False}
    
    try:
        url = "https://open-api.coinglass.com/public/v2/open_interest"
        headers = {"coinglassSecret": api_key}
        response = requests.get(url, headers=headers, params={"symbol": symbol}, timeout=10)
        data = response.json()
        
        if "data" in data:
            oi_data = {item.get("exchange", "unknown"): float(item.get("openInterest", 0)) for item in data["data"]}
            total_oi = sum(oi_data.values())
            return {"symbol": symbol, "open_interest_by_exchange": oi_data, "total_open_interest": total_oi, "success": True}
        return {"error": "Invalid response from Coinglass", "symbol": symbol, "success": False}
    except Exception as e:
        logger.error(f"Coinglass open interest error: {e}")
        return {"error": str(e), "symbol": symbol, "success": False}

# ============================================================================
# FEAR & GREED INDEX
# ============================================================================

@mcp.tool()
async def get_fear_greed_index() -> Dict[str, Any]:
    """Get Crypto Fear & Greed Index from Alternative.me API."""
    import requests
    
    try:
        url = "https://api.alternative.me/fng/"
        response = requests.get(url, timeout=5)
        data = response.json()
        
        if "data" in data and len(data["data"]) > 0:
            latest = data["data"][0]
            return {"value": int(latest.get("value", 50)), "classification": latest.get("value_classification", "Neutral"), "timestamp": int(latest.get("timestamp", 0)), "success": True}
        return {"error": "No data returned from Alternative.me", "success": False}
    except Exception as e:
        logger.error(f"Alternative.me API error: {e}")
        return {"error": str(e), "success": False}

# ============================================================================
# YAHOO FINANCE (Stocks & Options)
# ============================================================================

@mcp.tool()
async def get_stock_price(symbol: str, include_history: bool = False, period: str = "1mo") -> Dict[str, Any]:
    """Get stock price and data from Yahoo Finance."""
    try:
        import yfinance as yf
        
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        result = {
            "symbol": symbol,
            "price": info.get("regularMarketPrice"),
            "change": info.get("regularMarketChange"),
            "change_pct": info.get("regularMarketChangePercent"),
            "volume": info.get("regularMarketVolume"),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "52w_high": info.get("fiftyTwoWeekHigh"),
            "52w_low": info.get("fiftyTwoWeekLow"),
            "success": True
        }
        
        if include_history:
            hist = ticker.history(period=period)
            if not hist.empty:
                result["history"] = {"dates": hist.index.strftime("%Y-%m-%d").tolist(), "close": hist["Close"].tolist(), "volume": hist["Volume"].tolist()}
        
        return result
    except Exception as e:
        logger.error(f"Yahoo Finance error: {e}")
        return {"error": str(e), "symbol": symbol, "success": False}

@mcp.tool()
async def get_options_chain(symbol: str, expiration: Optional[str] = None) -> Dict[str, Any]:
    """Get options chain data from Yahoo Finance."""
    try:
        import yfinance as yf
        
        ticker = yf.Ticker(symbol)
        expirations = ticker.options
        
        if not expirations:
            return {"error": f"No options available for {symbol}", "symbol": symbol, "success": False}
        
        exp_date = expiration if expiration else expirations[0]
        chain = ticker.option_chain(exp_date)
        
        return {
            "symbol": symbol, "expiration": exp_date, "available_expirations": list(expirations),
            "calls": chain.calls.to_dict("records") if hasattr(chain.calls, 'to_dict') else [],
            "puts": chain.puts.to_dict("records") if hasattr(chain.puts, 'to_dict') else [],
            "success": True
        }
    except Exception as e:
        logger.error(f"Yahoo Finance options error: {e}")
        return {"error": str(e), "symbol": symbol, "success": False}

# ============================================================================
# ALPHA VANTAGE (Stocks & Technical Indicators)
# ============================================================================

@mcp.tool()
async def get_stock_quote_av(symbol: str) -> Dict[str, Any]:
    """Get real-time stock quote from Alpha Vantage API."""
    import requests
    
    api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
    if not api_key:
        return {"error": "ALPHA_VANTAGE_API_KEY not set", "symbol": symbol, "success": False}
    
    try:
        url = "https://www.alphavantage.co/query"
        params = {"function": "GLOBAL_QUOTE", "symbol": symbol, "apikey": api_key}
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if "Global Quote" in data:
            quote = data["Global Quote"]
            return {
                "symbol": quote.get("01. symbol"), "price": float(quote.get("05. price", 0)),
                "change": float(quote.get("09. change", 0)), "change_pct": quote.get("10. change percent", "0%"),
                "volume": int(quote.get("06. volume", 0)), "success": True
            }
        return {"error": "Invalid response from Alpha Vantage", "symbol": symbol, "success": False}
    except Exception as e:
        logger.error(f"Alpha Vantage error: {e}")
        return {"error": str(e), "symbol": symbol, "success": False}

@mcp.tool()
async def get_stock_fundamentals_av(symbol: str) -> Dict[str, Any]:
    """Get company fundamentals (P/E, beta, market cap, revenue, gross margin, etc.) from Alpha Vantage OVERVIEW API."""
    import requests

    api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
    if not api_key:
        return {"error": "ALPHA_VANTAGE_API_KEY not set", "symbol": symbol, "success": False}

    try:
        url = "https://www.alphavantage.co/query"
        params = {"function": "OVERVIEW", "symbol": symbol, "apikey": api_key}
        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        if not data or "Symbol" not in data:
            return {"error": data.get("Note") or "Invalid or missing response from Alpha Vantage", "symbol": symbol, "success": False}

        def _float(key: str, default: Optional[float] = None):
            v = data.get(key)
            if v is None or v == "None" or v == "-": return default
            try: return float(v)
            except (TypeError, ValueError): return default

        def _str(key: str, default: Optional[str] = None):
            v = data.get(key)
            if v is None or v == "None" or v == "-": return default
            return str(v)

        rev = _float("RevenueTTM")
        gross_profit = _float("GrossProfitTTM")
        gross_margin = (gross_profit / rev) if rev and rev > 0 and gross_profit is not None else _float("ProfitMargin")

        return {
            "symbol": _str("Symbol", symbol),
            "name": _str("Name"),
            "sector": _str("Sector"),
            "industry": _str("Industry"),
            "market_cap": _float("MarketCapitalization"),
            "pe_ratio": _float("PERatio"),
            "peg_ratio": _float("PEGRatio"),
            "beta": _float("Beta"),
            "revenue_ttm": rev,
            "revenue": rev,
            "gross_profit_ttm": gross_profit,
            "gross_margin": gross_margin,
            "profit_margin": _float("ProfitMargin"),
            "operating_margin_ttm": _float("OperatingMarginTTM"),
            "eps": _float("EPS"),
            "dividend_yield": _float("DividendYield"),
            "52w_high": _float("52WeekHigh"),
            "52w_low": _float("52WeekLow"),
            "analyst_target_price": _float("AnalystTargetPrice"),
            "success": True,
        }
    except Exception as e:
        logger.error(f"Alpha Vantage OVERVIEW error: {e}")
        return {"error": str(e), "symbol": symbol, "success": False}

@mcp.tool()
async def get_technical_indicator_av(symbol: str, indicator: str = "RSI", interval: str = "daily", time_period: int = 14) -> Dict[str, Any]:
    """Get technical indicator from Alpha Vantage API."""
    import requests
    
    api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
    if not api_key:
        return {"error": "ALPHA_VANTAGE_API_KEY not set", "symbol": symbol, "success": False}
    
    try:
        url = "https://www.alphavantage.co/query"
        params = {"function": indicator.upper(), "symbol": symbol, "interval": interval, "time_period": time_period, "series_type": "close", "apikey": api_key}
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        key = f"Technical Analysis: {indicator.upper()}"
        if key in data:
            indicator_data = data[key]
            latest_date = max(indicator_data.keys())
            latest_value = indicator_data[latest_date]
            return {"symbol": symbol, "indicator": indicator.upper(), "latest_date": latest_date, "latest_value": float(latest_value.get(indicator.upper(), 0)), "success": True}
        return {"error": f"Indicator {indicator} not supported", "symbol": symbol, "success": False}
    except Exception as e:
        logger.error(f"Alpha Vantage indicator error: {e}")
        return {"error": str(e), "symbol": symbol, "success": False}

# ============================================================================
# DXY (Dollar Index)
# ============================================================================

@mcp.tool()
async def get_dxy_index() -> Dict[str, Any]:
    """Get DXY (US Dollar Index) data from Yahoo Finance."""
    try:
        import yfinance as yf
        
        ticker = yf.Ticker("DX-Y.NYB")
        info = ticker.info
        hist = ticker.history(period="5d")
        
        return {
            "symbol": "DXY", "price": info.get("regularMarketPrice"),
            "change": info.get("regularMarketChange"), "change_pct": info.get("regularMarketChangePercent"),
            "52w_high": info.get("fiftyTwoWeekHigh"), "52w_low": info.get("fiftyTwoWeekLow"),
            "5d_history": {"dates": hist.index.strftime("%Y-%m-%d").tolist() if not hist.empty else [], "close": hist["Close"].tolist() if not hist.empty else []},
            "success": True
        }
    except Exception as e:
        logger.error(f"DXY data error: {e}")
        return {"error": str(e), "success": False}

# ============================================================================
# TECHNICAL INDICATORS (TA-Lib)
# ============================================================================

@mcp.tool()
async def calculate_technical_indicators(data: List[float], indicator: str = "RSI", period: Optional[int] = None) -> Dict[str, Any]:
    """Calculate technical indicators using TA-Lib."""
    import numpy as np
    import talib
    
    close_prices = np.array(data, dtype=float)
    
    if len(close_prices) < 2:
        return {"error": "Insufficient data points", "indicator": indicator, "success": False}
    
    try:
        if indicator.upper() == "RSI":
            timeperiod = period or 14
            result = talib.RSI(close_prices, timeperiod=timeperiod)
            return {"indicator": "RSI", "period": timeperiod, "latest_value": float(result[-1]) if not np.isnan(result[-1]) else None, "success": True}
        elif indicator.upper() == "SMA":
            timeperiod = period or 30
            result = talib.SMA(close_prices, timeperiod=timeperiod)
            return {"indicator": "SMA", "period": timeperiod, "latest_value": float(result[-1]) if not np.isnan(result[-1]) else None, "success": True}
        elif indicator.upper() == "EMA":
            timeperiod = period or 30
            result = talib.EMA(close_prices, timeperiod=timeperiod)
            return {"indicator": "EMA", "period": timeperiod, "latest_value": float(result[-1]) if not np.isnan(result[-1]) else None, "success": True}
        elif indicator.upper() == "MACD":
            macd, signal, hist = talib.MACD(close_prices)
            return {"indicator": "MACD", "macd": float(macd[-1]) if not np.isnan(macd[-1]) else None, "signal": float(signal[-1]) if not np.isnan(signal[-1]) else None, "histogram": float(hist[-1]) if not np.isnan(hist[-1]) else None, "success": True}
        return {"error": f"Indicator {indicator} not implemented. Supported: RSI, SMA, EMA, MACD", "indicator": indicator, "success": False}
    except Exception as e:
        logger.error(f"TA-Lib calculation error: {e}")
        return {"error": str(e), "indicator": indicator, "success": False}

if __name__ == "__main__":
    mcp.run()
