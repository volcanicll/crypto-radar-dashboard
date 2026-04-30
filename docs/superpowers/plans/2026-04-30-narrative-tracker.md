# 叙事雷达追踪系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Python 版 On-Chain-Narrative-Radar.py 的安全检查、代币描述、动量追踪、去重/新颖性四个功能移植到前端。

**Architecture:** API 层新增 GoPlus 安全检查和 DexScreener 描述获取（无状态）。前端新增 `src/logic/narrative-tracker.ts` 使用 localStorage 实现动量快照、代币去重和叙事新颖性检测（有状态）。UI 层在 NarrativeRadar.tsx 展示信号高亮和标签。

**Tech Stack:** TypeScript, React, SWR, localStorage, GoPlus API, DexScreener API

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/types/index.ts` | 修改 | NarrativeToken 新增 8 个字段 |
| `api/narratives.ts` | 修改 | 新增安全检查 + 描述获取函数 |
| `src/logic/narrative-tracker.ts` | 新增 | 动量追踪 + 去重/新颖性 localStorage 逻辑 |
| `src/api/hooks.ts` | 修改 | useNarrativeRadar 集成 tracker |
| `src/components/cards/NarrativeRadar.tsx` | 修改 | UI 展示信号/标签/按钮 |

---

### Task 1: 扩展 NarrativeToken 类型定义

**Files:**
- Modify: `src/types/index.ts:166-191`

- [ ] **Step 1: 在 NarrativeToken 接口中新增字段**

在 `src/types/index.ts` 的 `NarrativeToken` 接口中，在 `url: string` 之后添加新字段：

```typescript
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
```

- [ ] **Step 2: 在 api/narratives.ts 的 toNarrativeToken 函数中添加默认值**

在 `api/narratives.ts` 的 `toNarrativeToken` 函数返回对象末尾（`url` 之后）添加：

```typescript
    safety: 'unknown',
    safetyFlags: [],
    isNew: false,
    seenCount: 0,
    isNovelNarrative: false,
    isHeating: false,
```

- [ ] **Step 3: 运行类型检查确认无报错**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/types/index.ts api/narratives.ts
git commit -m "feat(types): NarrativeToken 新增安全检查/动量/去重字段"
```

---

### Task 2: API 层 — 安全检查

**Files:**
- Modify: `api/narratives.ts`

- [ ] **Step 1: 添加 checkTokenSafety 函数**

在 `api/narratives.ts` 中 `buildClusters` 函数之前添加：

```typescript
interface SafetyResult {
  safety: 'safe' | 'warning' | 'unknown'
  safetyFlags: string[]
}

async function checkTokenSafety(
  chain: string,
  addresses: string[],
): Promise<Map<string, SafetyResult>> {
  const results = new Map<string, SafetyResult>()
  if (!addresses.length) return results

  const chainIdMap: Record<string, string> = {
    eth: '1', bsc: '56', base: '8453', sol: 'solana',
  }
  const chainId = chainIdMap[chain]
  if (!chainId) {
    for (const addr of addresses) results.set(addr, { safety: 'unknown', safetyFlags: [] })
    return results
  }

  const url =
    chain === 'sol'
      ? `https://api.gopluslabs.io/api/v1/sol_token_security/v1?contract_addresses=${addresses.join(',')}`
      : `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${addresses.join(',')}`

  try {
    const resp = await fetch(url, { signal: timeoutSignal(5000) })
    const json = await resp.json()
    const data = json?.result || {}

    for (const addr of addresses) {
      const info = data[addr.toLowerCase()] || data[addr]
      if (!info) {
        results.set(addr, { safety: 'unknown', safetyFlags: [] })
        continue
      }

      const flags: string[] = []
      if (info.is_honeypot === '1') flags.push('honeypot')
      if (Number(info.buy_tax || 0) > 0.2 || Number(info.sell_tax || 0) > 0.2) flags.push('tax_high')
      if (info.is_open_source !== '1') flags.push('not_verified')
      if (info.is_mintable === '1') flags.push('mintable')
      if (info.is_blacklisted === '1') flags.push('blacklist')

      results.set(addr, {
        safety: flags.length > 0 ? 'warning' : 'safe',
        safetyFlags: flags,
      })
    }
  } catch {
    for (const addr of addresses) results.set(addr, { safety: 'unknown', safetyFlags: [] })
  }
  return results
}
```

- [ ] **Step 2: 添加 enrichSafety 函数**

在 `checkTokenSafety` 之后添加：

```typescript
async function enrichSafety(
  tokens: ReturnType<typeof toNarrativeToken>[],
): Promise<void> {
  const candidates = tokens.filter((t) => t.score >= 60).slice(0, 20)
  if (!candidates.length) return

  // 按链分组批量查询
  const byChain = new Map<string, string[]>()
  for (const t of candidates) {
    const list = byChain.get(t.chain) || []
    list.push(t.address)
    byChain.set(t.chain, list)
  }

  const allResults = new Map<string, SafetyResult>()
  await Promise.all(
    [...byChain.entries()].map(async ([chain, addrs]) => {
      const results = await checkTokenSafety(chain, addrs)
      for (const [addr, result] of results) allResults.set(addr, result)
    }),
  )

  for (const token of tokens) {
    const result = allResults.get(token.address)
    if (result) {
      token.safety = result.safety
      token.safetyFlags = result.safetyFlags
    }
  }
}
```

- [ ] **Step 3: 在 handler 中调用 enrichSafety**

在 `handler` 函数中，排序和截取之后、返回之前，插入调用：

在 `const tokens = [...byAddress.values()]...sort...slice(0, 80)` 之后、`res.status(200).json(...)` 之前添加：

```typescript
    await enrichSafety(tokens)
