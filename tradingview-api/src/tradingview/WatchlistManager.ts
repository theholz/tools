/**
 * Watchlist Manager - Handles TradingView watchlist operations
 */

import { Page } from 'playwright';
import { Logger } from '../utils/logger.js';
import { withRetry, sleep } from '../utils/retry.js';
import { NotFoundError, TimeoutError } from '../utils/errors.js';
import { Watchlist } from './types.js';

export class WatchlistManager {
  private page: Page;
  private logger: Logger;

  constructor(page: Page, logger: Logger) {
    this.page = page;
    this.logger = logger;
  }

  /**
   * Select/activate a watchlist
   */
  async selectWatchlist(watchlistName: string): Promise<Watchlist> {
    this.logger.info(`Selecting watchlist: ${watchlistName}`);

    return await withRetry(
      () => this.selectWatchlistInternal(watchlistName),
      {
        maxRetries: 3,
        initialDelay: 1000,
        onRetry: (attempt, error) => {
          this.logger.warn(`Watchlist selection attempt ${attempt} failed`, { error: error.message });
        }
      }
    );
  }

  /**
   * Internal watchlist selection
   */
  private async selectWatchlistInternal(watchlistName: string): Promise<Watchlist> {
    // Try multiple methods to open watchlist panel
    let panelOpened = false;

    // Method 1: Find and click button
    const watchlistButton = await this.findWatchlistButton();
    if (watchlistButton) {
      try {
        await watchlistButton.click();
        await sleep(800);
        panelOpened = true;
        this.logger.debug('Watchlist panel opened via button click');
      } catch (error) {
        this.logger.debug('Button click failed', { error: error instanceof Error ? error.message : String(error) });
      }
    }

    // Method 2: Try keyboard shortcut (if button not found)
    if (!panelOpened) {
      try {
        // Try common shortcuts (these may need to be adjusted based on TradingView)
        const shortcuts = ['Alt+w', 'Control+w', 'Meta+w'];
        
        for (const shortcut of shortcuts) {
          try {
            await this.page.keyboard.press(shortcut);
            await sleep(800);
            
            // Check if panel appeared
            const panelSelectors = [
              '[data-name="watchlist"]',
              '[class*="watchlist-panel"]',
              '[class*="watchlist"]'
            ];

            for (const selector of panelSelectors) {
              try {
                const panel = await this.page.waitForSelector(selector, { timeout: 1000 });
                if (panel) {
                  const isVisible = await panel.isVisible();
                  if (isVisible) {
                    panelOpened = true;
                    this.logger.debug('Watchlist panel opened via keyboard shortcut', { shortcut });
                    break;
                  }
                }
              } catch {
                // Continue
              }
            }

            if (panelOpened) break;
          } catch {
            // Try next shortcut
          }
        }
      } catch (error) {
        this.logger.debug('Keyboard shortcut method failed');
      }
    }

    // Method 3: Try to find panel that's already open
    if (!panelOpened) {
      try {
        const panelSelectors = [
          '[data-name="watchlist"]',
          '[class*="watchlist-panel"]',
          '[class*="watchlist"]'
        ];

        for (const selector of panelSelectors) {
          try {
            const panel = await this.page.waitForSelector(selector, { timeout: 1000 });
            if (panel) {
              const isVisible = await panel.isVisible();
              if (isVisible) {
                panelOpened = true;
                this.logger.debug('Watchlist panel already open', { selector });
                break;
              }
            }
          } catch {
            // Continue
          }
        }
      } catch {
        // Panel not found
      }
    }

    if (!panelOpened) {
      this.logger.warn('Watchlist panel could not be opened - will try to find watchlist anyway');
      // Continue anyway - might be able to find watchlist in DOM
    }

    // Find and click the target watchlist
    const watchlistClicked = await this.page.evaluate((params) => {
      const { watchlistName } = params;

      // Try multiple selectors
      const selectors = [
        '[data-name="watchlist-item"]',
        '[class*="watchlist-item"]',
        '[class*="listItem"]'
      ];

      for (const selector of selectors) {
        const items = Array.from(document.querySelectorAll(selector));
        for (const item of items) {
          const nameEl = item.querySelector('[data-name="watchlist-name"], [class*="watchlist-name"], [class*="title"]');
          const name = nameEl?.textContent?.trim() || '';

          if (name === watchlistName || name.toLowerCase() === watchlistName.toLowerCase()) {
            (item as HTMLElement).click();
            return true;
          }
        }
      }
      return false;
    }, { watchlistName });

    if (!watchlistClicked) {
      throw new NotFoundError(`Watchlist "${watchlistName}" not found`);
    }

    // Wait for watchlist to activate
    await sleep(500);

    // Get symbols from active watchlist
    const symbols = await this.getWatchlistSymbols();

    this.logger.info(`Watchlist "${watchlistName}" selected successfully`, { symbolCount: symbols.length });

    return {
      name: watchlistName,
      symbols,
      active: true
    };
  }

