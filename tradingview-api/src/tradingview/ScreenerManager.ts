/**
 * ScreenerManager - TradingView screener data via public API
 * 
 * Uses TradingView's scanner API (no browser needed) for market data.
 */

interface ScreenerScanOptions {
  market?: string;
  filters?: any;
  sort_by?: string;
  limit?: number;
}

interface OHLCVOptions {
  symbol: string;
  exchange?: string;
  timeframe?: string;
  bars?: number;
}

export class ScreenerManager {
  private logger: any;

  constructor(logger: any) {
    this.logger = logger;
  }

  async scanScreener(options: ScreenerScanOptions): Promise<any> {
    const { market = 'america', filters, sort_by, limit = 50 } = options;
    
    try {
      const response = await fetch('https://scanner.tradingview.com/' + market + '/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: filters || [],
          symbols: { query: { types: ['stock'] } },
          columns: ['name', 'close', 'change', 'volume', 'market_cap_basic', 'RSI', 'Recommend.All'],
          sort: { sortBy: sort_by || 'volume', sortOrder: 'desc' },
          range: [0, limit]
        })
      });

      const data = await response.json();
      return {
        success: true,
        market,
        totalCount: data.totalCount || 0,
        results: (data.data || []).map((item: any) => ({
          symbol: item.s,
          values: item.d
        }))
      };
    } catch (error) {
      this.logger.error('Screener scan failed', { error: error instanceof Error ? error.message : String(error) });
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async scanJames(options: any = {}): Promise<any> {
    const { rsi_max = 30, min_volume_ratio = 1.5, max_change = -5, limit = 20 } = options;
    return this.scanScreener({
      market: 'america',
      filters: [
        { left: 'RSI', operation: 'less', right: rsi_max },
        { left: 'relative_volume_10d_calc', operation: 'greater', right: min_volume_ratio },
        { left: 'change', operation: 'less', right: max_change }
      ],
      sort_by: 'RSI',
      limit
    });
  }

  async scanGainers(options: any = {}): Promise<any> {
    return this.scanScreener({
      market: options.market || 'america',
      sort_by: 'change',
      limit: options.limit || 20
    });
  }

  async scanLosers(options: any = {}): Promise<any> {
    return this.scanScreener({
      market: options.market || 'america',
      filters: [{ left: 'change', operation: 'less', right: 0 }],
      sort_by: 'change',
      limit: options.limit || 20
    });
  }

  async getOHLCV(options: OHLCVOptions): Promise<any> {
    // TradingView doesn't have a clean public OHLCV API
    // This would typically use the unofficial TV websocket or a data provider
    this.logger.warn('OHLCV endpoint: consider using a dedicated data provider');
    return {
      success: false,
      error: 'OHLCV via TradingView public API is limited. Use exchange APIs or data providers.'
    };
  }
}
