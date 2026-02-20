(function () {
  'use strict';
  if (document.getElementById('oc-orb-root')) return;

  function scrapeContext() {
    const isTradingView = location.hostname.includes('tradingview.com');
    const ctx = {
      isTradingView,
      generic: {
        url: location.href,
        title: document.title,
        hostname: location.hostname,
        h1: document.querySelector('h1')?.textContent?.trim() ?? null,
        metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null,
        selectedText: window.getSelection()?.toString()?.trim() ?? null,
      },
      timestamp: Date.now(),
    };
    if (isTradingView) ctx.tradingView = scrapeTradingView();
    return ctx;
  }

  function scrapeTradingView() {
    const tv = { symbol: null, exchange: null, timeframe: null, indicators: [], source: 'dom' };

    // Symbol from legend
    const legend = document.querySelector('[data-name="legend-series-item"]');
    const legendText = legend?.querySelector('[class*="title"]')?.textContent?.trim();
    if (legendText) {
      const parts = legendText.split(':');
      tv.exchange = parts.length >= 2 ? parts[0] : null;
      tv.symbol   = parts.length >= 2 ? parts[1] : legendText;
    }

    // Fallback: symbol search button
    if (!tv.symbol) {
      const btn = document.querySelector('[data-name="symbol-search-button"]');
      const t = btn?.textContent?.trim();
      if (t) { const p = t.split(':'); tv.exchange = p.length >= 2 ? p[0] : null; tv.symbol = p.length >= 2 ? p[1] : t; }
    }

    // Fallback: URL
    if (!tv.symbol) {
      const m = location.href.match(/chart\/([^\/\?]+)/);
      if (m) tv.symbol = decodeURIComponent(m[1]).replace(/^.*:/, '');
    }

    // Timeframe
    const tfEl = document.querySelector('[data-active="true"][class*="time"]') ||
                 document.querySelector('.isActive-LeLE6TDz');
    if (tfEl) tv.timeframe = tfEl.textContent?.trim() ?? null;

    // Indicators
    document.querySelectorAll('[data-name="legend-source-item"]').forEach(el => {
      const name = el.querySelector('[class*="title"]')?.textContent?.trim();
      if (name) tv.indicators.push(name);
    });

    return tv;
  }

  function reportContext() {
    const ctx = scrapeContext();
    chrome.runtime.sendMessage({ type: 'PAGE_CONTEXT', context: ctx });
  }

  reportContext();

  // SPA navigation detection
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) { lastUrl = location.href; setTimeout(reportContext, 1500); }
  }).observe(document, { subtree: true, childList: true });

  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg.type === 'SCRAPE_CONTEXT') { reply(scrapeContext()); return true; }
    if (msg.type === 'GET_SELECTION') { reply({ selectedText: window.getSelection()?.toString()?.trim() ?? '' }); return true; }
  });

  // Inject floating orb
  const root = document.createElement('div');
  root.id = 'oc-orb-root';
  root.innerHTML = `<button id="oc-orb" title="Open OpenClaw Copilot">🤖</button>`;
  document.body.appendChild(root);
  document.getElementById('oc-orb').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
  });
})();
