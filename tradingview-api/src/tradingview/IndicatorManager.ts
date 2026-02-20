/**
 * Indicator Manager - Handles TradingView indicator operations
 */

import { Page } from 'playwright';
import { Logger } from '../utils/logger.js';
import { withRetry, sleep } from '../utils/retry.js';
import { NotFoundError } from '../utils/errors.js';
import { Indicator, IndicatorSettings, IndicatorSignal, BacktestTable } from './types.js';

export class IndicatorManager {
  private page: Page;
  private logger: Logger;

  constructor(page: Page, logger: Logger) {
    this.page = page;
    this.logger = logger;
  }

  /**
   * List all indicators on the chart
   */
  async listIndicators(): Promise<Indicator[]> {
    this.logger.info('Listing indicators on chart');

    try {
      // Wait for legend to be present
      const legendSelector = '[data-name="legend"]';
      await this.page.waitForSelector(legendSelector, { timeout: 5000 }).catch(() => {
        this.logger.warn('Legend container not found');
        return [];
      });

      const indicators = await this.page.evaluate(() => {
        const results: Indicator[] = [];

        // Find all legend source items
      const legendItems = Array.from(document.querySelectorAll('[data-name="legend-source-item"]'));

      legendItems.forEach((item: any, index: number) => {
          const titleEl = item.querySelector('[class*="title"], [class*="legendTitle"]');
          const name = titleEl?.textContent?.trim() || `Unknown-${index}`;

          // Check if settings button exists
          const settingsBtn = item.querySelector('[data-name="legend-settings-action"]');
          const hasSettings = !!settingsBtn;

          // Check visibility
          const hideBtn = item.querySelector('[data-name="legend-hide-action"]');
          const visible = hideBtn ? !hideBtn.classList.contains('hidden') : true;

          // Determine pane
          const paneElement = item.closest('[class*="pane"]');
          let pane = 0;
          if (paneElement) {
            const paneIndex = paneElement.getAttribute('data-index');
            pane = paneIndex ? parseInt(paneIndex, 10) : 0;
          }

          const fullName = (item as HTMLElement).title || name;

          results.push({
            name: name.split('[')[0].trim(), // Remove version suffix
            fullName,
            pane,
            hasSettings,
            visible
          });
        });

        return results;
      });

      this.logger.info(`Found ${indicators.length} indicators`);
      return indicators;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to list indicators', { error: errorMessage });
      return [];
    }
  }

  /**
   * Find indicator by name (fuzzy match)
   */
  async findIndicator(name: string): Promise<Indicator | null> {
    const indicators = await this.listIndicators();
    const lowerName = name.toLowerCase();

    // Exact match first
    let match = indicators.find(i =>
      i.name.toLowerCase() === lowerName ||
      i.fullName.toLowerCase() === lowerName
    );

    if (match) return match;

    // Partial match
    match = indicators.find(i =>
      i.name.toLowerCase().includes(lowerName) ||
      i.fullName.toLowerCase().includes(lowerName) ||
      lowerName.includes(i.name.toLowerCase())
    );

    if (match) {
      this.logger.debug(`Fuzzy matched "${name}" to "${match.name}"`);
    }

    return match || null;
  }

