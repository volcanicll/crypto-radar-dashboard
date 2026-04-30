import type { Kline, Ticker24h, OIHistPoint, LongShortRatio, LiquidationEvent } from '../types'

const FAPI = 'https://fapi.binance.com'

async function apiGet<T>(endpoint: string, params?: Record<string, string | number>): Promise<T | null> {
  const url = new URL(endpoint, FAPI)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  }
  try {
    const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })
    if (resp.ok) return resp.json()
    return null
  } catch {
    return null
  }
}

/** 获取所有 USDT 永续合约 */
export async function getPerpSymbols(): Promise<string[]> {
  const info = await apiGet<any>('/fapi/v1/exchangeInfo')
  if (!info) return []
  return info.symbols
    .filter((s: any) => s.quoteAsset === 'USDT' && s.contractType === 'PERPETUAL' && s.status === 'TRADING')
    .map((s: any) => s.symbol)
}

/** 日K线 */
export async function getDailyKlines(symbol: string, limit = 180): Promise<Kline[] | null> {
  const raw = await apiGet<any[]>('/fapi/v1/klines', { symbol, interval: '1d', limit })
  if (!raw || !Array.isArray(raw)) return null
  return raw.map(k => ({
    ts: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], vol: +k[7],
  }))
}

/** 全市场 24h 行情 */
export async function getAllTickers(): Promise<Record<string, Ticker24h>> {
  const raw = await apiGet<any[]>('/fapi/v1/ticker/24hr')
  if (!raw) return {}
  const map: Record<string, Ticker24h> = {}
  for (const t of raw) {
    if (t.symbol.endsWith('USDT')) {
      map[t.symbol] = {
        symbol: t.symbol,
        price: +t.lastPrice,
        priceChangePercent: +t.priceChangePercent,
        quoteVolume: +t.quoteVolume,
      }
    }
  }
  return map
}

/** 全市场费率 */
export async function getAllFundingRates(): Promise<Record<string, number>> {
  const raw = await apiGet<any[]>('/fapi/v1/premiumIndex')
  if (!raw) return {}
  const map: Record<string, number> = {}
  for (const p of raw) {
    if (p.symbol.endsWith('USDT')) {
      map[p.symbol] = +p.lastFundingRate
    }
  }
  return map
}

/** 费率历史 */
export async function getFundingRateHistory(symbol: string, limit = 5): Promise<number[]> {
  const raw = await apiGet<any[]>('/fapi/v1/fundingRate', { symbol, limit })
  if (!raw) return []
  return raw.map((f: any) => +f.fundingRate * 100)
}

/** OI 历史 */
export async function getOIHist(symbol: string, period = '1h', limit = 48): Promise<OIHistPoint[] | null> {
  const raw = await apiGet<any[]>('/futures/data/openInterestHist', { symbol, period, limit })
  if (!raw || !Array.isArray(raw)) return null
  return raw.map((x: any) => ({
    timestamp: x.timestamp,
    sumOpenInterest: +x.sumOpenInterest,
    sumOpenInterestValue: +x.sumOpenInterestValue,
  }))
}

/** 市值数据 */
export async function getMarketCaps(): Promise<Record<string, number>> {
  try {
    const resp = await fetch('https://www.binance.com/bapi/composite/v1/public/marketing/symbol/list', {
      signal: AbortSignal.timeout(10000),
    })
    if (!resp.ok) return {}
    const data = await resp.json()
    const map: Record<string, number> = {}
    for (const item of data.data || []) {
      const name = item.name
      const mc = item.marketCap
      if (name && mc) map[name] = +mc
    }
    return map
  } catch {
    return {}
  }
}

export async function getGlobalLongShortRatio(
  symbol: string,
  period: '5m' | '15m' | '1h' | '4h' | '1d' = '1h',
  limit = 30,
): Promise<LongShortRatio[]> {
  const resp = await fetch(`${FAPI}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=${limit}`, { signal: AbortSignal.timeout(10_000) })
  if (!resp.ok) return []
  const data = await resp.json()
  return (data || []).map((d: Record<string, unknown>) => ({
    symbol,
    longRatio: Number(d.longShortRatio || 0),
    shortRatio: 1 - Number(d.longShortRatio || 0),
    timestamp: Number(d.timestamp || 0),
  }))
}

export async function getTopTraderRatio(
  symbol: string,
  period: '5m' | '15m' | '1h' | '4h' | '1d' = '1h',
  limit = 30,
): Promise<LongShortRatio[]> {
  const resp = await fetch(`${FAPI}/futures/data/topLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=${limit}`, { signal: AbortSignal.timeout(10_000) })
  if (!resp.ok) return []
  const data = await resp.json()
  return (data || []).map((d: Record<string, unknown>) => ({
    symbol,
    longRatio: Number(d.longShortRatio || 0),
    shortRatio: 1 - Number(d.longShortRatio || 0),
    timestamp: Number(d.timestamp || 0),
  }))
}

export async function getLiquidations(limit = 50): Promise<LiquidationEvent[]> {
  const resp = await fetch(`${FAPI}/futures/data/allForceOrders?limit=${limit}`, { signal: AbortSignal.timeout(10_000) })
  if (!resp.ok) return []
  const data = await resp.json()
  return (data || []).map((d: Record<string, unknown>) => ({
    symbol: String(d.symbol || ''),
    side: String(d.side || 'LONG') as 'LONG' | 'SHORT',
    price: Number(d.price || 0),
    quantity: Number(d.origQty || 0),
    quoteQuantity: Number(d.price || 0) * Number(d.origQty || 0),
    timestamp: Number(d.time || 0),
  }))
}
