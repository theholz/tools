/**
 * TV Copilot - Content Script
 * 
 * Architecture:
 * 1. Injects sidebar UI into TradingView DOM
 * 2. Scrapes chart context directly from DOM (fast, no Playwright needed for reading)
 * 3. Streams messages to OpenClaw via AG-UI/clawg-ui SSE protocol
 * 4. Includes chart context in every message via CopilotKit-style readable state
 */

(function () {
  'use strict';

  // ── Config (loaded from chrome.storage) ──────────────────────────────────
  let CONFIG = {
    gateway_url: 'http://192.168.50.52:18789',
    clawg_token: null,
    tv_api_url: 'http://192.168.50.52:8084',
  };

  // ── State ─────────────────────────────────────────────────────────────────
  let messages = [];
  let chartCtx = null;
  let isStreaming = false;
  let abortController = null;

  // ── Load config from background ───────────────────────────────────────────
  chrome.runtime.sendMessage({ type: 'GET_CONFIG' }, (cfg) => {
    if (cfg) Object.assign(CONFIG, cfg);
    init();
  });

  function init() {
    if (document.getElementById('tv-copilot-toggle')) return; // already injected
    injectUI();
    fetchChartContext();
    // Refresh context when URL changes (symbol navigation)
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(fetchChartContext, 1500);
      }
    }).observe(document, { subtree: true, childList: true });
  }

  // ── DOM Context Scraper ───────────────────────────────────────────────────
  // Extract chart state directly from TradingView DOM — same approach as ChartManager.ts
  function scrapeChartContext() {
    const ctx = { symbol: null, exchange: null, timeframe: null, indicators: [], source: 'dom' };

    // Symbol + exchange from legend title
    const seriesItem = document.querySelector('[data-name="legend-series-item"]');
    if (seriesItem) {
      const txt = seriesItem.querySelector('[class*="title"]')?.textContent?.trim();
      if (txt) {
        const parts = txt.split(':');
        if (parts.length >= 2) { ctx.exchange = parts[0]; ctx.symbol = parts[1]; }
        else ctx.symbol = txt;
      }
    }

    // Fallback: header symbol button
    if (!ctx.symbol) {
      const btn = document.querySelector('[data-name="symbol-search-button"]');
      const txt = btn?.textContent?.trim();
      if (txt) {
        const parts = txt.split(':');
        if (parts.length >= 2) { ctx.exchange = parts[0]; ctx.symbol = parts[1]; }
        else ctx.symbol = txt;
      }
    }

    // Fallback: URL
    if (!ctx.symbol) {
      const m = location.href.match(/chart\/([^\/\?]+)/);
      if (m) ctx.symbol = decodeURIComponent(m[1]).replace(/^.*:/, '');
    }

    // Timeframe — look for selected timeframe button
    const tfBtn = document.querySelector('[data-active="true"][class*="time"]') ||
                  document.querySelector('.isActive-LeLE6TDz') ||
                  document.querySelector('[class*="interval"][class*="active"]');
    if (tfBtn) ctx.timeframe = tfBtn.textContent?.trim();

    // Indicators from legend source items
    document.querySelectorAll('[data-name="legend-source-item"]').forEach(el => {
      const name = el.querySelector('[class*="title"]')?.textContent?.trim();
      if (name) ctx.indicators.push(name);
    });

    return ctx;
  }

  // Fetch richer context from tradingview-api (has price, full indicator signals)
  async function fetchChartContext() {
    // Always get fast DOM scrape first
    const domCtx = scrapeChartContext();
    updateContextUI(domCtx);

    // Then try the API for richer data
    try {
      const resp = await fetch(`${CONFIG.tv_api_url}/api/chart/context`, { signal: AbortSignal.timeout(3000) });
      if (resp.ok) {
        const data = await resp.json();
        chartCtx = { ...data, source: 'api' };
      } else {
        chartCtx = domCtx;
      }
    } catch {
      chartCtx = domCtx;
    }
    updateContextUI(chartCtx);
  }

  function updateContextUI(ctx) {
    if (!ctx) return;
    const container = document.getElementById('tv-copilot-context');
    if (!container) return;

    const badge = document.getElementById('tv-copilot-ctx-badge');
    const sym = ctx.symbol || '—';
    const tf = ctx.timeframe || '—';
    const ex = ctx.exchange || '';
    const indCount = ctx.indicators?.length || 0;

    if (badge) {
      badge.textContent = sym !== '—' ? `${sym} · ${tf}` : 'No context';
      badge.className = 'context-badge' + (sym === '—' ? ' no-ctx' : '');
    }

    container.innerHTML = `
      ${ex && sym !== '—' ? `<span class="ctx-pill"><span class="label">Exchange</span><span class="value">${ex}</span></span>` : ''}
      ${sym !== '—' ? `<span class="ctx-pill"><span class="label">Symbol</span><span class="value">${sym}</span></span>` : ''}
      ${tf !== '—' ? `<span class="ctx-pill"><span class="label">TF</span><span class="value">${tf}</span></span>` : ''}
      ${indCount > 0 ? `<span class="ctx-pill"><span class="label">Indicators</span><span class="value">${indCount}</span></span>` : ''}
      <button id="tv-copilot-context-refresh" title="Refresh chart context">↻</button>
    `;
    container.querySelector('#tv-copilot-context-refresh')?.addEventListener('click', fetchChartContext);
  }

  // ── Build context string to inject into every message ────────────────────
  function buildContextBlock() {
    if (!chartCtx) return '';
    const c = chartCtx;
    const lines = ['<chart_context>'];
    if (c.symbol) lines.push(`  symbol: ${c.exchange ? c.exchange + ':' : ''}${c.symbol}`);
    if (c.timeframe) lines.push(`  timeframe: ${c.timeframe}`);
    if (c.chartType) lines.push(`  chart_type: ${c.chartType}`);
    if (c.indicators?.length) {
      lines.push(`  indicators:`);
      c.indicators.forEach(ind => {
        const name = typeof ind === 'string' ? ind : ind.name;
        lines.push(`    - ${name}`);
      });
    }
    lines.push('</chart_context>');
    return lines.join('\n');
  }

  // ── AG-UI / clawg-ui streaming ────────────────────────────────────────────
  async function sendMessage(userText) {
    if (isStreaming) return;
    if (!CONFIG.clawg_token) {
      appendMessage('assistant', '⚠️ No gateway token set. Open extension settings (click the extension icon).');
      return;
    }

    const ctxBlock = buildContextBlock();
    const fullContent = ctxBlock ? `${ctxBlock}\n\n${userText}` : userText;

    // Push to local history for display (show clean text, not ctx block)
    appendMessage('user', userText);
    const assistantEl = appendMessage('assistant', '', true);

    messages.push({ role: 'user', content: fullContent });
    isStreaming = true;
    toggleSendButton(false);

    let assistantText = '';
    abortController = new AbortController();

    try {
      const resp = await fetch(`${CONFIG.gateway_url}/v1/clawg-ui`, {
        method: 'POST',
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.clawg_token}`,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        assistantText = `Error ${resp.status}: ${err}`;
        setMessageContent(assistantEl, assistantText, false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === '[DONE]') continue;
          try {
            const event = JSON.parse(raw);
            if (event.type === 'TEXT_MESSAGE_CONTENT' && event.delta) {
              assistantText += event.delta;
              setMessageContent(assistantEl, assistantText, true);
            }
          } catch {}
        }
      }

      setMessageContent(assistantEl, assistantText, false);
      messages.push({ role: 'assistant', content: assistantText });
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessageContent(assistantEl, `Connection error: ${err.message}`, false);
      }
    } finally {
      isStreaming = false;
      toggleSendButton(true);
      abortController = null;
    }
  }

  // ── UI Helpers ────────────────────────────────────────────────────────────
  function appendMessage(role, text, streaming = false) {
    const container = document.getElementById('tv-copilot-messages');
    if (!container) return null;

    const el = document.createElement('div');
    el.className = `msg ${role}`;
    const bubble = document.createElement('div');
    bubble.className = `msg-bubble${streaming ? ' streaming' : ''}`;
    bubble.textContent = text;
    el.appendChild(bubble);
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    return el;
  }

  function setMessageContent(el, text, streaming) {
    if (!el) return;
    const bubble = el.querySelector('.msg-bubble');
    if (!bubble) return;
    bubble.textContent = text || (streaming ? '' : '(no response)');
    bubble.className = `msg-bubble${streaming ? ' streaming' : ''}`;
    const container = document.getElementById('tv-copilot-messages');
    if (container) container.scrollTop = container.scrollHeight;
  }

  function toggleSendButton(enabled) {
    const btn = document.getElementById('tv-copilot-send');
    if (btn) btn.disabled = !enabled;
  }

  // ── Inject HTML ───────────────────────────────────────────────────────────
  function injectUI() {
    // Toggle tab
    const toggle = document.createElement('div');
    toggle.id = 'tv-copilot-toggle';
    toggle.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;
    document.body.appendChild(toggle);

    // Sidebar panel
    const panel = document.createElement('div');
    panel.id = 'tv-copilot-panel';
    panel.innerHTML = `
      <div id="tv-copilot-header">
        <div class="title">
          <span class="emoji">🤖</span>
          <span>TV Copilot</span>
          <span id="tv-copilot-ctx-badge" class="context-badge no-ctx">Loading...</span>
        </div>
        <button id="tv-copilot-close">✕</button>
      </div>
      <div id="tv-copilot-context"></div>
      <div id="tv-copilot-messages">
        <div class="msg assistant">
          <div class="msg-bubble">👋 Ask me anything about this chart. I can see your current symbol, timeframe, and indicators.</div>
        </div>
      </div>
      <div id="tv-copilot-quick-actions">
        <button class="quick-action" data-prompt="What's the current market structure on this chart?">Market structure</button>
        <button class="quick-action" data-prompt="Analyze the current indicator signals and give me a bias.">Indicator signals</button>
        <button class="quick-action" data-prompt="What are the key levels I should watch on this chart?">Key levels</button>
        <button class="quick-action" data-prompt="Give me an InvestAnswers-style trade thesis for this setup.">IA thesis</button>
      </div>
      <div id="tv-copilot-input-area">
        <textarea id="tv-copilot-input" placeholder="Ask about this chart…" rows="1"></textarea>
        <button id="tv-copilot-send">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    `;
    document.body.appendChild(panel);

    // Wire up events
    toggle.addEventListener('click', () => {
      panel.classList.toggle('open');
      toggle.style.display = 'none';
      if (!panel.classList.contains('open')) toggle.style.display = '';
      if (panel.classList.contains('open')) fetchChartContext();
    });

    document.getElementById('tv-copilot-close').addEventListener('click', () => {
      panel.classList.remove('open');
      toggle.style.display = '';
    });

    document.getElementById('tv-copilot-send').addEventListener('click', handleSend);

    const input = document.getElementById('tv-copilot-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    document.querySelectorAll('.quick-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.dataset.prompt;
        document.getElementById('tv-copilot-input').value = prompt;
        handleSend();
      });
    });
  }

  function handleSend() {
    const input = document.getElementById('tv-copilot-input');
    const text = input?.value?.trim();
    if (!text || isStreaming) return;
    input.value = '';
    input.style.height = 'auto';
    sendMessage(text);
  }
})();