  /**
   * Get indicator settings
   */
  async getSettings(indicatorName: string): Promise<IndicatorSettings> {
    this.logger.info(`Getting settings for indicator: ${indicatorName}`);

    const indicator = await this.findIndicator(indicatorName);
    if (!indicator) {
      throw new NotFoundError(`Indicator "${indicatorName}" not found on chart`);
    }

    // Open settings dialog
    const opened = await this.openIndicatorSettings(indicator.name);
    if (!opened) {
      throw new NotFoundError(`Could not open settings for "${indicator.name}"`);
    }

    // Wait for dialog
    await sleep(500);

    // Extract settings
    const settings = await this.page.evaluate(() => {
      const result: IndicatorSettings = {
        indicator: '',
        settings: {
          inputs: {},
          style: {},
          visibility: {}
        }
      };

      const dialog = document.querySelector('#overlap-manager-root');
      if (!dialog) return result;

      // Get indicator name from dialog title
      const titleEl = dialog.querySelector('[class*="title"]');
      result.indicator = titleEl?.textContent?.trim() || 'Unknown';

      // Try to get inputs
      const inputs = dialog.querySelectorAll('input[type="text"], input[type="number"]');
      inputs.forEach((input, idx) => {
        const htmlInput = input as HTMLInputElement;
        const label = input.closest('[class*="row"]')?.querySelector('[class*="label"]')?.textContent?.trim() ||
                     `input_${idx}`;
        result.settings.inputs[label] = htmlInput.value;
      });

      // Get checkboxes
      const checkboxes = dialog.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((checkbox, idx) => {
        const htmlCheckbox = checkbox as HTMLInputElement;
        const label = checkbox.closest('[class*="row"]')?.querySelector('[class*="label"]')?.textContent?.trim() ||
                     `checkbox_${idx}`;
        result.settings.visibility[label] = htmlCheckbox.checked;
      });

      return result;
    });

    // Close dialog
    await this.closeSettingsDialog();

    return settings;
  }

  /**
   * Ensure indicators are loaded
   */
  async ensureIndicatorsLoaded(expectedIndicators: string[]): Promise<{
    present: string[];
    missing: string[];
  }> {
    this.logger.info('Ensuring indicators are loaded', { expectedCount: expectedIndicators.length });

    const currentIndicators = await this.listIndicators();
    const currentNames = currentIndicators.map(i => i.name.toLowerCase());

    const present: string[] = [];
    const missing: string[] = [];

    for (const expected of expectedIndicators) {
      const lowerExpected = expected.toLowerCase();
      const found = currentNames.some(name =>
        name.includes(lowerExpected) || lowerExpected.includes(name)
      );

      if (found) {
        present.push(expected);
      } else {
        missing.push(expected);
      }
    }

    this.logger.info('Indicator check complete', {
      present: present.length,
      missing: missing.length
    });

    return { present, missing };
  }

  /**
   * Open indicator settings dialog
   */
  private async openIndicatorSettings(indicatorName: string): Promise<boolean> {
    return await this.page.evaluate((params) => {
      const { indicatorName } = params;
      const legendItems = Array.from(document.querySelectorAll('[data-name="legend-source-item"]'));

      for (const item of legendItems) {
        const title = item.querySelector('[class*="title"]')?.textContent?.trim() || '';

        if (title.toLowerCase().includes(indicatorName.toLowerCase())) {
          const settingsBtn = item.querySelector('[data-name="legend-settings-action"]') as HTMLElement;
          if (settingsBtn) {
            settingsBtn.click();
            return true;
          }
        }
      }
      return false;
    }, { indicatorName });
  }

