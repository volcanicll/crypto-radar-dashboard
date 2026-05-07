import CardShell from './CardShell'

interface Props {
  title: string
  icon?: string
  rows?: number
}

export default function CardSkeleton({ title, icon, rows = 7 }: Props) {
  return (
    <CardShell title={title} icon={icon}>
      <div className="space-y-2" aria-label={`${title} 加载中`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-row" style={{ width: `${92 - (i % 3) * 12}%` }} />
        ))}
      </div>
    </CardShell>
  )
}
