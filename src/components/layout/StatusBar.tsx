import type { MarketOverview } from '../../types'

interface Props {
  data: MarketOverview | undefined
  countdown: number
}

export default function StatusBar({ data, countdown }: Props) {
  return (
    <div
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

      <div className="flex items-center gap-5 text-xs overflow-auto" style={{ color: 'var(--text-secondary)' }}>
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
      </div>

      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        {data && <span>{data.lastScanTime}</span>}
        <span>
          刷新 <b style={{ color: 'var(--accent)' }}>{countdown}s</b>
        </span>
        <button
          onClick={() => { localStorage.removeItem('dashboard-layout'); location.reload() }}
          className="text-xs px-1.5 py-0.5 rounded"
          style={{ color: 'var(--text-muted)', background: 'var(--border-card)' }}
          title="Reset layout"
        >
          ↺
        </button>
      </div>
    </div>
  )
}
