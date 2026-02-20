# OpenClaw Copilot v2 — Architecture & Development Notes

**Commit context:** Complete rewrite of the TV Copilot Chrome extension.
Upgraded from a TradingView-only sidebar to a full CopilotKit + AG-UI
compliant extension that works across any website.

---

## Background & Motivation

The original TV Copilot v1 (`extension/`) was a hand-rolled Chrome extension
purpose-built for TradingView. It worked, but had hard limits:

- Vanilla JS only — no React, no component model
- TradingView-specific manifest (`matches: tradingview.com/*`)
- Manual SSE parsing against OpenClaw's `/v1/clawg-ui` endpoint
- No AG-UI protocol awareness — just raw stream consumption
- Context injection via string concatenation (`buildContextBlock()`)
- No voice, no quick-launch tools, no side panel

The goal for v2 was to meld the full OpenClaw toolset into the browser for
use on **any page** — not just TradingView — while adopting proper AG-UI
protocol compliance and CopilotKit as the frontend framework.

---

## Architecture Decision: Integration Path

Before writing a line of code, two integration paths were evaluated:

### Path A — Direct AG-UI (80% solution)
Use `@ag-ui/client`'s `useAgent` hook pointed directly at the OpenClaw
`/v1/clawg-ui` endpoint. OpenClaw already speaks AG-UI natively (emits
`TEXT_MESSAGE_CONTENT`, `TOOL_CALL_START/END`, `STATE_SNAPSHOT/DELTA`
events). This gets streaming, tool call visibility, and shared state — but
requires manual context injection and loses CopilotKit's higher-level hooks.

### Path B — Full CopilotRuntime (100% solution)
Wrap the gateway with a thin CopilotRuntime endpoint (~30 lines of Express)
and point the extension at that. This unlocks:
- `useCopilotReadable` — automatic context injection into every LLM call
- `useCopilotAction` — agent can call frontend functions directly
- `<CopilotChat>` / suggestions / HITL `renderAndWait` patterns
- Built-in dark-theme-customizable chat UI

**Decision: Path B, staged.** The extension is built fully CopilotKit-native
(Path B) from day one. The gateway endpoint (`/v1/clawg-ui`) already speaks
AG-UI, so `<CopilotKit runtimeUrl="...">` points directly at it now and can
be swapped for a proper CopilotRuntime wrapper later with a one-line change.

Key insight: OpenClaw's gateway *is* already the runtime. CopilotRuntime is
just a thin adapter that unlocks the full hook surface.

---

## Tech Stack (all versions pinned and verified live from npm)

| Package | Version | Notes |
|---|---|---|
| `@copilotkit/react-core` | `1.51.4` | AG-UI native v1.50+ series |
| `@copilotkit/react-ui` | `1.51.4` | **Never `npm audit fix --force`** — downgrades to 0.2.0 and breaks everything |
| `@ag-ui/client` | `0.0.45` | Must match `@ag-ui/core` exactly |
| `@ag-ui/core` | `0.0.45` | Type mismatch if versions differ |
| `react` + `react-dom` | `19.2.4` | Must be identical |
| `vite` | `7.3.1` | |
| `@vitejs/plugin-react` | `5.1.4` | Matches Vite 7 |
| `tailwindcss` | `4.2.0` | v4 — `@import "tailwindcss"` not `@tailwind base` |
| `@tailwindcss/vite` | `4.2.0` | v4 uses Vite plugin, no config file |
| `typescript` | `5.9.3` | |
| `lucide-react` | `0.575.0` | |
| `react-markdown` | `10.1.0` | |

### Version pinning rationale
A known npm issue exists where `npm audit fix --force` resolves a prismjs
vulnerability by downgrading `@copilotkit/react-ui` to `0.2.0` — a version
that predates the modern sidebar API and breaks all CopilotKit UI components.
All versions are pinned exactly (no `^` ranges) and `--legacy-peer-deps` is
used during install to avoid npm blocking on peer declaration mismatches.

---

## Chrome Extension Architecture (Manifest v3)

Three separate JS environments with strict boundaries:

