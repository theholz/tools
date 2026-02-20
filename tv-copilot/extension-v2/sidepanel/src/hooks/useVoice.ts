import { useState, useEffect, useRef, useCallback } from 'react'
import { Config } from '../types'

interface UseVoiceOptions {
  config: Config
  onTranscript: (text: string) => void
}

export interface VoiceState {
  isRecording: boolean
  isSpeaking: boolean
  sttSupported: boolean
  ttsSupported: boolean
  startRecording: () => void
  stopRecording: () => void
  speak: (text: string) => void
  stopSpeaking: () => void
  toggleRecording: () => void
}

// Strip markdown so it doesn't get read aloud
function cleanForTts(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/---+/g, '')
    .trim()
}

export function useVoice({ config, onTranscript }: UseVoiceOptions): VoiceState {
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const sttSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  // TTS: prefer proxy if configured, fall back to browser speechSynthesis
  const ttsSupported = Boolean(config.tts_proxy_url) || 'speechSynthesis' in window

  // ── STT ────────────────────────────────────────────────────────────────

  const startRecording = useCallback(() => {
    if (!sttSupported || isRecording) return
    const SR = (window.SpeechRecognition || window.webkitSpeechRecognition) as typeof SpeechRecognition
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'en-US'
    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('').trim()
      if (t) onTranscript(t)
    }
    rec.onend = () => setIsRecording(false)
    rec.onerror = () => setIsRecording(false)
    recognitionRef.current = rec
    rec.start()
    setIsRecording(true)
  }, [sttSupported, isRecording, onTranscript])

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }, [])

  const toggleRecording = useCallback(() => {
    isRecording ? stopRecording() : startRecording()
  }, [isRecording, startRecording, stopRecording])

  // ── TTS — ElevenLabs proxy ─────────────────────────────────────────────

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  const speakViaProxy = useCallback(async (text: string) => {
    const proxyUrl = config.tts_proxy_url?.replace(/\/$/, '')
    if (!proxyUrl) return false
    try {
      const res = await fetch(`${proxyUrl}/v1/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.clawg_token ? { Authorization: `Bearer ${config.clawg_token}` } : {}),
        },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        console.warn('[useVoice] TTS proxy error:', res.status)
        return false
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      // Clean up previous playback
      stopSpeaking()
      objectUrlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onplay = () => setIsSpeaking(true)
      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(url)
        objectUrlRef.current = null
        audioRef.current = null
      }
      audio.onerror = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(url)
        objectUrlRef.current = null
        audioRef.current = null
      }
      await audio.play()
      return true
    } catch (err) {
      console.warn('[useVoice] TTS proxy fetch failed:', err)
      return false
    }
  }, [config.tts_proxy_url, config.clawg_token, stopSpeaking])

  const speakViaBrowser = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = config.tts_rate
    utt.pitch = config.tts_pitch
    utt.onstart = () => setIsSpeaking(true)
    utt.onend = () => setIsSpeaking(false)
    utt.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utt)
  }, [config.tts_rate, config.tts_pitch])

  const speak = useCallback((text: string) => {
    const clean = cleanForTts(text)
    if (!clean) return
    // Try proxy first; fall back to browser TTS if proxy fails or not configured
    if (config.tts_proxy_url) {
      speakViaProxy(clean).then(ok => {
        if (!ok) speakViaBrowser(clean)
      })
    } else {
      speakViaBrowser(clean)
    }
  }, [config.tts_proxy_url, speakViaProxy, speakViaBrowser])

  // Cleanup on unmount
  useEffect(() => () => {
    recognitionRef.current?.stop()
    stopSpeaking()
  }, [stopSpeaking])

  return { isRecording, isSpeaking, sttSupported, ttsSupported,
    startRecording, stopRecording, speak, stopSpeaking, toggleRecording }
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
