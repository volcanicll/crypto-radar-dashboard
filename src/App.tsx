import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import StatusBar from './components/layout/StatusBar'
import SignalSummaryBar from './components/layout/SignalSummaryBar'
import Dashboard from './components/layout/Dashboard'
import DetailDrawer from './components/layout/DetailDrawer'
import SearchPalette from './components/layout/SearchPalette'
import { useMarketData, useAccumulationPool, useOIAlerts, useScores, useShortFuel, useNarrativeRadar, useMarketOverview, useLiquidations } from './api/hooks'
import { requestNotificationPermission, notifyFiringPool, notifyOIAlert, notifyNarrativeMomentum, notifyShortSqueeze } from './logic/notifications'
import { trackSignals, type TrackResult } from './logic/signal-tracker'
import type { AccumulationResult } from './types'

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(60)
  const [searchOpen, setSearchOpen] = useState(false)

  // 倒计时
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 60 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 浏览器通知权限请求
  useEffect(() => {
    requestNotificationPermission()
  }, [])

  // Cmd+K 搜索快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // 1. 市场基础数据（60s 刷新）
  const { data: market } = useMarketData()

  // 2. 收筹标的池（5min 刷新，需要 symbols）
  const symbols = useMemo(() => market?.symbols || [], [market?.symbols])
  const { data: pool } = useAccumulationPool(symbols)

  // 构建 poolMap
  const poolMap = useMemo(() => {
    const map: Record<string, AccumulationResult> = {}
    if (pool) for (const r of pool) map[r.symbol] = r
    return map
  }, [pool])

  const poolSymbolSet = useMemo(() => new Set(pool?.map(r => r.symbol) || []), [pool])

  // 3. OI 异动
  const { data: oiAlerts } = useOIAlerts(poolSymbolSet, market?.tickers || {})

  // 补充 OI alert 中的行情数据
  const enrichedOiAlerts = useMemo(() => {
    if (!oiAlerts || !market?.tickers) return oiAlerts || []
    return oiAlerts.map(a => {
      const tk = market.tickers[a.symbol]
      return tk ? {
        ...a,
        price: tk.price,
        vol24h: tk.quoteVolume,
        pxChgPct: tk.priceChangePercent,
        fundingRate: (market.fundingRates?.[a.symbol] || 0) * 100,
      } : a
    })
  }, [oiAlerts, market?.tickers, market?.fundingRates])

  // 4. 综合评分
  const { data: scores } = useScores(
    poolMap,
    enrichedOiAlerts,
    market?.tickers || {},
    market?.fundingRates || {},
    market?.mcapMap || {},
    market?.trendingCoins || new Set(),
  )

  // 5. 空头燃料
  const { data: shortFuelData } = useShortFuel(
    market?.tickers || {},
    market?.fundingRates || {},
  )

  // 6. 市场总览
  const { data: overview } = useMarketOverview(
    market?.tickers || {},
    market?.fundingRates || {},
    pool?.length || 0,
  )

  // 7. 爆仓事件
  const { data: liquidations } = useLiquidations()

  // 8. 链上叙事雷达（Vercel Serverless）
  const { data: narrative, error: narrativeError } = useNarrativeRadar()

  // 9. 信号变化追踪
  const signalDiff = useMemo<TrackResult>(() => {
    if (!pool || !enrichedOiAlerts) return { pool: {}, oiAlerts: {}, ambush: {}, squeeze: {}, narrativeMomentum: {} }
    return trackSignals({
      pool: pool.map(r => r.symbol),
      oiAlerts: enrichedOiAlerts.filter(a => a.oiDelta6h > 5).map(a => a.symbol),
      ambush: (scores?.ambush || []).map(a => a.symbol),
      squeeze: (shortFuelData?.squeeze || []).map(s => s.symbol),
      narrativeMomentum: (narrative?.tokens || []).filter(t => t.momentumSignal).map(t => `${t.symbol}-${t.chain}`),
    })
  }, [pool, enrichedOiAlerts, scores?.ambush, shortFuelData?.squeeze, narrative?.tokens])

  // 10. 浏览器通知（仅首次数据加载后触发）
  const notificationsFired = useRef(false)
  useEffect(() => {
    if (notificationsFired.current) return
    if (!pool && !enrichedOiAlerts && !narrative && !shortFuelData) return

    notificationsFired.current = true

    // 收筹点火通知
    pool?.filter(p => p.status === 'firing').forEach(p => notifyFiringPool(p.coin))

    // OI 异动通知
    enrichedOiAlerts?.filter(a => a.oiDelta6h > 10).forEach(a => notifyOIAlert(a.coin, a.oiDelta6h))

    // 叙事动量通知
    narrative?.tokens?.filter(t => t.momentumSignal).forEach(t =>
      notifyNarrativeMomentum(t.symbol, t.momentumSignal!.pctGain)
    )

    // 空头轧空通知
    shortFuelData?.squeeze?.forEach(s => notifyShortSqueeze(s.coin, s.pxChg))
  }, [pool, enrichedOiAlerts, narrative, shortFuelData])

  // 搜索所需的 symbol 集合
  const searchSets = useMemo(() => ({
    pool: poolSymbolSet,
    oi: new Set(enrichedOiAlerts.map(a => a.symbol)),
    ambush: new Set((scores?.ambush || []).map(a => a.symbol)),
    squeeze: new Set((shortFuelData?.squeeze || []).map(s => s.symbol)),
    narrative: new Set((narrative?.tokens || []).map(t => `${t.symbol}-${t.chain}`)),
  }), [poolSymbolSet, enrichedOiAlerts, scores?.ambush, shortFuelData?.squeeze, narrative?.tokens])

  const handleSelectSymbol = useCallback((symbol: string) => {
    setSelectedSymbol(symbol)
  }, [])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <StatusBar
        data={overview}
        countdown={countdown}
        onSearchOpen={() => setSearchOpen(true)}
      />
      <SignalSummaryBar
        pool={pool || []}
        oiAlerts={enrichedOiAlerts}
        ambush={scores?.ambush || []}
        fuel={shortFuelData?.fuel || []}
        squeeze={shortFuelData?.squeeze || []}
        narrative={narrative}
      />
      <Dashboard
        pool={pool || []}
        oiAlerts={enrichedOiAlerts}
        chase={scores?.chase || []}
        combined={scores?.combined || []}
        ambush={scores?.ambush || []}
        fuel={shortFuelData?.fuel || []}
        squeeze={shortFuelData?.squeeze || []}
        liquidations={liquidations}
        narrative={narrative}
        narrativeError={narrativeError}
        onSelectSymbol={handleSelectSymbol}
        signalDiff={signalDiff}
      />
      <DetailDrawer
        symbol={selectedSymbol}
        coinData={scores?.coinData || {}}
        onClose={() => setSelectedSymbol(null)}
      />
      <SearchPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        coinData={scores?.coinData || {}}
        onSelectSymbol={handleSelectSymbol}
        poolSymbols={searchSets.pool}
        oiSymbols={searchSets.oi}
        ambushSymbols={searchSets.ambush}
        squeezeSymbols={searchSets.squeeze}
        narrativeSymbols={searchSets.narrative}
      />
    </div>
  )
}

export default App
