// Background service worker - handles config storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['clawg_token', 'gateway_url'], (result) => {
    if (!result.gateway_url) {
      chrome.storage.local.set({ gateway_url: 'http://192.168.50.52:18789' });
    }
  });
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type === 'GET_CONFIG') {
    chrome.storage.local.get(['clawg_token', 'gateway_url'], reply);
    return true;
  }
  if (msg.type === 'SET_CONFIG') {
    chrome.storage.local.set(msg.data, () => reply({ ok: true }));
    return true;
  }
});
