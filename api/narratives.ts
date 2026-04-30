const GMGN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  Accept: 'application/json',
  Referer: 'https://gmgn.ai/',
}

const MUSK_TRUMP_KEYWORDS = [
  'musk', 'elon', 'elonmusk', 'spacex', 'starship', 'tesla', 'cybertruck',
  'neuralink', 'boring', 'hyperloop', 'xai', 'grok', 'floki', 'dogefather',
  'mars colony', 'mars', 'trump', 'donald', 'maga', 'potus', 'trump47',
  'melania', 'barron', 'ivanka', 'dark maga', 'truth social', 'covfefe',
  'doge department', 'government efficiency',
]

const BINANCE_CZ_KEYWORDS = [
  'cz', 'changpeng', 'zhao', 'czb', 'czbinance', 'heyi', 'yi he', 'he yi',
  '何一', 'yihe', 'sister yi', '一姐', 'binance', 'bnb', 'pancake',
  'pancakeswap', 'giggle academy', 'binance life', 'bnb chain',
  'principles', 'cz book', 'yzi', 'yzi labs', '赵长鹏', '币安', '长鹏',
  'fourmeme', 'four meme', '4meme', 'czs dog', 'build on bnb',
]

const CELEBRITY_VIRAL_KEYWORDS = [
  'vitalik', 'buterin', 'sam altman', 'satoshi', 'saylor', 'cathie wood',
  'jack dorsey', 'zuckerberg', 'bezos', 'jensen huang', 'nvidia', 'tim cook',
  'justin sun', 'sun yuchen', '孙宇晨', 'tron', 'arthur hayes', 'blackrock',
  'coinbase', 'sec', 'biden', 'obama', 'putin', 'kanye', 'drake',
  'snoop dogg', 'mr beast', 'mrbeast', 'lobster', '龙虾', 'hawk tuah',
  'skibidi', 'rizz', 'sigma', 'etf', 'halving', '减半', 'fed', 'rate cut',
  'tiktok',
]

const SPAM_PATTERNS = [
  /airdrop/i, /presale/i, /pre\s*sale/i, /1000x/i, /100x guaranteed/i,
  /safe\s*moon/i, /baby\s*\w+/i, /porn/i, /xxx/i, /nsfw/i,
  /scam/i, /rugpull/i, /rug\s*pull/i, /official\s*token/i,
]

const NOISE_WORDS = new Set([
  'token', 'coin', 'inu', 'swap', 'finance', 'protocol', 'dao', 'defi',
  'nft', 'meta', 'verse', 'fi', 'ai', 'pepe', 'wojak', 'chad', 'based',
  'nice', 'good', 'bad', 'cool', 'hot', 'big', 'small', 'life', 'love',
  'cat', 'dog', 'moon', 'sun', 'star', 'king', 'queen', 'gold', 'cash',
  'money', 'pump', 'dump', 'bull', 'bear', 'hello', 'world', 'test',
  'new', 'old', 'real', 'fake', 'the', 'and', 'for', 'from', 'with',
  'this', 'that', 'meme', 'usd', 'usdt', 'usdc',
])

type RawToken = {
  address: string
  chain: string
  name: string
  symbol: string
  mc: number
  liq: number
  volume: number
  holders: number
  sm: number
  chg_1h: number
  chg_24h: number
  age_h: number
  buys_1h: number
  sells_1h: number
  launchpad?: string
  support_reason?: string
}

function timeoutSignal(ms: number) {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

async function gmgnGet(url: string) {
  try {
    const resp = await fetch(url, { headers: GMGN_HEADERS, signal: timeoutSignal(12_000) })
    if (!resp.ok) return {}
    const body = await resp.json()
    return body?.data || {}
  } catch {
    return {}
  }
}

function normalizeTheme(name: string, symbol: string) {
  const text = `${name} ${symbol}`
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\d+x?/g, '')
    .replace(/[^a-z\u4e00-\u9fa5\s]/g, ' ')

  const words = text.split(/\s+/).filter((w) => w.length > 1 && !NOISE_WORDS.has(w))
  return words.length ? [...new Set(words)].sort().join(' ') : name.toLowerCase().trim()
}

function findMatches(text: string, keywords: string[]) {
  const lower = text.toLowerCase()
  return keywords.filter((kw) => lower.includes(kw.toLowerCase())).slice(0, 5)
}

