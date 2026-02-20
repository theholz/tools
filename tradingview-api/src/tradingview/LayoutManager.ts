/**
 * Layout Manager - Handles TradingView layout operations
 */

import { Page } from 'playwright';
import { Logger } from '../utils/logger.js';
import { withRetry, sleep } from '../utils/retry.js';
import { NotFoundError, TimeoutError } from '../utils/errors.js';
import { Layout } from './types.js';

export class LayoutManager {
  private page: Page;
  private logger: Logger;

  constructor(page: Page, logger: Logger) {
    this.page = page;
    this.logger = logger;
  }

  /**
   * Load a layout by name or URL
   */
  async loadLayout(layoutName: string, layoutUrl?: string): Promise<Layout> {
    this.logger.info(`Loading layout: ${layoutName}`);

    try {
      // If URL provided, navigate directly (most reliable method)
      if (layoutUrl) {
        this.logger.debug('Loading layout via URL', { layoutUrl });
        
        // Try with networkidle first, fallback to domcontentloaded if timeout
        try {
          await this.page.goto(layoutUrl, { waitUntil: 'networkidle', timeout: 30000 });
        } catch (timeoutError) {
          // If networkidle times out, try domcontentloaded (faster, less strict)
          this.logger.debug('networkidle timed out, trying domcontentloaded', {
            error: timeoutError instanceof Error ? timeoutError.message : String(timeoutError)
          });
          try {
            await this.page.goto(layoutUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          } catch (domError) {
            // Even domcontentloaded failed, but page might still be loading
            this.logger.warn('Both wait strategies timed out, but continuing', {
              error: domError instanceof Error ? domError.message : String(domError)
            });
          }
        }
        
        await sleep(3000); // Wait for layout to fully load (charts, indicators, etc.)

        const currentUrl = this.page.url();
        this.logger.info(`Layout loaded via URL`, { url: currentUrl });
        return {
          name: layoutName,
          url: currentUrl
        };
      }

      // Try to get layout URL from config file if available
      try {
        const configPath = '/media/tait/Docker/projects/mcp_servers/tradingview-mcp/layouts-config.json';
        const fs = await import('fs/promises');
        try {
          const configContent = await fs.readFile(configPath, 'utf-8');
          const config = JSON.parse(configContent);
          const layoutConfig = config.layouts?.[layoutName];
          if (layoutConfig?.url) {
            this.logger.info('Found layout URL in config, using URL-based loading', { url: layoutConfig.url });
            return await this.loadLayout(layoutName, layoutConfig.url);
          } else {
            this.logger.debug('Layout found in config but no URL', { layoutName });
          }
        } catch (readError) {
          // Config file doesn't exist or can't be read - that's okay
          this.logger.debug('Could not read layout config file', {
            error: readError instanceof Error ? readError.message : String(readError)
          });
        }
      } catch (configError) {
        // Import or other error - continue with dialog method
        this.logger.debug('Could not load layout from config', {
          error: configError instanceof Error ? configError.message : String(configError)
        });
      }

      // Otherwise, use layout dialog
      return await withRetry(
        () => this.loadLayoutFromDialog(layoutName),
        {
          maxRetries: 3,
          initialDelay: 1000,
          onRetry: (attempt, error) => {
            this.logger.warn(`Layout load attempt ${attempt} failed`, { error: error.message });
            // Close any open dialogs before retry
            this.page.keyboard.press('Escape').catch(() => {});
            sleep(500);
          }
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to load layout "${layoutName}"`, { error: errorMessage });
      
      // Try URL-based fallback if dialog method failed
      if (!layoutUrl) {
        this.logger.info('Attempting URL-based fallback');
        // Could try to construct URL from layout name, but this is unreliable
        // Better to use config file or provide URL
      }
      
      throw new NotFoundError(`Failed to load layout: ${errorMessage}`);
    }
  }

  /**
   * Load layout from TradingView dialog
   */
  private async loadLayoutFromDialog(layoutName: string): Promise<Layout> {
    // Try multiple methods to open layout dialog
    let dialogOpened = false;

    // Method 1: Keyboard shortcut (Ctrl+S) - try multiple times
    for (let attempt = 0; attempt < 3 && !dialogOpened; attempt++) {
      try {
        await this.page.keyboard.press('Control+s');
        await sleep(1000); // Longer wait
        
        // Try multiple dialog selectors
        const dialogSelectors = [
          '#overlap-manager-root > div:nth-child(2) > div > div.dialog-qyCw0PaN',
          '#overlap-manager-root > div:nth-child(2) > div > div.dialog',
          '[class*="dialog"][class*="layout"]',
          '[data-name="layout-dialog"]'
        ];

        for (const selector of dialogSelectors) {
          try {
            const dialog = await this.page.waitForSelector(selector, { timeout: 2000, state: 'visible' }).catch(() => null);
            if (dialog) {
              const isVisible = await dialog.isVisible();
              if (isVisible) {
                dialogOpened = true;
                this.logger.debug('Layout dialog opened via keyboard shortcut', { attempt: attempt + 1, selector });
                break;
              }
            }
          } catch {
            // Try next selector
          }
        }

        if (dialogOpened) break;
      } catch (error) {
        this.logger.debug(`Keyboard shortcut attempt ${attempt + 1} failed`, {
          error: error instanceof Error ? error.message : String(error)
        });
        if (attempt < 2) await sleep(500); // Wait before retry
      }
    }

    // Method 2: Try clicking layout button
    if (!dialogOpened) {
      try {
        const layoutButtonSelectors = [
          '[data-name="layout-button"]',
          '[aria-label*="Layout"]',
          '[class*="layout-button"]',
          'button:has-text("Layout")',
          '[title*="Layout"]'
        ];

        for (const selector of layoutButtonSelectors) {
          try {
            const button = await this.page.waitForSelector(selector, { timeout: 2000 });
            if (button) {
              await button.click();
              await sleep(800);
              
              const dialogSelector = '#overlap-manager-root > div:nth-child(2) > div > div.dialog-qyCw0PaN';
              const dialog = await this.page.waitForSelector(dialogSelector, { timeout: 3000 }).catch(() => null);
              if (dialog) {
                dialogOpened = true;
                this.logger.debug('Layout dialog opened via button click', { selector });
                break;
              }
            }
          } catch {
            // Try next selector
          }
        }
      } catch (error) {
        this.logger.debug('Button click failed, trying menu method');
      }
    }

    // Method 3: Try via menu (if available)
    if (!dialogOpened) {
      try {
        // Look for menu items that might open layouts
        const menuSelectors = [
          '[data-name="menu-item"]:has-text("Layout")',
          '[class*="menu-item"]:has-text("Layout")',
          'button[aria-label*="Layout"]'
        ];

        for (const selector of menuSelectors) {
          try {
            const menuItem = await this.page.waitForSelector(selector, { timeout: 2000 });
            if (menuItem) {
              await menuItem.click();
              await sleep(800);
              
              const dialogSelector = '#overlap-manager-root > div:nth-child(2) > div > div.dialog-qyCw0PaN';
              const dialog = await this.page.waitForSelector(dialogSelector, { timeout: 3000 }).catch(() => null);
              if (dialog) {
                dialogOpened = true;
                this.logger.debug('Layout dialog opened via menu', { selector });
                break;
              }
            }
          } catch {
            // Try next selector
          }
        }
      } catch (error) {
        this.logger.debug('Menu method failed');
      }
    }

    if (!dialogOpened) {
      // Try a more generic dialog selector
      const genericDialogSelectors = [
        '#overlap-manager-root > div:nth-child(2) > div > div.dialog',
        '[class*="dialog"]',
        '[data-name="dialog"]'
      ];

      for (const selector of genericDialogSelectors) {
        try {
          const dialog = await this.page.waitForSelector(selector, { timeout: 2000 });
          if (dialog) {
            const isVisible = await dialog.isVisible();
            if (isVisible) {
              dialogOpened = true;
              this.logger.debug('Found dialog with generic selector', { selector });
              break;
            }
          }
        } catch {
          // Try next selector
        }
      }
    }

    if (!dialogOpened) {
      // Last resort: Try to find any visible dialog and see if it's the layout dialog
      try {
        const anyDialog = await this.page.evaluate(() => {
          const dialogs = Array.from(document.querySelectorAll('[class*="dialog"], [data-name*="dialog"]'));
          for (const dialog of dialogs) {
            const style = window.getComputedStyle(dialog as HTMLElement);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              // Check if it contains layout-related text
              const text = dialog.textContent?.toLowerCase() || '';
              if (text.includes('layout') || text.includes('save') || text.includes('load')) {
                return true;
              }
            }
          }
          return false;
        });

        if (anyDialog) {
          dialogOpened = true;
          this.logger.debug('Found dialog that might be layout dialog');
        }
      } catch {
        // Ignore
      }
    }

    if (!dialogOpened) {
      // Provide helpful error message
      const currentUrl = this.page.url();
      throw new TimeoutError(
        `Layout dialog did not open. Tried: keyboard shortcut (Ctrl+S), button click, menu methods. ` +
        `Current page: ${currentUrl}. ` +
        `Tip: Use layoutUrl parameter for more reliable loading, or ensure TradingView layout dialog is accessible.`
      );
    }

    // Find search input
    const searchInputSelector = '#overlap-manager-root > div:nth-child(2) > div > div.dialog-qyCw0PaN.dialog-b8SxMnzX.dialog-T4Q8BJPb.dialog-aRAWUDhF.rounded-aRAWUDhF.shadowed-aRAWUDhF > div > div.container-qm7Rg5MB > div > input';
    const searchInput = await this.page.waitForSelector(searchInputSelector, { timeout: 3000 });

    if (!searchInput) {
      throw new NotFoundError('Layout search input not found');
    }

    // Type layout name
    await searchInput.click();
    await this.page.keyboard.press('Control+a');
    await this.page.keyboard.type(layoutName, { delay: 100 });
    await sleep(500); // Wait for search results

    // Find and click layout
    const layoutClicked = await this.page.evaluate((params) => {
      const { layoutName } = params;
      
      // Try multiple selectors for layout items
      const selectors = [
        '[class*="layout-item"]',
        '[data-name="layout-item"]',
        '[class*="listItem"]'
      ];

      for (const selector of selectors) {
        const items = Array.from(document.querySelectorAll(selector));
        for (const item of items) {
          const nameEl = item.querySelector('[class*="layout-name"], [class*="title"]');
          const name = nameEl?.textContent?.trim() || '';
          
          if (name.toLowerCase().includes(layoutName.toLowerCase()) ||
              layoutName.toLowerCase().includes(name.toLowerCase())) {
            (item as HTMLElement).click();
            return true;
          }
        }
      }
      return false;
    }, { layoutName });

    if (!layoutClicked) {
      await this.page.keyboard.press('Escape'); // Close dialog
      throw new NotFoundError(`Layout "${layoutName}" not found in search results`);
    }

    // Wait for layout to load
    await sleep(2000);
    const newUrl = this.page.url();

    if (!newUrl.includes('/chart/')) {
      throw new TimeoutError('Layout did not load - URL did not change to chart format');
    }

    this.logger.info(`Layout "${layoutName}" loaded successfully`);

    return {
      name: layoutName,
      url: newUrl
    };
  }

  /**
   * List all available layouts
   * Updated to match TradingView MCP implementation
   */
  async listLayouts(): Promise<Layout[]> {
    this.logger.info('Listing available layouts');

    try {
      // Open layouts dialog (keyboard shortcut: Ctrl+S or click layout button)
      // Match MCP implementation from legend-scanner.ts
      await this.page.keyboard.press('Control+s').catch(async () => {
        // Fallback: Try clicking layout button
        const layoutButton = await this.page.waitForSelector(
          '[data-name="layout-button"], [aria-label*="Layout"]',
          { timeout: 3000 }
        ).catch(() => null);
        if (layoutButton) {
          await layoutButton.click();
        }
      });
      
      await sleep(500);
      
      // Wait for layout dialog to appear (using MCP selector)
      const dialog = await this.page.waitForSelector(
        '#overlap-manager-root > div:nth-child(2) > div > div.dialog-qyCw0PaN',
        { timeout: 3000 }
      ).catch(() => null);
      
      if (!dialog) {
        throw new TimeoutError('Layout dialog did not open');
      }

      // Extract layout list
      const layouts = await this.page.evaluate(() => {
        const results: Layout[] = [];

        // Try multiple selectors
        const selectors = [
          '[class*="layout-item"]',
          '[data-name="layout-item"]',
          '[class*="listItem"]'
        ];

        for (const selector of selectors) {
          const items = Array.from(document.querySelectorAll(selector));
          if (items.length > 0) {
            items.forEach((item: any) => {
              const nameEl = item.querySelector('[class*="layout-name"], [class*="title"]');
              const name = nameEl?.textContent?.trim();
              
              if (name) {
                const url = (item as HTMLElement).getAttribute('data-url') ||
                           (item.querySelector('a') as HTMLAnchorElement)?.href ||
                           undefined;
                
                results.push({ name, url });
              }
            });
            break; // Use first selector that finds items
          }
        }

        return results;
      });

      // Close dialog
      await this.page.keyboard.press('Escape');

      this.logger.info(`Found ${layouts.length} layouts`);

      return layouts;
    } catch (error) {
      await this.page.keyboard.press('Escape').catch(() => {}); // Ensure dialog is closed
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to list layouts', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Get currently active layout
   */
  async getCurrentLayout(): Promise<Layout | null> {
    try {
      const url = this.page.url();

      // Extract layout ID from URL
      const layoutMatch = url.match(/\/chart\/([^\/]+)/);
      const layoutId = layoutMatch ? layoutMatch[1] : null;

      if (!layoutId) {
        return null;
      }

      // Try to get layout name from page title
      const layoutName = await this.page.evaluate(() => {
        const title = document.title;
        const titleMatch = title.match(/(.+?)\s*[-|]\s*TradingView/);
        return titleMatch ? titleMatch[1].trim() : null;
      });

      return {
        name: layoutName || `Layout-${layoutId}`,
        url
      };
    } catch (error) {
      this.logger.error('Failed to get current layout', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Create a new layout from the current chart state
   */
  async createLayout(layoutName: string, description?: string): Promise<Layout> {
    this.logger.info(`Creating new layout: ${layoutName}`);

    try {
      // Open layout dialog (Ctrl+S)
      await this.page.keyboard.press('Control+s');
      await sleep(1000);

      // Wait for dialog
      const dialogSelector = '#overlap-manager-root > div:nth-child(2) > div > div.dialog-qyCw0PaN';
      await this.page.waitForSelector(dialogSelector, { timeout: 5000 });

      // Look for "Save As" or "Create" button
      const saveAsClicked = await this.page.evaluate((params) => {
        const { layoutName } = params;
        
        // Try to find "Save As" button
        const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
        for (const btn of buttons) {
          const text = btn.textContent?.toLowerCase() || '';
          const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
          
          if (text.includes('save as') || text.includes('create') || 
              ariaLabel.includes('save as') || ariaLabel.includes('create')) {
            (btn as HTMLElement).click();
            return true;
          }
        }
        return false;
      }, { layoutName });

      if (!saveAsClicked) {
        // Try alternative: Look for input field directly (create layout dialog)
        const createInputSelector = '#overlap-manager-root > div:nth-child(2) > div > div.dialog-qyCw0PaN.popupDialog-B02UUUN3.dialog-aRAWUDhF.rounded-aRAWUDhF.shadowed-aRAWUDhF > div > div > div.content-B02UUUN3 > div.autocomplete-uszkUMOz.js-dialog-skip-escape > span > span.inner-slot-W53jtLjw.inner-middle-slot-W53jtLjw > input';
        const input = await this.page.waitForSelector(createInputSelector, { timeout: 3000 }).catch(() => null);
        
        if (!input) {
          throw new NotFoundError('Could not find layout creation dialog');
        }
      } else {
        // Wait for create dialog to appear
        await sleep(500);
      }

      // Find and fill the layout name input
      const inputFilled = await this.page.evaluate((params) => {
        const { layoutName } = params;
        
        // Try multiple selectors for the input field
        const selectors = [
          '#overlap-manager-root > div:nth-child(2) > div > div.dialog-qyCw0PaN.popupDialog-B02UUUN3.dialog-aRAWUDhF.rounded-aRAWUDhF.shadowed-aRAWUDhF > div > div > div.content-B02UUUN3 > div.autocomplete-uszkUMOz.js-dialog-skip-escape > span > span.inner-slot-W53jtLjw.inner-middle-slot-W53jtLjw > input',
          'input[type="text"]',
          'input[placeholder*="layout" i]',
          'input[placeholder*="name" i]'
        ];

        for (const selector of selectors) {
          const input = document.querySelector(selector) as HTMLInputElement;
          if (input && input.offsetParent !== null) { // Check if visible
            input.focus();
            input.value = '';
            input.value = layoutName;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        return false;
      }, { layoutName });

      if (!inputFilled) {
        throw new NotFoundError('Could not find layout name input field');
      }

      await sleep(300);

      // Click Save/Create button
      const saved = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
        for (const btn of buttons) {
          const text = btn.textContent?.toLowerCase() || '';
          const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
          const isDisabled = btn.hasAttribute('disabled') || btn.classList.contains('disabled');
          
          if (!isDisabled && (
            text.includes('save') || text.includes('create') || text === 'ok' ||
            ariaLabel.includes('save') || ariaLabel.includes('create')
          )) {
            (btn as HTMLElement).click();
            return true;
          }
        }
        return false;
      });

      if (!saved) {
        throw new NotFoundError('Could not find Save/Create button');
      }

      // Wait for layout to save and load
      await sleep(2000);

      // Get the new layout URL
      const newUrl = this.page.url();
      if (!newUrl.includes('/chart/')) {
        throw new TimeoutError('Layout did not save - URL did not change');
      }

      this.logger.info(`Layout "${layoutName}" created successfully`, { url: newUrl });

      return {
        name: layoutName,
        url: newUrl
      };
    } catch (error) {
      // Close any open dialogs
      await this.page.keyboard.press('Escape').catch(() => {});
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create layout "${layoutName}"`, { error: errorMessage });
      throw new NotFoundError(`Failed to create layout: ${errorMessage}`);
    }
  }

  /**
   * Duplicate an existing layout
   */
  async duplicateLayout(sourceLayoutName: string, newLayoutName: string): Promise<Layout> {
    this.logger.info(`Duplicating layout: ${sourceLayoutName} → ${newLayoutName}`);

    // Load the source layout first
    await this.loadLayout(sourceLayoutName);
    await sleep(2000); // Wait for layout to fully load

    // Then create a new layout from current state
    return await this.createLayout(newLayoutName);
  }

  /**
   * Delete a layout
   */
  async deleteLayout(layoutName: string): Promise<boolean> {
    this.logger.info(`Deleting layout: ${layoutName}`);

    try {
      // Open layout dialog
      await this.page.keyboard.press('Control+s');
      await sleep(1000);

      const dialogSelector = '#overlap-manager-root > div:nth-child(2) > div > div.dialog-qyCw0PaN';
      await this.page.waitForSelector(dialogSelector, { timeout: 5000 });

      // Search for the layout
      const searchInputSelector = '#overlap-manager-root > div:nth-child(2) > div > div.dialog-qyCw0PaN.dialog-b8SxMnzX.dialog-T4Q8BJPb.dialog-aRAWUDhF.rounded-aRAWUDhF.shadowed-aRAWUDhF > div > div.container-qm7Rg5MB > div > input';
      const searchInput = await this.page.waitForSelector(searchInputSelector, { timeout: 3000 });
      
      await searchInput.click();
      await this.page.keyboard.press('Control+a');
      await this.page.keyboard.type(layoutName, { delay: 100 });
      await sleep(500);

      // Find and click the layout item
      const layoutClicked = await this.page.evaluate((params) => {
        const { layoutName } = params;
        const selectors = [
          '[class*="layout-item"]',
          '[data-name="layout-item"]'
        ];

        for (const selector of selectors) {
          const items = Array.from(document.querySelectorAll(selector));
          for (const item of items) {
            const nameEl = item.querySelector('[class*="layout-name"], [class*="title"]');
            const name = nameEl?.textContent?.trim() || '';
            
            if (name.toLowerCase() === layoutName.toLowerCase() ||
                name.toLowerCase().includes(layoutName.toLowerCase())) {
              // Right-click or find delete button
              const deleteBtn = item.querySelector('[data-name="delete"], [aria-label*="delete" i], button[title*="delete" i]');
              if (deleteBtn) {
                (deleteBtn as HTMLElement).click();
                return true;
              }
              
              // Try right-click context menu
              const rect = (item as HTMLElement).getBoundingClientRect();
              const event = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2
              });
              item.dispatchEvent(event);
              return true;
            }
          }
        }
        return false;
      }, { layoutName });

      if (!layoutClicked) {
        await this.page.keyboard.press('Escape');
        throw new NotFoundError(`Layout "${layoutName}" not found`);
      }

      await sleep(500);

      // Find and click Delete in context menu or confirmation
      const deleted = await this.page.evaluate(() => {
        // Look for delete button in context menu or confirmation dialog
        const deleteSelectors = [
          'button:has-text("Delete")',
          'button[aria-label*="delete" i]',
          '[data-name="delete"]',
          'button:has-text("Remove")'
        ];

        for (const selector of deleteSelectors) {
          try {
            const btn = document.querySelector(selector) as HTMLElement;
            if (btn && btn.offsetParent !== null) {
              btn.click();
              return true;
            }
          } catch {
            // Continue
          }
        }

        // Try finding by text content
        const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
        for (const btn of buttons) {
          const text = btn.textContent?.toLowerCase() || '';
          const htmlBtn = btn as HTMLElement;
          if ((text.includes('delete') || text.includes('remove')) && htmlBtn.offsetParent !== null) {
            htmlBtn.click();
            return true;
          }
        }
        return false;
      });

      if (!deleted) {
        await this.page.keyboard.press('Escape');
        throw new NotFoundError('Could not find delete button');
      }

      // Wait for deletion
      await sleep(1000);
      await this.page.keyboard.press('Escape').catch(() => {}); // Close dialog

      this.logger.info(`Layout "${layoutName}" deleted successfully`);
      return true;
    } catch (error) {
      await this.page.keyboard.press('Escape').catch(() => {});
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to delete layout "${layoutName}"`, { error: errorMessage });
      throw new NotFoundError(`Failed to delete layout: ${errorMessage}`);
    }
  }

  /**
   * Rename a layout
   */
  async renameLayout(oldLayoutName: string, newLayoutName: string): Promise<Layout> {
    this.logger.info(`Renaming layout: ${oldLayoutName} → ${newLayoutName}`);

    try {
      // Open layout dialog
      await this.page.keyboard.press('Control+s');
      await sleep(1000);

      const dialogSelector = '#overlap-manager-root > div:nth-child(2) > div > div.dialog-qyCw0PaN';
      await this.page.waitForSelector(dialogSelector, { timeout: 5000 });

      // Search for the layout
      const searchInputSelector = '#overlap-manager-root > div:nth-child(2) > div > div.dialog-qyCw0PaN.dialog-b8SxMnzX.dialog-T4Q8BJPb.dialog-aRAWUDhF.rounded-aRAWUDhF.shadowed-aRAWUDhF > div > div.container-qm7Rg5MB > div > input';
      const searchInput = await this.page.waitForSelector(searchInputSelector, { timeout: 3000 });
      
      await searchInput.click();
      await this.page.keyboard.press('Control+a');
      await this.page.keyboard.type(oldLayoutName, { delay: 100 });
      await sleep(500);

      // Find and click the layout item
      const layoutClicked = await this.page.evaluate((params) => {
        const { oldLayoutName } = params;
        const selectors = [
          '[class*="layout-item"]',
          '[data-name="layout-item"]'
        ];

        for (const selector of selectors) {
          const items = Array.from(document.querySelectorAll(selector));
          for (const item of items) {
            const nameEl = item.querySelector('[class*="layout-name"], [class*="title"]');
            const name = nameEl?.textContent?.trim() || '';
            
            if (name.toLowerCase() === oldLayoutName.toLowerCase() ||
                name.toLowerCase().includes(oldLayoutName.toLowerCase())) {
              // Look for rename button or double-click
              const renameBtn = item.querySelector('[data-name="rename"], [aria-label*="rename" i]');
              if (renameBtn) {
                (renameBtn as HTMLElement).click();
                return true;
              }
              
              // Try double-click
              const event = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
              item.dispatchEvent(event);
              return true;
            }
          }
        }
        return false;
      }, { oldLayoutName });

      if (!layoutClicked) {
        await this.page.keyboard.press('Escape');
        throw new NotFoundError(`Layout "${oldLayoutName}" not found`);
      }

      await sleep(500);

      // Find and edit the name input
      const renamed = await this.page.evaluate((params) => {
        const { newLayoutName } = params;
        
        // Look for input field (might be in the layout item or a dialog)
        const inputSelectors = [
          'input[type="text"]',
          'input[value*="' + params.oldLayoutName + '"]',
          'input:focus'
        ];

        for (const selector of inputSelectors) {
          const input = document.querySelector(selector) as HTMLInputElement;
          if (input && input.offsetParent !== null) {
            input.focus();
            input.select();
            input.value = newLayoutName;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Press Enter or find Save button
            return true;
          }
        }
        return false;
      }, { oldLayoutName, newLayoutName });

      if (!renamed) {
        await this.page.keyboard.press('Escape');
        throw new NotFoundError('Could not find rename input field');
      }

      // Press Enter to save or find Save button
      await this.page.keyboard.press('Enter');
      await sleep(1000);
      await this.page.keyboard.press('Escape').catch(() => {}); // Close dialog

      this.logger.info(`Layout renamed successfully: ${oldLayoutName} → ${newLayoutName}`);

      // Get updated layout info
      const currentLayout = await this.getCurrentLayout();
      return currentLayout || { name: newLayoutName, url: this.page.url() };
    } catch (error) {
      await this.page.keyboard.press('Escape').catch(() => {});
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to rename layout "${oldLayoutName}"`, { error: errorMessage });
      throw new NotFoundError(`Failed to rename layout: ${errorMessage}`);
    }
  }
}
