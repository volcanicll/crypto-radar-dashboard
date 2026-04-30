import useSWR from 'swr'
import { getPerpSymbols, getDailyKlines, getAllTickers, getAllFundingRates, getMarketCaps } from './binance'
import { getTrendingCoins } from './coingecko'
import { analyzeAccumulation } from '../logic/accumulation'
import { detectOIAlerts } from '../logic/oi-detector'
import { computeAllScores } from '../logic/scoring'
import { detectShortFuel } from '../logic/short-fuel'
import { processNarrativeData } from '../logic/narrative-tracker'
import type { AccumulationResult, OIAlert, MarketOverview, NarrativeRadarData } from '../types'

export { manualMomentumCheck } from '../logic/narrative-tracker'

// 轻量数据 60s 刷新
export function useMarketData() {
  return useSWR('market-data', async () => {
    const [tickers, fundingRates, mcapMap, trendingCoins, symbols] = await Promise.all([
      getAllTickers(),
      getAllFundingRates(),
      getMarketCaps(),
      getTrendingCoins(),
      getPerpSymbols(),
    ])
    return { tickers, fundingRates, mcapMap, trendingCoins, symbols }
  }, { refreshInterval: 60_000, dedupingInterval: 30_000 })
}

// 收筹分析 5min 刷新
export function useAccumulationPool(symbols: string[]) {
  return useSWR(
    symbols.length > 0 ? ['accumulation', symbols.sort().join(',')] : null,
    async () => {
      // 限制并发，分批请求
      const batchSize = 5
      const results: AccumulationResult[] = []
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize)
        const klinesArr = await Promise.all(batch.map(s => getDailyKlines(s, 180)))
        for (let j = 0; j < batch.length; j++) {
          const klines = klinesArr[j]
          if (klines) {
            const result = analyzeAccumulation(batch[j], klines)
            if (result) results.push(result)
          }
        }
        // 简单限速
        if (i + batchSize < symbols.length) {
          await new Promise(r => setTimeout(r, 200))
        }
      }
      results.sort((a, b) => b.score - a.score)
      return results
    },
    { refreshInterval: 300_000, dedupingInterval: 120_000 }
  )
}

// OI 异动 5min 刷新
export function useOIAlerts(poolSymbols: Set<string>, tickers: Record<string, any>) {
  const symbolList = Object.keys(tickers)
  // 取成交量 top150 + 标的池内放量的
  const topByVol = symbolList
    .sort((a, b) => (tickers[b]?.quoteVolume || 0) - (tickers[a]?.quoteVolume || 0))
    .slice(0, 150)
  const extraPool = [...poolSymbols].filter(s => !topByVol.includes(s))
  const scanList = [...topByVol, ...extraPool]

  return useSWR(
    scanList.length > 0 ? ['oi-alerts', scanList.length] : null,
    () => detectOIAlerts(scanList, poolSymbols),
    { refreshInterval: 300_000, dedupingInterval: 120_000 }
  )
}

// 综合评分（依赖市场数据+收筹池+OI）
export function useScores(
  poolMap: Record<string, AccumulationResult>,
  oiAlerts: OIAlert[],
  tickers: Record<string, any>,
  fundingRates: Record<string, number>,
  mcapMap: Record<string, number>,
  trendingCoins: Set<string>,
) {
  return useSWR(
    'all-scores',
    () => computeAllScores(poolMap, oiAlerts, tickers, fundingRates, mcapMap, trendingCoins),
    { refreshInterval: 300_000, dedupingInterval: 120_000 }
  )
}

// 空头燃料
export function useShortFuel(tickers: Record<string, any>, fundingRates: Record<string, number>) {
  return useSWR(
    'short-fuel',
    () => detectShortFuel(tickers, fundingRates),
    { refreshInterval: 60_000, dedupingInterval: 30_000 }
  )
}

// 链上叙事雷达：Vercel Serverless 快照，复用 Python 脚本的分类逻辑
export function useNarrativeRadar() {
  return useSWR<NarrativeRadarData>(
    'narrative-radar',
    async () => {
      const resp = await fetch('/api/narratives')
      if (!resp.ok) throw new Error('Narrative radar API unavailable')
      const data = await resp.json()
      if (data.tokens) processNarrativeData(data.tokens)
      return data
    },
    { refreshInterval: 30_000, dedupingInterval: 20_000 }
  )
}

// 市场总览
export function useMarketOverview(tickers: Record<string, any>, fundingRates: Record<string, number>, poolCount: number) {
  return useSWR(
    ['overview', poolCount],
    () => {
      const frArr = Object.values(fundingRates).filter(v => v !== 0)
      const avgFr = frArr.length > 0 ? frArr.reduce((a, b) => a + b, 0) / frArr.length : 0
      const btcTicker = tickers['BTCUSDT']
      const ethTicker = tickers['ETHUSDT']
      return {
        totalSymbols: Object.keys(tickers).length,
        poolCount,
        lastScanTime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
        avgFundingRate: avgFr,
        btcPrice: btcTicker?.price || 0,
        ethPrice: ethTicker?.price || 0,
      } as MarketOverview
    },
    { refreshInterval: 60_000, dedupingInterval: 30_000 }
  )
}
