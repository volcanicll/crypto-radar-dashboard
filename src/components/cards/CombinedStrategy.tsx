import { memo } from 'react'
import CardShell from '../shared/CardShell'
import { fmtMcap } from '../../logic/scoring'
import type { CombinedScore } from '../../types'

interface Props {
  data: CombinedScore[]
  onSelect?: (symbol: string) => void
}

function CombinedStrategy({ data, onSelect }: Props) {
  return (
    <CardShell
      title="综合策略"
      icon="📊"
      extra={<span className="text-xs" style={{ color: 'var(--text-muted)' }}>四维各25=100</span>}
    >
      <div className="overflow-auto h-full">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs" style={{ color: 'var(--text-muted)' }}>
            暂无信号
          </div>
        ) : (
          <div className="space-y-1">
            {data.slice(0, 8).map((s) => (
              <div
                key={s.symbol}
                className="px-2 py-1.5 rounded cursor-pointer table-row"
                onClick={() => onSelect?.(s.symbol)}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') onSelect?.(s.symbol) }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>{s.coin}</span>
                  <span className="text-sm font-bold">{s.total}分</span>
                </div>
                <div className="flex gap-1">
                  {s.fSc >= 10 && (
                    <span className="text-[10px] px-1 rounded" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent)' }}>
                      费{s.frPct.toFixed(2)}%
                    </span>
                  )}
                  {s.mSc >= 12 && (
                    <span className="text-[10px] px-1 rounded" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--green)' }}>
                      市值{fmtMcap(s.estMcap)}
                    </span>
                  )}
                  {s.sSc >= 10 && (
                    <span className="text-[10px] px-1 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--amber)' }}>
                      横{s.swDays}d
                    </span>
                  )}
                  {s.oSc >= 10 && (
                    <span className="text-[10px] px-1 rounded" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>
                      OI{s.d6h >= 0 ? '+' : ''}{s.d6h.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </CardShell>
  )
}

export default memo(CombinedStrategy)
