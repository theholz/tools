/**
 * Health Monitor - Monitors browser connection health and auto-recovers
 */

import { BrowserManager } from './BrowserManager.js';
import { Logger } from '../utils/logger.js';
import { sleep } from '../utils/retry.js';
import { reportBug } from '../utils/bug-reporter.js';

export interface HealthStatus {
  healthy: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
  error?: string;
}

export class HealthMonitor {
  private browserManager: BrowserManager;
  private logger: Logger;
  private interval: NodeJS.Timeout | null = null;
  private checkInterval: number;
  private maxConsecutiveFailures: number;
  private status: HealthStatus = {
    healthy: false,
    lastCheck: new Date(),
    consecutiveFailures: 0
  };
  private isRunning = false;
  private lastBugReportId: string | null = null;
  private lastBugReportTime: number = 0;
  private readonly BUG_REPORT_COOLDOWN = 3600000; // 1 hour cooldown between bug reports

  constructor(
    browserManager: BrowserManager,
    logger: Logger,
    options: {
      checkInterval?: number; // milliseconds
      maxConsecutiveFailures?: number;
    } = {}
  ) {
    this.browserManager = browserManager;
    this.logger = logger;
    this.checkInterval = options.checkInterval || 30000; // 30 seconds default
    this.maxConsecutiveFailures = options.maxConsecutiveFailures || 3;
  }

  /**
   * Start health monitoring
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Health monitor already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting health monitor', {
      checkInterval: this.checkInterval,
      maxConsecutiveFailures: this.maxConsecutiveFailures
    });

    // Initial check
    this.checkHealth();

    // Schedule periodic checks
    this.interval = setInterval(() => {
      this.checkHealth();
    }, this.checkInterval);
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.logger.info('Health monitor stopped');
  }

  /**
   * Perform health check
   */
  async checkHealth(): Promise<HealthStatus> {
    try {
      this.logger.debug('Performing health check');

      // Check 1: Is browser connected?
      if (!this.browserManager.isConnected()) {
        throw new Error('Browser not connected');
      }

      // Check 2: Can we access the page?
      const page = this.browserManager.getPage();
      const url = page.url();

      if (!url.includes('tradingview.com')) {
        throw new Error('Not on TradingView page');
      }

      // Check 3: Is page responsive? (try to get title)
      await page.title();

      // Check 4: Is CDP responsive? (if using CDP)
      const state = this.browserManager.getState();
      if (state.browserEndpoint) {
        // Try to fetch CDP version
        const response = await fetch(`${state.browserEndpoint}/json/version`, {
          signal: AbortSignal.timeout(2000)
        });
        if (!response.ok) {
          throw new Error('CDP endpoint not responding');
        }
      }

      // Health check passed
      this.status = {
        healthy: true,
        lastCheck: new Date(),
        consecutiveFailures: 0
      };

      this.logger.debug('Health check passed');

      return this.status;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.status.consecutiveFailures++;
      this.status.healthy = false;
      this.status.lastCheck = new Date();
      this.status.error = errorMessage;

      this.logger.warn('Health check failed', {
        consecutiveFailures: this.status.consecutiveFailures,
        error: errorMessage
      });

      // Auto-recover if too many failures
      if (this.status.consecutiveFailures >= this.maxConsecutiveFailures) {
        this.logger.warn('Max consecutive failures reached, attempting recovery');
        await this.recover();
      }

      return this.status;
    }
  }

  /**
   * Attempt to recover from health check failure
   */
  private async recover(): Promise<void> {
    try {
      this.logger.info('Attempting to recover from health check failure');

      // Try to reconnect
      await this.browserManager.reconnect();

      // Reset failure count
      this.status.consecutiveFailures = 0;
      this.status.healthy = true;
      this.status.error = undefined;

      this.logger.info('Recovery successful');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Recovery failed', { error: errorMessage });
      this.status.error = `Recovery failed: ${errorMessage}`;
      
      // Report bug if recovery failed (with cooldown to avoid spam)
      const now = Date.now();
      if (now - this.lastBugReportTime > this.BUG_REPORT_COOLDOWN) {
        const bugTitle = `TradingView API Health Check Failed - Recovery Unsuccessful`;
        const bugContext = {
          consecutiveFailures: this.status.consecutiveFailures,
          lastCheck: this.status.lastCheck.toISOString(),
          error: errorMessage,
          recoveryAttempted: true
        };
        
        reportBug(bugTitle, errorMessage, bugContext, this.logger).then(cardId => {
          if (cardId) {
            this.lastBugReportId = cardId;
            this.lastBugReportTime = now;
            this.logger.info('Bug report created for API failure', { cardId });
          }
        }).catch(err => {
          this.logger.error('Failed to create bug report', { error: err });
        });
      } else {
        this.logger.debug('Skipping bug report (cooldown active)', {
          timeSinceLastReport: now - this.lastBugReportTime,
          cooldown: this.BUG_REPORT_COOLDOWN
        });
      }
    }
  }

  /**
   * Get current health status
   */
  getStatus(): HealthStatus {
    return { ...this.status };
  }

  /**
   * Force a health check (manual trigger)
   */
  async forceCheck(): Promise<HealthStatus> {
    return await this.checkHealth();
  }
}