function classify(token: RawToken) {
  const text = `${token.name} ${token.symbol}`
  if (SPAM_PATTERNS.some((pattern) => pattern.test(text))) {
    return { category: 'common', matched: [], narrative: '低质量过滤', stars: 1 }
  }

  const chain = token.chain.toLowerCase()
  const mt = findMatches(text, MUSK_TRUMP_KEYWORDS)
  if (mt.length && ['eth', 'ethereum', 'sol', 'solana', 'bsc', 'base'].includes(chain)) {
    return { category: 'musk_trump', matched: mt, narrative: `马斯克/川普: ${mt.slice(0, 3).join(', ')}`, stars: 3 }
  }

  const bc = findMatches(text, BINANCE_CZ_KEYWORDS)
  if (bc.length && chain === 'bsc') {
    return { category: 'binance_cz', matched: bc, narrative: `币安/CZ: ${bc.slice(0, 3).join(', ')}`, stars: 3 }
  }

  const cv = findMatches(text, CELEBRITY_VIRAL_KEYWORDS)
  if (cv.length) {
    return { category: 'celebrity_viral', matched: cv, narrative: `名人/热点: ${cv.slice(0, 3).join(', ')}`, stars: 2 }
  }

  if (token.launchpad === 'flap') {
    return { category: 'flap_support', matched: ['flap'], narrative: 'FLAP社区低吸', stars: 2 }
  }

  const theme = normalizeTheme(token.name, token.symbol)
  const usefulWords = theme.split(/\s+/).filter((w) => w.length > 2 && !NOISE_WORDS.has(w))
  if (usefulWords.length >= 2) {
    return { category: 'emerging', matched: usefulWords.slice(0, 3), narrative: theme, stars: 2 }
  }

  return { category: 'common', matched: [], narrative: theme || '无明确叙事', stars: 1 }
}

function scoreToken(token: RawToken, stars: number) {
  const mcBand = token.mc > 0 && token.mc < 250_000 ? 18 : token.mc < 1_000_000 ? 14 : token.mc < 5_000_000 ? 8 : 4
  const liqScore = Math.min(18, Math.log10(Math.max(token.liq, 1)) * 3)
  const volScore = Math.min(18, Math.log10(Math.max(token.volume, 1)) * 2.6)
  const momentum = Math.max(0, Math.min(24, token.chg_1h / 4))
  const flow = Math.min(12, Math.max(0, token.buys_1h - token.sells_1h) / 4)
  const smart = Math.min(10, token.sm * 2)
  return Math.round(Math.min(100, stars * 8 + mcBand + liqScore + volScore + momentum + flow + smart))
}

function mapRawToken(chain: string, t: Record<string, unknown>): RawToken | null {
  const address = String(t.address || '')
  const mc = Number(t.market_cap || t.fdv || 0)
  const liq = Number(t.liquidity || 0)
  if (!address || mc < 1_000 || liq < 500 || mc > 10_000_000) return null

  const openTs = Number(t.open_timestamp || 0)
  return {
    address,
    chain,
    name: String(t.name || '?'),
    symbol: String(t.symbol || '?'),
    mc,
    liq,
    volume: Number(t.volume || 0),
    holders: Number(t.holder_count || 0),
    sm: Number(t.smart_degen_count || 0),
    chg_1h: Number(t.price_change_percent1h || 0),
    chg_24h: Number(t.price_change_percent || 0),
    age_h: openTs > 0 ? (Date.now() / 1000 - openTs) / 3600 : 999,
    buys_1h: Number(t.buys || 0),
    sells_1h: Number(t.sells || 0),
  }
}

async function fetchNewTokens() {
  const all: RawToken[] = []
  const seen = new Set<string>()

  for (const chain of ['eth', 'bsc', 'base']) {
    const urls = [
      `https://gmgn.ai/defi/quotation/v1/rank/${chain}/swaps/1h?orderby=open_timestamp&direction=desc&limit=80`,
      `https://gmgn.ai/defi/quotation/v1/rank/${chain}/swaps/1h?orderby=swaps&direction=desc&limit=50`,
    ]
    const responses = await Promise.all(urls.map(gmgnGet))
    for (const data of responses) {
      for (const raw of data?.rank || []) {
        const token = mapRawToken(chain, raw)
        if (!token || seen.has(token.address)) continue
        seen.add(token.address)
        all.push(token)
      }
    }
  }

  return all
}

