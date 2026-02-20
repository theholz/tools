// OpenClaw Copilot — Background Service Worker (MV3)
const DEFAULTS = {
  gateway_url: 'http://192.168.50.52:18789',
  clawg_token: '',
  tv_api_url:  'http://192.168.50.52:8084',
  openclaw_ui: 'http://192.168.50.52:8080',
  auto_tts: false,
  tts_rate: 1.0,
  tts_pitch: 1.0,
};

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(Object.keys(DEFAULTS), (stored) => {
    const merged = {};
    for (const [k, v] of Object.entries(DEFAULTS)) {
      merged[k] = stored[k] !== undefined ? stored[k] : v;
    }
    chrome.storage.local.set(merged);
  });
});

// Clicking toolbar icon opens the side panel
chrome.action.onClicked.addListener(async (tab) => {
  try { await chrome.sidePanel.open({ tabId: tab.id }); } catch {}
});

const pageContextCache = new Map();

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type === 'GET_CONFIG') {
    chrome.storage.local.get(Object.keys(DEFAULTS), reply);
    return true;
  }
  if (msg.type === 'SET_CONFIG') {
    chrome.storage.local.set(msg.data, () => reply({ ok: true }));
    return true;
  }
  if (msg.type === 'PAGE_CONTEXT') {
    const tabId = sender.tab?.id;
    if (tabId) pageContextCache.set(tabId, msg.context);
    chrome.runtime.sendMessage({ type: 'PAGE_CONTEXT_UPDATE', context: msg.context }).catch(() => {});
    return false;
  }
  if (msg.type === 'GET_PAGE_CONTEXT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      reply({ context: tabId ? (pageContextCache.get(tabId) ?? null) : null });
    });
    return true;
  }
  if (msg.type === 'REFRESH_CONTEXT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId) {
        chrome.tabs.sendMessage(tabId, { type: 'SCRAPE_CONTEXT' }, (ctx) => {
          if (ctx && tabId) pageContextCache.set(tabId, ctx);
          reply({ context: ctx ?? null });
        });
      } else { reply({ context: null }); }
    });
    return true;
  }
  if (msg.type === 'OPEN_SIDE_PANEL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId) chrome.sidePanel.open({ tabId }).catch(() => {});
    });
    return false;
  }
  if (msg.type === 'OPEN_OPENCLAW') {
    chrome.storage.local.get(['openclaw_ui'], (cfg) => {
      chrome.tabs.create({ url: cfg.openclaw_ui || DEFAULTS.openclaw_ui });
    });
    return false;
  }
  if (msg.type === 'OPEN_URL') {
    chrome.tabs.create({ url: msg.url });
    return false;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => { pageContextCache.delete(tabId); });
