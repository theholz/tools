import { useState } from 'react'
import { X, Save, CheckCircle, XCircle } from 'lucide-react'
import { Config } from '../types'

interface Props { config: Config; onSave: (u: Partial<Config>) => void; onClose: () => void }

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace',
  outline: 'none', background: 'var(--color-surface-2)',
  border: '1px solid var(--color-border)', color: 'var(--color-text)',
}
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, marginBottom: 4, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--color-muted)',
}

export function SettingsPanel({ config, onSave, onClose }: Props) {
  const [form, setForm] = useState({ ...config })
  const [status, setStatus] = useState<'idle'|'testing'|'ok'|'err'>('idle')
  const [msg, setMsg] = useState('')
  const set = (k: keyof Config, v: string | boolean | number) => setForm(f => ({ ...f, [k]: v }))

  async function testConn() {
    setStatus('testing'); setMsg('Testing…')
    try {
      const r = await fetch(`${form.gateway_url}/health`, { signal: AbortSignal.timeout(4000) })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setStatus('ok'); setMsg('Connected ✓')
    } catch (e) {
      setStatus('err'); setMsg(`Failed: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Settings</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}><X size={16} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {([
          ['Gateway URL', 'gateway_url', 'text', 'http://192.168.50.52:18789'],
          ['Device Token', 'clawg_token', 'password', 'Bearer token…'],
          ['TTS Proxy URL', 'tts_proxy_url', 'text', 'http://192.168.50.52:8086'],
          ['TradingView API URL', 'tv_api_url', 'text', 'http://192.168.50.52:8084'],
          ['OpenClaw UI URL', 'openclaw_ui', 'text', 'http://192.168.50.52:8080'],
        ] as const).map(([label, key, type, ph]) => (
          <div key={key}>
            <label style={lbl}>{label}</label>
            <input type={type} value={form[key] as string} placeholder={ph} style={inp}
              onChange={e => set(key, e.target.value)} />
          </div>
        ))}

        <div>
          <label style={lbl}>Voice / TTS</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.auto_tts} onChange={e => set('auto_tts', e.target.checked)} />
            Auto-read assistant responses
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, fontSize: 11, color: 'var(--color-muted)' }}>
            Speech rate: {form.tts_rate.toFixed(1)}×
            <input type="range" min="0.5" max="2" step="0.1" value={form.tts_rate}
              onChange={e => set('tts_rate', parseFloat(e.target.value))}
              style={{ accentColor: 'var(--color-accent)' }} />
          </label>
        </div>

        <button onClick={testConn} disabled={status === 'testing'}
          style={{ padding: '8px 0', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          {status === 'testing' ? 'Testing…' : 'Test Connection'}
        </button>

        {status !== 'idle' && status !== 'testing' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 6, fontSize: 12,
            background: status === 'ok' ? 'rgba(38,166,154,0.1)' : 'rgba(239,83,80,0.1)',
            color: status === 'ok' ? 'var(--color-green)' : 'var(--color-red)' }}>
            {status === 'ok' ? <CheckCircle size={13} /> : <XCircle size={13} />} {msg}
          </div>
        )}
      </div>

      <div style={{ padding: 14, borderTop: '1px solid var(--color-border)' }}>
        <button onClick={() => { onSave(form); onClose() }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', background: 'var(--color-accent)', border: 'none', color: 'white' }}>
          <Save size={14} /> Save Settings
        </button>
      </div>
    </div>
  )
}