```
┌─────────────────────────────────────────────────────────┐
│  SIDE PANEL  (Vite + React 19)                          │
│  sidepanel.html → sidepanel.js (built by Vite)          │
│                                                         │
│  <CopilotKit runtimeUrl="gateway/v1/clawg-ui">          │
│    useCopilotReadable(pageContext)   ← auto-injected     │
│    useCopilotReadable(platformInfo)  ← auto-injected     │
│    <CopilotChat />                  ← AG-UI streaming    │
│    useVoice()                       ← STT + TTS          │
│    <Header />                       ← voice + quick links│
│    <SettingsPanel />                ← config form        │
│                                           ↕              │
│              chrome.runtime.sendMessage                  │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│  BACKGROUND SERVICE WORKER  (background.js)             │
│                                                         │
│  - Config storage (chrome.storage.local)                │
│  - Page context cache (Map, per-tab)                    │
│  - Side panel lifecycle (chrome.sidePanel.open)         │
│  - Message router (GET/SET_CONFIG, PAGE_CONTEXT,        │
│    REFRESH_CONTEXT, OPEN_SIDE_PANEL, OPEN_URL)          │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│  CONTENT SCRIPT  (content.js + content.css)             │
│  Injected into every page (<all_urls>)                  │
│                                                         │
│  - Floating orb FAB (click → opens side panel)          │
│  - DOM scraper: TradingView-aware + generic fallback     │
│  - SPA navigation detection (MutationObserver)          │
│  - Pushes PAGE_CONTEXT to background on load/navigate   │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│  OPENCLAW GATEWAY  (external, on LAN)                   │
│  http://192.168.50.52:18789                             │
│                                                         │
│  /v1/clawg-ui  ← AG-UI SSE stream (existing)           │
│  /health       ← connection test                        │
└─────────────────────────────────────────────────────────┘
```

---

## File Structure

```
extension-v2/
├── dist/                        ← Load THIS folder in Chrome
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── content.css
│   ├── popup.html / popup.js
│   ├── sidepanel.html           ← React app entry (copied from index.html)
│   ├── sidepanel.js             ← Vite bundle (~2.2MB, lazy-chunked)
│   ├── sidepanel.css
│   ├── chunks/                  ← Code-split lazy chunks (syntax highlighting etc)
│   └── icons/
│
├── sidepanel/                   ← Vite + React source
│   ├── index.html
│   └── src/
│       ├── main.tsx             ← React 19 createRoot entry
│       ├── App.tsx              ← CopilotKit provider + CopilotChat
│       ├── index.css            ← Tailwind v4 + CSS vars + CopilotKit theme overrides
│       ├── types.ts             ← Shared types (PageContext, Config, TradingViewContext)
│       ├── hooks/
│       │   ├── useConfig.ts     ← chrome.storage.local wrapper
│       │   ├── usePageContext.ts ← context relay + XML string builder
│       │   └── useVoice.ts      ← Web Speech API (STT + TTS)
│       └── components/
│           ├── Header.tsx       ← Voice controls + context badge + quick-launch icons
│           └── SettingsPanel.tsx ← Gateway config + connection test
│
├── background.js                ← Service worker source
├── content.js                   ← Content script source
├── content.css                  ← Orb FAB styles
├── manifest.json                ← MV3 manifest
├── popup.html / popup.js        ← Toolbar popup
├── package.json                 ← Pinned deps
├── vite.config.ts               ← Vite 7 + Tailwind v4 plugin
├── tsconfig.json
└── .local-npm/                  ← Local Vite/TS install (system npm prefix workaround)
```

---

## Key Implementation Details

### Context Sharing (`usePageContext` + `useCopilotReadable`)

Page context flows: content script → background cache → side panel hook →
`useCopilotReadable` → injected into every LLM call automatically.

The context string is structured XML that the LLM can parse:

```xml
<page_context>
  url: https://www.tradingview.com/chart/...
  title: BTCUSDT — TradingView
  platform: TradingView
  instrument: BINANCE:BTCUSDT
  timeframe: 4H
  last_price: 97234
  indicators:
    - RSI (14)
    - Volume
    - EMA 200
</page_context>
```

On non-TradingView pages, falls back to title, hostname, h1, meta description,
and any selected text — so the agent has useful context on any website.

TradingView DOM scraping uses multiple selector strategies with fallbacks:
1. `[data-name="legend-series-item"]` → symbol from chart legend
2. `[data-name="symbol-search-button"]` → symbol search button text
3. URL pattern match → last resort

SPA navigation is detected via `MutationObserver` watching `document` for
child list changes, with a 1.5s debounce to let the TV DOM settle.

### Voice (`useVoice`)

