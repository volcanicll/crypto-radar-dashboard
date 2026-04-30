// === 原始数据类型 ===

export interface Kline {
  ts: number
  open: number
  high: number
  low: number
  close: number
  vol: number
}

export interface Ticker24h {
  symbol: string
  price: number
  priceChangePercent: number
  quoteVolume: number
}

export interface FundingRatePoint {
  symbol: string
  fundingRate: number
  fundingTime: number
}

export interface OIHistPoint {
  timestamp: number
  sumOpenInterest: number
  sumOpenInterestValue: number
}

// === 分析结果类型 ===

export type AccumulationStatus = 'firing' | 'warming' | 'sleeping'

export interface AccumulationResult {
  symbol: string
  coin: string
  sidewaysDays: number
  rangePct: number
  slopePct: number
  lowPrice: number
  highPrice: number
  avgVol: number
  currentPrice: number
  recentVol: number
  volBreakout: number
  score: number
  status: AccumulationStatus
  dataDays: number
}

export interface OIAlert {
  symbol: string
  coin: string
  price: number
  oiUsd: number
  oiDelta1h: number
  oiDelta6h: number
  vol24h: number
  pxChgPct: number
  fundingRate: number
  oiHist: number[]
  inPool: boolean
}

export interface ChaseCandidate {
  symbol: string
  coin: string
  frPct: number
  frDelta: number
  trend: string
  rates: number[]
  pxChg: number
  vol: number
  estMcap: number
}

export interface CombinedScore {
  symbol: string
  coin: string
  total: number
  fSc: number
  mSc: number
  sSc: number
  oSc: number
  frPct: number
  estMcap: number
  swDays: number
  d6h: number
  pxChg: number
}

export interface AmbushCandidate {
  symbol: string
  coin: string
  total: number
  mSc: number
  oSc: number
  sSc: number
  fSc: number
  estMcap: number
  d6h: number
  swDays: number
  frPct: number
  pxChg: number
}

export interface ShortFuelTarget {
  coin: string
  symbol: string
  pxChg: number
  funding: number
  vol: number
  price: number
  fuelScore: number
}

export interface HotCoin {
  coin: string
  symbol: string
  heat: number
  inCG: boolean
  volSurge: boolean
  pxChg: number
  estMcap: number
  d6h: number
  inPool: boolean
  swDays: number
  frPct: number
}

export interface CoinData {
  coin: string
  symbol: string
  pxChg: number
  vol: number
  frPct: number
  d6h: number
  oiUsd: number
  estMcap: number
  swDays: number
  poolSc: number
  inPool: boolean
  heat: number
  inCG: boolean
  volSurge: boolean
}

export interface MarketOverview {
  totalSymbols: number
  poolCount: number
  lastScanTime: string
  avgFundingRate: number
  btcPrice: number
  ethPrice: number
}

export type NarrativeCategory =
  | 'musk_trump'
  | 'binance_cz'
  | 'celebrity_viral'
  | 'flap_support'
  | 'heating'
  | 'emerging'
  | 'common'

export interface NarrativeToken {
  address: string
  chain: 'eth' | 'bsc' | 'base' | 'sol' | string
  name: string
  symbol: string
  category: NarrativeCategory
  narrative: string
  matched: string[]
  stars: number
  score: number
  mc: number
  liq: number
  volume: number
  holders: number
  smartMoney: number
  chg1h: number
  chg24h: number
  ageHours: number
  buys1h: number
  sells1h: number
  buyRatio: number
  launchpad?: string
  supportReason?: string
  url: string
  // 安全检查 (API 层填充)
  safety: 'safe' | 'warning' | 'unknown'
  safetyFlags: string[]
  // 代币描述 (API 层填充)
  description?: string
  socials?: { twitter?: string; telegram?: string; website?: string }
  // 动量追踪 (前端 tracker 填充)
  momentumSignal?: {
    pctGain: number
    rounds: number
    volIncreasing: boolean
    signalCount: number
  }
  // 去重/新颖性 (前端 tracker 填充)
  isNew: boolean
  seenCount: number
  isNovelNarrative: boolean
  isHeating: boolean
}

export interface NarrativeCluster {
  narrative: string
  category: NarrativeCategory
  score: number
  stars: number
  count: number
  chains: string[]
  totalMc: number
  totalVolume: number
  avgChg1h: number
  topToken: NarrativeToken
}

export interface NarrativeRadarData {
  updatedAt: string
  scanIntervalSec: number
  source: string
  tokens: NarrativeToken[]
  clusters: NarrativeCluster[]
}

export interface CardLayout {
  i: string
  x: number
  y: number
  w: number
  h: number
}

export interface LongShortRatio {
  symbol: string
  longRatio: number
  shortRatio: number
  timestamp: number
}

export interface LiquidationEvent {
  symbol: string
  side: 'LONG' | 'SHORT'
  price: number
  quantity: number
  quoteQuantity: number
  timestamp: number
}