  /**
   * Close settings dialog
   */
  private async closeSettingsDialog(): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => {});
    await sleep(300);
  }

  /**
   * Set indicator settings (write)
   */
  async setSettings(indicatorName: string, settings: {
    inputs?: Record<string, string | number | boolean>;
    style?: Record<string, string | number | boolean>;
    visibility?: Record<string, boolean>;
  }): Promise<IndicatorSettings> {
    this.logger.info(`Setting indicator settings for: ${indicatorName}`, { settings });

    const indicator = await this.findIndicator(indicatorName);
    if (!indicator) {
      throw new NotFoundError(`Indicator "${indicatorName}" not found on chart`);
    }

    // Open settings dialog
    const opened = await this.openIndicatorSettings(indicator.name);
    if (!opened) {
      throw new NotFoundError(`Could not open settings for "${indicator.name}"`);
    }

    // Wait for dialog
    await sleep(800);

    // Apply settings
    const applied = await this.page.evaluate((params) => {
      const { settings } = params;
      const dialog = document.querySelector('#overlap-manager-root');
      if (!dialog) return false;

      let appliedCount = 0;

      // Apply inputs
      if (settings.inputs) {
        const inputs = dialog.querySelectorAll('input[type="text"], input[type="number"]');
        inputs.forEach((input) => {
          const htmlInput = input as HTMLInputElement;
          const label = input.closest('[class*="row"]')?.querySelector('[class*="label"]')?.textContent?.trim();
          
          if (label && settings.inputs![label]) {
            htmlInput.value = String(settings.inputs![label]);
            htmlInput.dispatchEvent(new Event('input', { bubbles: true }));
            htmlInput.dispatchEvent(new Event('change', { bubbles: true }));
            appliedCount++;
          }
        });
      }

      // Apply checkboxes
      if (settings.visibility) {
        const checkboxes = dialog.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((checkbox) => {
          const htmlCheckbox = checkbox as HTMLInputElement;
          const label = checkbox.closest('[class*="row"]')?.querySelector('[class*="label"]')?.textContent?.trim();
          
          if (label && settings.visibility![label] !== undefined) {
            htmlCheckbox.checked = settings.visibility![label];
            htmlCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
            appliedCount++;
          }
        });
      }

      return appliedCount > 0;
    }, { settings });

    if (!applied) {
      await this.closeSettingsDialog();
      throw new NotFoundError('Could not apply settings - fields not found');
    }

    // Click OK/Save button
    await sleep(300);
    const saved = await this.page.evaluate(() => {
      const dialog = document.querySelector('#overlap-manager-root');
      if (!dialog) return false;

      // Try multiple selectors for save button
      const saveSelectors = [
        'button:has-text("OK")',
        'button:has-text("Save")',
        'button[data-name="ok"]',
        '[class*="ok-button"]',
        '[class*="save-button"]'
      ];

      for (const selector of saveSelectors) {
        try {
          const btn = dialog.querySelector(selector) as HTMLElement;
          if (btn) {
            btn.click();
            return true;
          }
        } catch {
          // Try next selector
        }
      }

      // Fallback: Press Enter
      return false;
    });

    if (!saved) {
      // Fallback: Press Enter to save
      await this.page.keyboard.press('Enter');
      await sleep(500);
    }

    // Close dialog if still open
    await this.closeSettingsDialog();

    // Verify settings were applied by reading them back
    await sleep(500);
    const verifySettings = await this.getSettings(indicatorName);

    this.logger.info(`Settings applied for ${indicatorName}`, { appliedCount: Object.keys(settings.inputs || {}).length });
    return verifySettings;
  }

  /**
   * Read indicator signal (Buy/Sell/Hold state)
   */
  async readSignal(indicatorName: string): Promise<IndicatorSignal> {
    this.logger.info(`Reading signal for indicator: ${indicatorName}`);

    try {
      const signal = await this.page.evaluate((params) => {
        const { indicatorName } = params;
        const legendItems = Array.from(document.querySelectorAll('[data-name="legend-source-item"]'));

        for (const item of legendItems) {
          const titleEl = item.querySelector('[class*="title"]');
          const title = titleEl?.textContent?.trim() || '';

          if (!title.toLowerCase().includes(indicatorName.toLowerCase())) {
            continue;
          }

          // Found the indicator - extract values
          const result: {
            indicator: string;
            signalState: 'buy' | 'sell' | 'hold' | 'neutral' | 'unknown';
            values: Record<string, string | number>;
            color?: string;
            timestamp: string;
          } = {
            indicator: title,
            signalState: 'unknown',
            values: {},
            timestamp: new Date().toISOString()
          };

          // Extract all value items from the legend
          const valueElements = item.querySelectorAll('[class*="valueItem"], [class*="value"], [class*="legendValue"]');
          valueElements.forEach((valEl, idx) => {
            const text = valEl.textContent?.trim() || '';
            
            // Try to parse as number
            const numMatch = text.match(/-?\d+\.?\d*/);
            if (numMatch) {
              result.values[`value_${idx}`] = parseFloat(numMatch[0]);
            } else {
              result.values[`value_${idx}`] = text;
            }

            // Check for color indicators (green = buy, red = sell)
            const style = window.getComputedStyle(valEl);
            const color = style.color || style.backgroundColor;
            if (color && color !== 'rgba(0, 0, 0, 0)') {
              result.color = color;
              
              // Infer signal from color
              if (color.includes('rgb(76, 175, 80)') || color.includes('green')) {
                result.signalState = 'buy';
              } else if (color.includes('rgb(244, 67, 54)') || color.includes('red')) {
                result.signalState = 'sell';
              }
            }
          });

          // Check for text-based signals
          const allText = item.textContent?.toLowerCase() || '';
          if (allText.includes('buy') || allText.includes('long')) {
            result.signalState = 'buy';
          } else if (allText.includes('sell') || allText.includes('short')) {
            result.signalState = 'sell';
          } else if (allText.includes('hold') || allText.includes('neutral')) {
            result.signalState = 'hold';
          }

          // Extract named values (e.g., "Entry: 94,500")
          const entryMatch = allText.match(/entry[:\s]+([\d,]+)/i);
          if (entryMatch) {
            result.values['entry'] = parseFloat(entryMatch[1].replace(/,/g, ''));
          }

          const stopLossMatch = allText.match(/stop[:\s]+loss[:\s]+([\d,]+)/i);
          if (stopLossMatch) {
            result.values['stopLoss'] = parseFloat(stopLossMatch[1].replace(/,/g, ''));
          }

          const takeProfitMatch = allText.match(/take[:\s]+profit[:\s]+([\d,]+)/i);
          if (takeProfitMatch) {
            result.values['takeProfit'] = parseFloat(takeProfitMatch[1].replace(/,/g, ''));
          }

          return result;
        }

        return null;
      }, { indicatorName });

      if (!signal) {
        throw new NotFoundError(`Could not read signal for indicator "${indicatorName}"`);
      }

      this.logger.info(`Signal read for ${indicatorName}`, { 
        signalState: signal.signalState,
        valueCount: Object.keys(signal.values).length
      });

      return signal;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to read signal for "${indicatorName}"`, { error: errorMessage });
      throw new NotFoundError(`Failed to read signal: ${errorMessage}`);
    }
  }

  /**
   * Enable backtest display for an indicator
   */
  async enableBacktestDisplay(indicatorName: string, enabled: boolean = true): Promise<boolean> {
    this.logger.info(`Setting backtest display for ${indicatorName} to ${enabled}`);

    try {
      // Get current settings
      const currentSettings = await this.getSettings(indicatorName);
      
      // Open settings dialog
      const indicator = await this.findIndicator(indicatorName);
      if (!indicator) {
        throw new NotFoundError(`Indicator "${indicatorName}" not found`);
      }

      const opened = await this.openIndicatorSettings(indicator.name);
      if (!opened) {
        throw new NotFoundError(`Could not open settings for "${indicator.name}"`);
      }

      await sleep(800);

      // Find and set "Show Backtest" setting
      const set = await this.page.evaluate((params) => {
        const { enabled } = params;
        const dialog = document.querySelector('#overlap-manager-root');
        if (!dialog) return false;

        // Find "Show Backtest" setting - look for label containing "Show Backtest" or "Backtest"
        const rows = Array.from(dialog.querySelectorAll('[class*="row"]'));
        for (const row of rows) {
          const label = row.querySelector('[class*="label"]')?.textContent?.trim() || '';
          if (label.toLowerCase().includes('show backtest') || 
              (label.toLowerCase().includes('backtest') && label.toLowerCase().includes('show'))) {
            
            // Find dropdown or checkbox
            const dropdown = row.querySelector('select, [class*="dropdown"]') as HTMLSelectElement;
            const checkbox = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
            
            if (dropdown) {
              dropdown.value = enabled ? 'True' : 'False';
              dropdown.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            } else if (checkbox) {
              checkbox.checked = enabled;
              checkbox.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
        }

        return false;
      }, { enabled });

      if (!set) {
        await this.closeSettingsDialog();
        this.logger.warn(`Could not find "Show Backtest" setting for ${indicatorName}`);
        return false;
      }

      // Save settings
      await sleep(300);
      const saved = await this.page.evaluate(() => {
        const dialog = document.querySelector('#overlap-manager-root');
        if (!dialog) return false;

        const saveSelectors = [
          'button:has-text("OK")',
          'button:has-text("Save")',
          'button[data-name="ok"]',
          '[class*="ok-button"]'
        ];

        for (const selector of saveSelectors) {
          try {
            const btn = dialog.querySelector(selector) as HTMLElement;
            if (btn) {
              btn.click();
              return true;
            }
          } catch {}
        }
        return false;
      });

      if (!saved) {
        await this.page.keyboard.press('Enter');
        await sleep(500);
      }

      await this.closeSettingsDialog();
      
      // Wait for backtest table to render (if enabled)
      if (enabled) {
        await sleep(2000); // Give TradingView time to render the table
      }

      this.logger.info(`Backtest display ${enabled ? 'enabled' : 'disabled'} for ${indicatorName}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to set backtest display for "${indicatorName}"`, { error: errorMessage });
      throw new NotFoundError(`Failed to set backtest display: ${errorMessage}`);
    }
  }

  /**
   * Read backtest table data from an indicator
   * Tables are visible on the chart when "Show Backtest" is enabled
   */
  async readBacktestTable(indicatorName: string): Promise<BacktestTable | null> {
    this.logger.info(`Reading backtest table for indicator: ${indicatorName}`);

    try {
      // Wait a bit for tables to be visible
      await sleep(1000);

      const table = await this.page.evaluate((params) => {
        const { indicatorName } = params;
        const result: BacktestTable | null = null;

        // Look for backtest tables on the chart
        // Tables typically have text like "Profit", "ROI", "Win%", "Buys", "Sells", "Open"
        const allTextElements = Array.from(document.querySelectorAll('*'));
        
        // Find elements containing backtest keywords
        const backtestKeywords = ['Profit', 'ROI', 'Win%', 'Buys', 'Sells', 'Open', 'Capital', 'Total'];
        const potentialTables: Array<{ element: Element; text: string }> = [];

        for (const el of allTextElements) {
          const text = el.textContent?.trim() || '';
          if (backtestKeywords.some(keyword => text.includes(keyword))) {
            potentialTables.push({ element: el, text });
          }
        }

        // Try to find table structure near indicator name
        // Look for table-like structures (divs with rows/columns)
        for (const { element } of potentialTables) {
          // Check if this element is part of a table structure
          const parent = element.closest('[class*="table"], [class*="results"], [class*="backtest"]');
          if (!parent) continue;

          // Try to extract table data
          const tableData: Record<string, any> = {};
          const rows = Array.from(parent.querySelectorAll('[class*="row"], div > div'));
          
          for (const row of rows) {
            const text = row.textContent?.trim() || '';
            
            // Parse common patterns
            // "Profit: 34,293" or "Profit 34,293"
            const profitMatch = text.match(/Profit[:\s]+([\d,.-]+)/i);
            if (profitMatch) {
              tableData.profit = parseFloat(profitMatch[1].replace(/,/g, ''));
            }

            // "ROI: 0.00%" or "ROI 0%"
            const roiMatch = text.match(/ROI[:\s]+([\d,.-]+)%?/i);
            if (roiMatch) {
              tableData.roi = parseFloat(roiMatch[1].replace(/,/g, ''));
            }

            // "Win%: 60.00%" or "Win% 60%"
            const winRateMatch = text.match(/Win%?[:\s]+([\d,.-]+)%?/i);
            if (winRateMatch) {
              tableData.winRate = parseFloat(winRateMatch[1].replace(/,/g, ''));
            }

            // "Buys: 10"
            const buysMatch = text.match(/Buys[:\s]+(\d+)/i);
            if (buysMatch) {
              tableData.buys = parseInt(buysMatch[1], 10);
            }

            // "Sells: 10"
            const sellsMatch = text.match(/Sells[:\s]+(\d+)/i);
            if (sellsMatch) {
              tableData.sells = parseInt(sellsMatch[1], 10);
            }

            // "Open: 0"
            const openMatch = text.match(/Open[:\s]+(\d+)/i);
            if (openMatch) {
              tableData.open = parseInt(openMatch[1], 10);
            }

            // "Capital: 100,000"
            const capitalMatch = text.match(/Capital[:\s]+([\d,.-]+)/i);
            if (capitalMatch) {
              tableData.capital = parseFloat(capitalMatch[1].replace(/,/g, ''));
            }

            // "Total: 174,293"
            const totalMatch = text.match(/Total[:\s]+([\d,.-]+)/i);
            if (totalMatch) {
              tableData.total = parseFloat(totalMatch[1].replace(/,/g, ''));
            }

            // "Max Drawdown: -15.2%"
            const drawdownMatch = text.match(/Max\s*Drawdown[:\s]+([\d,.-]+)/i);
            if (drawdownMatch) {
              tableData.maxDrawdown = Math.abs(parseFloat(drawdownMatch[1].replace(/,/g, '')));
            }

            // "Sortino: 1.85"
            const sortinoMatch = text.match(/Sortino[:\s]+([\d,.-]+)/i);
            if (sortinoMatch) {
              tableData.sortino = parseFloat(sortinoMatch[1].replace(/,/g, ''));
            }

            // "Profit Factor: 2.3"
            const profitFactorMatch = text.match(/Profit\s*Factor[:\s]+([\d,.-]+)/i);
            if (profitFactorMatch) {
              tableData.profitFactor = parseFloat(profitFactorMatch[1].replace(/,/g, ''));
            }

            // "Total Trades: 45"
            const tradesMatch = text.match(/Total\s*Trades[:\s]+(\d+)/i);
            if (tradesMatch) {
              tableData.totalTrades = parseInt(tradesMatch[1], 10);
            }

            // Try to find table name (e.g., "PTOS Results", "Conf-BT Results")
            const nameMatch = text.match(/([A-Za-z-]+)\s*(?:Results|Backtest)/i);
            if (nameMatch && !tableData.tableName) {
              tableData.tableName = nameMatch[1].trim();
            }
          }

          // If we found any data, return it
          if (Object.keys(tableData).length > 0) {
            return {
              indicator: indicatorName,
              tableName: tableData.tableName,
              profit: tableData.profit || 0,
              roi: tableData.roi || 0,
              winRate: tableData.winRate || 0,
              maxDrawdown: tableData.maxDrawdown,
              sortino: tableData.sortino,
              profitFactor: tableData.profitFactor,
              totalTrades: tableData.totalTrades,
              buys: tableData.buys || 0,
              sells: tableData.sells || 0,
              open: tableData.open || 0,
              capital: tableData.capital,
              total: tableData.total,
              timestamp: new Date().toISOString(),
              rawData: tableData
            } as BacktestTable;
          }
        }

        return null;
      }, { indicatorName });

      if (!table) {
        this.logger.warn(`No backtest table found for ${indicatorName} - ensure "Show Backtest" is enabled`);
        return null;
      }

      this.logger.info(`Backtest table read for ${indicatorName}`, {
        profit: table.profit,
        roi: table.roi,
        winRate: table.winRate
      });

      return table;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to read backtest table for "${indicatorName}"`, { error: errorMessage });
      return null;
    }
  }

  /**
   * Enable backtest and read table in one operation
   */
  async enableAndReadBacktest(indicatorName: string): Promise<BacktestTable | null> {
    await this.enableBacktestDisplay(indicatorName, true);
    await sleep(2000); // Wait for table to render
    return await this.readBacktestTable(indicatorName);
  }

  /**
   * Read comprehensive indicator configuration
   * Migrated from MCP handleReadIndicatorConfig
   */
  async readIndicatorConfig(
    indicatorName: string,
    options?: { includeStyle?: boolean; includeVisibility?: boolean }
  ): Promise<{
    indicator: string;
    inputs: Record<string, { type: string; value: unknown; options?: string[] }>;
    style: Record<string, unknown>;
    visibility: Record<string, boolean>;
    tabs: string[];
  }> {
    const indicator = await this.findIndicator(indicatorName);
    if (!indicator) {
      throw new NotFoundError(`Indicator "${indicatorName}" not found on chart`);
    }

    const opened = await this.openIndicatorSettings(indicator.name);
    if (!opened) {
      throw new NotFoundError(`Could not open settings for "${indicator.name}"`);
    }

    await sleep(800);

    const config = await this.page.evaluate((params) => {
      const { includeStyle, includeVisibility } = params;

      interface ConfigResult {
        indicator: string;
        inputs: Record<string, { type: string; value: unknown; options?: string[] }>;
        style: Record<string, unknown>;
        visibility: Record<string, boolean>;
        tabs: string[];
      }

      const result: ConfigResult = {
        indicator: '',
        inputs: {},
        style: {},
        visibility: {},
        tabs: []
      };

      const dialog = document.querySelector('#overlap-manager-root');
      if (!dialog) return result;

      // Get indicator name from title
      const titleEl = dialog.querySelector('[class*="title"], [class*="titleWrapper"]');
      result.indicator = titleEl?.textContent?.trim() || 'Unknown';

      // Find all tabs
      const tabs = dialog.querySelectorAll('[class*="tabs"] button, [role="tab"]');
      tabs.forEach(tab => {
        const tabName = tab.textContent?.trim();
        if (tabName) result.tabs.push(tabName);
      });

      // Extract all input rows
      const rows = dialog.querySelectorAll('[class*="cell-"], [class*="row"], [class*="content"] > div > div');

      rows.forEach((row) => {
        const labelEl = row.querySelector('[class*="first-"], [class*="label"], label');
        const label = labelEl?.textContent?.trim();
        if (!label || label.length > 50) return;

        const textInput = row.querySelector('input[type="text"], input[type="number"]') as HTMLInputElement;
        const checkbox = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
        const dropdown = row.querySelector('button[class*="button"], [class*="dropdown"]');
        const colorPicker = row.querySelector('[class*="color"], [class*="swatch"]');

        if (textInput) {
          result.inputs[label] = {
            type: textInput.type === 'number' ? 'number' : 'text',
            value: textInput.type === 'number' ? parseFloat(textInput.value) || 0 : textInput.value
          };
        } else if (checkbox) {
          result.inputs[label] = {
            type: 'checkbox',
            value: checkbox.checked
          };
        } else if (dropdown) {
          const selectedText = dropdown.textContent?.trim();
          result.inputs[label] = {
            type: 'dropdown',
            value: selectedText || '',
            options: []
          };
        } else if (colorPicker) {
          const style = window.getComputedStyle(colorPicker);
          result.inputs[label] = {
            type: 'color',
            value: style.backgroundColor || 'unknown'
          };
        }
      });

      return result;
    }, { includeStyle: options?.includeStyle || false, includeVisibility: options?.includeVisibility || false });

    // Close dialog
    await this.page.keyboard.press('Escape');
    await sleep(300);

    return config;
  }
}
