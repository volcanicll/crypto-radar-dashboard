/** CoinGecko Trending 热度币种 */
export async function getTrendingCoins(): Promise<Set<string>> {
  try {
    const resp = await fetch('https://api.coingecko.com/api/v3/search/trending', {
      signal: AbortSignal.timeout(10000),
    })
    if (!resp.ok) return new Set()
    const data = await resp.json()
    const coins = new Set<string>()
    for (const item of data.coins || []) {
      const sym = item.item?.symbol?.toUpperCase()
      if (sym) coins.add(sym)
    }
    return coins
  } catch {
    return new Set()
  }
}
