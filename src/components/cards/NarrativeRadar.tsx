import { memo, useState } from 'react'
import CardShell from '../shared/CardShell'
import ScoreBar from '../shared/ScoreBar'
import { Pill } from '../shared/StatusPill'
import { fmtMcap, fmtPct } from '../../logic/scoring'
import type { NarrativeCategory, NarrativeRadarData, NarrativeToken } from '../../types'
import type { SignalStatusMap } from '../../logic/signal-tracker'

interface Props {
  data: NarrativeRadarData | undefined
  error?: unknown
  signalStatus?: SignalStatusMap
}

const CATEGORY_LABEL: Record<NarrativeCategory, { label: string; color: string }> = {
  musk_trump: { label: '马/川', color: '#ef4444' },
  binance_cz: { label: '币安/CZ', color: '#f59e0b' },
  celebrity_viral: { label: '名人热点', color: '#8b5cf6' },
  flap_support: { label: 'FLAP低吸', color: '#10b981' },
  heating: { label: '叙事升温', color: '#06b6d4' },
  emerging: { label: '新叙事', color: '#3b82f6' },
  common: { label: '动量', color: '#94a3b8' },
}

function Stars({ count }: { count: number }) {
  return (
    <span className="text-xs tracking-normal whitespace-nowrap" style={{ color: 'var(--amber)' }}>
      {'★'.repeat(count)}{'☆'.repeat(Math.max(0, 3 - count))}
    </span>
  )
}