async function fetchFlapTokens() {
  const data = await gmgnGet('https://gmgn.ai/defi/quotation/v1/rank/bsc/swaps/24h?launchpad=flap&orderby=volume&direction=desc&limit=30')
  const candidates: RawToken[] = []

  for (const raw of data?.rank || []) {
    const token = mapRawToken('bsc', raw)
    if (!token || token.holders < 5) continue
    const buyRatio = token.buys_1h / Math.max(token.sells_1h, 1)
    let supportReason = ''

    if (token.chg_24h < -10 && token.chg_1h > token.chg_24h * 0.3) {
      supportReason = `24h跌${token.chg_24h.toFixed(0)}%但1h企稳${token.chg_1h.toFixed(0)}%`
    }
    if (-10 <= token.chg_24h && token.chg_24h <= 30 && token.chg_1h > -5 && buyRatio > 1.1) {
      supportReason = `底部横盘 买卖比${buyRatio.toFixed(2)}`
    }
    if (token.chg_24h < -30 && token.chg_1h > 10) {
      supportReason = `大跌${token.chg_24h.toFixed(0)}%后反弹${token.chg_1h.toFixed(0)}%`
    }

    if (supportReason && buyRatio >= 1) {
      candidates.push({ ...token, launchpad: 'flap', support_reason: supportReason })
    }
  }

  return candidates
}

function buildClusters(tokens: ReturnType<typeof toNarrativeToken>[]) {
  const grouped = new Map<string, ReturnType<typeof toNarrativeToken>[]>()
  for (const token of tokens) {
    const key = `${token.category}:${token.narrative}`
    grouped.set(key, [...(grouped.get(key) || []), token])
  }

  return [...grouped.values()].map((items) => {
    const topToken = [...items].sort((a, b) => b.score - a.score)[0]
    const totalVolume = items.reduce((sum, item) => sum + item.volume, 0)
    const avgChg1h = items.reduce((sum, item) => sum + item.chg1h, 0) / items.length
    const score = Math.round(Math.min(100, topToken.score + Math.min(20, (items.length - 1) * 8) + Math.max(0, avgChg1h / 4)))
    return {
      narrative: topToken.narrative,
      category: topToken.category,
      score,
      stars: Math.max(...items.map((item) => item.stars)),
      count: items.length,
      chains: [...new Set(items.map((item) => item.chain.toUpperCase()))],
      totalMc: items.reduce((sum, item) => sum + item.mc, 0),
      totalVolume,
      avgChg1h,
      topToken,
    }
  }).sort((a, b) => b.score - a.score)
}

function toNarrativeToken(token: RawToken) {
  const classified = classify(token)
  const stars = token.launchpad === 'flap' && classified.stars < 3 && token.buys_1h > token.sells_1h * 1.5
    ? classified.stars + 1
    : classified.stars
  const score = scoreToken(token, stars)

  return {
    address: token.address,
    chain: token.chain,
    name: token.name,
    symbol: token.symbol,
    category: classified.category,
    narrative: classified.narrative,
    matched: classified.matched,
    stars,
    score,
    mc: token.mc,
    liq: token.liq,
    volume: token.volume,
    holders: token.holders,
    smartMoney: token.sm,
    chg1h: token.chg_1h,
    chg24h: token.chg_24h,
    ageHours: token.age_h,
    buys1h: token.buys_1h,
    sells1h: token.sells_1h,
    buyRatio: token.buys_1h / Math.max(token.sells_1h, 1),
    launchpad: token.launchpad,
    supportReason: token.support_reason,
    url: `https://gmgn.ai/${token.chain}/token/${token.address}`,
    safety: 'unknown',
    safetyFlags: [],
    isNew: false,
    seenCount: 0,
    isNovelNarrative: false,
    isHeating: false,
  }
}

export default async function handler(_req: unknown, res: {
  status: (code: number) => { json: (body: unknown) => void }
  setHeader: (key: string, value: string) => void
}) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')

  try {
    const [newTokens, flapTokens] = await Promise.all([fetchNewTokens(), fetchFlapTokens()])
    const byAddress = new Map<string, RawToken>()
    for (const token of [...newTokens, ...flapTokens]) byAddress.set(token.address, token)

    const tokens = [...byAddress.values()]
      .map(toNarrativeToken)
      .filter((token) => token.category !== 'common' || token.score >= 55)
      .sort((a, b) => b.score - a.score)
      .slice(0, 80)

    res.status(200).json({
      updatedAt: new Date().toISOString(),
      scanIntervalSec: 30,
      source: 'GMGN + FLAP snapshot, based on On-Chain-Narrative-Radar.py',
      tokens,
      clusters: buildClusters(tokens).slice(0, 24),
    })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Narrative scan failed' })
  }
}
