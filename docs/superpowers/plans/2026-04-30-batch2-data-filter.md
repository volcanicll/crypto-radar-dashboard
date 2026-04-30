# Batch 2: Binance Position Data + NarrativeRadar Filter/Sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Binance long/short ratio and liquidation data, add filtering and sorting to NarrativeRadar.

**Architecture:** New API functions in binance.ts, new types, new hooks, UI enhancements in DetailDrawer/ShortFuel/NarrativeRadar.

**Tech Stack:** React, TypeScript, SWR, Binance Futures API, Recharts

---

### Task 1: Add types for LongShortRatio and LiquidationEvent

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add new types at end of file**

```typescript
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
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add LongShortRatio and LiquidationEvent types"
```

---

### Task 2: Add Binance API functions

**Files:**
- Modify: `src/api/binance.ts`

- [ ] **Step 1: Add three API functions**

Append to `src/api/binance.ts`:

```typescript
export async function getGlobalLongShortRatio(
  symbol: string,
  period: '5m' | '15m' | '1h' | '4h' | '1d' = '1h',
  limit = 30,
): Promise<LongShortRatio[]> {
  const url = `${BINANCE_FAPI}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=${limit}`
  const data = await fetchJson(url)
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
  const url = `${BINANCE_FAPI}/futures/data/topLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=${limit}`
  const data = await fetchJson(url)
  return (data || []).map((d: Record<string, unknown>) => ({
    symbol,
    longRatio: Number(d.longShortRatio || 0),
    shortRatio: 1 - Number(d.longShortRatio || 0),
    timestamp: Number(d.timestamp || 0),
  }))
}

export async function getLiquidations(limit = 50): Promise<LiquidationEvent[]> {
  const url = `${BINANCE_FAPI}/futures/data/allForceOrders?limit=${limit}`
  const data = await fetchJson(url)
  return (data || []).map((d: Record<string, unknown>) => ({
    symbol: String(d.symbol || ''),
    side: String(d.side || 'LONG') as 'LONG' | 'SHORT',
    price: Number(d.price || 0),
    quantity: Number(d.origQty || 0),
    quoteQuantity: Number(d.price || 0) * Number(d.origQty || 0),
    timestamp: Number(d.time || 0),
  }))
}
```