function TokenRow({ token }: { token: NarrativeToken }) {
  const category = CATEGORY_LABEL[token.category]
  return (
    <a
      href={token.url}
      target="_blank"
      rel="noreferrer"
      className="block rounded px-2 py-1.5 table-row"
      aria-label={`打开 ${token.symbol} 外部详情`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="font-semibold text-sm truncate" style={{ color: 'var(--accent)' }}>
              {token.symbol}
            </span>
            <Pill label={token.chain.toUpperCase()} color={category.color} />
            <Stars count={token.stars} />
            {token.momentumSignal && (
              <span className="text-xs" title={`连涨${token.momentumSignal.rounds}轮 +${token.momentumSignal.pctGain.toFixed(1)}%`}>
                🔥
              </span>
            )}
            {token.safety === 'safe' && (
              <span className="text-[10px]" title="安全">🛡️</span>
            )}
            {token.safety === 'warning' && (
              <span className="text-[10px]" title={`风险: ${token.safetyFlags.join(', ')}`} style={{ color: 'var(--red)' }}>⚠️</span>
            )}
            {token.isNew && (
              <Pill label="新" color="#3b82f6" />
            )}
            {token.isNovelNarrative && (
              <Pill label="新叙事" color="#8b5cf6" />
            )}
            {token.isHeating && (
              <Pill label="升温" color="#f97316" />
            )}
          </div>
          <div className="truncate text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {token.narrative}
          </div>
        </div>
        <div className="w-24 shrink-0">
          <ScoreBar score={token.score} max={100} color={category.color} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-1 text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
        <span>MC {fmtMcap(token.mc)}</span>
        <span>Liq {fmtMcap(token.liq)}</span>
        <span style={{ color: token.chg1h >= 0 ? 'var(--green)' : 'var(--red)' }}>
          1h {fmtPct(token.chg1h, 0)}
        </span>
        <span>买卖 {token.buyRatio.toFixed(1)}</span>
      </div>
      {token.supportReason && (
        <div className="mt-1 text-[10px]" style={{ color: 'var(--green)' }}>
          {token.supportReason}
        </div>
      )}
      {token.momentumSignal && (
        <div className="mt-1 text-[10px]" style={{ color: 'var(--green)' }}>
          连涨{token.momentumSignal.rounds}轮 +{token.momentumSignal.pctGain.toFixed(1)}%
          {token.momentumSignal.volIncreasing ? ' · 放量' : ''}
          {token.momentumSignal.signalCount > 1 ? ` · #${token.momentumSignal.signalCount}` : ''}
        </div>
      )}
      {token.seenCount > 1 && (
        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          已出现 {token.seenCount} 次
        </div>
      )}
      {token.description && (
        <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {token.description}
        </div>
      )}
      {token.socials && (
        <div className="flex gap-2 mt-0.5">
          {token.socials.twitter && (
            <a href={token.socials.twitter} target="_blank" rel="noreferrer" className="text-[10px]" onClick={e => e.stopPropagation()}>🐦</a>
          )}
          {token.socials.telegram && (
            <a href={token.socials.telegram} target="_blank" rel="noreferrer" className="text-[10px]" onClick={e => e.stopPropagation()}>✈️</a>
          )}
          {token.socials.website && (
            <a href={token.socials.website} target="_blank" rel="noreferrer" className="text-[10px]" onClick={e => e.stopPropagation()}>🌐</a>
          )}
        </div>
      )}
    </a>
  )
}

const SIGNAL_MARKER: Record<string, string> = { new: '🆕', lost: '📉', persistent: '⚡' }

function NarrativeRadar({ data, error, signalStatus }: Props) {
  const [filter, setFilter] = useState<NarrativeCategory | 'all'>('all')
  const [sortBy, setSortBy] = useState<'score' | 'chg1h' | 'buyRatio' | 'mc' | 'momentum'>('score')
  const [expanded, setExpanded] = useState(false)

  const clusters = data?.clusters || []
  const allTokens = data?.tokens || []
  const filtered = filter === 'all' ? allTokens : allTokens.filter(t => t.category === filter)
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'momentum') {
      const aVal = a.momentumSignal ? a.momentumSignal.pctGain : -1
      const bVal = b.momentumSignal ? b.momentumSignal.pctGain : -1
      return bVal - aVal
    }
    if (sortBy === 'chg1h') return b.chg1h - a.chg1h
    if (sortBy === 'buyRatio') return b.buyRatio - a.buyRatio
    if (sortBy === 'mc') return b.mc - a.mc
    return b.score - a.score
  })
  const tokenList = expanded ? sorted : sorted.slice(0, 12)
  const topCluster = clusters[0]
  const momentumCount = allTokens.filter((t) => t.momentumSignal).length
  const newCount = allTokens.filter((t) => t.isNew).length

  return (
    <CardShell
      title="链上叙事雷达"
      icon="🛰️"
      extra={
        <div className="flex items-center gap-3 text-xs">
          {momentumCount > 0 && (
            <span style={{ color: 'var(--green)' }}>🔥 {momentumCount}</span>
          )}
          {newCount > 0 && (
            <span style={{ color: '#3b82f6' }}>新 {newCount}</span>
          )}
          <span style={{ color: error ? 'var(--red)' : 'var(--text-muted)' }}>
            {error ? 'API未连接' : data ? new Date(data.updatedAt).toLocaleTimeString('zh-CN', { hour12: false }) : '扫描中'}
          </span>
        </div>
      }
    >
      {!data && !error ? (
        <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--text-muted)' }}>
          正在读取 GMGN / FLAP 快照...
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-full text-xs text-center px-6" style={{ color: 'var(--text-muted)' }}>
          本地 Vite 不会自动运行 Vercel API。部署到 Vercel 后此卡片会读取 /api/narratives。
        </div>
      ) : (
        <div className="h-full grid grid-cols-[1.05fr_1.4fr] gap-3 overflow-hidden max-[900px]:grid-cols-1">
          <div className="overflow-auto pr-1">
            <div
              className="rounded p-3 mb-2"
              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid var(--border-card)' }}
            >
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>当前主线</div>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {topCluster?.narrative || '等待新信号'}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {topCluster ? `${topCluster.count} 个币 · ${topCluster.chains.join('/')}` : '暂无叙事簇'}
                  </div>
                </div>
                <div className="w-24">
                  <ScoreBar score={topCluster?.score || 0} max={100} color="var(--accent)" size="md" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              {clusters.slice(0, 8).map((cluster) => {
                const category = CATEGORY_LABEL[cluster.category]
                return (
                  <div key={`${cluster.category}-${cluster.narrative}`} className="rounded px-2 py-1.5 table-row">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Pill label={category.label} color={category.color} />
                          <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                            {cluster.narrative}
                          </span>
                        </div>
                        <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                          {cluster.count}币 · Vol {fmtMcap(cluster.totalVolume)} · 均1h {fmtPct(cluster.avgChg1h, 0)}
                        </div>
                      </div>
                      <span className="text-sm font-bold tabular-nums" style={{ color: category.color }}>
                        {cluster.score}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="overflow-auto pr-1">
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {(['all', 'musk_trump', 'binance_cz', 'celebrity_viral', 'flap_support', 'emerging'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className="text-[10px] px-1.5 py-0.5 rounded cursor-pointer"
                  style={{
                    background: filter === cat ? 'var(--accent)' : 'var(--border-card)',
                    color: filter === cat ? 'white' : 'var(--text-muted)',
                  }}
                >
                  {cat === 'all' ? 'All' : CATEGORY_LABEL[cat].label}
                </button>
              ))}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="text-[10px] px-1 py-0.5 rounded ml-auto"
                style={{ background: 'var(--border-card)', color: 'var(--text-secondary)', border: 'none' }}
              >
                <option value="score">Score</option>
                <option value="chg1h">1h Change</option>
                <option value="buyRatio">Buy Ratio</option>
                <option value="mc">Market Cap</option>
                <option value="momentum">Momentum</option>
              </select>
            </div>
            {/* 动量信号代币优先展示 */}
            {momentumCount > 0 && (
              <div className="mb-2">
                <div className="text-[10px] mb-1 font-semibold" style={{ color: 'var(--green)' }}>
                  动量信号 ({momentumCount})
                </div>
                <div className="grid grid-cols-2 gap-2 max-[1100px]:grid-cols-1">
                  {tokenList.filter((t) => t.momentumSignal).slice(0, 6).map((token) => {
                    const key = `${token.symbol}-${token.chain}`
                    const mk = signalStatus?.[key]
                    return (
                      <div key={token.address} className="relative">
                        {mk && SIGNAL_MARKER[mk] && (
                          <span className="absolute top-1 right-1 text-xs">{SIGNAL_MARKER[mk]}</span>
                        )}
                        <TokenRow token={token} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 max-[1100px]:grid-cols-1">
              {tokenList.slice(0, 12).map((token) => (
                <div key={token.address} className="relative">
                  {signalStatus?.[`${token.symbol}-${token.chain}`] && (
                    <span className="absolute top-1 right-1 text-xs">{SIGNAL_MARKER[signalStatus[`${token.symbol}-${token.chain}`]]}</span>
                  )}
                  <TokenRow token={token} />
                </div>
              ))}
            </div>
            {filtered.length > 12 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[10px] w-full text-center py-1 mt-1 rounded cursor-pointer"
                style={{ color: 'var(--accent)', background: 'var(--border-card)' }}
              >
                {expanded ? 'Show less' : `Show all (${filtered.length})`}
              </button>
            )}
          </div>
        </div>
      )}
    </CardShell>
  )
}

export default memo(NarrativeRadar)
