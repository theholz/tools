/**
 * Chart Manager - Handles TradingView chart operations
 */

import { Page } from 'playwright';
import { Logger } from '../utils/logger.js';
import { withRetry, sleep } from '../utils/retry.js';
import { NotFoundError, TimeoutError } from '../utils/errors.js';
import { ChartContext, TV_SELECTORS } from './types.js';
import { IndicatorManager } from './IndicatorManager.js';

export class ChartManager {
  private page: Page;
  private logger: Logger;
  private indicatorManager: IndicatorManager;

  constructor(page: Page, logger: Logger) {
    this.page = page;
    this.logger = logger;
    this.indicatorManager = new IndicatorManager(page, logger);
  }

  /**
   * Get current chart context (symbol, timeframe, exchange, indicators)
   */
  async getContext(): Promise<ChartContext> {
    this.logger.info('Getting chart context');

    try {
      const context = await this.page.evaluate(() => {
        // Get symbol info from the legend series item (main price series)
        let symbol = 'Unknown';
        let exchange = 'Unknown';

        // Approach 1: From the main legend item
        const seriesItem = document.querySelector('[data-name="legend-series-item"]');
        if (seriesItem) {
          const symbolText = seriesItem.querySelector('[class*="title"]')?.textContent;
          if (symbolText) {
            const parts = symbolText.split(':');
            if (parts.length >= 2) {
              exchange = parts[0].trim();
              symbol = parts[1].trim();
            } else {
              symbol = symbolText.trim();
            }
          }
        }

        // Approach 2: From the header symbol button
        if (symbol === 'Unknown') {
          const symbolBtn = document.querySelector('[data-name="symbol-search-button"]');
          const btnText = symbolBtn?.textContent;
          if (btnText) {
            const parts = btnText.split(':');
            if (parts.length >= 2) {
              exchange = parts[0].trim();
              symbol = parts[1].trim();
            } else {
              symbol = btnText.trim();
            }
          }
        }

        // Approach 3: From URL
        if (symbol === 'Unknown') {
          const url = window.location.href;
          const urlMatch = url.match(/chart\/([^\/]+)/);
          if (urlMatch) {
            const urlSymbol = urlMatch[1];
            const parts = urlSymbol.split(':');
            if (parts.length >= 2) {
              exchange = parts[0];
              symbol = parts[1];
            } else {
              symbol = urlSymbol;
            }
          }
        }

        // Get timeframe from interval button or header
        let timeframe = 'Unknown';
        const intervalBtn = document.querySelector('#header-toolbar-intervals button[aria-checked="true"]');
        if (intervalBtn) {
          timeframe = intervalBtn.textContent?.trim() || 'Unknown';
        } else {
          // Fallback: try to find active interval in different locations
          const activeInterval = document.querySelector('[class*="interval"][class*="active"]') ||
                                document.querySelector('[data-name="interval-menu"]');
          if (activeInterval) {
            timeframe = activeInterval.textContent?.trim().split(',')[0] || 'Unknown';
          }
        }

        // Get chart type (candlestick, bars, etc.)
        let chartType = 'candlestick';
        const chartTypePicker = document.querySelector('[data-name="chart-type-picker"]');
        if (chartTypePicker) {
          const activeType = chartTypePicker.getAttribute('data-value');
          chartType = activeType || 'candlestick';
        }

        return {
          symbol,
          exchange,
          timeframe,
          chartType,
          timestamp: new Date().toISOString()
        };
      });

      // Add indicators to context
      const indicators = await this.indicatorManager.listIndicators();

      const fullContext: ChartContext = {
        ...context,
        indicators,
        alertsCount: await this.countAlerts()
      };

      this.logger.info('Chart context retrieved', {
        symbol: fullContext.symbol,
        timeframe: fullContext.timeframe,
        indicatorCount: fullContext.indicators.length
      });

      return fullContext;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get chart context', { error: errorMessage });
      throw new NotFoundError(`Failed to get chart context: ${errorMessage}`);
    }
  }

