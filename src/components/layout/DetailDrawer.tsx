import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getOIHist, getFundingRateHistory } from '../../api/binance'
import { useLongShortRatio } from '../../api/hooks'
import { fmtUsd, fmtMcap } from '../../logic/scoring'
import type { CoinData } from '../../types'

interface Props {
  symbol: string | null
  coinData: Record<string, CoinData>
  onClose: () => void
}

export default function DetailDrawer({ symbol, coinData, onClose }: Props) {
  const { data: ratioData } = useLongShortRatio(symbol)
  const [oiHist, setOiHist] = useState<number[]>([])
  const [frHist, setFrHist] = useState<number[]>([])

  useEffect(() => {
    if (!symbol) return
    setOiHist([])
    setFrHist([])
    getOIHist(symbol, '1h', 48).then(hist => {
      if (hist) setOiHist(hist.map(h => h.sumOpenInterestValue))
    })
    getFundingRateHistory(symbol, 10).then(rates => {
      setFrHist(rates)
    })
  }, [symbol])

  if (!symbol) return null

  const d = coinData[symbol]
  const coin = symbol.replace('USDT', '')

  return (
    <div
      className="fixed right-0 top-0 h-full z-50 flex"
      style={{ width: 360 }}
    >
      {/* 遮罩 */}
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      {/* 抽屉 */}
      <div
        className="relative ml-auto h-full overflow-auto"
        style={{
          width: 360,
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-card)',
        }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-card)' }}>
          <div>
            <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{coin}</span>
            {d && <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{fmtMcap(d.estMcap)}</span>}
          </div>
          <button
            onClick={onClose}
            className="text-lg px-2 hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* 关键指标 */}
        {d && (
          <div className="grid grid-cols-2 gap-2 p-4">
            <MetricCard label="24h 涨跌" value={`${d.pxChg >= 0 ? '+' : ''}${d.pxChg.toFixed(1)}%`} color={d.pxChg >= 0 ? 'var(--green)' : 'var(--red)'} />
            <MetricCard label="费率" value={`${d.frPct.toFixed(4)}%`} color={d.frPct < 0 ? 'var(--red)' : 'var(--green)'} />
            <MetricCard label="OI 变化6h" value={`${d.d6h >= 0 ? '+' : ''}${d.d6h.toFixed(1)}%`} color={d.d6h > 0 ? 'var(--green)' : 'var(--red)'} />
            <MetricCard label="横盘天数" value={`${d.swDays}d`} color="var(--amber)" />
          </div>
        )}

        {/* OI 走势图 */}
        {oiHist.length > 2 && (
          <div className="px-4 pb-3">
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>OI 走势 (48h)</div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={oiHist.map((v, i) => ({ i, v }))}>
                <XAxis dataKey="i" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 4, fontSize: 11 }}
                  labelStyle={{ display: 'none' }}
                  formatter={(v: any) => [fmtUsd(Number(v)), 'OI']}
                />
                <Line type="monotone" dataKey="v" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 费率历史 */}
        {frHist.length > 1 && (
          <div className="px-4 pb-4">
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>费率历史</div>
            <div className="flex items-end gap-1">
              {frHist.map((r, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
                  <div
                    className="w-full rounded-sm"
                    style={{
                      height: Math.max(Math.abs(r) * 200, 2),
                      background: r < 0 ? 'var(--red)' : 'var(--green)',
                      opacity: 0.7,
                    }}
                  />
                  <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                    {r.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 标签 */}
        {d && (
          <div className="px-4 pb-4 flex flex-wrap gap-1">
            {d.inPool && <Tag label="收筹池" color="var(--accent)" />}
            {d.inCG && <Tag label="CG Trending" color="var(--amber)" />}
            {d.volSurge && <Tag label="放量" color="var(--green)" />}
            {d.frPct < -0.03 && <Tag label="负费率" color="var(--red)" />}
          </div>
        )}

        {/* 多空比 */}
        {ratioData && (ratioData.global.length > 0 || ratioData.topTrader.length > 0) && (
          <div className="mt-3 pt-3 px-4" style={{ borderTop: '1px solid var(--border-card)' }}>
            <div className="text-[10px] mb-2 font-semibold" style={{ color: 'var(--text-muted)' }}>Long/Short Ratio</div>
            {ratioData.global[0] && (
              <div className="mb-2">
                <div className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>Global</div>
                <div className="flex gap-1 items-center text-[10px]">
                  <span className="w-10 text-right" style={{ color: 'var(--green)' }}>{(ratioData.global[0].longRatio * 100).toFixed(1)}%</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-card)' }}>
                    <div className="h-full rounded-full" style={{ width: `${ratioData.global[0].longRatio * 100}%`, background: 'var(--green)' }} />
                  </div>
                  <span className="w-10" style={{ color: 'var(--red)' }}>{(ratioData.global[0].shortRatio * 100).toFixed(1)}%</span>
                </div>
              </div>
            )}
            {ratioData.topTrader[0] && (
              <div>
                <div className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>Top Traders</div>
                <div className="flex gap-1 items-center text-[10px]">
                  <span className="w-10 text-right" style={{ color: 'var(--green)' }}>{(ratioData.topTrader[0].longRatio * 100).toFixed(1)}%</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-card)' }}>
                    <div className="h-full rounded-full" style={{ width: `${ratioData.topTrader[0].longRatio * 100}%`, background: 'var(--green)' }} />
                  </div>
                  <span className="w-10" style={{ color: 'var(--red)' }}>{(ratioData.topTrader[0].shortRatio * 100).toFixed(1)}%</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div className="text-sm font-bold tabular-nums" style={{ color }}>{value}</div>
    </div>
  )
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${color}22`, color }}>
      {label}
    </span>
  )
}
