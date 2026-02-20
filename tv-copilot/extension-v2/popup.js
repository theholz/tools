document.getElementById('panel').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.sidePanel.open({ tabId: tabs[0].id });
    window.close();
  });
});
document.getElementById('settings').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
  window.close();
});