- **STT**: Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`).
  Chrome's implementation is backed by Google's Whisper infrastructure.
  Single-shot mode (not continuous) to avoid runaway sessions.
- **TTS**: `SpeechSynthesisUtterance` with markdown stripping before speak
  (headers, bold, code blocks removed so prose reads cleanly).
- Voice transcripts are dispatched as a custom DOM event
  (`oc-voice-transcript`) to decouple the hook from CopilotKit's internal
  input state.
- Auto-TTS: `onResponseComplete` callback on `<CopilotChat>` triggers
  `voice.speak()` for each assistant message when enabled.

### CopilotKit Integration

```tsx
<CopilotKit
  runtimeUrl={`${config.gateway_url}/v1/clawg-ui`}
  headers={{ Authorization: `Bearer ${config.clawg_token}` }}
  showDevConsole={import.meta.env.DEV}
>
  {/* useCopilotReadable hooks fire here, injecting context into every call */}
  <CopilotChat
    instructions={systemPrompt}   // adapts between TV and generic mode
    onResponseComplete={...}      // triggers TTS if enabled
  />
</CopilotKit>
```

The `runtimeUrl` points directly at OpenClaw's existing AG-UI endpoint.
No changes required on the gateway side for v2 to work.

### Upgrade Path to Full CopilotRuntime (Path B)

When ready, add this route to the OpenClaw gateway:

```typescript
import { CopilotRuntime, RemoteAgentEndpoint } from '@copilotkit/runtime'

app.post('/api/copilotkit', async (req, res) => {
  const runtime = new CopilotRuntime({
    agents: [new RemoteAgentEndpoint({
      url: 'http://localhost:18789/v1/clawg-ui',
      headers: { Authorization: req.headers.authorization },
    })]
  })
  // ... handle
})
```

Then in `App.tsx`, change one line:
```tsx
// Before
runtimeUrl={`${config.gateway_url}/v1/clawg-ui`}
// After
runtimeUrl={`${config.gateway_url}/api/copilotkit`}
```

This unlocks `useCopilotAction` (agent calls frontend functions), suggestions,
and full HITL `renderAndWait` patterns with zero other code changes.

---

## Build System Notes

### The npm global prefix problem

The system npm installation has a global prefix (`/usr`) which causes
devDependencies to install globally rather than locally, resulting in an
empty `node_modules/.bin/`. Vite is not accessible via the normal
`./node_modules/.bin/vite` path.

**Workaround:** Vite and TypeScript are installed into `.local-npm/` using
`npm install --prefix .local-npm`, which respects local placement. Scripts
in `package.json` reference `.local-npm/node_modules/.bin/vite` directly
and set `NODE_PATH=.local-npm/node_modules` so the vite.config.ts module
resolution works.

This is a system-level quirk specific to this machine — on a normal npm
setup `npm run build` would just work.

### Build command (manual)
```bash
cd /home/tait/Projects/tools/tv-copilot/extension-v2
NODE_PATH=.local-npm/node_modules .local-npm/node_modules/.bin/vite build \
  && cp manifest.json background.js content.js content.css popup.html popup.js dist/ \
  && cp -r icons dist/ \
  && cp dist/index.html dist/sidepanel.html
```

Or just:
```bash
npm run build
```

---

## What Was Deliberately Left Out (and Why)

**Server-side rendering / Next.js**: Chrome extension side panels are static
HTML pages — SSR adds complexity with zero benefit. Vite + static output is
the right primitive here.

**webpack / CRXJS**: Both were considered. CRXJS handles MV3 complexity well
but adds a non-trivial abstraction layer. Given we only need one entry point
(the side panel), plain Vite with manual static file copying is simpler and
easier to debug.

**GraphQL**: CopilotKit v1.50 removed GraphQL in favour of direct HTTP/SSE.
No GraphQL layer needed.

**State management (Zustand/Redux)**: React's built-in `useState` is
sufficient for the extension's scope. The "global state" lives in
`chrome.storage.local` (config) and the background service worker's Map
(page context cache).

---

## What's Next

- [ ] Add `useCopilotAction` hooks for direct OpenClaw tool invocation
      (execute order, open canvas, trigger research run)
- [ ] Wire the voice transcript event to CopilotKit's textarea properly
      once CopilotKit exposes a stable `setInput` API
- [ ] Add CopilotRuntime wrapper to OpenClaw gateway (Path B upgrade)
- [ ] Replace placeholder icons with proper branded assets
- [ ] Add `vite-plugin-web-extension` or similar to automate the static
      file copying step in the build
- [ ] Consider code-splitting the CopilotKit bundle to reduce the 2.2MB
      initial `sidepanel.js` (most of the size is syntax highlighting
      grammars from `react-syntax-highlighter` via CopilotKit)

---

*Written by Claude (Anthropic) as part of the development session —
February 19, 2026*
