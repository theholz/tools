import { useState, useEffect, useCallback } from 'react'
import { PageContext } from '../types'

export function usePageContext() {
  const [context, setContext] = useState<PageContext | null>(null)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_PAGE_CONTEXT' }, (res: { context: PageContext | null }) => {
      if (res?.context) setContext(res.context)
    })
  }, [])

  useEffect(() => {
    const listener = (msg: { type: string; context: PageContext }) => {
      if (msg.type === 'PAGE_CONTEXT_UPDATE') setContext(msg.context)
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  const refresh = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'REFRESH_CONTEXT' }, (res: { context: PageContext | null }) => {
      if (res?.context) setContext(res.context)
    })
  }, [])

  const contextString = context ? buildContextString(context) : null
  return { context, contextString, refresh }
}

function buildContextString(ctx: PageContext): string {
  const lines: string[] = ['<page_context>']
  lines.push(`  url: ${ctx.generic.url}`)
  lines.push(`  title: ${ctx.generic.title}`)
  if (ctx.generic.h1) lines.push(`  heading: ${ctx.generic.h1}`)
  if (ctx.generic.metaDescription) lines.push(`  description: ${ctx.generic.metaDescription}`)

  if (ctx.isTradingView && ctx.tradingView) {
    const tv = ctx.tradingView
    lines.push(`  platform: TradingView`)
    if (tv.exchange && tv.symbol) lines.push(`  instrument: ${tv.exchange}:${tv.symbol}`)
    else if (tv.symbol) lines.push(`  symbol: ${tv.symbol}`)
    if (tv.timeframe) lines.push(`  timeframe: ${tv.timeframe}`)
    if (tv.price) lines.push(`  last_price: ${tv.price}`)
    if (tv.indicators?.length) {
      lines.push(`  indicators:`)
      tv.indicators.forEach(i => lines.push(`    - ${i}`))
    }
  }

  if (ctx.generic.selectedText) {
    lines.push(`  selected_text: "${ctx.generic.selectedText.slice(0, 500)}"`)
  }
  lines.push('</page_context>')
  return lines.join('\n')
}
