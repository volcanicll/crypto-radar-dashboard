import type { AccumulationResult, OIAlert, AmbushCandidate, ShortFuelTarget, NarrativeRadarData } from '../../types'

interface Props {
  pool: AccumulationResult[]
  oiAlerts: OIAlert[]
  ambush: AmbushCandidate[]
  fuel: ShortFuelTarget[]
  squeeze: ShortFuelTarget[]
  narrative: NarrativeRadarData | undefined
}

interface SignalItem {
  icon: string
  label: string
  count: number
  targetId: string
  urgent?: boolean
}

export default function SignalSummaryBar({ pool, oiAlerts, ambush, fuel, squeeze, narrative }: Props) {
  const firingCount = pool.filter(p => p.status === 'firing').length
  const momentumCount = narrative?.tokens?.filter(t => t.momentumSignal).length || 0

  const signals: SignalItem[] = [
    { icon: '🚀', label: 'Squeeze', count: fuel.length, targetId: 'shortFuel', urgent: fuel.length > 0 },
    { icon: '🎯', label: '潜在轧空', count: squeeze.length, targetId: 'shortFuel', urgent: squeeze.length > 3 },
    { icon: '📊', label: 'OI异动', count: oiAlerts.length, targetId: 'oi' },
    { icon: '🏦', label: '收筹点火', count: firingCount, targetId: 'pool', urgent: firingCount > 0 },
    { icon: '🎯', label: '埋伏', count: ambush.length, targetId: 'ambush' },
    { icon: '🛰️', label: '叙事动量', count: momentumCount, targetId: 'narrative', urgent: momentumCount > 0 },
  ]

  const hasAny = signals.some(s => s.count > 0)

  const scrollToCard = (targetId: string) => {
    const el = document.querySelector(`[data-card-id="${targetId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('flash-border')
      setTimeout(() => el.classList.remove('flash-border'), 3000)
    }
  }

  return (
    <div
      className="flex items-center gap-4 px-4 py-1.5 select-none overflow-x-auto"
      style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-card)',
      }}
    >
      {!hasAny ? (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          暂无活跃信号
        </span>
      ) : (
        <>
          <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
            信号概览
          </span>
          {signals.filter(s => s.count > 0).map((s) => (
            <button
              key={s.label}
              onClick={() => scrollToCard(s.targetId)}
              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded cursor-pointer shrink-0 ${s.urgent ? 'pulse-glow' : ''}`}
              style={{
                background: s.urgent ? 'rgba(6,182,212,0.12)' : 'var(--border-card)',
                color: s.urgent ? 'var(--accent)' : 'var(--text-secondary)',
                border: s.urgent ? '1px solid rgba(6,182,212,0.3)' : 'none',
              }}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
              <b style={{ color: s.urgent ? 'var(--accent)' : 'var(--text-primary)' }}>×{s.count}</b>
            </button>
          ))}
        </>
      )}
    </div>
  )
}
