import { getOIHist } from '../api/binance'
import type { OIAlert } from '../types'

const MIN_OI_DELTA_PCT = 3.0
const MIN_OI_USD = 2_000_000

export async function detectOIAlerts(symbols: string[], poolSet: Set<string>): Promise<OIAlert[]> {
  const alerts: OIAlert[] = []
  const batchSize = 5

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async (sym) => {
        const hist = await getOIHist(sym, '1h', 48)
        if (!hist || hist.length < 2) return null

        const curr = hist[hist.length - 1].sumOpenInterestValue
        const prev1h = hist[hist.length - 2].sumOpenInterestValue
        const prev6h = hist[Math.max(0, hist.length - 7)].sumOpenInterestValue

        if (prev1h <= 0 || curr < MIN_OI_USD) return null

        const d1h = ((curr - prev1h) / prev1h) * 100
        const d6h = prev6h > 0 ? ((curr - prev6h) / prev6h) * 100 : 0

        if (Math.abs(d1h) < MIN_OI_DELTA_PCT && Math.abs(d6h) < MIN_OI_DELTA_PCT) return null

        const oiHist = hist.slice(-12).map(h => h.sumOpenInterestValue)
        const coin = sym.replace('USDT', '')

        return {
          symbol: sym, coin,
          price: 0, // 由调用方补充
          oiUsd: curr,
          oiDelta1h: d1h, oiDelta6h: d6h,
          vol24h: 0, pxChgPct: 0, fundingRate: 0,
          oiHist, inPool: poolSet.has(sym),
        } as OIAlert
      })
    )
    alerts.push(...results.filter(Boolean) as OIAlert[])

    if (i + batchSize < symbols.length) {
      await new Promise(r => setTimeout(r, 200))
    }
  }

  alerts.sort((a, b) => Math.abs(b.oiDelta6h) - Math.abs(a.oiDelta6h))
  return alerts
}
