/**
 * Connection Pool - Manages multiple browser connections
 * (For future use when we need concurrent sessions)
 */

import { BrowserManager } from './BrowserManager.js';
import { Logger } from '../utils/logger.js';
import { BrowserError } from '../utils/errors.js';

export interface ConnectionInfo {
  sessionId: string;
  browserManager: BrowserManager;
  createdAt: Date;
  lastUsed: Date;
  active: boolean;
}

export class ConnectionPool {
  private connections: Map<string, ConnectionInfo> = new Map();
  private logger: Logger;
  private maxConnections: number;
  private idleTimeout: number; // milliseconds

  constructor(
    logger: Logger,
    options: {
      maxConnections?: number;
      idleTimeout?: number;
    } = {}
  ) {
    this.logger = logger;
    this.maxConnections = options.maxConnections || 5;
    this.idleTimeout = options.idleTimeout || 300000; // 5 minutes default

    // Start cleanup interval
    setInterval(() => {
      this.cleanup();
    }, 60000); // Check every minute
  }

  /**
   * Get or create a connection
   */
  async getConnection(
    sessionId: string,
    config?: { headless?: boolean; timeout?: number; userDataDir?: string; args?: string[] }
  ): Promise<BrowserManager> {
    let connection = this.connections.get(sessionId);

    if (connection && connection.active) {
      connection.lastUsed = new Date();
      this.logger.debug('Reusing existing connection', { sessionId });
      return connection.browserManager;
    }

    // Check if we're at max connections
    if (this.connections.size >= this.maxConnections) {
      // Remove oldest idle connection
      await this.removeOldestIdleConnection();
    }

    // Create new connection
    this.logger.info('Creating new connection', { sessionId });

    const browserManager = new BrowserManager(
      config || {},
      this.logger
    );

    await browserManager.connect();

    connection = {
      sessionId,
      browserManager,
      createdAt: new Date(),
      lastUsed: new Date(),
      active: true
    };

    this.connections.set(sessionId, connection);

    return browserManager;
  }

  /**
   * Release a connection (mark as inactive but keep for reuse)
   */
  async releaseConnection(sessionId: string): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (connection) {
      connection.active = false;
      connection.lastUsed = new Date();
      this.logger.debug('Connection released', { sessionId });
    }
  }

  /**
   * Remove a connection completely
   */
  async removeConnection(sessionId: string): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (connection) {
      await connection.browserManager.disconnect();
      this.connections.delete(sessionId);
      this.logger.info('Connection removed', { sessionId });
    }
  }

  /**
   * Get connection info
   */
  getConnectionInfo(sessionId: string): ConnectionInfo | undefined {
    return this.connections.get(sessionId);
  }

  /**
   * List all connections
   */
  listConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values());
  }

  /**
   * Cleanup idle connections
   */
  private async cleanup(): Promise<void> {
    const now = new Date();
    const toRemove: string[] = [];

    for (const [sessionId, connection] of this.connections.entries()) {
      const idleTime = now.getTime() - connection.lastUsed.getTime();

      if (idleTime > this.idleTimeout && !connection.active) {
        toRemove.push(sessionId);
      }
    }

    for (const sessionId of toRemove) {
      this.logger.debug('Removing idle connection', { sessionId });
      await this.removeConnection(sessionId);
    }
  }

  /**
   * Remove oldest idle connection
   */
  private async removeOldestIdleConnection(): Promise<void> {
    let oldest: ConnectionInfo | null = null;
    let oldestSessionId: string | null = null;

    for (const [sessionId, connection] of this.connections.entries()) {
      if (!connection.active) {
        if (!oldest || connection.lastUsed < oldest.lastUsed) {
          oldest = connection;
          oldestSessionId = sessionId;
        }
      }
    }

    if (oldestSessionId) {
      this.logger.info('Removing oldest idle connection', { sessionId: oldestSessionId });
      await this.removeConnection(oldestSessionId);
    } else {
      throw new BrowserError('No idle connections available to remove');
    }
  }

  /**
   * Cleanup all connections
   */
  async cleanupAll(): Promise<void> {
    this.logger.info('Cleaning up all connections', { count: this.connections.size });

    const disconnectPromises = Array.from(this.connections.values()).map(connection =>
      connection.browserManager.disconnect()
    );

    await Promise.all(disconnectPromises);
    this.connections.clear();
  }
}
