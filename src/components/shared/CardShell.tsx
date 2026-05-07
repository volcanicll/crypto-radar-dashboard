import type { ReactNode } from 'react'

interface Props {
  title: string
  icon?: string
  children: ReactNode
  extra?: ReactNode
}

export default function CardShell({ title, icon, children, extra }: Props) {
  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: 8,
      }}
    >
      {/* 卡片头部 — 拖拽手柄 */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing drag-handle select-none"
        style={{ borderBottom: '1px solid var(--border-card)' }}
        title="拖动模块"
      >
        <div className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </span>
        </div>
        {extra && <div className="flex items-center gap-1">{extra}</div>}
      </div>
      {/* 卡片内容 */}
      <div className="flex-1 overflow-auto p-2">
        {children}
      </div>
    </div>
  )
}
