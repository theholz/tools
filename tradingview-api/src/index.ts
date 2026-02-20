#!/usr/bin/env node
/**
 * TradingView API - Main Entry Point
 * 
 * Stable REST API for TradingView automation
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ConsoleLogger } from './utils/logger.js';
import { BrowserManager } from './browser/BrowserManager.js';
import { HealthMonitor } from './browser/HealthMonitor.js';
import { ConnectionPool } from './browser/ConnectionPool.js';
import { LayoutManager } from './tradingview/LayoutManager.js';
import { WatchlistManager } from './tradingview/WatchlistManager.js';
import { IndicatorManager } from './tradingview/IndicatorManager.js';
import { ChartManager } from './tradingview/ChartManager.js';
import { AlertManager } from './tradingview/AlertManager.js';
import { ScreenerManager } from './tradingview/ScreenerManager.js';
import { OptimizationManager } from './tradingview/OptimizationManager.js';
import { syncCookiesFromDailyBrowsers } from './utils/cookie-sync.js';
import { sleep } from './utils/retry.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 8084;
const logger = new ConsoleLogger((process.env.LOG_LEVEL as any) || 'info');

// Initialize browser manager and health monitor
// Use dedicated Chrome profile (same as MCP) for cookie persistence
const chromeUserDataDir = process.env.CHROME_USER_DATA_DIR || 
  `${process.env.HOME || '/tmp'}/.config/chrome-tradingview`;

const browserManager = new BrowserManager(
  {
    headless: process.env.HEADLESS !== 'false', // Allow visible mode via env var
    timeout: 30000,
    userDataDir: chromeUserDataDir,
    args: [
      '--remote-debugging-port=9222',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      ...(process.env.HEADLESS === 'false' ? [] : ['--disable-gpu']) // Only disable GPU in headless
    ]
  },
  logger
);

const healthMonitor = new HealthMonitor(browserManager, logger, {
  checkInterval: 30000, // 30 seconds
  maxConsecutiveFailures: 3
});

const connectionPool = new ConnectionPool(logger, {
  maxConnections: 5,
  idleTimeout: 300000 // 5 minutes
});

// TradingView managers (initialized after connection)
let layoutManager: LayoutManager | null = null;
let watchlistManager: WatchlistManager | null = null;
let indicatorManager: IndicatorManager | null = null;
let chartManager: ChartManager | null = null;
let alertManager: AlertManager | null = null;
let screenerManager: ScreenerManager | null = null;
let optimizationManager: OptimizationManager | null = null;

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.body ? Object.keys(req.body) : undefined
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const healthStatus = healthMonitor.getStatus();
  const browserState = browserManager.getState();

  res.json({
    status: healthStatus.healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    browser: {
      connected: browserState.connected,
      url: browserState.tradingViewUrl
    },
    health: healthStatus
  });
});

// Connection endpoints
app.post('/api/connect', async (req, res) => {
  try {
    const state = await browserManager.connect();
    
    if (state.connected) {
      // Initialize TradingView managers
      const page = browserManager.getPage();
      layoutManager = new LayoutManager(page, logger);
      watchlistManager = new WatchlistManager(page, logger);
      indicatorManager = new IndicatorManager(page, logger);
      chartManager = new ChartManager(page, logger);
      
      // Start health monitoring
      healthMonitor.start();
    }

    res.json({
      success: state.connected,
      state
    });
  } catch (error) {
    logger.error('Connection failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/api/disconnect', async (req, res) => {
  try {
    healthMonitor.stop();
    await browserManager.disconnect();
    res.json({ success: true });
  } catch (error) {
    logger.error('Disconnect failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

app.get('/api/status', (req, res) => {
  const state = browserManager.getState();
  const healthStatus = healthMonitor.getStatus();

  res.json({
    browser: state,
    health: healthStatus
  });
});

// ============================================
// Auth & Cookie Management
// ============================================

app.post('/api/auth/sync-cookies', async (req, res) => {
  try {
    // Check if browser is connected
    const state = browserManager.getState();
    if (!state.connected) {
      // Try to connect if not connected
      await browserManager.connect();
    }

    // Sync cookies
    logger.info('Starting cookie sync...');
    const result = await syncCookiesFromDailyBrowsers(9222, logger);
    
    if (result.synced > 0) {
      res.json({ 
        success: true, 
        message: `Successfully synced ${result.synced} cookies from ${result.source}`,
        details: result
      });
    } else {
      res.json({ 
        success: false, 
        message: 'No cookies synced (browser might be locked or no cookies found)',
        details: result
      });
    }
  } catch (error) {
    logger.error('Cookie sync failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// ============================================
// Layout endpoints
app.get('/api/layouts', async (req, res) => {
  try {
    if (!layoutManager) {
      const page = browserManager.getPage();
      layoutManager = new LayoutManager(page, logger);
    }

    const layouts = await layoutManager.listLayouts();
    res.json({ success: true, layouts, count: layouts.length });
  } catch (error) {
    logger.error('Failed to list layouts', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/layouts/current', async (req, res) => {
  try {
    if (!layoutManager) {
      const page = browserManager.getPage();
      layoutManager = new LayoutManager(page, logger);
    }

    const layout = await layoutManager.getCurrentLayout();
    if (layout) {
      res.json({ success: true, layout });
    } else {
      res.json({ success: false, error: 'Could not determine current layout' });
    }
  } catch (error) {
    logger.error('Failed to get current layout', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/layouts/load', async (req, res) => {
  try {
    const { layoutName, layoutUrl } = req.body || {};
    if (!layoutName) {
      return res.status(400).json({ success: false, error: 'layoutName is required' });
    }

    if (!layoutManager) {
      const page = browserManager.getPage();
      layoutManager = new LayoutManager(page, logger);
    }

    const layout = await layoutManager.loadLayout(layoutName, layoutUrl);
    res.json({ success: true, layout });
  } catch (error) {
    logger.error('Failed to load layout', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Create new layout from current chart state
app.post('/api/layouts/create', async (req, res) => {
  try {
    const { layoutName, description } = req.body || {};
    if (!layoutName) {
      return res.status(400).json({ success: false, error: 'layoutName is required' });
    }

    if (!layoutManager) {
      const page = browserManager.getPage();
      layoutManager = new LayoutManager(page, logger);
    }

    const layout = await layoutManager.createLayout(layoutName, description);
    res.json({ success: true, layout, message: `Layout "${layoutName}" created successfully` });
  } catch (error) {
    logger.error('Failed to create layout', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Duplicate an existing layout
app.post('/api/layouts/duplicate', async (req, res) => {
  try {
    const { sourceLayoutName, newLayoutName } = req.body || {};
    if (!sourceLayoutName || !newLayoutName) {
      return res.status(400).json({ success: false, error: 'sourceLayoutName and newLayoutName are required' });
    }

    if (!layoutManager) {
      const page = browserManager.getPage();
      layoutManager = new LayoutManager(page, logger);
    }

    const layout = await layoutManager.duplicateLayout(sourceLayoutName, newLayoutName);
    res.json({ success: true, layout, message: `Layout "${sourceLayoutName}" duplicated as "${newLayoutName}"` });
  } catch (error) {
    logger.error('Failed to duplicate layout', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Delete a layout
app.delete('/api/layouts/:layoutName', async (req, res) => {
  try {
    const { layoutName } = req.params;
    if (!layoutName) {
      return res.status(400).json({ success: false, error: 'layoutName is required' });
    }

    if (!layoutManager) {
      const page = browserManager.getPage();
      layoutManager = new LayoutManager(page, logger);
    }

    const deleted = await layoutManager.deleteLayout(layoutName);
    res.json({ success: deleted, message: deleted ? `Layout "${layoutName}" deleted successfully` : 'Layout not found' });
  } catch (error) {
    logger.error('Failed to delete layout', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Rename a layout
app.put('/api/layouts/:oldLayoutName/rename', async (req, res) => {
  try {
    const { oldLayoutName } = req.params;
    const { newLayoutName } = req.body || {};
    
    if (!oldLayoutName || !newLayoutName) {
      return res.status(400).json({ success: false, error: 'oldLayoutName and newLayoutName are required' });
    }

    if (!layoutManager) {
      const page = browserManager.getPage();
      layoutManager = new LayoutManager(page, logger);
    }

    const layout = await layoutManager.renameLayout(oldLayoutName, newLayoutName);
    res.json({ success: true, layout, message: `Layout "${oldLayoutName}" renamed to "${newLayoutName}"` });
  } catch (error) {
    logger.error('Failed to rename layout', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Watchlist endpoints
app.get('/api/watchlists', async (req, res) => {
  try {
    if (!watchlistManager) {
      const page = browserManager.getPage();
      watchlistManager = new WatchlistManager(page, logger);
    }

    const watchlists = await watchlistManager.listWatchlists();
    res.json({ success: true, watchlists, count: watchlists.length });
  } catch (error) {
    logger.error('Failed to list watchlists', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/watchlists/active', async (req, res) => {
  try {
    if (!watchlistManager) {
      const page = browserManager.getPage();
      watchlistManager = new WatchlistManager(page, logger);
    }

    const watchlist = await watchlistManager.getActiveWatchlist();
    if (watchlist) {
      res.json({ success: true, watchlist });
    } else {
      res.json({ success: false, error: 'No active watchlist found' });
    }
  } catch (error) {
    logger.error('Failed to get active watchlist', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/watchlists/select', async (req, res) => {
  try {
    const { watchlistName } = req.body || {};
    if (!watchlistName) {
      return res.status(400).json({ success: false, error: 'watchlistName is required' });
    }

    if (!watchlistManager) {
      const page = browserManager.getPage();
      watchlistManager = new WatchlistManager(page, logger);
    }

    const watchlist = await watchlistManager.selectWatchlist(watchlistName);
    res.json({ success: true, watchlist });
  } catch (error) {
    logger.error('Failed to select watchlist', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Create a new watchlist
app.post('/api/watchlists/create', async (req, res) => {
  try {
    const { name, symbols } = req.body || {};
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }

    if (!watchlistManager) {
      const page = browserManager.getPage();
      watchlistManager = new WatchlistManager(page, logger);
    }

    const watchlist = await watchlistManager.createWatchlist(name, symbols);
    res.json({ 
      success: true, 
      watchlist, 
      message: symbols && symbols.length > 0 
        ? `Watchlist "${name}" created with ${symbols.length} symbols` 
        : `Watchlist "${name}" created successfully` 
    });
  } catch (error) {
    logger.error('Failed to create watchlist', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Indicator endpoints
app.get('/api/indicators', async (req, res) => {
  try {
    if (!indicatorManager) {
      const page = browserManager.getPage();
      indicatorManager = new IndicatorManager(page, logger);
    }

    const indicators = await indicatorManager.listIndicators();
    res.json({ success: true, indicators, count: indicators.length });
  } catch (error) {
    logger.error('Failed to list indicators', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/indicators/:name/settings', async (req, res) => {
  try {
    const { name } = req.params;
    if (!indicatorManager) {
      const page = browserManager.getPage();
      indicatorManager = new IndicatorManager(page, logger);
    }

    const settings = await indicatorManager.getSettings(name);
    res.json({ success: true, settings });
  } catch (error) {
    logger.error('Failed to get indicator settings', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/indicators/ensure', async (req, res) => {
  try {
    const { expectedIndicators } = req.body || {};
    if (!expectedIndicators || !Array.isArray(expectedIndicators) || expectedIndicators.length === 0) {
      return res.status(400).json({ success: false, error: 'expectedIndicators array is required' });
    }

    if (!indicatorManager) {
      const page = browserManager.getPage();
      indicatorManager = new IndicatorManager(page, logger);
    }

    const result = await indicatorManager.ensureIndicatorsLoaded(expectedIndicators);
    res.json({
      success: true,
      expectedCount: expectedIndicators.length,
      presentCount: result.present.length,
      missingCount: result.missing.length,
      present: result.present,
      missing: result.missing
    });
  } catch (error) {
    logger.error('Failed to ensure indicators loaded', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Chart endpoints
app.get('/api/chart/context', async (req, res) => {
  try {
    if (!chartManager) {
      const page = browserManager.getPage();
      chartManager = new ChartManager(page, logger);
    }

    const context = await chartManager.getContext();
    res.json({ success: true, context });
  } catch (error) {
    logger.error('Failed to get chart context', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/chart/symbol', async (req, res) => {
  try {
    const { symbol } = req.body || {};
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'symbol is required' });
    }

    if (!chartManager) {
      const page = browserManager.getPage();
      chartManager = new ChartManager(page, logger);
    }

    const result = await chartManager.changeSymbol(symbol);
    res.json({ ...result, success: result.success });
  } catch (error) {
    logger.error('Failed to change symbol', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/chart/timeframe', async (req, res) => {
  try {
    const { timeframe } = req.body || {};
    if (!timeframe) {
      return res.status(400).json({ success: false, error: 'timeframe is required' });
    }

    if (!chartManager) {
      const page = browserManager.getPage();
      chartManager = new ChartManager(page, logger);
    }

    const result = await chartManager.changeTimeframe(timeframe);
    res.json({ ...result, success: result.success });
  } catch (error) {
    logger.error('Failed to change timeframe', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Screenshot endpoint
app.post('/api/chart/screenshot', async (req, res) => {
  try {
    const { fullPage = false, selector, quality = 80 } = req.body || {};
    
    const page = browserManager.getPage();
    
    let screenshotOptions: any = {
      type: 'png',
      fullPage
    };

    // If a selector is provided, screenshot just that element
    if (selector) {
      const element = await page.$(selector);
      if (!element) {
        return res.status(404).json({ success: false, error: `Element not found: ${selector}` });
      }
      const buffer = await element.screenshot({ type: 'png' });
      res.set('Content-Type', 'image/png');
      return res.send(buffer);
    }

    // Default: screenshot the chart area
    // Try to find the main chart container first
    const chartElement = await page.$('[class*="chart-container"]') || 
                         await page.$('.chart-markup-table') ||
                         await page.$('#chart-area');
    
    if (chartElement && !fullPage) {
      const buffer = await chartElement.screenshot({ type: 'png' });
      
      // If request accepts JSON, return base64
      if (req.accepts('json') && !req.accepts('image/png')) {
        return res.json({
          success: true,
          image: buffer.toString('base64'),
          mimeType: 'image/png',
          timestamp: new Date().toISOString()
        });
      }
      
      res.set('Content-Type', 'image/png');
      return res.send(buffer);
    }

    // Fallback: full page screenshot
    const buffer = await page.screenshot(screenshotOptions);
    
    if (req.accepts('json') && !req.accepts('image/png')) {
      return res.json({
        success: true,
        image: buffer.toString('base64'),
        mimeType: 'image/png',
        timestamp: new Date().toISOString()
      });
    }
    
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (error) {
    logger.error('Screenshot failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Indicator write operations
app.post('/api/indicators/:name/settings', async (req, res) => {
  try {
    const { name } = req.params;
    const { inputs, style, visibility } = req.body || {};

    if (!indicatorManager) {
      const page = browserManager.getPage();
      indicatorManager = new IndicatorManager(page, logger);
    }

    const settings = await indicatorManager.setSettings(name, { inputs, style, visibility });
    res.json({ success: true, settings });
  } catch (error) {
    logger.error('Failed to set indicator settings', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/indicators/:name/signal', async (req, res) => {
  try {
    const { name } = req.params;

    if (!indicatorManager) {
      const page = browserManager.getPage();
      indicatorManager = new IndicatorManager(page, logger);
    }

    const signal = await indicatorManager.readSignal(name);
    res.json({ success: true, signal });
  } catch (error) {
    logger.error('Failed to read indicator signal', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Backtest table endpoints
app.post('/api/indicators/:name/backtest/enable', async (req, res) => {
  try {
    const { name } = req.params;
    const { enabled = true } = req.body || {};

    if (!indicatorManager) {
      const page = browserManager.getPage();
      indicatorManager = new IndicatorManager(page, logger);
    }

    const success = await indicatorManager.enableBacktestDisplay(name, enabled);
    res.json({ success, enabled });
  } catch (error) {
    logger.error('Failed to enable backtest display', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/indicators/:name/backtest', async (req, res) => {
  try {
    const { name } = req.params;

    if (!indicatorManager) {
      const page = browserManager.getPage();
      indicatorManager = new IndicatorManager(page, logger);
    }

    const table = await indicatorManager.readBacktestTable(name);
    if (!table) {
      return res.status(404).json({ 
        success: false, 
        error: 'Backtest table not found. Ensure "Show Backtest" is enabled for this indicator.' 
      });
    }
    res.json({ success: true, table });
  } catch (error) {
    logger.error('Failed to read backtest table', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/indicators/:name/backtest/capture', async (req, res) => {
  try {
    const { name } = req.params;

    if (!indicatorManager) {
      const page = browserManager.getPage();
      indicatorManager = new IndicatorManager(page, logger);
    }

    // Enable backtest display and read table in one operation
    const table = await indicatorManager.enableAndReadBacktest(name);
    if (!table) {
      return res.status(404).json({ 
        success: false, 
        error: 'Could not capture backtest table. Indicator may not support backtesting.' 
      });
    }
    res.json({ success: true, table });
  } catch (error) {
    logger.error('Failed to capture backtest table', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Workflow endpoint
app.post('/api/workflow/setup', async (req, res) => {
  try {
    const { layoutName, watchlistName } = req.body || {};
    if (!layoutName || !watchlistName) {
      return res.status(400).json({ success: false, error: 'layoutName and watchlistName are required' });
    }

    // Initialize managers
    const page = browserManager.getPage();
    if (!layoutManager) layoutManager = new LayoutManager(page, logger);
    if (!watchlistManager) watchlistManager = new WatchlistManager(page, logger);
    if (!indicatorManager) indicatorManager = new IndicatorManager(page, logger);

    // Load layout
    logger.info(`Loading layout: ${layoutName}`);
    const layout = await layoutManager.loadLayout(layoutName);

    // Select watchlist
    logger.info(`Selecting watchlist: ${watchlistName}`);
    const watchlist = await watchlistManager.selectWatchlist(watchlistName);

    res.json({
      success: true,
      layout,
      watchlist,
      message: `Layout "${layoutName}" loaded and watchlist "${watchlistName}" activated`
    });
  } catch (error) {
    logger.error('Failed to setup workflow', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Batch backtest capture endpoint
app.post('/api/workflow/batch-backtest-capture', async (req, res) => {
  try {
    const {
      layout,
      watchlist,
      symbols,
      indicators,
      options = {}
    } = req.body || {};

    if (!layout || !watchlist) {
      return res.status(400).json({
        success: false,
        error: 'layout and watchlist are required'
      });
    }

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'symbols array is required and must not be empty'
      });
    }

    if (!indicators || !Array.isArray(indicators) || indicators.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'indicators array is required and must not be empty'
      });
    }

    const {
      verifyBacktestEnabled = false,
      enableIfMissing = false,
      waitForRender = 3000
    } = options;

    // Initialize managers
    const page = browserManager.getPage();
    if (!layoutManager) layoutManager = new LayoutManager(page, logger);
    if (!watchlistManager) watchlistManager = new WatchlistManager(page, logger);
    if (!indicatorManager) indicatorManager = new IndicatorManager(page, logger);
    if (!chartManager) chartManager = new ChartManager(page, logger);

    logger.info('Starting batch backtest capture', {
      layout,
      watchlist,
      symbolCount: symbols.length,
      indicatorCount: indicators.length
    });

    // Step 1: Load layout and select watchlist
    await layoutManager.loadLayout(layout);
    await watchlistManager.selectWatchlist(watchlist);
    await sleep(2000); // Wait for layout to fully load

    const results: any[] = [];
    const errors: any[] = [];

    // Step 2: Process each symbol
    for (const symbol of symbols) {
      try {
        logger.info(`Processing symbol: ${symbol}`);

        // Change symbol
        await chartManager.changeSymbol(symbol);
        await sleep(waitForRender); // Wait for chart to render

        const symbolResults: any[] = [];

        // Step 3: Capture backtest for each indicator
        for (const indicatorName of indicators) {
          try {
            // Verify/enable backtest if needed
            if (verifyBacktestEnabled || enableIfMissing) {
              const isEnabled = await indicatorManager.enableBacktestDisplay(indicatorName, true);
              if (!isEnabled && enableIfMissing) {
                logger.warn(`Could not enable backtest for ${indicatorName}, continuing anyway`);
              }
              await sleep(500); // Wait for backtest table to render
            }

            // Capture backtest table
            const backtestData = await indicatorManager.enableAndReadBacktest(indicatorName);

            if (backtestData) {
              symbolResults.push({
                indicator: indicatorName,
                success: true,
                data: backtestData
              });
            } else {
              symbolResults.push({
                indicator: indicatorName,
                success: false,
                error: 'Backtest table not found or empty'
              });
            }
          } catch (indicatorError) {
            logger.error(`Failed to capture backtest for ${indicatorName} on ${symbol}`, {
              error: indicatorError instanceof Error ? indicatorError.message : String(indicatorError)
            });
            symbolResults.push({
              indicator: indicatorName,
              success: false,
              error: indicatorError instanceof Error ? indicatorError.message : String(indicatorError)
            });
          }
        }

        results.push({
          symbol,
          indicators: symbolResults,
          success: symbolResults.some(r => r.success) // At least one succeeded
        });
      } catch (symbolError) {
        logger.error(`Failed to process symbol ${symbol}`, {
          error: symbolError instanceof Error ? symbolError.message : String(symbolError)
        });
        errors.push({
          symbol,
          error: symbolError instanceof Error ? symbolError.message : String(symbolError)
        });
      }
    }

    res.json({
      success: true,
      layout,
      watchlist,
      results,
      errors,
      summary: {
        totalSymbols: symbols.length,
        successful: results.filter(r => r.success).length,
        failed: errors.length,
        totalCaptures: results.reduce((sum, r) => sum + r.indicators.filter((i: any) => i.success).length, 0)
      }
    });
  } catch (error) {
    logger.error('Batch backtest capture failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// ============================================
// Alert Management Endpoints
// ============================================

// Create single alert
app.post('/api/alerts/create', async (req, res) => {
  try {
    const alertInput = req.body || {};
    
    if (!alertInput.symbol || !alertInput.condition) {
      return res.status(400).json({ success: false, error: 'symbol and condition are required' });
    }

    if (!alertManager) {
      const page = browserManager.getPage();
      alertManager = new AlertManager(page, logger, process.env.DEFAULT_WEBHOOK_URL);
    }

    const alert = await alertManager.createAlert(alertInput);
    res.json({ success: true, alert });
  } catch (error) {
    logger.error('Failed to create alert', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Create bulk alerts
app.post('/api/alerts/create-bulk', async (req, res) => {
  try {
    const { alerts, stopOnError, delayBetween } = req.body || {};
    
    if (!alerts || !Array.isArray(alerts) || alerts.length === 0) {
      return res.status(400).json({ success: false, error: 'alerts array is required' });
    }

    if (!alertManager) {
      const page = browserManager.getPage();
      alertManager = new AlertManager(page, logger, process.env.DEFAULT_WEBHOOK_URL);
    }

    const result = await alertManager.createBulkAlerts(alerts, { stopOnError, delayBetween });
    res.json(result);
  } catch (error) {
    logger.error('Failed to create bulk alerts', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// ============================================
// Screener Endpoints
// ============================================

if (!screenerManager) {
  screenerManager = new ScreenerManager(logger);
}

// Custom screener scan
app.post('/api/screener/scan', async (req, res) => {
  try {
    const { market, filters, sort_by, limit } = req.body || {};
    if (!screenerManager) {
      screenerManager = new ScreenerManager(logger);
    }
    const result = await screenerManager.scanScreener({ market, filters, sort_by, limit });
    res.json(result);
  } catch (error) {
    logger.error('Screener scan failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// James scan
app.post('/api/screener/james', async (req, res) => {
  try {
    const { rsi_max, min_volume_ratio, max_change, limit } = req.body || {};
    if (!screenerManager) {
      screenerManager = new ScreenerManager(logger);
    }
    const result = await screenerManager.scanJames({ rsi_max, min_volume_ratio, max_change, limit });
    res.json(result);
  } catch (error) {
    logger.error('James scan failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Scan gainers
app.post('/api/screener/gainers', async (req, res) => {
  try {
    const { market, limit } = req.body || {};
    if (!screenerManager) {
      screenerManager = new ScreenerManager(logger);
    }
    const result = await screenerManager.scanGainers({ market, limit });
    res.json(result);
  } catch (error) {
    logger.error('Gainers scan failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Scan losers
app.post('/api/screener/losers', async (req, res) => {
  try {
    const { market, limit } = req.body || {};
    if (!screenerManager) {
      screenerManager = new ScreenerManager(logger);
    }
    const result = await screenerManager.scanLosers({ market, limit });
    res.json(result);
  } catch (error) {
    logger.error('Losers scan failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Rotation screener (queries Supabase)
app.post('/api/screener/rotation', async (req, res) => {
  try {
    const { minSortino, minROI, maxDrawdown, limit, createWatchlist, watchlistName } = req.body || {};
    
    // This requires Supabase - implement similar to MCP
    let supabase: any = null;
    try {
      const supabaseModule = await import('@supabase/supabase-js');
      supabase = supabaseModule.createClient(
        process.env.SUPABASE_URL || 'http://localhost:8055',
        process.env.SUPABASE_SERVICE_KEY || ''
      );
    } catch (e) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }

    const { data, error } = await supabase
      .from('backtest_results')
      .select('symbol, sortino_ratio, roi_percent, max_drawdown_percent, win_rate_percent, total_trades, timeframe, indicator_type')
      .gte('roi_percent', minROI || 0)
      .lte('max_drawdown_percent', maxDrawdown || 100)
      .order('roi_percent', { ascending: false })
      .limit(limit || 20);

    if (error) {
      throw new Error(`Supabase query error: ${error.message}`);
    }

    const candidates = (data || [])
      .filter((r: any) => !minSortino || !r.sortino_ratio || r.sortino_ratio >= (minSortino || 1.5))
      .map((r: any) => ({
        symbol: r.symbol,
        metrics: {
          sortino: r.sortino_ratio,
          roi: r.roi_percent,
          drawdown: r.max_drawdown_percent,
          winRate: r.win_rate_percent,
          totalTrades: r.total_trades
        },
        timeframe: r.timeframe,
        indicator: r.indicator_type
      }));

    // Create watchlist if requested
    let watchlistCreated = false;
    if (createWatchlist && candidates.length > 0) {
      const wlName = watchlistName || `Rotation Candidates ${new Date().toISOString().split('T')[0]}`;
      const symbols = candidates.map((c: any) => c.symbol);
      
      if (!watchlistManager) {
        const page = browserManager.getPage();
        watchlistManager = new WatchlistManager(page, logger);
      }
      
      try {
        await watchlistManager.createWatchlist(wlName, symbols);
        watchlistCreated = true;
      } catch (e) {
        logger.warn(`Failed to create watchlist: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    res.json({
      success: true,
      candidatesFound: candidates.length,
      candidates,
      watchlistCreated,
      watchlistName: watchlistCreated ? (watchlistName || `Rotation Candidates ${new Date().toISOString().split('T')[0]}`) : undefined
    });
  } catch (error) {
    logger.error('Rotation screener failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// ============================================
// Additional Watchlist Endpoints
// ============================================

// Get watchlist symbols
app.get('/api/watchlists/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    if (!watchlistManager) {
      const page = browserManager.getPage();
      watchlistManager = new WatchlistManager(page, logger);
    }

    const watchlist = await watchlistManager.getWatchlist(name);
    res.json({ success: true, watchlist });
  } catch (error) {
    logger.error('Failed to get watchlist', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Get watchlist data (with prices)
app.post('/api/watchlists/data', async (req, res) => {
  try {
    const { symbols } = req.body || {};
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ success: false, error: 'symbols array is required' });
    }

    if (!watchlistManager) {
      const page = browserManager.getPage();
      watchlistManager = new WatchlistManager(page, logger);
    }

    const data = await watchlistManager.getWatchlistData(symbols);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Failed to get watchlist data', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Ensure layout and watchlist
app.post('/api/workflow/ensure', async (req, res) => {
  try {
    const { layoutName, watchlistName } = req.body || {};
    
    if (!layoutName || !watchlistName) {
      return res.status(400).json({ success: false, error: 'layoutName and watchlistName are required' });
    }

    const page = browserManager.getPage();
    if (!layoutManager) layoutManager = new LayoutManager(page, logger);
    if (!watchlistManager) watchlistManager = new WatchlistManager(page, logger);

    // Load layout
    const layoutResult = await layoutManager.loadLayout(layoutName);
    if (!layoutResult) {
      return res.status(500).json({ success: false, error: 'Failed to load layout' });
    }

    // Select watchlist
    const watchlist = await watchlistManager.selectWatchlist(watchlistName);

    res.json({
      success: true,
      layoutName,
      watchlistName,
      layoutLoaded: true,
      watchlistSelected: true,
      symbolCount: watchlist.symbols.length
    });
  } catch (error) {
    logger.error('Failed to ensure layout and watchlist', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// ============================================
// Additional Indicator Endpoints
// ============================================

// Find indicator
app.get('/api/indicators/find/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    if (!indicatorManager) {
      const page = browserManager.getPage();
      indicatorManager = new IndicatorManager(page, logger);
    }

    const indicator = await indicatorManager.findIndicator(name);
    if (indicator) {
      res.json({ success: true, found: true, indicator });
    } else {
      const allIndicators = await indicatorManager.listIndicators();
      res.json({
        success: true,
        found: false,
        searchTerm: name,
        availableIndicators: allIndicators.map(i => i.name)
      });
    }
  } catch (error) {
    logger.error('Failed to find indicator', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Read indicator config
app.get('/api/indicators/:name/config', async (req, res) => {
  try {
    const { name } = req.params;
    const { includeStyle, includeVisibility } = req.query || {};
    
    if (!indicatorManager) {
      const page = browserManager.getPage();
      indicatorManager = new IndicatorManager(page, logger);
    }

    const config = await indicatorManager.readIndicatorConfig(name, {
      includeStyle: includeStyle === 'true',
      includeVisibility: includeVisibility === 'true'
    });
    res.json({ success: true, config });
  } catch (error) {
    logger.error('Failed to read indicator config', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// ============================================
// OHLCV Data Endpoint
// ============================================

app.get('/api/data/ohlcv', async (req, res) => {
  try {
    const { symbol, exchange, timeframe, bars } = req.query || {};
    
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'symbol is required' });
    }

    if (!screenerManager) {
      screenerManager = new ScreenerManager(logger);
    }

    const result = await screenerManager.getOHLCV({
      symbol: symbol as string,
      exchange: exchange as string,
      timeframe: timeframe as string,
      bars: bars ? parseInt(bars as string) : undefined
    });
    res.json(result);
  } catch (error) {
    logger.error('Failed to get OHLCV data', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// ============================================
// Optimization Endpoints
// ============================================

app.post('/api/optimization/test', async (req, res) => {
  try {
    const { symbol, indicatorName, testMatrix, delayBetween, storeResults } = req.body || {};
    
    if (!symbol || !indicatorName || !testMatrix) {
      return res.status(400).json({ success: false, error: 'symbol, indicatorName, and testMatrix are required' });
    }

    const page = browserManager.getPage();
    if (!optimizationManager) {
      optimizationManager = new OptimizationManager(page, logger);
    }

    const result = await optimizationManager.runOptimizationTest({
      symbol,
      indicatorName,
      testMatrix,
      delayBetween,
      storeResults
    });

    res.json(result);
  } catch (error) {
    logger.error('Optimization test failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/api/optimization/recommendations', async (req, res) => {
  try {
    const { symbol, indicatorName, optimizeFor, limit } = req.query || {};
    
    if (!symbol || !indicatorName) {
      return res.status(400).json({ success: false, error: 'symbol and indicatorName are required' });
    }

    // Query Supabase
    let supabase: any = null;
    try {
      const supabaseModule = await import('@supabase/supabase-js');
      supabase = supabaseModule.createClient(
        process.env.SUPABASE_URL || 'http://localhost:8055',
        process.env.SUPABASE_SERVICE_KEY || ''
      );
    } catch (e) {
      return res.status(500).json({ success: false, error: 'Supabase not configured' });
    }

    const { data, error } = await supabase
      .from('backtest_results')
      .select('*')
      .eq('symbol', (symbol as string).toUpperCase())
      .ilike('indicator_type', `%${indicatorName}%`)
      .order(optimizeFor as string || 'roi_percent', { ascending: false })
      .limit(parseInt(limit as string) || 10);

    if (error) {
      throw new Error(`Supabase query error: ${error.message}`);
    }

    const recommendations = (data || []).map((r: any, index: number) => ({
      rank: index + 1,
      config: r.indicator_config,
      metrics: {
        roi: r.roi_percent,
        winRate: r.win_rate_percent,
        drawdown: r.max_drawdown_percent,
        sortino: r.sortino_ratio,
        profitFactor: r.profit_factor,
        totalTrades: r.total_trades
      }
    }));

    res.json({
      success: true,
      symbol,
      indicatorName,
      recommendations,
      count: recommendations.length
    });
  } catch (error) {
    logger.error('Failed to get optimization recommendations', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// ============================================
// Browser Control Endpoints
// ============================================

app.post('/api/browser/start', async (req, res) => {
  try {
    const { url, headless } = req.body || {};
    // Browser is managed automatically by BrowserManager
    // This endpoint is for compatibility
    const state = await browserManager.connect();
    res.json({ success: state.connected, state });
  } catch (error) {
    logger.error('Failed to start browser', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

app.post('/api/browser/stop', async (req, res) => {
  try {
    await browserManager.disconnect();
    res.json({ success: true, message: 'Browser disconnected' });
  } catch (error) {
    logger.error('Failed to stop browser', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// ============================================
// Webhook Receiver (TradingView Alert Intake)
// ============================================

app.post('/api/webhook/tradingview', async (req, res) => {
  try {
    const payload = req.body;
    const timestamp = new Date().toISOString();
    
    logger.info('TradingView webhook received', {
      timestamp,
      keys: Object.keys(payload),
      symbol: payload.ticker || payload.symbol,
      action: payload.action || payload.signal
    });

    // Forward to n8n webhook if configured
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (n8nWebhookUrl) {
      try {
        await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'tradingview',
            receivedAt: timestamp,
            ...payload
          })
        });
        logger.info('Forwarded to n8n', { url: n8nWebhookUrl });
      } catch (fwdError) {
        logger.error('Failed to forward to n8n', { error: fwdError instanceof Error ? fwdError.message : String(fwdError) });
      }
    }

    res.json({
      success: true,
      received: timestamp,
      forwarded: !!n8nWebhookUrl
    });
  } catch (error) {
    logger.error('Webhook processing failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(500).json({
    success: false,
    error: err.message
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 TradingView API Server started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });

  logger.info(`
Endpoints:
  GET  /health                    - Health check
  POST /api/connect               - Connect to browser
  POST /api/disconnect            - Disconnect from browser
  GET  /api/status                - Get connection status
  
  Layout Management:
  GET  /api/layouts               - List all layouts
  GET  /api/layouts/current       - Get current layout
  POST /api/layouts/load          - Load layout
  POST /api/layouts/create         - Create new layout from current state
  POST /api/layouts/duplicate     - Duplicate existing layout
  PUT  /api/layouts/:name/rename  - Rename layout
  DELETE /api/layouts/:name      - Delete layout
  
  Watchlist Management:
  GET  /api/watchlists            - List all watchlists
  GET  /api/watchlists/active     - Get active watchlist
  GET  /api/watchlists/:name      - Get watchlist symbols
  POST /api/watchlists/select     - Select watchlist
  POST /api/watchlists/create     - Create new watchlist
  POST /api/watchlists/data       - Get watchlist with price data
  
  Indicator Management:
  GET  /api/indicators            - List indicators
  GET  /api/indicators/find/:name - Find indicator by name
  GET  /api/indicators/:name/settings - Get indicator settings
  GET  /api/indicators/:name/config - Read full indicator config
  POST /api/indicators/ensure     - Ensure indicators loaded
  GET  /api/indicators/:name/signal - Read indicator signal
  
  Backtest Tables:
  POST /api/indicators/:name/backtest/enable - Enable/disable backtest display
  GET  /api/indicators/:name/backtest - Read backtest table
  POST /api/indicators/:name/backtest/capture - Enable and read backtest in one call
  
  Alert Management:
  POST /api/alerts/create         - Create single alert
  POST /api/alerts/create-bulk    - Create multiple alerts
  
  Screener:
  POST /api/screener/scan         - Custom screener scan
  POST /api/screener/james        - James oversold scan
  POST /api/screener/gainers      - Top gainers scan
  POST /api/screener/losers       - Top losers scan
  POST /api/screener/rotation     - Rotation candidates from backtest
  
  Optimization:
  POST /api/optimization/test     - Run optimization tests
  GET  /api/optimization/recommendations - Get best settings
  
  Data:
  GET  /api/data/ohlcv            - Get OHLCV historical data
  
  Browser Control:
  POST /api/browser/start          - Start browser
  POST /api/browser/stop           - Stop browser
  
  Workflow:
  POST /api/workflow/setup        - Setup layout + watchlist
  POST /api/workflow/ensure       - Ensure layout + watchlist
  POST /api/workflow/batch-backtest-capture - Batch capture backtest tables for multiple symbols
  `);

  // Auto-connect on startup (optional)
  if (process.env.AUTO_CONNECT === 'true') {
    logger.info('Auto-connecting to browser...');
    browserManager.connect()
      .then(state => {
        if (state.connected) {
          healthMonitor.start();
          logger.info('Auto-connected successfully');
        } else {
          logger.warn('Auto-connect failed', { error: state.error });
        }
      })
      .catch(error => {
        logger.error('Auto-connect error', { error: error.message });
      });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  healthMonitor.stop();
  await browserManager.disconnect();
  await connectionPool.cleanupAll();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  healthMonitor.stop();
  await browserManager.disconnect();
  await connectionPool.cleanupAll();
  process.exit(0);
});
