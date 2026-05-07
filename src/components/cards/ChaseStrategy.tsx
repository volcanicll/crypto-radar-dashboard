import { memo } from 'react'
import CardShell from '../shared/CardShell'
import { WatchStar } from '../layout/WatchlistPanel'
import { fmtPct, fmtMcap } from '../../logic/scoring'
import type { ChaseCandidate } from '../../types'

interface Props {
  data: ChaseCandidate[]
  onSelect?: (symbol: string) => void
  onToggleWatch?: (symbol: string) => void
}

function ChaseStrategy({ data, onSelect, onToggleWatch }: Props) {
  return (
    <CardShell title="追多策略" icon="🔥" extra={<span className="text-xs" style={{ color: 'var(--text-muted)' }}>费率排名</span>}>
      <div className="overflow-auto h-full">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs" style={{ color: 'var(--text-muted)' }}>
            暂无信号
          </div>
        ) : (
          <div className="space-y-1">
            {data.slice(0, 8).map((c) => (
              <div
                key={c.symbol}
                className="flex items-center justify-between px-2 py-1.5 rounded cursor-pointer table-row"
                onClick={() => onSelect?.(c.symbol)}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') onSelect?.(c.symbol) }}
              >
                <div className="flex items-center gap-2">
                  <WatchStar symbol={c.symbol} onToggle={onToggleWatch ?? (() => {})} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>{c.coin}</span>
                  <span className="text-xs" style={{ color: 'var(--red)' }}>
                    费{c.frPct >= 0 ? '+' : ''}{c.frPct.toFixed(3)}%
                  </span>
                  <span className="text-xs">{c.trend}</span>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: c.pxChg >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {fmtPct(c.pxChg, 1)}
                  </span>
                  <span>{fmtMcap(c.estMcap)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CardShell>
  )
}

export default memo(ChaseStrategy)
