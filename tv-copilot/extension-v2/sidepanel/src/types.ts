export interface TradingViewContext {
  symbol: string | null
  exchange: string | null
  timeframe: string | null
  indicators: string[]
  chartType?: string
  price?: number | null
  source: 'dom' | 'api'
}

export interface GenericPageContext {
  title: string
  url: string
  hostname: string
  selectedText?: string | null
  metaDescription?: string | null
  h1?: string | null
}

export interface PageContext {
  isTradingView: boolean
  generic: GenericPageContext
  tradingView?: TradingViewContext
  timestamp: number
}

export interface Config {
  gateway_url: string
  clawg_token: string
  tts_proxy_url: string
  tv_api_url: string
  openclaw_ui: string
  auto_tts: boolean
  tts_rate: number
  tts_pitch: number
}

export const DEFAULT_CONFIG: Config = {
  gateway_url: 'http://192.168.50.52:18789',
  clawg_token: '',
  tts_proxy_url: 'http://192.168.50.52:8086',
  tv_api_url:  'http://192.168.50.52:8084',
  openclaw_ui: 'http://192.168.50.52:8080',
  auto_tts: false,
  tts_rate: 1.0,
  tts_pitch: 1.0,
}
