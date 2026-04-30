import type { AccumulationResult, OIAlert, ChaseCandidate, CombinedScore, AmbushCandidate, CoinData } from '../types'

export function fmtUsd(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

export function fmtPct(v: number, decimals = 1): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(decimals)}%`
}

export function fmtMcap(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

// 构建综合数据
export function buildCoinData(
  poolMap: Record<string, AccumulationResult>,
  oiAlerts: OIAlert[],
  tickers: Record<string, { price: number; priceChangePercent: number; quoteVolume: number }>,
  fundingRates: Record<string, number>,
  mcapMap: Record<string, number>,
  trendingCoins: Set<string>,
): Record<string, CoinData> {
  const oiMap = new Map<string, OIAlert>()
  for (const a of oiAlerts) oiMap.set(a.symbol, a)

  const allSymbols = new Set([...Object.keys(poolMap), ...oiMap.keys()])
  // 也加入有行情的 top 币种
  const topVols = Object.entries(tickers)
    .sort(([, a], [, b]) => b.quoteVolume - a.quoteVolume)
    .slice(0, 200)
  for (const [sym] of topVols) allSymbols.add(sym)

  const result: Record<string, CoinData> = {}

  for (const sym of allSymbols) {
    const tk = tickers[sym]
    if (!tk) continue

    const pool = poolMap[sym]
    const oi = oiMap.get(sym)
    const fr = fundingRates[sym] || 0
    const coin = sym.replace('USDT', '')
    const frPct = fr * 100

    const estMcap = mcapMap[coin] || tk.quoteVolume * 0.3

    result[sym] = {
      coin, symbol: sym,
      pxChg: tk.priceChangePercent,
      vol: tk.quoteVolume,
      frPct,
      d6h: oi?.oiDelta6h || 0,
      oiUsd: oi?.oiUsd || 0,
      estMcap,
      swDays: pool?.sidewaysDays || 0,
      poolSc: pool?.score || 0,
      inPool: !!pool,
      heat: 0,
      inCG: trendingCoins.has(coin),
      volSurge: false,
    }
  }

  return result
}

// 追多策略
export function scoreChase(
  coinData: Record<string, CoinData>,
): ChaseCandidate[] {
  const candidates: ChaseCandidate[] = []

  for (const [, d] of Object.entries(coinData)) {
    if (d.pxChg <= 3 || d.frPct >= -0.005 || d.vol <= 1_000_000) continue

    const trend = d.frPct < -0.1 ? '🔥加速' : d.frPct < -0.03 ? '⬇️变负' : '➡️'
    candidates.push({
      symbol: d.symbol, coin: d.coin,
      frPct: d.frPct, frDelta: 0, trend,
      rates: [d.frPct], pxChg: d.pxChg,
      vol: d.vol, estMcap: d.estMcap,
    })
  }

  candidates.sort((a, b) => a.frPct - b.frPct)
  return candidates
}

// 综合策略
export function scoreCombined(
  coinData: Record<string, CoinData>,
): CombinedScore[] {
  const results: CombinedScore[] = []

  for (const [, d] of Object.entries(coinData)) {
    // 费率分(25)
    let fSc = 0
    if (d.frPct < -0.5) fSc = 25
    else if (d.frPct < -0.1) fSc = 22
    else if (d.frPct < -0.05) fSc = 18
    else if (d.frPct < -0.03) fSc = 14
    else if (d.frPct < -0.01) fSc = 10
    else if (d.frPct < 0) fSc = 5

    // 市值分(25)
    let mSc = 0
    const mc = d.estMcap
    if (mc > 0 && mc < 50e6) mSc = 25
    else if (mc < 100e6) mSc = 22
    else if (mc < 200e6) mSc = 20
    else if (mc < 300e6) mSc = 17
    else if (mc < 500e6) mSc = 12
    else if (mc < 1e9) mSc = 7

    // 横盘分(25)
    let sSc = 0
    if (d.swDays >= 120) sSc = 25
    else if (d.swDays >= 90) sSc = 22
    else if (d.swDays >= 75) sSc = 18
    else if (d.swDays >= 60) sSc = 14
    else if (d.swDays >= 45) sSc = 10

    // OI分(25)
    const abs6 = Math.abs(d.d6h)
    let oSc = 0
    if (abs6 >= 15) oSc = 25
    else if (abs6 >= 8) oSc = 22
    else if (abs6 >= 5) oSc = 18
    else if (abs6 >= 3) oSc = 14
    else if (abs6 >= 2) oSc = 10

    const total = fSc + mSc + sSc + oSc
    if (total < 25) continue

    results.push({
      symbol: d.symbol, coin: d.coin, total,
      fSc, mSc, sSc, oSc,
      frPct: d.frPct, estMcap: d.estMcap,
      swDays: d.swDays, d6h: d.d6h, pxChg: d.pxChg,
    })
  }

  results.sort((a, b) => b.total - a.total)
  return results
}

// 埋伏策略
export function scoreAmbush(
  coinData: Record<string, CoinData>,
): AmbushCandidate[] {
  const results: AmbushCandidate[] = []

  for (const [, d] of Object.entries(coinData)) {
    if (!d.inPool || d.pxChg > 50) continue

    // 市值(35)
    let mSc = 0
    const mc = d.estMcap
    if (mc > 0 && mc < 50e6) mSc = 35
    else if (mc < 100e6) mSc = 32
    else if (mc < 150e6) mSc = 28
    else if (mc < 200e6) mSc = 25
    else if (mc < 300e6) mSc = 20
    else if (mc < 500e6) mSc = 12
    else if (mc < 1e9) mSc = 5

    // OI(30)
    const abs6 = Math.abs(d.d6h)
    let oSc = 0
    if (abs6 >= 10) oSc = 30
    else if (abs6 >= 5) oSc = 25
    else if (abs6 >= 3) oSc = 20
    else if (abs6 >= 2) oSc = 14
    else if (abs6 >= 1) oSc = 8
    // 暗流加分
    if (d.d6h > 2 && Math.abs(d.pxChg) < 5) oSc = Math.min(oSc + 5, 30)

    // 横盘(20)
    let sSc = 0
    if (d.swDays >= 120) sSc = 20
    else if (d.swDays >= 90) sSc = 17
    else if (d.swDays >= 75) sSc = 14
    else if (d.swDays >= 60) sSc = 10
    else if (d.swDays >= 45) sSc = 6

    // 费率(15)
    let fSc = 0
    if (d.frPct < -0.1) fSc = 15
    else if (d.frPct < -0.05) fSc = 12
    else if (d.frPct < -0.03) fSc = 9
    else if (d.frPct < -0.01) fSc = 6
    else if (d.frPct < 0) fSc = 3

    const total = mSc + oSc + sSc + fSc
    if (total < 20) continue

    results.push({
      symbol: d.symbol, coin: d.coin, total,
      mSc, oSc, sSc, fSc,
      estMcap: d.estMcap, d6h: d.d6h, swDays: d.swDays,
      frPct: d.frPct, pxChg: d.pxChg,
    })
  }

  results.sort((a, b) => b.total - a.total)
  return results
}

// 全量评分入口
export function computeAllScores(
  poolMap: Record<string, AccumulationResult>,
  oiAlerts: OIAlert[],
  tickers: Record<string, any>,
  fundingRates: Record<string, number>,
  mcapMap: Record<string, number>,
  trendingCoins: Set<string>,
) {
  const coinData = buildCoinData(poolMap, oiAlerts, tickers, fundingRates, mcapMap, trendingCoins)
  return {
    coinData,
    chase: scoreChase(coinData),
    combined: scoreCombined(coinData),
    ambush: scoreAmbush(coinData),
  }
}
