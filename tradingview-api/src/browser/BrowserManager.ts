/**
 * Browser Manager - Handles browser lifecycle and connection management
 * Uses Playwright for stable browser automation
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { Logger } from '../utils/logger.js';
import { withRetry, sleep } from '../utils/retry.js';
import { ConnectionError, BrowserError } from '../utils/errors.js';
import { syncCookiesFromDailyBrowsers, checkSqlite3Available } from '../utils/cookie-sync.js';
import { loginToTradingView } from '../utils/tv-auth.js';
import { mkdirSync } from 'fs';
import { join } from 'path';

export interface BrowserConfig {
  headless?: boolean;
  timeout?: number;
  userDataDir?: string;
  args?: string[];
}

export interface BrowserState {
  connected: boolean;
  browserEndpoint?: string;
  tradingViewUrl?: string;
  pageTitle?: string;
  error?: string;
}

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: BrowserConfig;
  private logger: Logger;
  private state: BrowserState = { connected: false };
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(config: BrowserConfig, logger: Logger) {
    // Use dedicated Chrome profile (same as MCP)
    const chromeUserDataDir = config.userDataDir || 
      join(process.env.HOME || '/tmp', '.config/chrome-tradingview');
    
    this.config = {
      headless: config.headless !== undefined ? config.headless : true, // Default to headless
      timeout: 30000,
      userDataDir: chromeUserDataDir,
      args: [
        '--remote-debugging-port=9222',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-gpu', // Recommended for headless
        ...(config.args || [])
      ],
      ...config
    };
    this.logger = logger;
    
    // Ensure profile directory exists
    try {
      mkdirSync(chromeUserDataDir, { recursive: true });
      this.logger.debug('Using dedicated Chrome profile', { userDataDir: chromeUserDataDir });
    } catch (error) {
      this.logger.warn('Could not create Chrome profile directory', { error });
    }
  }

  /**
   * Connect to browser (try CDP first, then launch new browser)
   */
  async connect(): Promise<BrowserState> {
    try {
      // Try connecting to existing CDP instance first
      const cdpUrl = process.env.CDP_URL || 'http://localhost:9222';
      this.logger.info('Attempting to connect to existing browser via CDP', { cdpUrl });

      try {
        this.browser = await chromium.connectOverCDP(cdpUrl, {
          timeout: 5000
        });

        const contexts = this.browser.contexts();
        if (contexts.length > 0) {
          this.context = contexts[0];
          this.page = await this.findTradingViewPage();
          
          if (this.page) {
            this.logger.info('Connected to existing browser via CDP');
            
            // Sync cookies from Brave/Vivaldi
            await this.syncCookies();
            
            return this.updateState(true, cdpUrl);
          }
        }
      } catch (cdpError) {
        this.logger.debug('CDP connection failed, will launch new browser', {
          error: cdpError instanceof Error ? cdpError.message : String(cdpError)
        });
      }

      // Launch new browser if CDP connection failed
      this.logger.info('Launching new browser instance');
      await this.launchBrowser();

      // Sync cookies from Brave/Vivaldi after browser is launched
      await this.syncCookies();

      return this.updateState(true);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to connect to browser', { error: errorMessage });
      return this.updateState(false, undefined, undefined, undefined, errorMessage);
    }
  }

  /**
   * Launch a new browser instance
   * Uses launchPersistentContext for userDataDir support (dedicated profile)
   */
  private async launchBrowser(): Promise<void> {
    // Use launchPersistentContext if userDataDir is specified (for dedicated profile)
    if (this.config.userDataDir) {
      this.logger.info('Launching browser with dedicated profile', { userDataDir: this.config.userDataDir });
      
      this.context = await chromium.launchPersistentContext(
        this.config.userDataDir,
        {
          headless: this.config.headless,
          timeout: this.config.timeout,
          args: this.config.args || [],
          viewport: { width: 1920, height: 1080 },
          // channel: 'chrome' // Disabled in Docker, use Playwright's bundled Chromium
        }
      );

      // Get browser from context (for compatibility)
      this.browser = this.context.browser() || null;

      // Navigate to TradingView
      this.page = await this.context.newPage();
      await this.page.goto('https://www.tradingview.com/chart', {
        waitUntil: 'networkidle',
        timeout: this.config.timeout
      });

      // Dismiss any popups/modals
      await this.dismissModals();

      // Attempt login if not already authenticated
      await loginToTradingView(this.page, this.logger);

      // Dismiss any post-login modals
      await this.dismissModals();

      this.logger.info('Browser launched with dedicated profile and navigated to TradingView');
    } else {
      // Fallback: regular launch (no persistent profile)
      const launchOptions: any = {
        headless: this.config.headless,
        timeout: this.config.timeout,
        args: this.config.args || []
      };

      this.browser = await chromium.launch(launchOptions);
      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 }
      });

      // Navigate to TradingView
      this.page = await this.context.newPage();
      await this.page.goto('https://www.tradingview.com/chart', {
        waitUntil: 'networkidle',
        timeout: this.config.timeout
      });

      // Attempt login if not already authenticated
      await loginToTradingView(this.page, this.logger);

      this.logger.info('Browser launched and navigated to TradingView');
    }
  }

  /**
   * Find TradingView page in existing browser contexts
   */
  private async findTradingViewPage(): Promise<Page | null> {
    if (!this.context) return null;

    const pages = this.context.pages();
    this.logger.debug(`Found ${pages.length} open tabs`);

    // Look for TradingView chart page
    for (const page of pages) {
      const url = page.url();
      if (url.includes('tradingview.com/chart') || url.includes('tradingview.com/symbols')) {
        this.logger.debug('Found TradingView page', { url });
        return page;
      }
    }

    // Fallback: any TradingView page
    for (const page of pages) {
      if (page.url().includes('tradingview.com')) {
        this.logger.debug('Found TradingView page (fallback)', { url: page.url() });
        return page;
      }
    }

    return null;
  }

  /**
   * Reconnect to browser with retry logic
   */
  async reconnect(): Promise<BrowserState> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new ConnectionError(
        `Max reconnection attempts (${this.maxReconnectAttempts}) reached`
      );
    }

    this.reconnectAttempts++;
    this.logger.warn(`Reconnecting to browser (attempt ${this.reconnectAttempts})`);

    // Disconnect first
    await this.disconnect();

    // Wait before reconnecting
    await sleep(2000);

    // Try to reconnect
    return await withRetry(
      () => this.connect(),
      {
        maxRetries: 3,
        initialDelay: 1000,
        onRetry: (attempt, error) => {
          this.logger.warn(`Reconnection attempt ${attempt} failed`, {
            error: error.message
          });
        }
      }
    );
  }

  /**
   * Disconnect from browser
   */
  async disconnect(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close().catch(() => {});
        this.page = null;
      }

      // Close context (for persistent contexts, this closes the browser)
      if (this.context && !this.state.browserEndpoint) {
        await this.context.close().catch(() => {});
      }

      // Close browser if we have one and it's not from CDP
      if (this.browser && !this.state.browserEndpoint) {
        await this.browser.close().catch(() => {});
      }

      this.browser = null;
      this.context = null;
      this.state = { connected: false };
      this.reconnectAttempts = 0;

      this.logger.info('Disconnected from browser');
    } catch (error) {
      this.logger.warn('Error during disconnect', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get current page (throws if not connected)
   */
  getPage(): Page {
    if (!this.page) {
      throw new BrowserError('Not connected to browser. Call connect() first.');
    }
    return this.page;
  }

  /**
   * Get current browser context
   */
  getContext(): BrowserContext {
    if (!this.context) {
      throw new BrowserError('Not connected to browser. Call connect() first.');
    }
    return this.context;
  }

  /**
   * Get current browser instance
   */
  getBrowser(): Browser {
    if (!this.browser) {
      throw new BrowserError('Not connected to browser. Call connect() first.');
    }
    return this.browser;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state.connected && this.page !== null;
  }

  /**
   * Get current state
   */
  getState(): BrowserState {
    return { ...this.state };
  }

  /**
   * Update state
   */
  private updateState(
    connected: boolean,
    browserEndpoint?: string,
    tradingViewUrl?: string,
    pageTitle?: string,
    error?: string
  ): BrowserState {
    if (this.page && !tradingViewUrl) {
      tradingViewUrl = this.page.url();
    }

    if (this.page && !pageTitle) {
      this.page.title().then(title => {
        this.state.pageTitle = title;
      }).catch(() => {});
    }

    this.state = {
      connected,
      browserEndpoint,
      tradingViewUrl,
      pageTitle,
      error
    };

    if (connected) {
      this.reconnectAttempts = 0;
    }

    return this.state;
  }

  /**
   * Dismiss common TradingView modals/popups
   */
  private async dismissModals(): Promise<void> {
    if (!this.page) return;
    
    try {
      // Common TV modal dismiss patterns
      const dismissSelectors = [
        'button:has-text("Got it")',
        'button:has-text("No, thanks")',
        'button:has-text("Maybe later")',
        'button:has-text("Not now")',
        'button:has-text("Close")',
        '[class*="dialog"] [class*="close"]',
        '[data-name="close"]',
        '[class*="toast"] [class*="close"]',
      ];

      for (const selector of dismissSelectors) {
        const buttons = await this.page.$$(selector);
        for (const btn of buttons) {
          try {
            await btn.click();
            await sleep(300);
          } catch {}
        }
      }

      // Also press Escape
      await this.page.keyboard.press('Escape').catch(() => {});
      await sleep(300);
    } catch (error) {
      this.logger.debug('Modal dismiss attempt completed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Save browser state (cookies, localStorage, etc.)
   */
  async saveState(): Promise<void> {
    if (!this.context) {
      throw new BrowserError('Not connected to browser');
    }

    // Save cookies
    const cookies = await this.context.cookies();
    this.logger.debug('Saved browser state', { cookieCount: cookies.length });
    // TODO: Persist to file or database
  }

  /**
   * Restore browser state
   */
  async restoreState(): Promise<void> {
    if (!this.context) {
      throw new BrowserError('Not connected to browser');
    }

    // TODO: Load cookies from file or database
    this.logger.debug('Restored browser state');
  }

  /**
   * Sync cookies from Brave/Vivaldi to Chrome
   */
  private async syncCookies(): Promise<void> {
    const cdpPort = 9222;
    
    // Check if sqlite3 is available
    if (!checkSqlite3Available()) {
      this.logger.warn('sqlite3 not available - cannot sync cookies. Install with: sudo apt-get install sqlite3');
      return;
    }

    try {
      this.logger.info('Syncing cookies from daily browsers (Brave/Vivaldi) to Chrome...');
      const result = await syncCookiesFromDailyBrowsers(cdpPort, this.logger);
      
      if (result.synced > 0) {
        this.logger.info(`Successfully synced ${result.synced} cookies from ${result.source}`);
      } else {
        this.logger.debug('No cookies synced (may already be synced or browsers not available)');
      }
    } catch (error) {
      this.logger.warn('Cookie sync failed, continuing without sync', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