```

- [ ] **Step 4: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add api/narratives.ts
git commit -m "feat(api): 添加 GoPlus 代币安全检查"
```

---

### Task 3: API 层 — 代币描述

**Files:**
- Modify: `api/narratives.ts`

- [ ] **Step 1: 添加 fetchDescriptions 函数**

在 `enrichSafety` 函数之后添加：

```typescript
async function fetchDescriptions(
  tokens: ReturnType<typeof toNarrativeToken>[],
): Promise<void> {
  const candidates = tokens.filter((t) => t.score >= 60).slice(0, 20)
  if (!candidates.length) return

  await Promise.all(
    candidates.map(async (token) => {
      try {
        const resp = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${token.address}`,
          { signal: timeoutSignal(5000) },
        )
        const json = await resp.json()
        const pair = json?.pairs?.[0]
        if (!pair) return

        if (pair.description) token.description = pair.description
        const info = pair.info || {}
        if (info.socials?.length) {
          const socials: { twitter?: string; telegram?: string; website?: string } = {}
          for (const s of info.socials) {
            if (s.type === 'twitter' && s.url) socials.twitter = s.url
            if (s.type === 'telegram' && s.url) socials.telegram = s.url
            if (s.type === 'website' && s.url) socials.website = s.url
          }
          if (socials.twitter || socials.telegram || socials.website) {
            token.socials = socials
          }
        }
      } catch {
        // 超时或失败，保持 undefined
      }
    }),
  )
}
```

- [ ] **Step 2: 在 handler 中调用 fetchDescriptions**

在 `await enrichSafety(tokens)` 之后添加：

```typescript
    await fetchDescriptions(tokens)
```

- [ ] **Step 3: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add api/narratives.ts
git commit -m "feat(api): 添加 DexScreener 代币描述和社交链接获取"
```

---

### Task 4: 前端逻辑层 — localStorage 存储工具

**Files:**
- Create: `src/logic/narrative-tracker.ts`

- [ ] **Step 1: 创建 narrative-tracker.ts 基础结构和存储工具**

创建 `src/logic/narrative-tracker.ts`，写入基础类型和 localStorage 工具函数：

```typescript
// 动量快照
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

// 代币去重
interface SeenRecord {
  address: string
  name: string
  symbol: string
  firstSeenAt: number
  seenCount: number
  lastSeenAt: number
}

// 叙事主题
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
    // localStorage 满了，清理最旧的数据
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
```

- [ ] **Step 2: 提交**

```bash
git add src/logic/narrative-tracker.ts
git commit -m "feat(tracker): 创建 narrative-tracker 存储基础结构"
```

