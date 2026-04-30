import CardShell from '../shared/CardShell'
import { fmtPct, fmtMcap } from '../../logic/scoring'
import type { ShortFuelTarget } from '../../types'

interface Props {
  fuel: ShortFuelTarget[]
  squeeze: ShortFuelTarget[]
  onSelect?: (symbol: string) => void
}

export default function ShortFuel({ fuel, squeeze, onSelect }: Props) {
  return (
    <CardShell title="空头燃料 + 热度" icon="🔥">
      <div className="overflow-auto h-full space-y-3">
        {/* 正在 Squeeze */}
        {fuel.length > 0 && (
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--red)' }}>
              🚀 正在 Squeeze ×{fuel.length}
            </div>
            {fuel.slice(0, 5).map((t) => (
              <div
                key={t.symbol}
                className="flex items-center justify-between px-2 py-1 rounded cursor-pointer table-row text-xs"
                onClick={() => onSelect?.(t.symbol)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ color: 'var(--accent)' }}>{t.coin}</span>
                  <span style={{ color: t.pxChg >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {fmtPct(t.pxChg)}
                  </span>
                </div>
                <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <span>费{(t.funding * 100).toFixed(4)}%</span>
                  <span>{fmtMcap(t.vol)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 潜在 Squeeze */}
        {squeeze.length > 0 && (
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--amber)' }}>
              🎯 潜在 Squeeze ×{squeeze.length}
            </div>
            {squeeze.slice(0, 5).map((t) => (
              <div
                key={t.symbol}
                className="flex items-center justify-between px-2 py-1 rounded cursor-pointer table-row text-xs"
                onClick={() => onSelect?.(t.symbol)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ color: 'var(--accent)' }}>{t.coin}</span>
                  <span style={{ color: t.pxChg >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {fmtPct(t.pxChg)}
                  </span>
                </div>
                <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <span>费{(t.funding * 100).toFixed(4)}%</span>
                  <span>{fmtMcap(t.vol)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {fuel.length === 0 && squeeze.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs" style={{ color: 'var(--text-muted)' }}>
            暂无信号
          </div>
        )}
      </div>
    </CardShell>
  )
}
