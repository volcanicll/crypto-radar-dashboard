import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { CoinData } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  coinData: Record<string, CoinData>
  onSelectSymbol: (symbol: string) => void
  // 用于判断币种出现在哪些卡片中
  poolSymbols: Set<string>
  oiSymbols: Set<string>
  ambushSymbols: Set<string>
  squeezeSymbols: Set<string>
  narrativeSymbols: Set<string>
}

interface SearchResult {
  symbol: string
  coin: string
  coinData: CoinData | undefined
  cards: string[]
  score: number
}

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (t.includes(q)) return true
  let qi = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++
  }
  return qi === q.length
}

function getCardsForSymbol(
  symbol: string,
  poolSymbols: Set<string>,
  oiSymbols: Set<string>,
  ambushSymbols: Set<string>,
  squeezeSymbols: Set<string>,
  narrativeSymbols: Set<string>,
): string[] {
  const cards: string[] = []
  if (poolSymbols.has(symbol)) cards.push('收筹')
  if (oiSymbols.has(symbol)) cards.push('OI')
  if (ambushSymbols.has(symbol)) cards.push('埋伏')
  if (squeezeSymbols.has(symbol)) cards.push('Squeeze')
  if (narrativeSymbols.has(symbol)) cards.push('叙事')
  return cards
}

export default function SearchPalette({
  open, onClose, coinData, onSelectSymbol,
  poolSymbols, oiSymbols, ambushSymbols, squeezeSymbols, narrativeSymbols,
}: Props) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // 收集所有可搜索的 symbol
  const allSymbols = useMemo(() => {
    const set = new Set<string>()
    for (const s of Object.keys(coinData)) set.add(s)
    for (const s of poolSymbols) set.add(s)
    for (const s of oiSymbols) set.add(s)
    for (const s of ambushSymbols) set.add(s)
    for (const s of squeezeSymbols) set.add(s)
    for (const s of narrativeSymbols) set.add(s)
    return [...set]
  }, [coinData, poolSymbols, oiSymbols, ambushSymbols, squeezeSymbols, narrativeSymbols])

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return []
    const q = query.trim()
    const mapped = allSymbols
      .map(symbol => {
        const coin = symbol.replace('USDT', '')
        const d = coinData[symbol]
        if (!fuzzyMatch(q, coin) && !fuzzyMatch(q, symbol)) return null
        const cards = getCardsForSymbol(symbol, poolSymbols, oiSymbols, ambushSymbols, squeezeSymbols, narrativeSymbols)
        // 评分：精确匹配 > 开头匹配 > 模糊匹配，卡片多排序靠前
        let score = cards.length
        if (coin.toLowerCase() === q.toLowerCase()) score += 100
        else if (coin.toLowerCase().startsWith(q.toLowerCase())) score += 50
        return { symbol, coin, coinData: d, cards, score } as SearchResult
      })
    return mapped
      .filter((r): r is SearchResult => r !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
  }, [query, allSymbols, coinData, poolSymbols, oiSymbols, ambushSymbols, squeezeSymbols, narrativeSymbols])

  const handleClose = useCallback(() => {
    setQuery('')
    onClose()
  }, [onClose])

  const handleSelect = useCallback((symbol: string) => {
    onSelectSymbol(symbol)
    handleClose()
  }, [handleClose, onSelectSymbol])

  const quickSymbols = useMemo(() => {
    const weighted = allSymbols
      .map(symbol => ({
        symbol,
        coin: symbol.replace('USDT', ''),
        cards: getCardsForSymbol(symbol, poolSymbols, oiSymbols, ambushSymbols, squeezeSymbols, narrativeSymbols),
        pxChg: coinData[symbol]?.pxChg ?? 0,
      }))
      .sort((a, b) => b.cards.length - a.cards.length || Math.abs(b.pxChg) - Math.abs(a.pxChg))
      .slice(0, 8)
    return weighted
  }, [allSymbols, coinData, poolSymbols, oiSymbols, ambushSymbols, squeezeSymbols, narrativeSymbols])

  // ESC 关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, handleClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" role="dialog" aria-modal="true" aria-label="搜索币种">
      {/* 遮罩 */}
      <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={handleClose} />
      {/* 搜索面板 */}
      <div
        className="relative w-full max-w-lg rounded-lg overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}
      >
        {/* 搜索输入 */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-card)' }}>
          <span style={{ color: 'var(--text-muted)' }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="搜索币种"
            placeholder="搜索币种 (如 BTC, ETH...)"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: 'var(--border-card)', color: 'var(--text-muted)' }}
          >
            ESC
          </kbd>
        </div>

        {/* 结果列表 */}
        <div className="max-h-80 overflow-auto">
          {query.trim() && results.length === 0 && (
            <div className="flex items-center justify-center h-20 text-xs" style={{ color: 'var(--text-muted)' }}>
              未找到匹配币种
            </div>
          )}
          {!query.trim() && (
            <div className="p-4">
              <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                热门信号
              </div>
              <div className="flex flex-wrap gap-2">
                {quickSymbols.map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => handleSelect(s.symbol)}
                    className="text-xs px-2 py-1 rounded cursor-pointer"
                    style={{ background: 'var(--border-card)', color: 'var(--text-secondary)' }}
                  >
                    {s.coin}
                  </button>
                ))}
                {quickSymbols.length === 0 && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>等待数据加载后可快速跳转</span>
                )}
              </div>
            </div>
          )}
          {results.map(r => (
            <button
              key={r.symbol}
              onClick={() => handleSelect(r.symbol)}
              aria-label={`打开 ${r.coin} 详情`}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left table-row cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm" style={{ color: 'var(--accent)' }}>{r.coin}</span>
                {r.coinData && (
                  <span className="text-xs" style={{ color: r.coinData.pxChg >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {r.coinData.pxChg >= 0 ? '+' : ''}{r.coinData.pxChg.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {r.cards.map(card => (
                  <span
                    key={card}
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(6,182,212,0.15)', color: 'var(--accent)' }}
                  >
                    {card}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
