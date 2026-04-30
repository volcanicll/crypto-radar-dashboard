import CardShell from '../shared/CardShell'
import Sparkline from '../shared/Sparkline'
import { Pill } from '../shared/StatusPill'
import type { OIAlert } from '../../types'
import type { SignalStatusMap } from '../../logic/signal-tracker'

const MARKER: Record<string, { label: string; color: string }> = {
  new: { label: '🆕', color: '#3b82f6' },
  lost: { label: '📉', color: '#ef4444' },
  persistent: { label: '⚡', color: '#f59e0b' },
}

interface Props {
  data: OIAlert[]
  onSelect?: (symbol: string) => void
  signalStatus?: SignalStatusMap
}

export default function OIMonitor({ data, onSelect, signalStatus }: Props) {
  return (
    <CardShell
      title={`OI 异动 ×${data.length}`}
      icon="📊"
    >
      <div className="overflow-auto h-full">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ color: 'var(--text-muted)' }}>
              <th className="text-left py-1 px-1 font-normal">币种</th>
              <th className="text-center py-1 px-1 font-normal">OI 1h</th>
              <th className="text-center py-1 px-1 font-normal">OI 6h</th>
              <th className="text-center py-1 px-1 font-normal">趋势</th>
              <th className="text-center py-1 px-1 font-normal">标签</th>
            </tr>
          </thead>
          <tbody>
            {data.map((a) => {
              const oiColor = a.oiDelta6h > 0 ? 'var(--green)' : 'var(--red)'
              const isDarkFlow = a.oiDelta6h > 2 && Math.abs(a.pxChgPct) < 5
              const marker = signalStatus?.[a.symbol]
              return (
                <tr
                  key={a.symbol}
                  className="table-row cursor-pointer slide-down"
                  onClick={() => onSelect?.(a.symbol)}
                >
                  <td className="py-1 px-1 font-semibold">
                    <span style={{ color: a.inPool ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {a.coin}
                    </span>
                    {a.inPool && <span className="ml-1 text-[10px]" style={{ color: 'var(--amber)' }}>池</span>}
                    {marker && <span className="ml-1">{MARKER[marker]?.label}</span>}
                  </td>
                  <td className="py-1 px-1 text-center tabular-nums" style={{ color: oiColor }}>
                    {a.oiDelta1h >= 0 ? '+' : ''}{a.oiDelta1h.toFixed(1)}%
                  </td>
                  <td className="py-1 px-1 text-center tabular-nums" style={{ color: oiColor }}>
                    {a.oiDelta6h >= 0 ? '+' : ''}{a.oiDelta6h.toFixed(1)}%
                  </td>
                  <td className="py-1 px-1">
                    <div style={{ width: 60, height: 20 }}>
                      <Sparkline data={a.oiHist} color={oiColor} height={20} />
                    </div>
                  </td>
                  <td className="py-1 px-1 text-center">
                    {isDarkFlow && <Pill label="暗流" color="var(--accent)" />}
                    {a.oiDelta6h > 5 && !isDarkFlow && <Pill label="启动" color="var(--green)" />}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs" style={{ color: 'var(--text-muted)' }}>
            暂无异动
          </div>
        )}
      </div>
    </CardShell>
  )
}
