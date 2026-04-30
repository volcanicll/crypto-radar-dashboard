import type { AccumulationStatus } from '../../types'

interface Props {
  status: AccumulationStatus
}

const STYLES: Record<AccumulationStatus, { bg: string; text: string; label: string }> = {
  firing: { bg: 'rgba(239,68,68,0.2)', text: '#ef4444', label: '🔥 放量启动' },
  warming: { bg: 'rgba(245,158,11,0.2)', text: '#f59e0b', label: '⚡ 开始放量' },
  sleeping: { bg: 'rgba(100,116,139,0.2)', text: '#94a3b8', label: '💤 收筹中' },
}

export default function StatusPill({ status }: Props) {
  const s = STYLES[status]
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs whitespace-nowrap"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  )
}

// 通用 pill
export function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs whitespace-nowrap"
      style={{ background: `${color}33`, color }}
    >
      {label}
    </span>
  )
}
