import { Mic, MicOff, Volume2, VolumeX, RefreshCw, Settings, ExternalLink, FlaskConical, BookOpen, LayoutDashboard } from 'lucide-react'
import { PageContext, Config } from '../types'
import { VoiceState } from '../hooks/useVoice'

interface HeaderProps {
  context: PageContext | null
  voice: VoiceState
  config: Config
  onRefreshContext: () => void
  onOpenSettings: () => void
  autoTts: boolean
  onToggleAutoTts: () => void
}

export function Header({ context, voice, config, onRefreshContext, onOpenSettings, autoTts, onToggleAutoTts }: HeaderProps) {
  const tv = context?.tradingView
  const hasTv = context?.isTradingView && tv?.symbol

  const quickLinks = [
    { icon: LayoutDashboard, label: 'OpenClaw UI',   url: config.openclaw_ui },
    { icon: FlaskConical,    label: 'Canvas',         url: `${config.openclaw_ui}/canvas` },
    { icon: BookOpen,        label: 'Research',       url: `${config.openclaw_ui}/research` },
  ]

  return (
    <div style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
      {/* Row 1: title + badge + controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', minHeight: 44 }}>
        <span style={{ fontSize: 18 }}>🤖</span>
        <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>OpenClaw Copilot</span>

        {hasTv ? (
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(41,98,255,0.15)', color: 'var(--color-accent)' }}>
            {tv!.symbol} · {tv!.timeframe ?? '—'}
          </span>
        ) : context ? (
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(120,123,134,0.15)', color: 'var(--color-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={context.generic.hostname}>
            {context.generic.hostname}
          </span>
        ) : null}

        <button onClick={onRefreshContext} title="Refresh context" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: 4 }}>
          <RefreshCw size={13} />
        </button>
        <button onClick={onOpenSettings} title="Settings" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: 4 }}>
          <Settings size={14} />
        </button>
      </div>

      {/* Row 2: voice + quick links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 12px 8px', borderTop: '1px solid var(--color-border)' }}>
        <button onClick={voice.toggleRecording} disabled={!voice.sttSupported}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 500, cursor: 'pointer',
            background: voice.isRecording ? 'rgba(239,83,80,0.15)' : 'var(--color-surface-2)',
            color: voice.isRecording ? 'var(--color-red)' : 'var(--color-muted)',
            border: `1px solid ${voice.isRecording ? 'var(--color-red)' : 'var(--color-border)'}`,
          }}>
          {voice.isRecording ? <MicOff size={12} /> : <Mic size={12} />}
          {voice.isRecording && <span>Stop</span>}
        </button>

        <button onClick={voice.isSpeaking ? voice.stopSpeaking : onToggleAutoTts} disabled={!voice.ttsSupported}
          title={autoTts ? 'Auto-read ON' : 'Auto-read OFF'}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 99, fontSize: 11, cursor: 'pointer',
            background: autoTts ? 'rgba(38,166,154,0.15)' : 'var(--color-surface-2)',
            color: autoTts ? 'var(--color-green)' : 'var(--color-muted)',
            border: `1px solid ${autoTts ? 'var(--color-green)' : 'var(--color-border)'}`,
          }}>
          {voice.isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>

        <div style={{ width: 1, height: 16, background: 'var(--color-border)', margin: '0 4px' }} />

        {quickLinks.map(({ icon: Icon, label, url }) => (
          <button key={label} onClick={() => chrome.runtime.sendMessage({ type: 'OPEN_URL', url })} title={label}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: 4 }}>
            <Icon size={13} />
          </button>
        ))}
        <button onClick={() => chrome.runtime.sendMessage({ type: 'OPEN_OPENCLAW' })} title="Open OpenClaw"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: 4 }}>
          <ExternalLink size={13} />
        </button>
      </div>
    </div>
  )
}
