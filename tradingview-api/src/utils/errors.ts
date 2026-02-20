/**
 * Custom error classes for TradingView API
 */

export class TradingViewError extends Error {
  constructor(message: string, public code?: string, public context?: Record<string, unknown>) {
    super(message);
    this.name = 'TradingViewError';
  }
}

export class ConnectionError extends TradingViewError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONNECTION_ERROR', context);
    this.name = 'ConnectionError';
  }
}

export class BrowserError extends TradingViewError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'BROWSER_ERROR', context);
    this.name = 'BrowserError';
  }
}

export class TimeoutError extends TradingViewError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'TIMEOUT_ERROR', context);
    this.name = 'TimeoutError';
  }
}

export class NotFoundError extends TradingViewError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NOT_FOUND', context);
    this.name = 'NotFoundError';
  }
}
