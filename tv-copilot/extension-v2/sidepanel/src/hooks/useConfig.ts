import { useState, useEffect, useCallback } from 'react'
import { Config, DEFAULT_CONFIG } from '../types'

export function useConfig() {
  const [config, setConfigState] = useState<Config>(DEFAULT_CONFIG)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_CONFIG' }, (cfg: Partial<Config>) => {
      if (cfg) setConfigState({ ...DEFAULT_CONFIG, ...cfg })
      setLoaded(true)
    })
  }, [])

  const saveConfig = useCallback((updates: Partial<Config>) => {
    const next = { ...config, ...updates }
    setConfigState(next)
    chrome.runtime.sendMessage({ type: 'SET_CONFIG', data: updates })
  }, [config])

  return { config, saveConfig, loaded }
}
