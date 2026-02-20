import { useState, useCallback, useEffect } from 'react'
import { CopilotKit, useCopilotReadable, useCopilotChat } from '@copilotkit/react-core'
import { CopilotChat } from '@copilotkit/react-ui'
import { TextMessage, MessageRole } from '@copilotkit/runtime-client-gql'
import { useConfig } from './hooks/useConfig'
import { usePageContext } from './hooks/usePageContext'
import { useVoice } from './hooks/useVoice'
import { Header } from './components/Header'
import { SettingsPanel } from './components/SettingsPanel'
import { PageContext } from './types'

// ── Inner app (inside CopilotKit context) ─────────────────────────────────
function CopilotApp({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { config, saveConfig } = useConfig()
  const { context, contextString, refresh } = usePageContext()
  const [autoTts, setAutoTts] = useState(config.auto_tts)

  useEffect(() => setAutoTts(config.auto_tts), [config.auto_tts])

  const { appendMessage } = useCopilotChat()

  useCopilotReadable({
    description: 'The current page the user is viewing, including chart data if on TradingView',
    value: contextString ?? 'No page context available yet.',
  })

  useCopilotReadable({
    description: 'OpenClaw platform connection info',
    value: JSON.stringify({ gateway: config.gateway_url, openclaw_ui: config.openclaw_ui, has_token: !!config.clawg_token }),
  })

  const handleTranscript = useCallback(async (text: string) => {
    if (!text.trim()) return
    try {
      await appendMessage(new TextMessage({ role: MessageRole.User, content: text }))
    } catch (err) {
      console.warn('[CopilotApp] voice transcript send failed:', err)
      // DOM fallback
      const textarea = document.querySelector<HTMLTextAreaElement>(
        'textarea[placeholder], .copilotKitInput textarea'
      )
      const submitBtn = document.querySelector<HTMLElement>(
        'button[type="submit"], .copilotKitSendButton'
      )
      if (textarea) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
        setter?.call(textarea, text)
        textarea.dispatchEvent(new Event('input', { bubbles: true }))
        textarea.dispatchEvent(new Event('change', { bubbles: true }))
        setTimeout(() => submitBtn ? submitBtn.click() :
          textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })), 50)
      }
    }
  }, [appendMessage])

  const voice = useVoice({ config, onTranscript: handleTranscript })

  const sendQuickAction = useCallback(async (prompt: string) => {
    try {
      await appendMessage(new TextMessage({ role: MessageRole.User, content: prompt }))
    } catch (err) {
      console.warn('[CopilotApp] quick action error:', err)
    }
  }, [appendMessage])

  const tvActions = context?.isTradingView ? [
    'What\'s the current market structure?',
    'Analyze my indicator signals.',
    'What are the key levels to watch?',
    'Give me a trade thesis.',
  ] : [
    'Summarize this page.',
    'What are the key points here?',
    'Explain the selected text.',
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
      <Header
        context={context} voice={voice} config={config}
        onRefreshContext={refresh} onOpenSettings={onOpenSettings}
        autoTts={autoTts} onToggleAutoTts={() => { const n = !autoTts; setAutoTts(n); saveConfig({ auto_tts: n }) }}
      />

      <div style={{ display: 'flex', gap: 6, padding: '8px 12px', overflowX: 'auto', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        {tvActions.map(p => (
          <button key={p} onClick={() => sendQuickAction(p)}
            style={{ whiteSpace: 'nowrap', fontSize: 11, padding: '3px 10px', borderRadius: 99, background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-muted)', cursor: 'pointer', flexShrink: 0 }}>
            {p.length > 30 ? p.slice(0, 30) + '…' : p}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <CopilotChat
          className="h-full"
          instructions={buildSystemPrompt(context)}
          labels={{
            title: 'OpenClaw Copilot',
            initial: context?.isTradingView
              ? `👋 I can see you're on **${context.tradingView?.symbol ?? 'a chart'}** (${context.tradingView?.timeframe ?? '?'}). Ask me anything about it.`
              : '👋 Ask me anything. I have your current page context.',
            placeholder: context?.isTradingView
              ? `Ask about ${context.tradingView?.symbol ?? 'this chart'}…`
              : 'Ask anything about this page…',
          }}
          onResponseComplete={(msg) => {
            if (autoTts && msg.content) voice.speak(msg.content)
          }}
        />
      </div>
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────
export default function App() {
  const { config, saveConfig, loaded } = useConfig()
  const [showSettings, setShowSettings] = useState(false)

  if (!loaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--color-bg)', color: 'var(--color-muted)', fontSize: 13 }}>
        Loading…
      </div>
    )
  }

  // Settings panel renders outside CopilotKit — no provider needed
  if (showSettings || !config.clawg_token) {
    return (
      <SettingsPanel
        config={config}
        onSave={saveConfig}
        onClose={() => setShowSettings(false)}
      />
    )
  }

  // Only mount CopilotKit when we have a real runtimeUrl.
  // /v1/copilotkit is on the tts-proxy service — bridges CopilotKit AG-UI ↔ OpenClaw /v1/responses
  const proxyBase = config.tts_proxy_url?.replace(/\/$/, "") || `${config.gateway_url.replace(/:\d+$/, "")}:8086`
  return (
    <CopilotKit
      runtimeUrl={`${proxyBase}/v1/copilotkit`}
      headers={{ Authorization: `Bearer ${config.clawg_token}` }}
      showDevConsole={import.meta.env.DEV}
    >
      <CopilotApp onOpenSettings={() => setShowSettings(true)} />
    </CopilotKit>
  )
}

function buildSystemPrompt(context: PageContext | null): string {
  const base = `You are OpenClaw Copilot, an AI assistant with access to OpenClaw tools. Be concise and actionable.`
  if (context?.isTradingView) {
    return `${base}\n\nThe user is on TradingView viewing ${context.tradingView?.symbol ?? 'a chart'} on the ${context.tradingView?.timeframe ?? '?'} timeframe. Focus on technical analysis, key levels, indicator signals, and trade thesis building.`
  }
  return `${base}\n\nThe user is browsing ${context?.generic.hostname ?? 'a web page'}. Help them understand the page content, do research, or use OpenClaw tools.`
}
