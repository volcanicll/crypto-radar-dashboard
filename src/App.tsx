import { useState, useEffect, useMemo } from 'react'
import StatusBar from './components/layout/StatusBar'
import Dashboard from './components/layout/Dashboard'
import DetailDrawer from './components/layout/DetailDrawer'
import { useMarketData, useAccumulationPool, useOIAlerts, useScores, useShortFuel, useNarrativeRadar, useMarketOverview } from './api/hooks'
import type { AccumulationResult } from './types'

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(60)

  // 倒计时
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 60 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
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

  // 7. 链上叙事雷达（Vercel Serverless）
  const { data: narrative, error: narrativeError } = useNarrativeRadar()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <StatusBar data={overview} countdown={countdown} />
      <Dashboard
        pool={pool || []}
        oiAlerts={enrichedOiAlerts}
        chase={scores?.chase || []}
        combined={scores?.combined || []}
        ambush={scores?.ambush || []}
        fuel={shortFuelData?.fuel || []}
        squeeze={shortFuelData?.squeeze || []}
        narrative={narrative}
        narrativeError={narrativeError}
        onSelectSymbol={setSelectedSymbol}
      />
      <DetailDrawer
        symbol={selectedSymbol}
        coinData={scores?.coinData || {}}
        onClose={() => setSelectedSymbol(null)}
      />
    </div>
  )
}

export default App
