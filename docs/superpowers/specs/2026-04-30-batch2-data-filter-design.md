# Batch 2: Binance Position Data + NarrativeRadar Filter/Sort Design

## Part 1: Binance Long/Short Ratio & Liquidation Events

### New API functions (src/api/binance.ts)

Three new Binance Futures data endpoints:

1. `getGlobalLongShortRatio(symbol, period, limit)` — GET `/futures/data/globalLongShortAccountRatio`
   - Returns global long/short account ratio for a symbol
   - Period: 5m/15m/1h/4h/1d (default 1h)
   - Limit: default 30

2. `getTopTraderRatio(symbol, period, limit)` — GET `/futures/data/topLongShortAccountRatio`
   - Returns top trader long/short account ratio
   - Same params as global ratio

3. `getLiquidations()` — GET `/futures/data/allForceOrders`
   - Returns recent liquidation events across all symbols
   - Limit: default 50

### New types (src/types/index.ts)

```typescript
export interface LongShortRatio {
  symbol: string
  longRatio: number      // 0-1
  shortRatio: number     // 0-1
  timestamp: number
}

export interface LiquidationEvent {
  symbol: string
  side: 'LONG' | 'SHORT'
  price: number
  quantity: number
  quoteQuantity: number  // USD value
  timestamp: number
}
```

### New hooks (src/api/hooks.ts)

1. `useLongShortRatio(symbol: string | null)` — fetches both global and top trader ratios for a symbol, 5min refresh. Returns `{ global: LongShortRatio[], topTrader: LongShortRatio[] }`

2. `useLiquidations()` — fetches recent liquidation events, 60s refresh. Returns `LiquidationEvent[]`

### UI changes

**DetailDrawer (src/components/layout/DetailDrawer.tsx):**
- Add long/short ratio sparkline charts (global + top trader)
- Show current ratio as "Long XX% / Short XX%" text
- Below OI chart section

**ShortFuel (src/components/cards/ShortFuel.tsx):**
- Add "Recent Liquidations" section showing last 5 liquidation events
- Show symbol, side (LONG/SHORT), price, USD value
- Color: LONG liquidation = red, SHORT liquidation = green

---

## Part 2: NarrativeRadar Filter & Sort

### Filter bar (src/components/cards/NarrativeRadar.tsx)

Add a filter bar above the token list with category pill buttons:
- "All" (default, no filter)
- "Musk/Trump" → `category === 'musk_trump'`
- "Binance/CZ" → `category === 'binance_cz'`
- "Celebrity" → `category === 'celebrity_viral'`
- "FLAP" → `category === 'flap_support'`
- "Emerging" → `category === 'emerging'`

Active filter highlighted with accent color. Uses existing `CATEGORY_LABEL` map.

### Sort dropdown

A small select dropdown next to filter bar:
- Score (default)
- 1h Change (`chg1h`)
- Buy Ratio (`buyRatio`)
- Market Cap (`mc`)
- Momentum (`momentumSignal.pctGain` — puts momentum tokens first)

### Expand button

- Default shows 12 tokens (current behavior)
- "Show more" button reveals all tokens (up to 80)
- "Show less" collapses back to 12

### Description & Socials display

- Show `description` as a single-line truncated text below narrative line (if present)
- Show social icons (Twitter 🐦, Telegram ✈️, Website 🌐) as clickable links after description

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/api/binance.ts` | Modify | Add 3 API functions |
| `src/types/index.ts` | Modify | Add LongShortRatio, LiquidationEvent types |
| `src/api/hooks.ts` | Modify | Add useLongShortRatio, useLiquidations hooks |
| `src/components/layout/DetailDrawer.tsx` | Modify | Add ratio charts |
| `src/components/cards/ShortFuel.tsx` | Modify | Add liquidation events |
| `src/components/cards/NarrativeRadar.tsx` | Modify | Add filter, sort, expand, description/socials |