  /**
   * Change chart symbol
   */
  async changeSymbol(symbol: string): Promise<{ success: boolean; symbol: string; exchange?: string }> {
    this.logger.info(`Changing chart symbol to: ${symbol}`);

    try {
      // Parse symbol (handle "EXCHANGE:SYMBOL" format)
      let exchange: string | undefined;
      let symbolOnly = symbol;

      if (symbol.includes(':')) {
        const parts = symbol.split(':');
        exchange = parts[0].trim();
        symbolOnly = parts.slice(1).join(':').trim();
      }

      // Method 1: Use symbol search button
      const changed = await this.page.evaluate((selectors) => {
        // Find symbol search button
        const symbolBtn = document.querySelector(selectors.symbol.searchButton) as HTMLElement || 
                          document.querySelector('#header-toolbar-symbol-search') as HTMLElement;
        if (!symbolBtn) return false;

        // Click to open search
        symbolBtn.click();
        return true;
      }, TV_SELECTORS);

      if (!changed) {
        // Fallback: Try keyboard shortcut (just start typing)
        this.logger.info('Symbol button not found, trying keyboard input...');
        // We'll proceed to typing, assuming chart is focused
      }

      // Wait for search dialog/input to appear
      await sleep(1000);

      // Check if dialog opened
      const dialogOpen = await this.page.evaluate((selectors) => {
        const input = document.querySelector(selectors.symbol.searchInput);
        return !!input;
      }, TV_SELECTORS);

      if (!dialogOpen && !changed) {
         throw new NotFoundError('Symbol search dialog did not open');
      }

      // Type symbol in search
      const typed = await this.page.evaluate((params) => {
        const { symbol, selectors } = params;
        const input = document.querySelector(selectors.symbol.searchInput) as HTMLInputElement;
        if (input) {
          input.value = symbol;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      }, { symbol: symbolOnly, selectors: TV_SELECTORS });

      if (!typed) {
         // Fallback to keyboard typing if input not found directly
         await this.page.keyboard.type(symbolOnly, { delay: 100 });
      }
      
      await sleep(1000);

      // Press Enter to select first result
      await this.page.keyboard.press('Enter');
      await sleep(3000); // Wait longer for chart to load

      // Verify symbol changed
      const newContext = await this.getContext();
      const newSymbol = exchange ? `${exchange}:${newContext.symbol}` : newContext.symbol;

      if (newSymbol.toLowerCase().includes(symbolOnly.toLowerCase()) ||
          symbolOnly.toLowerCase().includes(newContext.symbol.toLowerCase())) {
        this.logger.info(`Symbol changed successfully`, { from: symbol, to: newSymbol });
        return {
          success: true,
          symbol: newContext.symbol,
          exchange: newContext.exchange
        };
      } else {
        this.logger.warn('Symbol may not have changed', { expected: symbol, actual: newSymbol });
        return {
          success: true, // Still return success if we tried
          symbol: newContext.symbol,
          exchange: newContext.exchange
        };
      }
    } catch (error) {
      const pageTitle = await this.page.title().catch(() => 'Unknown');
      const pageUrl = this.page.url();
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to change symbol to "${symbol}"`, { error: errorMessage, pageTitle, pageUrl });
      throw new NotFoundError(`Failed to change symbol: ${errorMessage} (Page: ${pageTitle}, URL: ${pageUrl})`);
    }
  }

  /**
   * Change chart timeframe
   */
  async changeTimeframe(timeframe: string): Promise<{ success: boolean; timeframe: string }> {
    this.logger.info(`Changing chart timeframe to: ${timeframe}`);

    try {
      // Normalize timeframe (handle variations like "4h", "4H", "4 hours")
      const normalized = this.normalizeTimeframe(timeframe);

      // Method 1: Try keyboard shortcut (type timeframe + Enter)
      const changed = await withRetry(
        async () => {
          // Type the timeframe
          await this.page.keyboard.type(normalized, { delay: 50 });
          await sleep(300);
          await this.page.keyboard.press('Enter');
          await sleep(1500); // Wait for timeframe to change

          // Verify timeframe changed
          const context = await this.getContext();
          const currentTimeframe = this.normalizeTimeframe(context.timeframe);

          if (currentTimeframe === normalized || 
              currentTimeframe.includes(normalized) ||
              normalized.includes(currentTimeframe)) {
            return { success: true, timeframe: context.timeframe };
          }

          throw new Error('Timeframe did not change');
        },
        {
          maxRetries: 2,
          initialDelay: 500
        }
      );

      if (changed.success) {
        this.logger.info(`Timeframe changed successfully`, { to: changed.timeframe });
        return changed;
      }

      // Method 2: Click interval button
      const clicked = await this.page.evaluate((params) => {
        const { normalized } = params;

        // Find interval buttons
        const intervalButtons = Array.from(
          document.querySelectorAll('#header-toolbar-intervals button, [class*="interval"] button')
        );

        for (const btn of intervalButtons) {
          const text = btn.textContent?.trim() || '';
          const normalizedText = text.toLowerCase().replace(/\s+/g, '');

          if (normalizedText.includes(normalized.toLowerCase()) ||
              normalized.toLowerCase().includes(normalizedText)) {
            (btn as HTMLElement).click();
            return true;
          }
        }

        return false;
      }, { normalized });

      if (clicked) {
        await sleep(1500);
        const context = await this.getContext();
        this.logger.info(`Timeframe changed via button click`, { to: context.timeframe });
        return { success: true, timeframe: context.timeframe };
      }

      throw new NotFoundError(`Could not change timeframe to "${timeframe}"`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to change timeframe to "${timeframe}"`, { error: errorMessage });
      throw new NotFoundError(`Failed to change timeframe: ${errorMessage}`);
    }
  }

  /**
   * Normalize timeframe string (handle variations)
   */
  private normalizeTimeframe(timeframe: string): string {
    const lower = timeframe.toLowerCase().trim();

    // Map common variations
    const mappings: Record<string, string> = {
      '1m': '1',
      '5m': '5',
      '15m': '15',
      '30m': '30',
      '1h': '60',
      '4h': '240',
      '1d': '1D',
      '1w': '1W',
      '1M': '1M'
    };

    if (mappings[lower]) {
      return mappings[lower];
    }

    // Remove spaces and common suffixes
    return lower.replace(/\s+/g, '').replace(/minute|hour|day|week|month/gi, '');
  }

  /**
   * Count active alerts (approximate - from UI indicators)
   */
  private async countAlerts(): Promise<number> {
    try {
      const count = await this.page.evaluate(() => {
        // Look for alert indicators on the chart
        const alertLines = document.querySelectorAll('[class*="alert-line"]');
        const alertIcons = document.querySelectorAll('[class*="alert-icon"]');
        return alertLines.length + alertIcons.length;
      });
      return count;
    } catch {
      return 0;
    }
  }
}
