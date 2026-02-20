/**
 * TradingView-specific types
 */

export interface Layout {
  name: string;
  url?: string;
  symbol?: string;
  timeframe?: string;
  lastModified?: string;
}

export interface Watchlist {
  name: string;
  symbols: string[];
  active?: boolean;
}

export interface Indicator {
  name: string;
  fullName: string;
  pane: number;
  hasSettings: boolean;
  visible: boolean;
}

export interface IndicatorSettings {
  indicator: string;
  settings: {
    inputs: Record<string, string | number | boolean>;
    style: Record<string, string | number | boolean>;
    visibility: Record<string, boolean>;
  };
}

export interface IndicatorSignal {
  indicator: string;
  signalState: 'buy' | 'sell' | 'hold' | 'neutral' | 'unknown';
  values: Record<string, string | number>;
  color?: string;
  timestamp: string;
}

export interface ChartContext {
  symbol: string;
  exchange: string;
  timeframe: string;
  chartType: string;
  indicators: Indicator[];
  alertsCount?: number;
  timestamp: string;
}

export interface SettingUpdate {
  label: string;
  value: string | number | boolean;
}

export interface BacktestTable {
  indicator: string;
  tableName?: string; // e.g., "PTOS Results", "Conf-BT Results", "Trend-BT Results"
  profit: number;
  roi: number; // Return on Investment percentage
  winRate: number; // Win percentage (0-100)
  maxDrawdown?: number; // Max drawdown percentage
  sortino?: number; // Sortino ratio
  profitFactor?: number; // Profit factor
  totalTrades?: number; // Total number of trades
  buys: number;
  sells: number;
  open: number; // Open positions
  capital?: number; // Initial capital
  total?: number; // Total value
  timestamp: string;
  rawData?: Record<string, any>; // Additional fields
}

export const TV_SELECTORS = {
  legend: {
    container: '[data-name="legend"]',
    sourceItem: '[data-name="legend-source-item"]',
    seriesItem: '[data-name="legend-series-item"]',
    title: '[class*="title"]',
    value: '[class*="value"]',
    settingsAction: '[data-name="legend-settings-action"]',
    visibilityAction: '[data-name="legend-hide-action"]',
    removeAction: '[data-name="legend-remove-action"]',
    moreAction: '[data-name="legend-more-action"]'
  },
  dialog: {
    overlay: '[class*="dialog-"]',
    title: '[class*="title-"]',
    closeButton: '[data-name="close"]',
    submitButton: '[data-name="submit"]',
    cancelButton: '[data-name="cancel"]'
  },
  settings: {
    dialog: '[data-name="indicator-settings-dialog"]',
    dialogOverlay: '#overlap-manager-root > div:nth-child(2) > div > div.dialog-qyCw0PaN', // Updated 2024
    tab: '[data-name="tab-item"]',
    input: 'input',
    checkbox: 'input[type="checkbox"]',
    okButton: '[data-name="submit"], button[name="submit"]',
    cancelButton: '[data-name="cancel"], button[name="cancel"]',
    applyButton: '[data-name="apply"]'
  },
  layout: {
    button: '[data-name="load-layout-dialog"]', // Updated
    dialog: '.popup-dialog', // Updated
    searchInput: 'input[data-role="search"]',
    layoutItem: '.layout-item',
    layoutName: '.layout-name'
  },
  watchlist: {
    button: '[data-name="watchlists-button"]',
    panel: '[data-name="watchlist-panel"]',
    item: '[data-name="watchlist-item"]',
    name: '[class*="listName"]',
    activeItem: '[data-name="watchlist-item"][data-active="true"]',
    symbolItem: '[data-name="watchlist-symbol-item"]'
  },
  symbol: {
    searchButton: '[data-name="symbol-search-button"]',
    searchInput: 'input[data-role="search"]',
    searchDialog: '[data-name="symbol-search-items-dialog"]'
  }
};
