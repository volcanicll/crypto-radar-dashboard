// === 信号变化追踪模块 ===

export type SignalChange = 'new' | 'lost' | 'persistent'
export type SignalStatusMap = Record<string, SignalChange>

const STORAGE_KEY = 'radar-signal-tracker'
const TTL_MS = 30 * 60 * 1000 // 30分钟 TTL

interface StoredSignals {
  timestamp: number
  pool: string[]
  oiAlerts: string[]
  ambush: string[]
  squeeze: string[]
  narrativeMomentum: string[]
}

function loadStored(): StoredSignals | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSignals
    if (Date.now() - parsed.timestamp > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function store(signals: StoredSignals): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...signals, timestamp: Date.now() }))
  } catch { /* ignore */ }
}

function computeDiff(current: Set<string>, previous: Set<string>): SignalStatusMap {
  const result: SignalStatusMap = {}
  for (const s of current) {
    result[s] = previous.has(s) ? 'persistent' : 'new'
  }
  for (const s of previous) {
    if (!current.has(s)) {
      result[s] = 'lost'
    }
  }
  return result
}

export interface TrackResult {
  pool: SignalStatusMap
  oiAlerts: SignalStatusMap
  ambush: SignalStatusMap
  squeeze: SignalStatusMap
  narrativeMomentum: SignalStatusMap
}

interface CurrentSignals {
  pool: string[]
  oiAlerts: string[]
  ambush: string[]
  squeeze: string[]
  narrativeMomentum: string[]
}

export function trackSignals(current: CurrentSignals): TrackResult {
  const prev = loadStored()

  const result: TrackResult = {
    pool: prev ? computeDiff(new Set(current.pool), new Set(prev.pool)) : {},
    oiAlerts: prev ? computeDiff(new Set(current.oiAlerts), new Set(prev.oiAlerts)) : {},
    ambush: prev ? computeDiff(new Set(current.ambush), new Set(prev.ambush)) : {},
    squeeze: prev ? computeDiff(new Set(current.squeeze), new Set(prev.squeeze)) : {},
    narrativeMomentum: prev ? computeDiff(new Set(current.narrativeMomentum), new Set(prev.narrativeMomentum)) : {},
  }

  // 存储当前信号集
  store({
    timestamp: Date.now(),
    pool: current.pool,
    oiAlerts: current.oiAlerts,
    ambush: current.ambush,
    squeeze: current.squeeze,
    narrativeMomentum: current.narrativeMomentum,
  })

  return result
}