  /**
   * Get currently active watchlist
   */
  async getActiveWatchlist(): Promise<Watchlist | null> {
    try {
      // Open watchlist panel
      const watchlistButton = await this.findWatchlistButton();
      if (watchlistButton) {
        await watchlistButton.click();
        await sleep(300);
      }

      // Find active watchlist
      const activeWatchlist = await this.page.evaluate(() => {
        // Find active watchlist item
        const activeSelectors = [
          '[data-name="watchlist-item"][class*="active"]',
          '[data-name="watchlist-item"][aria-selected="true"]',
          '[class*="watchlist-item"][class*="active"]'
        ];

        let activeItem: any = null;
        for (const selector of activeSelectors) {
          activeItem = document.querySelector(selector);
          if (activeItem) break;
        }

        // Fallback: get first watchlist item
        if (!activeItem) {
          activeItem = document.querySelector('[data-name="watchlist-item"]') ||
                      document.querySelector('[class*="watchlist-item"]');
        }

        if (!activeItem) {
          return null;
        }

        const nameEl = activeItem.querySelector('[data-name="watchlist-name"], [class*="watchlist-name"], [class*="title"]');
        const name = nameEl?.textContent?.trim() || '';

        // Get symbols
        const symbolItems = document.querySelectorAll('[data-name="watchlist-symbol-item"], [class*="symbol-item"]');
        const symbols = Array.from(symbolItems).map(item => {
          const symbolText = item.textContent?.trim() || '';
          return symbolText.split(/\s+/)[0]; // First part is usually symbol
        }).filter(Boolean);

        return { name, symbols };
      });

      // Close watchlist panel if we opened it
      if (watchlistButton) {
        await this.page.keyboard.press('Escape').catch(() => {});
      }

      if (activeWatchlist) {
        return {
          name: activeWatchlist.name,
          symbols: activeWatchlist.symbols,
          active: true
        };
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to get active watchlist', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * List all available watchlists
   */
  async listWatchlists(): Promise<Watchlist[]> {
    this.logger.info('Listing available watchlists');

    try {
      // Open watchlist panel
      const watchlistButton = await this.findWatchlistButton();
      if (!watchlistButton) {
        throw new NotFoundError('Watchlist button not found');
      }

      await watchlistButton.click();
      await sleep(500);

      // Extract watchlist list
      const watchlists = await this.page.evaluate(() => {
        const results: Array<{ name: string; symbolCount: number }> = [];

        const selectors = [
          '[data-name="watchlist-item"]',
          '[class*="watchlist-item"]'
        ];

        for (const selector of selectors) {
          const items = document.querySelectorAll(selector);
          if (items.length > 0) {
            items.forEach((item: any) => {
              const nameEl = item.querySelector('[data-name="watchlist-name"], [class*="watchlist-name"], [class*="title"]');
              const name = nameEl?.textContent?.trim() || '';

              if (name) {
                // Count symbols (approximate)
                const symbolItems = item.querySelectorAll('[data-name="watchlist-symbol-item"], [class*="symbol-item"]');
                results.push({
                  name,
                  symbolCount: symbolItems.length
                });
              }
            });
            break;
          }
        }

        return results;
      });

      // Close panel
      await this.page.keyboard.press('Escape');

      this.logger.info(`Found ${watchlists.length} watchlists`);

      return watchlists.map(wl => ({
        name: wl.name,
        symbols: [], // Will be populated when selected
        active: false
      }));
    } catch (error) {
      await this.page.keyboard.press('Escape').catch(() => {});
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to list watchlists', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Get symbols from active watchlist
   */
  async getWatchlistSymbols(): Promise<string[]> {
    return await this.page.evaluate(() => {
      const symbolItems = document.querySelectorAll(
        '[data-name="watchlist-symbol-item"], [class*="symbol-item"], [class*="symbol"]'
      );
      
      return Array.from(symbolItems).map((item: any) => {
        const symbolText = item.textContent?.trim() || '';
        return symbolText.split(/\s+/)[0]; // First part is usually symbol
      }).filter(Boolean);
    });
  }

  /**
   * Find watchlist button (multiple methods)
   */
  private async findWatchlistButton(): Promise<any> {
    const selectors = [
      '[data-name="watchlists-button"]',
      '[data-name="watchlist-button"]',
      '[aria-label*="Watchlist"]',
      '[aria-label*="watchlist"]',
      '[class*="watchlist-button"]',
      '[class*="watchlists-button"]',
      'button:has-text("Watchlist")',
      '[title*="Watchlist"]',
      '[title*="watchlist"]'
    ];

    // Method 1: Try selectors
    for (const selector of selectors) {
      try {
        const button = await this.page.waitForSelector(selector, { timeout: 2000 });
        if (button) {
          const isVisible = await button.isVisible();
          if (isVisible) {
            this.logger.debug('Found watchlist button', { selector });
            return button;
          }
        }
      } catch {
        // Try next selector
      }
    }

    // Method 2: Try to find by text content
    try {
      const buttonByText = await this.page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
        for (const btn of buttons) {
          const text = btn.textContent?.toLowerCase() || '';
          const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
          if (text.includes('watchlist') || ariaLabel.includes('watchlist')) {
            return btn;
          }
        }
        return null;
      }).then(handle => handle?.asElement()).catch(() => null);

      if (buttonByText) {
        this.logger.debug('Found watchlist button by text content');
        return buttonByText;
      }
    } catch {
      // Continue
    }

    // Method 3: Try keyboard shortcut (if available)
    // Note: TradingView might not have a keyboard shortcut for watchlist panel
    // But we can try common shortcuts
    try {
      // Try Alt+W or similar (this is a guess - may need adjustment)
      await this.page.keyboard.press('Alt+w');
      await sleep(500);
      
      // Check if watchlist panel appeared
      const panelSelectors = [
        '[data-name="watchlist"]',
        '[class*="watchlist-panel"]',
        '[class*="watchlist"]'
      ];

      for (const selector of panelSelectors) {
        try {
          const panel = await this.page.waitForSelector(selector, { timeout: 1000 });
          if (panel) {
            const isVisible = await panel.isVisible();
            if (isVisible) {
              this.logger.debug('Watchlist panel opened via keyboard shortcut');
              return panel; // Return panel instead of button
            }
          }
        } catch {
          // Continue
        }
      }
    } catch {
      // Keyboard shortcut not available
    }

    this.logger.warn('Watchlist button not found - tried multiple methods');
    return null;
  }

  /**
   * Create a new watchlist in TradingView
   * Migrated from TradingView MCP (mcp_servers/tradingview-mcp/src/tools.ts)
   */
  async createWatchlist(name: string, symbols?: string[]): Promise<Watchlist> {
    this.logger.info(`Creating watchlist: ${name}`);

    try {
      // Open watchlist panel (click watchlist icon or use keyboard shortcut)
      this.logger.info('Opening watchlist panel...');
      await this.page.keyboard.press('Escape'); // Close any open dialogs
      await sleep(500);
      
      // Click watchlist button
      const watchlistButton = await this.page.waitForSelector('[data-name="watchlists-button"]', { timeout: 5000 });
      if (!watchlistButton) {
        throw new NotFoundError('Watchlist button not found');
      }
      await watchlistButton.click();
      await sleep(1000);
      
      // Click "Create new list" button
      this.logger.info('Clicking "Create new list"...');
      const createButton = await this.page.waitForSelector('button:has-text("Create new list")', { timeout: 5000 })
        .catch(() => null);
      
      if (!createButton) {
        // Try XPath alternative
        const createButtonXPath = await this.page.waitForSelector('xpath/.//button[contains(text(), "Create new list")]', { timeout: 5000 })
          .catch(() => null);
        if (createButtonXPath) {
          await createButtonXPath.click();
        } else {
          throw new NotFoundError('"Create new list" button not found');
        }
      } else {
        await createButton.click();
      }
      await sleep(1000);
      
      // Wait for modal to appear
      this.logger.info('Entering watchlist name...');
      const inputSelector = 'input[placeholder="List name"], input.input-RUSovanF';
      const nameInput = await this.page.waitForSelector(inputSelector, { timeout: 5000 });
      if (!nameInput) {
        throw new NotFoundError('Watchlist name input not found');
      }
      await nameInput.click();
      await nameInput.type(name);
      await sleep(700);
      
      // Click save/create button
      this.logger.info('Saving watchlist...');
      const saveButton = await this.page.waitForSelector('button[name="save"]', { timeout: 5000 });
      if (!saveButton) {
        throw new NotFoundError('Save button not found');
      }
      await sleep(300); // Wait for button to be enabled
      await saveButton.click();
      await sleep(2000);
      
      this.logger.info(`Watchlist "${name}" created successfully`);
      
      // If symbols provided, add them
      let symbolsAdded = 0;
      if (symbols && symbols.length > 0) {
        this.logger.info(`Adding ${symbols.length} symbols to watchlist...`);
        
        for (const symbol of symbols) {
          try {
            await this.addToWatchlist(name, [symbol]);
            symbolsAdded++;
          } catch (error) {
            this.logger.warn(`Failed to add symbol ${symbol}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
      
      return {
        name,
        symbols: [], // Will be populated when selected
        active: false
      };
      
    } catch (error) {
      await this.page.keyboard.press('Escape').catch(() => {}); // Close any dialogs
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to create watchlist', { error: errorMessage });
      throw new NotFoundError(`Failed to create watchlist: ${errorMessage}`);
    }
  }

  /**
   * Add symbols to an existing watchlist using right-click context menu
   * Migrated from TradingView MCP (mcp_servers/tradingview-mcp/src/tools.ts)
   */
  async addToWatchlist(watchlistName: string, symbols: string[]): Promise<void> {
    if (!watchlistName) {
      throw new Error('watchlistName is required');
    }
    if (!symbols || symbols.length === 0) {
      throw new Error('symbols array is required and must not be empty');
    }
    
    this.logger.info(`Adding ${symbols.length} symbols to watchlist "${watchlistName}"`);
    
    // Implementation would go here - similar to MCP's handleAddToWatchlist
    // This requires right-clicking on symbols in the chart, which is complex
    // For now, we'll log that this needs to be implemented
    this.logger.warn('addToWatchlist() not yet fully implemented - requires symbol right-click context menu');
    throw new NotFoundError('addToWatchlist() not yet fully implemented');
  }

  /**
   * Get all symbols from a specific watchlist
   * Migrated from MCP handleGetWatchlistSymbols
   */
  async getWatchlist(watchlistName: string): Promise<Watchlist> {
    if (!watchlistName) {
      throw new Error('watchlistName is required');
    }

    this.logger.info(`Getting symbols from watchlist: ${watchlistName}`);

    try {
      // Open watchlist panel
      await this.page.keyboard.press('Escape');
      await sleep(500);

      const watchlistButton = await this.page.waitForSelector('[data-name="watchlists-button"]', { timeout: 5000 });
      if (!watchlistButton) {
        throw new NotFoundError('Watchlist button not found');
      }
      await watchlistButton.click();
      await sleep(1500);

      // Click the target watchlist to activate it
      const watchlistItem = await this.page.waitForSelector(`xpath/.//span[text()="${watchlistName}"]`, { timeout: 5000 });
      if (!watchlistItem) {
        throw new NotFoundError(`Watchlist "${watchlistName}" not found`);
      }
      await watchlistItem.click();
      await sleep(1500);

      // Extract symbols from the active watchlist
      const symbols = await this.page.evaluate(() => {
        const symbolElements = Array.from(document.querySelectorAll('[data-name="watchlist-symbol-item"]'));

        return symbolElements.map(el => {
          const symbolElement = el.querySelector('[data-name="symbol-ticker"]');
          return symbolElement?.textContent?.trim() || '';
        }).filter(s => s.length > 0);
      });

      // Close panel
      await this.page.keyboard.press('Escape');

      this.logger.info(`Found ${symbols.length} symbols in watchlist "${watchlistName}"`);

      return {
        name: watchlistName,
        symbols,
        active: true
      };

    } catch (error) {
      await this.page.keyboard.press('Escape').catch(() => {});
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get watchlist', { error: errorMessage });
      throw new NotFoundError(`Failed to get watchlist: ${errorMessage}`);
    }
  }

  /**
   * Get watchlist data with price information
   * This would require Python bridge - placeholder for now
   */
  async getWatchlistData(symbols: string[]): Promise<Array<{
    symbol: string;
    price?: number;
    change?: number;
    change_pct?: number;
    volume?: number;
    timestamp?: string;
  }>> {
    // This requires Python bridge integration
    // For now, return basic structure
    this.logger.warn('getWatchlistData() requires Python bridge - not yet implemented');
    return symbols.map(symbol => ({ symbol }));
  }
}
