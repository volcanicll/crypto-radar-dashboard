// === 自选观察列表 (localStorage) ===

const STORAGE_KEY = 'radar-watchlist'

export interface WatchlistItem {
  symbol: string
  coin: string
  addedAt: number
  priceAlert?: number // 价格提醒阈值 (可选)
}

export type Watchlist = WatchlistItem[]

export function loadWatchlist(): Watchlist {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveWatchlist(list: Watchlist): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch { /* ignore */ }
}

export function addToWatchlist(symbol: string): Watchlist {
  const list = loadWatchlist()
  if (list.some(item => item.symbol === symbol)) return list
  const coin = symbol.replace('USDT', '')
  const updated = [...list, { symbol, coin, addedAt: Date.now() }]
  saveWatchlist(updated)
  return updated
}

export function removeFromWatchlist(symbol: string): Watchlist {
  const list = loadWatchlist()
  const updated = list.filter(item => item.symbol !== symbol)
  saveWatchlist(updated)
  return updated
}

export function isInWatchlist(symbol: string): boolean {
  return loadWatchlist().some(item => item.symbol === symbol)
}

export function setPriceAlert(symbol: string, price: number): Watchlist {
  const list = loadWatchlist()
  const updated = list.map(item =>
    item.symbol === symbol ? { ...item, priceAlert: price } : item
  )
  saveWatchlist(updated)
  return updated
}

// 检查价格提醒是否触发
export function checkPriceAlerts(tickers: Record<string, { price: number }>): { symbol: string; coin: string; targetPrice: number; currentPrice: number }[] {
  const list = loadWatchlist()
  const triggered: { symbol: string; coin: string; targetPrice: number; currentPrice: number }[] = []
  for (const item of list) {
    if (!item.priceAlert) continue
    const tk = tickers[item.symbol]
    if (!tk) continue
    // 当价格从下方穿越目标价 或 从上方穿越目标价
    if (tk.price >= item.priceAlert * 0.99 && tk.price <= item.priceAlert * 1.01) {
      triggered.push({ symbol: item.symbol, coin: item.coin, targetPrice: item.priceAlert, currentPrice: tk.price })
    }
  }
  return triggered
}
