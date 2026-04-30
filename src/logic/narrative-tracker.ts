import type { NarrativeToken } from '../types'

// === 动量快照类型 ===

interface MomentumSnapshot {
  ts: number
  mc: number
  vol: number
  buys: number
}

interface MomentumRecord {
  snapshots: MomentumSnapshot[]
  signalCount: number
  lastSignalMc: number
  lastSignalTs: number
}

// === 代币去重类型 ===

interface SeenRecord {
  address: string
  name: string
  symbol: string
  firstSeenAt: number
  seenCount: number
  lastSeenAt: number
}

// === 叙事主题类型 ===

interface ThemeRecord {
  theme: string
  tokenCount: number
  firstSeenAt: number
  lastSeenAt: number
  sampleAddresses: string[]
}

type MomentumStore = Record<string, MomentumRecord>
type SeenStore = Record<string, SeenRecord>
type ThemeStore = Record<string, ThemeRecord>

// === 常量 ===

const KEYS = {
  momentum: 'narrative-momentum',
  seen: 'narrative-seen',
  themes: 'narrative-themes',
} as const

const TWELVE_HOURS = 12 * 60 * 60 * 1000
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
const MAX_SNAPSHOTS = 20
const MOMENTUM_CONSECUTIVE_UP = 3
const MOMENTUM_MIN_GAIN_PCT = 5

// === localStorage 工具 ===

function loadJson<T>(key: string): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : ({} as T)
  } catch {
    return {} as T
  }
}

function saveJson(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // localStorage 满了，清理最旧的数据后重试
    cleanAll()
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch {
      // 仍然失败则放弃
    }
  }
}

function cleanAll(): void {
  for (const key of Object.values(KEYS)) {
    localStorage.removeItem(key)
  }
}

// === 动量追踪 ===

function cleanMomentum(store: MomentumStore, now: number): MomentumStore {
  const cleaned: MomentumStore = {}
  for (const [addr, record] of Object.entries(store)) {
    const lastTs = record.snapshots.at(-1)?.ts ?? 0
    if (now - lastTs < TWELVE_HOURS) {
      cleaned[addr] = record
    }
  }
  return cleaned
}

function updateMomentum(tokens: NarrativeToken[]): void {
  const now = Date.now()
  let store = loadJson<MomentumStore>(KEYS.momentum)
  store = cleanMomentum(store, now)

  for (const token of tokens) {
    if (token.mc < 1000 || token.liq < 500 || token.mc > 10_000_000) continue

    const record = store[token.address] || {
      snapshots: [],
      signalCount: 0,
      lastSignalMc: 0,
      lastSignalTs: 0,
    }

    const snapshot: MomentumSnapshot = {
      ts: now,
      mc: token.mc,
      vol: token.volume,
      buys: token.buys1h,
    }

    // 跳过重复数据（与上一条完全一样）
    const last = record.snapshots.at(-1)
    if (last && last.mc === snapshot.mc && last.vol === snapshot.vol) continue

    record.snapshots.push(snapshot)

    // 只保留最近 20 个快照
    if (record.snapshots.length > MAX_SNAPSHOTS) {
      record.snapshots = record.snapshots.slice(-MAX_SNAPSHOTS)
    }

    // 至少需要 N 个快照
    if (record.snapshots.length >= MOMENTUM_CONSECUTIVE_UP) {
      const recent = record.snapshots.slice(-MOMENTUM_CONSECUTIVE_UP)

      let consecutiveUp = true
      for (let i = 1; i < recent.length; i++) {
        const prevMc = recent[i - 1].mc
        const currMc = recent[i].mc
        if (prevMc <= 0) { consecutiveUp = false; break }
        const gain = (currMc - prevMc) / prevMc
        if (gain <= 0) { consecutiveUp = false; break }
      }

      if (consecutiveUp) {
        const firstMc = recent[0].mc
        const lastMc = recent.at(-1)!.mc
        const pctGain = firstMc > 0 ? ((lastMc - firstMc) / firstMc) * 100 : 0

        if (pctGain >= MOMENTUM_MIN_GAIN_PCT) {
          // 必须比上次信号市值还高
          if (record.signalCount > 0 && lastMc <= record.lastSignalMc) {
            store[token.address] = record
            continue
          }

          // 放量检测
          let volIncreasing = true
          for (let i = 1; i < recent.length; i++) {
            if (recent[i].buys < recent[i - 1].buys * 0.8) {
              volIncreasing = false
              break
            }
          }

          record.signalCount++
          record.lastSignalMc = lastMc
          record.lastSignalTs = now

          token.momentumSignal = {
            pctGain,
            rounds: recent.length,
            volIncreasing,
            signalCount: record.signalCount,
          }
        }
      }
    }

    store[token.address] = record
  }

  saveJson(KEYS.momentum, store)
}

// === 去重/新颖性 ===

function cleanSeenStore(store: SeenStore, maxAge: number, now: number): SeenStore {
  const cleaned: SeenStore = {}
  for (const [key, record] of Object.entries(store)) {
    if (now - record.lastSeenAt < maxAge) cleaned[key] = record
  }
  return cleaned
}

function cleanThemeStore(store: ThemeStore, maxAge: number, now: number): ThemeStore {
  const cleaned: ThemeStore = {}
  for (const [key, record] of Object.entries(store)) {
    if (now - record.lastSeenAt < maxAge) cleaned[key] = record
  }
  return cleaned
}

function updateSeenAndThemes(tokens: NarrativeToken[]): void {
  const now = Date.now()
  let seenStore = loadJson<SeenStore>(KEYS.seen)
  let themeStore = loadJson<ThemeStore>(KEYS.themes)

  seenStore = cleanSeenStore(seenStore, SEVEN_DAYS, now)
  themeStore = cleanThemeStore(themeStore, SEVEN_DAYS, now)

  for (const token of tokens) {
    // 代币去重
    const existing = seenStore[token.address]
    if (existing) {
      existing.seenCount++
      existing.lastSeenAt = now
      token.isNew = false
      token.seenCount = existing.seenCount
    } else {
      seenStore[token.address] = {
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        firstSeenAt: now,
        seenCount: 1,
        lastSeenAt: now,
      }
      token.isNew = true
      token.seenCount = 1
    }

    // 叙事主题新颖性
    const theme = token.narrative
    if (theme && token.category !== 'common') {
      const themeRec = themeStore[theme]
      if (themeRec) {
        themeRec.tokenCount++
        themeRec.lastSeenAt = now
        if (!themeRec.sampleAddresses.includes(token.address) && themeRec.sampleAddresses.length < 5) {
          themeRec.sampleAddresses.push(token.address)
        }
        token.isNovelNarrative = false
        token.isHeating = themeRec.tokenCount >= 3
      } else {
        themeStore[theme] = {
          theme,
          tokenCount: 1,
          firstSeenAt: now,
          lastSeenAt: now,
          sampleAddresses: [token.address],
        }
        token.isNovelNarrative = true
        token.isHeating = false
      }
    } else {
      token.isNovelNarrative = false
      token.isHeating = false
    }
  }

  saveJson(KEYS.seen, seenStore)
  saveJson(KEYS.themes, themeStore)
}

// === 导出接口 ===

// 统一入口：SWR 每次拿到新数据后调用
export function processNarrativeData(tokens: NarrativeToken[]): void {
  updateSeenAndThemes(tokens)
  updateMomentum(tokens)
}

// 手动触发：仅执行动量检查（用户点击按钮时调用）
export function manualMomentumCheck(tokens: NarrativeToken[]): void {
  updateMomentum(tokens)
}
