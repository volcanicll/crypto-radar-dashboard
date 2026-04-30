import type { ShortFuelTarget } from '../types'

export function detectShortFuel(
  tickers: Record<string, { price: number; priceChangePercent: number; quoteVolume: number }>,
  fundingRates: Record<string, number>,
): { fuel: ShortFuelTarget[]; squeeze: ShortFuelTarget[] } {
  const fuelTargets: ShortFuelTarget[] = []
  const squeezeTargets: ShortFuelTarget[] = []

  for (const [sym, tk] of Object.entries(tickers)) {
    if (!sym.endsWith('USDT')) continue

    const pxChg = tk.priceChangePercent
    const vol = tk.quoteVolume
    const fr = fundingRates[sym] || 0
    const coin = sym.replace('USDT', '')

    const item: ShortFuelTarget = {
      coin, symbol: sym, pxChg, funding: fr, vol, price: tk.price, fuelScore: 0,
    }

    // 正在 squeeze: 涨>5% + 费率负 + Vol>$5M
    if (pxChg > 5 && fr < -0.0003 && vol > 5_000_000) {
      item.fuelScore = Math.abs(fr) * 10000 * pxChg
      fuelTargets.push(item)
    }
    // 潜在 squeeze: 费率很负 + 还没大涨(<10%) + Vol>$2M
    else if (fr < -0.0005 && pxChg < 10 && vol > 2_000_000) {
      item.fuelScore = Math.abs(fr) * 10000
      squeezeTargets.push(item)
    }
  }

  fuelTargets.sort((a, b) => b.fuelScore - a.fuelScore)
  squeezeTargets.sort((a, b) => b.fuelScore - a.fuelScore)

  return { fuel: fuelTargets, squeeze: squeezeTargets }
}
