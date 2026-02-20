/**
 * Cookie Sync Utility
 * Syncs cookies from Brave/Vivaldi browsers to Chrome for TradingView API
 * Ported from TradingView MCP
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { Logger } from './logger.js';

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: string;
}

/**
 * Get browser profile paths
 */
function getBrowserProfiles(): {
  brave?: string;
  vivaldi?: string;
  chrome?: string;
} {
  const home = process.env.HOME || process.env.USERPROFILE || '/tmp';
  const profiles: { brave?: string; vivaldi?: string; chrome?: string } = {};

  // Brave profile paths (Linux)
  const bravePaths = [
    join(home, '.config/BraveSoftware/Brave-Browser/Default'),
    join(home, 'Library/Application Support/BraveSoftware/Brave-Browser/Default'), // macOS
  ];
  for (const path of bravePaths) {
    if (existsSync(path)) {
      profiles.brave = path;
      break;
    }
  }

  // Vivaldi profile paths (Linux)
  const vivaldiPaths = [
    join(home, '.config/vivaldi/Default'),
    join(home, 'Library/Application Support/Vivaldi/Default'), // macOS
  ];
  for (const path of vivaldiPaths) {
    if (existsSync(path)) {
      profiles.vivaldi = path;
      break;
    }
  }

  // Chrome profile paths
  const chromePaths = [
    join(home, '.config/google-chrome/Default'),
    join(home, 'Library/Application Support/Google/Chrome/Default'), // macOS
    join(home, 'AppData/Local/Google/Chrome/User Data/Default'), // Windows
  ];
  for (const path of chromePaths) {
    if (existsSync(path)) {
      profiles.chrome = path;
      break;
    }
  }

  return profiles;
}

/**
 * Extract cookies from Chromium-based browser (Brave/Vivaldi/Chrome)
 * Uses sqlite3 to read from Cookies database
 */
