// Load saved values
chrome.storage.local.get(['clawg_token', 'gateway_url'], (result) => {
  if (result.gateway_url) document.getElementById('gateway_url').value = result.gateway_url;
  if (result.clawg_token) document.getElementById('clawg_token').value = result.clawg_token;
});

document.getElementById('save').addEventListener('click', async () => {
  const gateway_url = document.getElementById('gateway_url').value.trim().replace(/\/$/, '');
  const clawg_token = document.getElementById('clawg_token').value.trim();
  const status = document.getElementById('status');

  if (!gateway_url || !clawg_token) {
    status.textContent = 'Both fields are required.';
    status.className = 'status err';
    return;
  }

  // Quick connectivity test
  status.textContent = 'Testing connection…';
  status.className = 'status';
  try {
    const resp = await fetch(`${gateway_url}/health`, { signal: AbortSignal.timeout(4000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    chrome.storage.local.set({ gateway_url, clawg_token }, () => {
      status.textContent = '✓ Saved! Reload TradingView.';
      status.className = 'status ok';
    });
  } catch (err) {
    status.textContent = `✗ ${err.message}`;
    status.className = 'status err';
  }
});