---

### Task 5: 前端逻辑层 — 动量追踪

**Files:**
- Modify: `src/logic/narrative-tracker.ts`

- [ ] **Step 1: 添加动量追踪函数**

在 `src/logic/narrative-tracker.ts` 末尾追加：

```typescript
import type { NarrativeToken } from '../types'

// 清理过期的动量记录
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

// 更新动量快照并检测信号
export function updateMomentum(tokens: NarrativeToken[]): void {
  const now = Date.now()
  let store = loadJson<MomentumStore>(KEYS.momentum)
  store = cleanMomentum(store, now)

  const currentAddrs = new Set(tokens.map((t) => t.address))

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
      let totalGain = 0
      for (let i = 1; i < recent.length; i++) {
        const prevMc = recent[i - 1].mc
        const currMc = recent[i].mc
        if (prevMc <= 0) { consecutiveUp = false; break }
        const gain = (currMc - prevMc) / prevMc
        if (gain <= 0) { consecutiveUp = false; break }
        totalGain += gain
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
```

- [ ] **Step 2: 提交**

```bash
git add src/logic/narrative-tracker.ts
git commit -m "feat(tracker): 实现动量追踪逻辑"
```

---

### Task 6: 前端逻辑层 — 去重/新颖性检测

**Files:**
- Modify: `src/logic/narrative-tracker.ts`

- [ ] **Step 1: 添加去重和新颖性检测函数**

在 `src/logic/narrative-tracker.ts` 末尾追加：

```typescript
// 清理过期的去重/主题记录
function cleanStore<T extends Record<string, { lastSeenAt?: number; lastTs?: number }>>(
  store: T,
  maxAge: number,
  now: number,
): T {
  const cleaned = {} as T
  for (const [key, record] of Object.entries(store)) {
    const lastTime = (record as Record<string, unknown>).lastSeenAt as number
      || (record as Record<string, unknown>).lastTs as number
      || 0
    if (now - lastTime < maxAge) {
      cleaned[key] = record
    }
  }
  return cleaned
}

// 更新去重和新颖性状态
export function updateSeenAndThemes(tokens: NarrativeToken[]): void {
  const now = Date.now()
  let seenStore = loadJson<SeenStore>(KEYS.seen)
  let themeStore = loadJson<ThemeStore>(KEYS.themes)

  seenStore = cleanStore(seenStore, SEVEN_DAYS, now)
  themeStore = cleanStore(themeStore, SEVEN_DAYS, now)

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
```

- [ ] **Step 2: 添加统一入口函数**

在末尾追加：

```typescript
// 统一入口：SWR 每次拿到新数据后调用
export function processNarrativeData(tokens: NarrativeToken[]): void {
  updateSeenAndThemes(tokens)
  updateMomentum(tokens)
}

// 手动触发：仅执行动量检查（用户点击按钮时调用）
export function manualMomentumCheck(tokens: NarrativeToken[]): void {
  updateMomentum(tokens)
}
```

- [ ] **Step 3: 提交**

```bash
git add src/logic/narrative-tracker.ts
git commit -m "feat(tracker): 实现去重/新颖性检测和统一入口"
```

---

### Task 7: 集成 tracker 到 SWR hook

**Files:**
- Modify: `src/api/hooks.ts`

- [ ] **Step 1: 在 useNarrativeRadar 中集成 processNarrativeData**

修改 `src/api/hooks.ts` 中的 `useNarrativeRadar` 函数。添加导入：

```typescript
import { processNarrativeData } from '../logic/narrative-tracker'
```

将 `useNarrativeRadar` 函数改为：

```typescript
export function useNarrativeRadar() {
  return useSWR<NarrativeRadarData>(
    'narrative-radar',
    async () => {
      const resp = await fetch('/api/narratives')
      if (!resp.ok) throw new Error('Narrative radar API unavailable')
      const data = await resp.json()
      if (data.tokens) processNarrativeData(data.tokens)
      return data
    },
    { refreshInterval: 30_000, dedupingInterval: 20_000 },
  )
}
```

- [ ] **Step 2: 导出 manualMomentumCheck**

