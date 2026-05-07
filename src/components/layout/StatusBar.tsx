import { memo, useEffect, useState } from 'react'
import type { MarketOverview } from '../../types'

interface Props {
  data: MarketOverview | undefined
  onSearchOpen?: () => void
  onWatchlistOpen?: () => void
}

function StatusBar({ data, onSearchOpen, onWatchlistOpen }: Props) {
  const [countdown, setCountdown] = useState(60)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 60 : prev - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <header
      className="flex items-center justify-between gap-4 px-4 py-3 select-none max-[820px]:flex-wrap"
      style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-card)',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">🛰️</span>
        <div>
          <div className="font-bold text-base leading-tight" style={{ color: 'var(--accent)' }}>
            On-Chain Narrative Radar
          </div>
          <div className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>
            链上叙事 · 合约收筹 · OI异动
          </div>
        </div>
      </div>

      <nav aria-label="市场总览" className="flex items-center gap-5 text-xs overflow-auto" style={{ color: 'var(--text-secondary)' }}>
        {data && (
          <>
            <span>BTC <b style={{ color: 'var(--text-primary)' }}>${data.btcPrice?.toLocaleString()}</b></span>
            <span>ETH <b style={{ color: 'var(--text-primary)' }}>${data.ethPrice?.toLocaleString()}</b></span>
            <span>合约 <b style={{ color: 'var(--text-primary)' }}>{data.totalSymbols}</b></span>
            <span>标的池 <b style={{ color: 'var(--amber)' }}>{data.poolCount}</b></span>
            <span>均费率 <b style={{ color: data.avgFundingRate < 0 ? 'var(--red)' : 'var(--green)' }}>
              {(data.avgFundingRate * 100).toFixed(4)}%
            </b></span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        {data && <span>{data.lastScanTime}</span>}
        <span>
          刷新 <b style={{ color: 'var(--accent)' }}>{countdown}s</b>
        </span>
        <button
          onClick={onSearchOpen}
          aria-label="打开搜索"
          className="text-xs px-1.5 py-0.5 rounded cursor-pointer"
          style={{ color: 'var(--text-muted)', background: 'var(--border-card)' }}
          title="搜索 (⌘K)"
        >
          🔍
        </button>
        <button
          onClick={onWatchlistOpen}
          aria-label="打开自选列表"
          className="text-xs px-1.5 py-0.5 rounded cursor-pointer"
          style={{ color: 'var(--text-muted)', background: 'var(--border-card)' }}
          title="自选列表 (⌘W)"
        >
          ⭐
        </button>
        <button
          onClick={() => { localStorage.removeItem('dashboard-layout'); location.reload() }}
          aria-label="重置布局"
          className="text-xs px-1.5 py-0.5 rounded cursor-pointer"
          style={{ color: 'var(--text-muted)', background: 'var(--border-card)' }}
          title="Reset layout"
        >
          ↺
        </button>
      </div>
    </header>
  )
}

export default memo(StatusBar)
