import { memo } from 'react'
import CardShell from '../shared/CardShell'
import StatusPill from '../shared/StatusPill'
import ScoreBar from '../shared/ScoreBar'
import { WatchStar } from '../layout/WatchlistPanel'
import { fmtUsd } from '../../logic/scoring'
import type { AccumulationResult } from '../../types'
import type { SignalStatusMap } from '../../logic/signal-tracker'

interface Props {
  data: AccumulationResult[]
  onSelect?: (symbol: string) => void
  onToggleWatch?: (symbol: string) => void
  signalStatus?: SignalStatusMap
}

const MARKER: Record<string, { label: string; color: string }> = {
  new: { label: '🆕', color: '#3b82f6' },
  lost: { label: '📉', color: '#ef4444' },
  persistent: { label: '⚡', color: '#f59e0b' },
}

function AccumulationPool({ data, onSelect, onToggleWatch, signalStatus }: Props) {
  if (!data || data.length === 0) {
    return (
      <CardShell title="收筹标的池" icon="🏦">
        <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--text-muted)' }}>
          扫描中...
        </div>
      </CardShell>
    )
  }

  return (
    <CardShell
      title={`收筹标的池 ×${data.length}`}
      icon="🏦"
      extra={<span className="text-xs" style={{ color: 'var(--text-muted)' }}>按评分排序</span>}
    >
      <div className="overflow-auto h-full">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ color: 'var(--text-muted)' }}>
              <th className="text-left py-1 px-1 font-normal">币种</th>
              <th className="text-center py-1 px-1 font-normal">评分</th>
              <th className="text-center py-1 px-1 font-normal">横盘</th>
              <th className="text-center py-1 px-1 font-normal">波动</th>
              <th className="text-center py-1 px-1 font-normal">Vol</th>
              <th className="text-center py-1 px-1 font-normal">状态</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => {
              const marker = signalStatus?.[r.symbol]
              return (
                <tr
                  key={r.symbol}
                  className="table-row cursor-pointer"
                  onClick={() => onSelect?.(r.symbol)}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') onSelect?.(r.symbol) }}
                >
                  <td className="py-1 px-1 font-semibold" style={{ color: 'var(--accent)' }}>
                    <WatchStar symbol={r.symbol} onToggle={onToggleWatch ?? (() => {})} />
                    {r.coin}
                    {marker && <span className="ml-1">{MARKER[marker]?.label}</span>}
                  </td>
                  <td className="py-1 px-1">
                    <ScoreBar score={Math.round(r.score)} max={100} />
                  </td>
                  <td className="py-1 px-1 text-center tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {r.sidewaysDays}d
                  </td>
                  <td className="py-1 px-1 text-center tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {r.rangePct.toFixed(0)}%
                  </td>
                  <td className="py-1 px-1 text-center tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {fmtUsd(r.avgVol)}
                  </td>
                  <td className="py-1 px-1 text-center">
                    <StatusPill status={r.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </CardShell>
  )
}

export default memo(AccumulationPool)
