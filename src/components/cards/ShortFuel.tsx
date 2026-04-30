import CardShell from '../shared/CardShell'
import { fmtPct, fmtMcap } from '../../logic/scoring'
import type { ShortFuelTarget, LiquidationEvent } from '../../types'
import type { SignalStatusMap } from '../../logic/signal-tracker'

const MARKER: Record<string, string> = {
  new: '🆕',
  lost: '📉',
  persistent: '⚡',
}

interface Props {
  fuel: ShortFuelTarget[]
  squeeze: ShortFuelTarget[]
  liquidations?: LiquidationEvent[]
  onSelect?: (symbol: string) => void
  signalStatus?: SignalStatusMap
}

export default function ShortFuel({ fuel, squeeze, liquidations, onSelect, signalStatus }: Props) {
  return (
    <CardShell title="空头燃料 + 热度" icon="🔥">
      <div className="overflow-auto h-full space-y-3">
        {/* 正在 Squeeze */}
        {fuel.length > 0 && (
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--red)' }}>
              🚀 正在 Squeeze ×{fuel.length}
            </div>
            {fuel.slice(0, 5).map((t) => {
              const marker = signalStatus?.[t.symbol]
              return (
                <div
                  key={t.symbol}
                  className="flex items-center justify-between px-2 py-1 rounded cursor-pointer table-row text-xs"
                  onClick={() => onSelect?.(t.symbol)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold" style={{ color: 'var(--accent)' }}>{t.coin}</span>
                    {marker && <span>{MARKER[marker]}</span>}
                    <span style={{ color: t.pxChg >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {fmtPct(t.pxChg)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <span>费{(t.funding * 100).toFixed(4)}%</span>
                    <span>{fmtMcap(t.vol)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 潜在 Squeeze */}
        {squeeze.length > 0 && (
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: 'var(--amber)' }}>
              🎯 潜在 Squeeze ×{squeeze.length}
            </div>
            {squeeze.slice(0, 5).map((t) => {
              const marker = signalStatus?.[t.symbol]
              return (
                <div
                  key={t.symbol}
                  className="flex items-center justify-between px-2 py-1 rounded cursor-pointer table-row text-xs"
                  onClick={() => onSelect?.(t.symbol)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold" style={{ color: 'var(--accent)' }}>{t.coin}</span>
                    {marker && <span>{MARKER[marker]}</span>}
                    <span style={{ color: t.pxChg >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {fmtPct(t.pxChg)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <span>费{(t.funding * 100).toFixed(4)}%</span>
                    <span>{fmtMcap(t.vol)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {fuel.length === 0 && squeeze.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs" style={{ color: 'var(--text-muted)' }}>
            暂无信号
          </div>
        )}

        {/* 近期爆仓事件 */}
        {liquidations && liquidations.length > 0 && (
          <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border-card)' }}>
            <div className="text-[10px] mb-1 font-semibold" style={{ color: 'var(--red)' }}>Recent Liquidations</div>
            <div className="space-y-0.5">
              {liquidations.slice(0, 5).map((liq, i) => (
                <div key={`${liq.symbol}-${liq.timestamp}-${i}`} className="flex items-center justify-between text-[10px]">
                  <span style={{ color: liq.side === 'LONG' ? 'var(--red)' : 'var(--green)' }}>
                    {liq.symbol.replace('USDT', '')} {liq.side === 'LONG' ? 'Long爆' : 'Short爆'}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    ${liq.quoteQuantity >= 1000 ? `${(liq.quoteQuantity / 1000).toFixed(1)}K` : liq.quoteQuantity.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </CardShell>
  )
}
