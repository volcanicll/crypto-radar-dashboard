interface Props {
  score: number
  max: number
  color?: string
  size?: 'sm' | 'md'
}

export default function ScoreBar({ score, max, color = 'var(--accent)', size = 'sm' }: Props) {
  const pct = Math.min((score / max) * 100, 100)
  const h = size === 'sm' ? 4 : 6
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: h, background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)', minWidth: 20 }}>
        {score}
      </span>
    </div>
  )
}