Note: Check if binance.ts already has a `BINANCE_FAPI` constant and a `fetchJson` helper. If `fetchJson` doesn't exist, use `fetch` with the same pattern as existing functions (10s timeout). Import the types at the top.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/api/binance.ts
git commit -m "feat(api): add Binance long/short ratio and liquidation endpoints"
```

---

### Task 3: Add SWR hooks

**Files:**
- Modify: `src/api/hooks.ts`

- [ ] **Step 1: Add imports for new functions and types**

Add to imports:
```typescript
import { getGlobalLongShortRatio, getTopTraderRatio, getLiquidations } from './binance'
import type { ..., LongShortRatio, LiquidationEvent } from '../types'
```

- [ ] **Step 2: Add useLongShortRatio hook**

```typescript
export function useLongShortRatio(symbol: string | null) {
  return useSWR<{ global: LongShortRatio[]; topTrader: LongShortRatio[] }>(
    symbol ? `ls-ratio-${symbol}` : null,
    async () => {
      const [global, topTrader] = await Promise.all([
        getGlobalLongShortRatio(symbol!),
        getTopTraderRatio(symbol!),
      ])
      return { global, topTrader }
    },
    { refreshInterval: 300_000, dedupingInterval: 240_000 },
  )
}
```

- [ ] **Step 3: Add useLiquidations hook**

```typescript
export function useLiquidations() {
  return useSWR<LiquidationEvent[]>(
    'liquidations',
    async () => {
      const data = await getLiquidations()
      return data
    },
    { refreshInterval: 60_000, dedupingInterval: 50_000 },
  )
}
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/api/hooks.ts
git commit -m "feat(hooks): add useLongShortRatio and useLiquidations hooks"
```

---

### Task 4: Enhance DetailDrawer with long/short ratio charts

**Files:**
- Modify: `src/components/layout/DetailDrawer.tsx`

- [ ] **Step 1: Add long/short ratio section**

Add import for `useLongShortRatio` hook. In the DetailDrawer component, call the hook:

```typescript
const { data: ratioData } = useLongShortRatio(symbol)
```

Add a new section below the existing OI/funding charts. Show:
- Title: "Long/Short Ratio"
- Two mini bar charts or text: Global and Top Trader
- Format: "Global: Long 52% / Short 48%" with color coding
- Use the latest data point from `ratioData?.global?.[0]` and `ratioData?.topTrader?.[0]`

Use simple inline bars (div with width%) rather than recharts for compactness:

```tsx
{ratioData && (
  <div className="mt-3">
    <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Long/Short Ratio</div>
    {ratioData.global[0] && (
      <div className="mb-1">
        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Global</div>
        <div className="flex gap-1 items-center text-[10px]">
          <span style={{ color: 'var(--green)' }}>L {(ratioData.global[0].longRatio * 100).toFixed(1)}%</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-card)' }}>
            <div className="h-full rounded-full" style={{ width: `${ratioData.global[0].longRatio * 100}%`, background: 'var(--green)' }} />
          </div>
          <span style={{ color: 'var(--red)' }}>S {(ratioData.global[0].shortRatio * 100).toFixed(1)}%</span>
        </div>
      </div>
    )}
    {ratioData.topTrader[0] && (
      <div>
        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Top Traders</div>
        <div className="flex gap-1 items-center text-[10px]">
          <span style={{ color: 'var(--green)' }}>L {(ratioData.topTrader[0].longRatio * 100).toFixed(1)}%</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-card)' }}>
            <div className="h-full rounded-full" style={{ width: `${ratioData.topTrader[0].longRatio * 100}%`, background: 'var(--green)' }} />
          </div>
          <span style={{ color: 'var(--red)' }}>S {(ratioData.topTrader[0].shortRatio * 100).toFixed(1)}%</span>
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/DetailDrawer.tsx
git commit -m "feat(ui): add long/short ratio display to DetailDrawer"
```

---

### Task 5: Add liquidation events to ShortFuel

**Files:**
- Modify: `src/components/cards/ShortFuel.tsx`

- [ ] **Step 1: Add liquidation section**

Add imports for `useLiquidations` and `LiquidationEvent`. Call the hook in the parent component that renders ShortFuel. Since ShortFuel receives props, add liquidation data as a new prop:

Add to ShortFuel's props interface:
```typescript
liquidations?: LiquidationEvent[]
```

Add a "Recent Liquidations" section at the bottom of the card showing the last 5 events:

```tsx
{liquidations && liquidations.length > 0 && (
  <div className="mt-2">
    <div className="text-[10px] mb-1 font-semibold" style={{ color: 'var(--red)' }}>
      Recent Liquidations
    </div>
    <div className="space-y-0.5">
      {liquidations.slice(0, 5).map((liq, i) => (
        <div key={i} className="flex items-center justify-between text-[10px]">
          <span style={{ color: liq.side === 'LONG' ? 'var(--red)' : 'var(--green)' }}>
            {liq.symbol.replace('USDT', '')} {liq.side === 'LONG' ? 'Long爆' : 'Short爆'}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            ${liq.quoteQuantity >= 1000 ? `${(liq.quoteQuantity / 1000).toFixed(1)}K` : liq.quoteQuantity.toFixed(0)}
          </span>
        </div>
      ))}
    </div>
  </div>
)}
```

Also update App.tsx or the parent to call `useLiquidations()` and pass data to ShortFuel.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/cards/ShortFuel.tsx src/App.tsx
git commit -m "feat(ui): add liquidation events display to ShortFuel card"
```

---

### Task 6: Add filter, sort, expand to NarrativeRadar

**Files:**
- Modify: `src/components/cards/NarrativeRadar.tsx`

- [ ] **Step 1: Add state for filter, sort, and expand**

Add useState hooks at the top of NarrativeRadar component:

```typescript
const [filter, setFilter] = useState<NarrativeCategory | 'all'>('all')
const [sortBy, setSortBy] = useState<'score' | 'chg1h' | 'buyRatio' | 'mc' | 'momentum'>('score')
const [expanded, setExpanded] = useState(false)
```

- [ ] **Step 2: Apply filter and sort**

Replace `const tokenList = data?.tokens || []` with:

```typescript
const allTokens = data?.tokens || []
const filtered = filter === 'all' ? allTokens : allTokens.filter(t => t.category === filter)
const sorted = [...filtered].sort((a, b) => {
  if (sortBy === 'momentum') {
    const aVal = a.momentumSignal ? a.momentumSignal.pctGain : -1
    const bVal = b.momentumSignal ? b.momentumSignal.pctGain : -1
    return bVal - aVal
  }
  if (sortBy === 'chg1h') return b.chg1h - a.chg1h
  if (sortBy === 'buyRatio') return b.buyRatio - a.buyRatio
  if (sortBy === 'mc') return b.mc - a.mc
  return b.score - a.score
})
const tokenList = expanded ? sorted : sorted.slice(0, 12)
```

- [ ] **Step 3: Add filter bar and sort control**

Add a filter bar and sort dropdown between the header section and the token grid in the right column. Place it right after the momentum section:

```tsx
<div className="flex items-center gap-1 mb-2 flex-wrap">
  {(['all', 'musk_trump', 'binance_cz', 'celebrity_viral', 'flap_support', 'emerging'] as const).map(cat => (
    <button
      key={cat}
      onClick={() => setFilter(cat)}
      className="text-[10px] px-1.5 py-0.5 rounded"
      style={{
        background: filter === cat ? 'var(--accent)' : 'var(--border-card)',
        color: filter === cat ? 'white' : 'var(--text-muted)',
      }}
    >
      {cat === 'all' ? 'All' : CATEGORY_LABEL[cat].label}
    </button>
  ))}
  <select
    value={sortBy}
    onChange={e => setSortBy(e.target.value as typeof sortBy)}
    className="text-[10px] px-1 py-0.5 rounded ml-auto"
    style={{ background: 'var(--border-card)', color: 'var(--text-secondary)', border: 'none' }}
  >
    <option value="score">Score</option>
    <option value="chg1h">1h Change</option>
    <option value="buyRatio">Buy Ratio</option>
    <option value="mc">Market Cap</option>
    <option value="momentum">Momentum</option>
  </select>
</div>
```

- [ ] **Step 4: Add expand button**

After the token grid, add:

```tsx
{filtered.length > 12 && (
  <button
    onClick={() => setExpanded(!expanded)}
    className="text-[10px] w-full text-center py-1 mt-1 rounded"
    style={{ color: 'var(--accent)', background: 'var(--border-card)' }}
  >
    {expanded ? 'Show less' : `Show all (${filtered.length})`}
  </button>
)}
```

- [ ] **Step 5: Show description and socials in TokenRow**

In the TokenRow component, after the `seenCount` section, add:

```tsx
{token.description && (
  <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
    {token.description}
  </div>
)}
{token.socials && (
  <div className="flex gap-2 mt-0.5">
    {token.socials.twitter && (
      <a href={token.socials.twitter} target="_blank" rel="noreferrer" className="text-[10px]" onClick={e => e.stopPropagation()}>🐦</a>
    )}
    {token.socials.telegram && (
      <a href={token.socials.telegram} target="_blank" rel="noreferrer" className="text-[10px]" onClick={e => e.stopPropagation()}>✈️</a>
    )}
    {token.socials.website && (
      <a href={token.socials.website} target="_blank" rel="noreferrer" className="text-[10px]" onClick={e => e.stopPropagation()}>🌐</a>
    )}
  </div>
)}
```

- [ ] **Step 6: Run type check**

Run: `npx tsc --noEmit`

- [ ] **Step 7: Commit**

```bash
git add src/components/cards/NarrativeRadar.tsx
git commit -m "feat(ui): add filter, sort, expand and description/socials to NarrativeRadar"
```

---

### Task 7: Build verification and push

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: successful

- [ ] **Step 2: Push all commits**

```bash
git push origin master
```
