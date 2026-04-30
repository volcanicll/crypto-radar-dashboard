import type { Kline, AccumulationResult } from '../types'

const MIN_SIDEWAYS_DAYS = 45
const MAX_RANGE_PCT = 80
const MAX_AVG_VOL_USD = 20_000_000
const MIN_DATA_DAYS = 50
const VOL_BREAKOUT_MULT = 3.0

const EXCLUDE_COINS = new Set(['USDC', 'USDP', 'TUSD', 'FDUSD', 'BTCDOM', 'DEFI', 'USDM'])

export function analyzeAccumulation(symbol: string, klines: Kline[]): AccumulationResult | null {
  if (klines.length < MIN_DATA_DAYS) return null

  const coin = symbol.replace('USDT', '')
  if (EXCLUDE_COINS.has(coin)) return null

  const recent7d = klines.slice(-7)
  const prior = klines.slice(0, -7)
  if (prior.length === 0) return null

  const recentAvgPx = recent7d.reduce((s, d) => s + d.close, 0) / recent7d.length
  const priorAvgPx = prior.reduce((s, d) => s + d.close, 0) / prior.length
  if (priorAvgPx > 0 && (recentAvgPx - priorAvgPx) / priorAvgPx > 3.0) return null

  let bestDays = 0, bestRange = 0, bestLow = 0, bestHigh = 0, bestAvgVol = 0, bestSlope = 0

  for (let window = MIN_SIDEWAYS_DAYS; window <= prior.length; window++) {
    const wd = prior.slice(-window)
    const lows = wd.map(d => d.low)
    const highs = wd.map(d => d.high)
    const wLow = Math.min(...lows)
    const wHigh = Math.max(...highs)
    if (wLow <= 0) continue

    const rangePct = ((wHigh - wLow) / wLow) * 100
    if (rangePct > MAX_RANGE_PCT) continue

    const avgVol = wd.reduce((s, d) => s + d.vol, 0) / wd.length
    if (avgVol > MAX_AVG_VOL_USD) continue

    // 线性回归斜率
    const closes = wd.map(d => d.close)
    const n = closes.length
    const xMean = (n - 1) / 2
    const yMean = closes.reduce((a, b) => a + b, 0) / n
    let num = 0, den = 0
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (closes[i] - yMean)
      den += (i - xMean) ** 2
    }
    const slope = den > 0 ? num / den : 0
    const slopePct = closes[0] > 0 ? (slope * n / closes[0]) * 100 : 0
    if (Math.abs(slopePct) > 20) continue

    if (window > bestDays) {
      bestDays = window
      bestRange = rangePct
      bestLow = wLow
      bestHigh = wHigh
      bestAvgVol = avgVol
      bestSlope = slopePct
    }
  }

  if (bestDays < MIN_SIDEWAYS_DAYS) return null

  // 评分
  const daysScore = Math.min(bestDays / 90, 1.0) * 25
  const rangeScore = Math.max(0, (1 - bestRange / MAX_RANGE_PCT)) * 20
  const volScore = Math.max(0, (1 - bestAvgVol / MAX_AVG_VOL_USD)) * 20
  const recentVol = recent7d.reduce((s, d) => s + d.vol, 0) / recent7d.length
  const volBreakout = bestAvgVol > 0 ? recentVol / bestAvgVol : 0
  const breakoutScore = Math.min(volBreakout / VOL_BREAKOUT_MULT, 1.0) * 15

  const estMcap = klines[klines.length - 1].close * bestAvgVol * 30
  let mcapScore = 0
  if (estMcap > 0 && estMcap < 50_000_000) mcapScore = 20
  else if (estMcap < 100_000_000) mcapScore = 15
  else if (estMcap < 200_000_000) mcapScore = 10
  else if (estMcap < 500_000_000) mcapScore = 5

  const flatnessBonus = Math.max(0, (1 - Math.abs(bestSlope) / 20)) * 5
  const score = daysScore + rangeScore + volScore + breakoutScore + mcapScore + flatnessBonus

  let status: AccumulationResult['status'] = 'sleeping'
  if (volBreakout >= VOL_BREAKOUT_MULT) status = 'firing'
  else if (volBreakout >= 1.5) status = 'warming'

  return {
    symbol, coin,
    sidewaysDays: bestDays, rangePct: bestRange, slopePct: bestSlope,
    lowPrice: bestLow, highPrice: bestHigh, avgVol: bestAvgVol,
    currentPrice: klines[klines.length - 1].close,
    recentVol, volBreakout, score, status, dataDays: klines.length,
  }
}
