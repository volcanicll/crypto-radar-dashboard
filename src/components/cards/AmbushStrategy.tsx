import { memo } from 'react'
import CardShell from '../shared/CardShell'
import { Pill } from '../shared/StatusPill'
import { WatchStar } from '../layout/WatchlistPanel'
import { fmtMcap } from '../../logic/scoring'
import type { AmbushCandidate } from '../../types'
import type { SignalStatusMap } from '../../logic/signal-tracker'

const MARKER: Record<string, string> = {
  new: '🆕',
  lost: '📉',
  persistent: '⚡',
}

interface Props {
  data: AmbushCandidate[]
  onSelect?: (symbol: string) => void
  onToggleWatch?: (symbol: string) => void
  signalStatus?: SignalStatusMap
}

function AmbushStrategy({ data, onSelect, onToggleWatch, signalStatus }: Props) {
  return (
    <CardShell
      title="埋伏策略"
      icon="🎯"
      extra={<span className="text-xs" style={{ color: 'var(--text-muted)' }}>市值35+OI30+横盘20+费率15</span>}
    >
      <div className="overflow-auto h-full">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs" style={{ color: 'var(--text-muted)' }}>
            暂无信号
          </div>
        ) : (
          <div className="space-y-1">
            {data.slice(0, 8).map((s) => {
              const isDarkFlow = s.d6h > 2 && Math.abs(s.pxChg) < 5
              const marker = signalStatus?.[s.symbol]
              return (
                <div
                  key={s.symbol}
                  className="px-2 py-1.5 rounded cursor-pointer table-row"
                  onClick={() => onSelect?.(s.symbol)}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') onSelect?.(s.symbol) }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <WatchStar symbol={s.symbol} onToggle={onToggleWatch ?? (() => {})} />
                      <span className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>{s.coin}</span>
                      {marker && <span className="text-xs">{MARKER[marker]}</span>}
                      <span className="text-sm font-bold">{s.total}分</span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {fmtMcap(s.estMcap)}
                    </span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {Math.abs(s.d6h) >= 2 && (
                      <span className="text-[10px] px-1 rounded" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>
                        OI{s.d6h >= 0 ? '+' : ''}{s.d6h.toFixed(0)}%
                      </span>
                    )}
                    {isDarkFlow && <Pill label="暗流" color="var(--accent)" />}
                    {s.swDays >= 45 && (
                      <span className="text-[10px] px-1 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--amber)' }}>
                        横{s.swDays}d
                      </span>
                    )}
                    {s.frPct < -0.01 && (
                      <span className="text-[10px] px-1 rounded" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent)' }}>
                        费{s.frPct.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </CardShell>
  )
}

export default memo(AmbushStrategy)