async function extractCookiesFromBrowser(profilePath: string, logger: Logger): Promise<Cookie[]> {
  const cookiesDb = join(profilePath, 'Cookies');
  
  if (!existsSync(cookiesDb)) {
    logger.warn(`Cookies database not found: ${cookiesDb}`);
    return [];
  }

  try {
    // Use sqlite3 command-line tool to extract cookies
    // Note: If Brave/Vivaldi is running, the database might be locked
    // In that case, we'll try to read it anyway (sqlite3 can sometimes read locked DBs)
    // Format: name|value|domain|path|expires|httpOnly|secure|sameSite
    const sql = `
      SELECT 
        name,
        value,
        host_key as domain,
        path,
        CASE 
          WHEN expires_utc = 0 THEN NULL
          ELSE (expires_utc/1000000 - 11644473600)
        END as expires,
        CASE WHEN is_httponly = 1 THEN 1 ELSE 0 END as httpOnly,
        CASE WHEN is_secure = 1 THEN 1 ELSE 0 END as secure,
        CASE 
          WHEN samesite = -1 THEN 'unspecified'
          WHEN samesite = 0 THEN 'no_restriction'
          WHEN samesite = 1 THEN 'lax'
          WHEN samesite = 2 THEN 'strict'
          ELSE 'unspecified'
        END as sameSite
      FROM cookies
      WHERE (expires_utc = 0 OR expires_utc > (strftime('%s', 'now') * 1000000 + 11644473600 * 1000000))
      ORDER BY creation_utc DESC
      LIMIT 10000;
    `;

    // Try to read the database (may fail if browser is running and has it locked)
    let output: string;
    try {
      output = execSync(`sqlite3 "${cookiesDb}" "${sql.replace(/\n/g, ' ')}"`, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large cookie databases
      });
    } catch (error: any) {
      if (error.message?.includes('locked') || error.message?.includes('database is locked')) {
        logger.warn(`Cookies database is locked (browser may be running). Try closing Brave/Vivaldi first.`);
        return [];
      }
      throw error;
    }
    
    const cookies: Cookie[] = [];
    const lines = output.trim().split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const parts = line.split('|');
      if (parts.length >= 7) {
        const expiresStr = parts[4]?.trim();
        const expires = expiresStr && expiresStr !== 'NULL' && expiresStr !== '' 
          ? parseInt(expiresStr) 
          : undefined;
        
        cookies.push({
          name: parts[0] || '',
          value: parts[1] || '',
          domain: parts[2] || '',
          path: parts[3] || '/',
          expires: expires,
          httpOnly: parts[5] === '1',
          secure: parts[6] === '1',
          sameSite: parts[7] || 'unspecified',
        });
      }
    }

    logger.info(`Extracted ${cookies.length} cookies from ${profilePath}`);
    return cookies;
  } catch (error) {
    logger.error(`Failed to extract cookies from ${profilePath}`, { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Import cookies into Chrome using CDP (Chrome DevTools Protocol)
 * This is the most reliable method as it uses Chrome's native API
 */
async function importCookiesViaCDP(
  cookies: Cookie[],
  cdpPort: number,
  logger: Logger
): Promise<number> {
  if (cookies.length === 0) return 0;

  try {
    // Get list of contexts (browser windows)
    const contextsResponse = await fetch(`http://localhost:${cdpPort}/json`);
    const contexts = await contextsResponse.json();
    
    if (!contexts || contexts.length === 0) {
      logger.warn('No Chrome contexts found for cookie import');
      return 0;
    }

    // Use Playwright to import cookies via CDP
    const { chromium } = await import('playwright');
    const browser = await chromium.connectOverCDP(`http://localhost:${cdpPort}`);
    const contexts_list = browser.contexts();
    
    if (contexts_list.length === 0) {
      await browser.close();
      logger.warn('No browser contexts available');
      return 0;
    }

    const context = contexts_list[0];
    
    // Convert our cookie format to Playwright format
    const playwrightCookies = cookies.map(cookie => {
      let sameSite: 'Lax' | 'Strict' | 'None' | undefined = 'Lax';
      if (cookie.sameSite === 'lax') {
        sameSite = 'Lax';
      } else if (cookie.sameSite === 'strict') {
        sameSite = 'Strict';
      } else if (cookie.sameSite === 'no_restriction') {
        sameSite = 'None';
      }
      
      return {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain.startsWith('.') ? cookie.domain : `.${cookie.domain}`,
        path: cookie.path || '/',
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: sameSite,
      };
    });

    // Import cookies into the browser context
    await context.addCookies(playwrightCookies);
    await browser.close();

    logger.info(`Imported ${cookies.length} cookies into Chrome via CDP`);
    return cookies.length;
  } catch (error) {
    logger.error('Failed to import cookies via CDP', { error: error instanceof Error ? error.message : String(error) });
    return 0;
  }
}

/**
 * Sync cookies from Brave/Vivaldi to Chrome
 * This should be called after Chrome is started with CDP
 */
export async function syncCookiesFromDailyBrowsers(
  cdpPort: number,
  logger: Logger
): Promise<{ synced: number; source: string }> {
  const profiles = getBrowserProfiles();
  const cookies: Cookie[] = [];

  // Try Brave first
  if (profiles.brave) {
    logger.info('Syncing cookies from Brave...');
    const braveCookies = await extractCookiesFromBrowser(profiles.brave, logger);
    cookies.push(...braveCookies);
    if (braveCookies.length > 0) {
      const imported = await importCookiesViaCDP(braveCookies, cdpPort, logger);
      return { synced: imported, source: 'Brave' };
    }
  }

  // Try Vivaldi if Brave had no cookies
  if (cookies.length === 0 && profiles.vivaldi) {
    logger.info('Syncing cookies from Vivaldi...');
    const vivaldiCookies = await extractCookiesFromBrowser(profiles.vivaldi, logger);
    cookies.push(...vivaldiCookies);
    if (vivaldiCookies.length > 0) {
      const imported = await importCookiesViaCDP(vivaldiCookies, cdpPort, logger);
      return { synced: imported, source: 'Vivaldi' };
    }
  }

  if (cookies.length === 0) {
    logger.warn('No cookies found in Brave or Vivaldi profiles');
    return { synced: 0, source: 'none' };
  }

  return { synced: cookies.length, source: 'multiple' };
}

/**
 * Check if sqlite3 is available (required for cookie extraction)
 */
export function checkSqlite3Available(): boolean {
  try {
    execSync('which sqlite3', { encoding: 'utf8' });
    return true;
  } catch {
    return false;
  }
}
