import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  loadWatchlist, addToWatchlist, removeFromWatchlist,
  setPriceAlert, checkPriceAlerts, type Watchlist,
} from '../../logic/watchlist'
import type { TickerMap, CoinData } from '../../types'
import { notifySignal } from '../../logic/notifications'

interface Props {
  open: boolean
  onClose: () => void
  tickers: TickerMap
  coinData: Record<string, CoinData>
  onToggleWatch: (symbol: string) => void
}

export default function WatchlistPanel({ open, onClose, tickers, coinData, onToggleWatch: _onToggleWatch }: Props) {
  const [list, setList] = useState<Watchlist>(loadWatchlist)
  const [alertInput, setAlertInput] = useState<string | null>(null)
  const [alertValue, setAlertValue] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const alertedRef = useRef(new Set<string>())

  // 价格提醒检测
  useEffect(() => {
    if (!open) return
    const triggered = checkPriceAlerts(tickers)
    for (const t of triggered) {
      const key = `${t.symbol}:${t.targetPrice}`
      if (!alertedRef.current.has(key)) {
        alertedRef.current.add(key)
        notifySignal('price-alert', `${t.coin} 接近目标价 $${t.targetPrice.toFixed(2)}（当前 $${t.currentPrice.toFixed(2)}）`)
      }
    }
  }, [tickers, open])

  // Esc 关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // 点击面板外关闭（仅当直接点击背景层时）
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  const handleRemove = useCallback((symbol: string) => {
    const next = removeFromWatchlist(symbol)
    setList(next)
  }, [])

  const handleSetAlert = useCallback((symbol: string) => {
    const price = parseFloat(alertValue)
    if (isNaN(price) || price <= 0) return
    const next = setPriceAlert(symbol, price)
    setList(next)
    setAlertInput(null)
    setAlertValue('')
  }, [alertValue])

  // 实时同步（其他卡片添加/移除时）
  useEffect(() => {
    const sync = () => setList(loadWatchlist())
    const interval = setInterval(sync, 2000)
    return () => clearInterval(interval)
  }, [])

  const enrichedItems = useMemo(() => {
    return list.map(item => {
      const tk = tickers[item.symbol]
      const cd = coinData[item.symbol]
      return {
        ...item,
        price: tk?.price ?? 0,
        pxChg: tk?.priceChangePercent ?? cd?.pxChg ?? 0,
        vol24h: tk?.quoteVolume ?? 0,
        frPct: cd?.frPct ?? 0,
      }
    })
  }, [list, tickers, coinData])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-end"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="自选观察列表"
    >
      <div
        ref={panelRef}
        className="watchlist-panel relative flex flex-col"
        style={{
          width: 340,
          maxHeight: 'calc(100dvh - 80px)',
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-card)',
          borderTop: '1px solid var(--border-card)',
          borderBottom: '1px solid var(--border-card)',
          borderRadius: '12px 0 0 12px',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* 头部 */}
        <div
          className="flex items-center justify-between px-3 py-2.5 select-none"
          style={{ borderBottom: '1px solid var(--border-card)' }}
        >
          <div className="flex items-center gap-2">
            <span>⭐</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              自选观察
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--border-card)', color: 'var(--text-muted)' }}>
              {list.length}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭自选列表"
            className="text-xs px-1.5 py-0.5 rounded cursor-pointer"
            style={{ color: 'var(--text-muted)', background: 'var(--border-card)' }}
          >
            ✕
          </button>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {enrichedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <span className="text-2xl">📌</span>
              <div className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                点击卡片行的 ⭐ 图标<br />添加自选币种
              </div>
            </div>
          ) : (
            enrichedItems.map(item => (
              <div
                key={item.symbol}
                className="rounded p-2 table-row"
                style={{ border: '1px solid var(--border-card)' }}
              >
                {/* 第一行：币种 + 价格 + 操作 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>
                      {item.coin}
                    </span>
                    {item.price > 0 && (
                      <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                        ${item.price < 1 ? item.price.toFixed(4) : item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    )}
                    {item.pxChg !== 0 && (
                      <span className="text-[10px]" style={{ color: item.pxChg >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {item.pxChg >= 0 ? '+' : ''}{item.pxChg.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setAlertInput(alertInput === item.symbol ? null : item.symbol)
                        setAlertValue('')
                      }}
                      aria-label="设置价格提醒"
                      className="text-[10px] px-1 py-0.5 rounded cursor-pointer"
                      style={{
                        background: item.priceAlert ? 'rgba(245,158,11,0.15)' : 'var(--border-card)',
                        color: item.priceAlert ? 'var(--amber)' : 'var(--text-muted)',
                      }}
                      title={item.priceAlert ? `目标价 $${item.priceAlert.toFixed(2)}` : '设置价格提醒'}
                    >
                      🔔
                    </button>
                    <button
                      onClick={() => handleRemove(item.symbol)}
                      aria-label={`移除 ${item.coin}`}
                      className="text-[10px] px-1 py-0.5 rounded cursor-pointer"
                      style={{ color: 'var(--red)', background: 'var(--border-card)' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* 价格提醒设置 */}
                {alertInput === item.symbol && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <input
                      type="number"
                      value={alertValue}
                      onChange={e => setAlertValue(e.target.value)}
                      placeholder={`目标价（当前 $${item.price.toFixed(2)}）`}
                      className="flex-1 text-[10px] px-2 py-1 rounded outline-none"
                      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-card)' }}
                      onKeyDown={e => { if (e.key === 'Enter') handleSetAlert(item.symbol) }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleSetAlert(item.symbol)}
                      className="text-[10px] px-2 py-1 rounded cursor-pointer"
                      style={{ background: 'var(--accent)', color: 'white' }}
                    >
                      确定
                    </button>
                  </div>
                )}

                {/* 已设提醒 */}
                {item.priceAlert && alertInput !== item.symbol && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px]" style={{ color: 'var(--amber)' }}>
                      🔔 目标 ${item.priceAlert.toFixed(2)}
                    </span>
                    {item.price > 0 && (
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        (距目标 {((item.priceAlert - item.price) / item.price * 100).toFixed(1)}%)
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// 星标按钮 — 嵌入各卡片行
export function WatchStar({ symbol, onToggle }: { symbol: string; onToggle: (s: string) => void }) {
  const [watched, setWatched] = useState(() => {
    try { return loadWatchlist().some(i => i.symbol === symbol) } catch { return false }
  })

  // 定期同步
  useEffect(() => {
    const timer = setInterval(() => {
      try { setWatched(loadWatchlist().some(i => i.symbol === symbol)) } catch { /* ignore */ }
    }, 3000)
    return () => clearInterval(timer)
  }, [symbol])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (watched) {
      removeFromWatchlist(symbol)
      setWatched(false)
    } else {
      addToWatchlist(symbol)
      setWatched(true)
    }
    onToggle(symbol)
  }, [symbol, watched, onToggle])

  return (
    <button
      onClick={handleClick}
      aria-label={watched ? `移除 ${symbol.replace('USDT', '')} 自选` : `添加 ${symbol.replace('USDT', '')} 自选`}
      className="watch-star text-xs px-0.5 cursor-pointer"
      style={{ color: watched ? 'var(--amber)' : 'var(--text-muted)', opacity: watched ? 1 : 0.4 }}
      title={watched ? '移除自选' : '添加自选'}
    >
      {watched ? '⭐' : '☆'}
    </button>
  )
}