在同一文件的导入行追加：

```typescript
import { processNarrativeData, manualMomentumCheck } from '../logic/narrative-tracker'
```

- [ ] **Step 3: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/api/hooks.ts
git commit -m "feat(hooks): 集成 narrative-tracker 到 useNarrativeRadar"
```

---

### Task 8: UI — NarrativeRadar 组件更新

**Files:**
- Modify: `src/components/cards/NarrativeRadar.tsx`

- [ ] **Step 1: 添加新导入和 Props 扩展**

在 `NarrativeRadar.tsx` 顶部添加导入：

```typescript
import { manualMomentumCheck } from '../../logic/narrative-tracker'
```

修改 `Props` 接口为：

```typescript
interface Props {
  data: NarrativeRadarData | undefined
  error?: unknown
  tokens?: NarrativeToken[]
  onManualCheck?: (tokens: NarrativeToken[]) => void
}
```

- [ ] **Step 2: 更新 TokenRow 组件**

替换整个 `TokenRow` 函数为：

```typescript
function TokenRow({ token }: { token: NarrativeToken }) {
  const category = CATEGORY_LABEL[token.category]
  return (
    <a
      href={token.url}
      target="_blank"
      rel="noreferrer"
      className="block rounded px-2 py-1.5 table-row"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm truncate" style={{ color: 'var(--accent)' }}>
              {token.symbol}
            </span>
            <Pill label={token.chain.toUpperCase()} color={category.color} />
            <Stars count={token.stars} />
            {token.momentumSignal && (
              <span className="text-xs" title={`连涨${token.momentumSignal.rounds}轮 +${token.momentumSignal.pctGain.toFixed(1)}%`}>
                🔥
              </span>
            )}
            {token.safety === 'safe' && (
              <span className="text-[10px]" title="安全" style={{ color: 'var(--green)' }}>🛡️</span>
            )}
            {token.safety === 'warning' && (
              <span className="text-[10px]" title={`风险: ${token.safetyFlags.join(', ')}`} style={{ color: 'var(--red)' }}>⚠️</span>
            )}
            {token.isNew && (
              <Pill label="新" color="#3b82f6" />
            )}
            {token.isNovelNarrative && (
              <Pill label="新叙事" color="#8b5cf6" />
            )}
            {token.isHeating && (
              <Pill label="升温" color="#f97316" />
            )}
          </div>
          <div className="truncate text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {token.narrative}
          </div>
        </div>
        <div className="w-24 shrink-0">
          <ScoreBar score={token.score} max={100} color={category.color} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-1 text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
        <span>MC {fmtMcap(token.mc)}</span>
        <span>Liq {fmtMcap(token.liq)}</span>
        <span style={{ color: token.chg1h >= 0 ? 'var(--green)' : 'var(--red)' }}>
          1h {fmtPct(token.chg1h, 0)}
        </span>
        <span>买卖 {token.buyRatio.toFixed(1)}</span>
      </div>
      {token.supportReason && (
        <div className="mt-1 text-[10px]" style={{ color: 'var(--green)' }}>
          {token.supportReason}
        </div>
      )}
      {token.momentumSignal && (
        <div className="mt-1 text-[10px]" style={{ color: 'var(--green)' }}>
          连涨{token.momentumSignal.rounds}轮 +{token.momentumSignal.pctGain.toFixed(1)}%
          {token.momentumSignal.volIncreasing ? ' · 放量' : ''}
          {token.momentumSignal.signalCount > 1 ? ` · #${token.momentumSignal.signalCount}` : ''}
        </div>
      )}
      {token.seenCount > 1 && (
        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          已出现 {token.seenCount} 次
        </div>
      )}
    </a>
  )
}
```

- [ ] **Step 3: 更新 NarrativeRadar 主组件 — 添加动量统计和手动按钮**

替换 `NarrativeRadar` 函数为：

```typescript
export default function NarrativeRadar({ data, error, tokens }: Props) {
  const clusters = data?.clusters || []
  const tokenList = data?.tokens || []
  const topCluster = clusters[0]
  const momentumCount = tokenList.filter((t) => t.momentumSignal).length
  const newCount = tokenList.filter((t) => t.isNew).length

  return (
    <CardShell
      title="链上叙事雷达"
      icon="🛰️"
      extra={
        <div className="flex items-center gap-3 text-xs">
          {momentumCount > 0 && (
            <span style={{ color: 'var(--green)' }}>🔥 {momentumCount}</span>
          )}
          {newCount > 0 && (
            <span style={{ color: '#3b82f6' }}>新 {newCount}</span>
          )}
          <span style={{ color: error ? 'var(--red)' : 'var(--text-muted)' }}>
            {error ? 'API未连接' : data ? new Date(data.updatedAt).toLocaleTimeString('zh-CN', { hour12: false }) : '扫描中'}
          </span>
        </div>
      }
    >
      {!data && !error ? (
        <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--text-muted)' }}>
          正在读取 GMGN / FLAP 快照...
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-full text-xs text-center px-6" style={{ color: 'var(--text-muted)' }}>
          本地 Vite 不会自动运行 Vercel API。部署到 Vercel 后此卡片会读取 /api/narratives。
        </div>
      ) : (
        <div className="h-full grid grid-cols-[1.05fr_1.4fr] gap-3 overflow-hidden max-[900px]:grid-cols-1">
          <div className="overflow-auto pr-1">
            <div
              className="rounded p-3 mb-2"
              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid var(--border-card)' }}
            >
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>当前主线</div>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {topCluster?.narrative || '等待新信号'}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {topCluster ? `${topCluster.count} 个币 · ${topCluster.chains.join('/')}` : '暂无叙事簇'}
                  </div>
                </div>
                <div className="w-24">
                  <ScoreBar score={topCluster?.score || 0} max={100} color="var(--accent)" size="md" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              {clusters.slice(0, 8).map((cluster) => {
                const category = CATEGORY_LABEL[cluster.category]
                return (
                  <div key={`${cluster.category}-${cluster.narrative}`} className="rounded px-2 py-1.5 table-row">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Pill label={category.label} color={category.color} />
                          <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                            {cluster.narrative}
                          </span>
                        </div>
                        <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                          {cluster.count}币 · Vol {fmtMcap(cluster.totalVolume)} · 均1h {fmtPct(cluster.avgChg1h, 0)}
                        </div>
                      </div>
                      <span className="text-sm font-bold tabular-nums" style={{ color: category.color }}>
                        {cluster.score}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="overflow-auto pr-1">
            {/* 动量信号代币优先展示 */}
            {momentumCount > 0 && (
              <div className="mb-2">
                <div className="text-[10px] mb-1 font-semibold" style={{ color: 'var(--green)' }}>
                  动量信号 ({momentumCount})
                </div>
                <div className="grid grid-cols-2 gap-2 max-[1100px]:grid-cols-1">
                  {tokenList.filter((t) => t.momentumSignal).slice(0, 6).map((token) => (
                    <TokenRow key={token.address} token={token} />
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 max-[1100px]:grid-cols-1">
              {tokenList.slice(0, 12).map((token) => (
                <TokenRow key={token.address} token={token} />
              ))}
            </div>
          </div>
        </div>
      )}
    </CardShell>
  )
}
```

- [ ] **Step 4: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add src/components/cards/NarrativeRadar.tsx
git commit -m "feat(ui): NarrativeRadar 展示动量/安全/新颖性标签"
```

---

### Task 9: 验证构建

**Files:** 无文件改动

- [ ] **Step 1: 运行完整构建**

Run: `npm run build`
Expected: 构建成功，无错误

- [ ] **Step 2: 运行 lint**

Run: `npx eslint src/logic/narrative-tracker.ts api/narratives.ts src/api/hooks.ts src/components/cards/NarrativeRadar.tsx`
Expected: 无错误或仅有可忽略的警告

- [ ] **Step 3: 启动开发服务器验证**

Run: `npm run dev`

打开浏览器访问，检查：
- NarrativeRadar 卡片正常渲染
- 无控制台错误
- localStorage 中 `narrative-momentum`、`narrative-seen`、`narrative-themes` 三个 key 被创建

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "feat(narrative-tracker): 完成安全检查/动量追踪/去重/新颖性四功能"
```
