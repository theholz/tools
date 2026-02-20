/**
 * TradingView Authentication
 * Handles login via username/password + TOTP for headless environments
 */

import { Page } from 'playwright';
import { Logger } from './logger.js';

// Simple TOTP implementation (no external deps)
function generateTOTP(secret: string): string {
  const crypto = require('crypto');
  
  // Base32 decode
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of secret.toUpperCase().replace(/=+$/, '')) {
    const val = base32Chars.indexOf(c);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  const key = Buffer.from(bytes);

  // Time-based counter
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / 30);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeUInt32BE(0, 0);
  counterBuf.writeUInt32BE(counter, 4);

  // HMAC-SHA1
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24 |
    (hmac[offset + 1] & 0xff) << 16 |
    (hmac[offset + 2] & 0xff) << 8 |
    (hmac[offset + 3] & 0xff)) % 1000000;

  return code.toString().padStart(6, '0');
}

export async function loginToTradingView(page: Page, logger: Logger): Promise<boolean> {
  const username = process.env.TRADINGVIEW_USERNAME;
  const password = process.env.TRADINGVIEW_PASSWORD;
  const totpSecret = process.env.TRADINGVIEW_TOTP_SECRET;

  if (!username || !password) {
    logger.warn('TradingView credentials not set (TRADINGVIEW_USERNAME, TRADINGVIEW_PASSWORD)');
    return false;
  }

  try {
    // Dismiss any modals/popups first
    try {
      const closeButtons = await page.$$('button:has-text("Close"), button:has-text("Got it"), button:has-text("No, thanks"), [class*="close"], [data-name="close"]');
      for (const btn of closeButtons) {
        try { await btn.click(); await page.waitForTimeout(500); } catch {}
      }
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(500);
    } catch {}

    // Check if already logged in (persistent profile may have session)
    const url = page.url();
    if (url.includes('tradingview.com/chart')) {
      // Look for user menu or premium indicators (indicates logged in)
      const userMenu = await page.$('[data-name="header-user-menu-button"]');
      const saveButton = await page.$('button:has-text("Save")');
      const premiumBadge = await page.$('[class*="premium"]');
      if (userMenu || saveButton || premiumBadge) {
        logger.info('Already logged into TradingView (persistent session)');
        return true;
      }
    }

    logger.info('Logging into TradingView...');

    // Navigate to sign-in page
    await page.goto('https://www.tradingview.com/accounts/signin/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Click "Email" sign-in option
    const emailButton = await page.$('button[name="Email"]') ||
                         await page.$('span:text("Email")');
    if (emailButton) {
      await emailButton.click();
      await page.waitForTimeout(1000);
    }

    // Fill username
    const usernameInput = await page.$('input[name="id_username"]') ||
                           await page.$('input[autocomplete="username"]') ||
                           await page.$('#id_username');
    if (usernameInput) {
      await usernameInput.fill(username);
    } else {
      logger.error('Could not find username input');
      return false;
    }

    // Fill password
    const passwordInput = await page.$('input[name="id_password"]') ||
                           await page.$('input[type="password"]') ||
                           await page.$('#id_password');
    if (passwordInput) {
      await passwordInput.fill(password);
    } else {
      logger.error('Could not find password input');
      return false;
    }

    // Click sign in button
    const signInButton = await page.$('button:has-text("Sign in")') ||
                          await page.$('button[type="submit"]') ||
                          await page.$('button[data-overflow-tooltip-text="Sign in"]');
    if (signInButton) {
      await signInButton.click();
    } else {
      logger.error('Could not find sign-in button');
      return false;
    }

    // Wait for navigation or TOTP prompt
    await page.waitForTimeout(3000);

    // Check for TOTP/2FA prompt
    const totpInput = await page.$('input[name="code"]') ||
                       await page.$('input[placeholder*="code"]') ||
                       await page.$('input[type="text"][maxlength="6"]');
    
    if (totpInput && totpSecret) {
      logger.info('2FA prompt detected, entering TOTP code...');
      const code = generateTOTP(totpSecret);
      await totpInput.fill(code);
      
      const submitButton = await page.$('button[type="submit"]') ||
                            await page.$('button:text("Confirm")');
      if (submitButton) {
        await submitButton.click();
      }
      await page.waitForTimeout(3000);
    } else if (totpInput && !totpSecret) {
      logger.error('2FA required but TRADINGVIEW_TOTP_SECRET not set');
      return false;
    }

    // Check if login succeeded by navigating to chart
    await page.goto('https://www.tradingview.com/chart', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Verify we're logged in
    const userMenuAfter = await page.$('[data-name="header-user-menu-button"]');
    if (userMenuAfter) {
      logger.info('Successfully logged into TradingView');
      return true;
    }

    logger.error('Login may have failed, no user menu found after login attempt');
    return false;

  } catch (error) {
    logger.error('TradingView login failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}
