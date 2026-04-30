# Accumulation Radar Dashboard

A narrative-first crypto trading workbench combining on-chain narrative scanning, Binance perpetual futures analytics, and CoinGecko trending data into a single real-time dashboard.

## Features

### On-Chain Narrative Radar

Real-time scanning of new tokens across ETH, BSC, Base, and Solana via GMGN and FLAP APIs:

- **Narrative classification** — Musk/Trump, Binance/CZ, celebrity/viral, FLAP community, emerging narratives with 1-3 star ratings
- **Momentum tracking** — Detects tokens with 3+ consecutive rounds of price gains (5%+ threshold) with volume confirmation
- **Token safety checks** — GoPlus API integration for honeypot, tax, mintable, and blacklist detection
- **Deduplication & novelty** — localStorage-based tracking of seen tokens and narrative themes, with heating detection (3+ tokens per theme)
- **Token descriptions** — DexScreener integration for project descriptions and social links

### Binance Futures Analytics

- **Accumulation pools** — Detect wallets accumulating perpetual futures positions
- **Open interest anomalies** — OI spike detection with price divergence signals
- **Short squeeze signals** — Funding rate + volume + OI combination fuel indicator
- **Comprehensive scoring** — Multi-factor scoring across accumulation, OI, and market metrics

### Market Overview

- CoinGecko trending coins
- Binance market-wide tickers and funding rates

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, SWR
- **API:** Vercel Serverless Functions (Bun runtime)
- **Data Sources:** GMGN, FLAP, Binance, CoinGecko, GoPlus, DexScreener
- **State:** localStorage for momentum snapshots and dedup history

## Project Structure

```
api/
  narratives.ts          # Serverless API — token scanning, classification, safety, descriptions
src/
  api/                   # Data fetching hooks (SWR)
    binance.ts           # Binance futures API
    coingecko.ts         # CoinGecko trending API
    hooks.ts             # SWR hooks for all data sources
  components/
    cards/               # Dashboard card components
      NarrativeRadar.tsx # On-chain narrative radar card
      AccumulationPool.tsx
      OIMonitor.tsx
      ShortFuel.tsx
      ...
    layout/              # Dashboard grid, detail drawer, status bar
    shared/              # CardShell, ScoreBar, Sparkline, StatusPill
  logic/
    narrative-tracker.ts # Momentum tracking, dedup, novelty detection (localStorage)
    accumulation.ts      # Accumulation analysis
    oi-detector.ts       # OI anomaly detection
    scoring.ts           # Multi-factor scoring engine
    short-fuel.ts        # Short squeeze fuel calculator
  types/
    index.ts             # All TypeScript type definitions
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- Node.js >= 20 (for Vercel CLI if deploying manually)

### Local Development

```bash
bun install
bun run dev
```

Open `http://localhost:5173`. Note: The narrative radar card requires the Vercel Serverless API. In local dev mode, it will show "API unavailable" — this is expected.

### Vercel Deployment (One-Click)

1. Push this repo to GitHub
2. Import the repo in [Vercel Dashboard](https://vercel.com/new)
3. Framework preset: **Vite** (auto-detected)
4. Deploy — no additional configuration needed

The included `vercel.json` handles everything:

- Build command: `bun run build`
- Output directory: `dist`
- Serverless function: `api/narratives.ts` (30s timeout)
- SPA rewrite: all non-API routes fallback to `index.html`

### Manual Vercel Deploy

```bash
npx vercel
npx vercel --prod
```

## Data Refresh Intervals

| Data Source | Interval | Storage |
|---|---|---|
| GMGN / FLAP tokens | 30s (SWR) | None (stateless API) |
| GoPlus safety checks | 30s (with token refresh) | None |
| DexScreener descriptions | 30s (with token refresh) | None |
| Momentum snapshots | 30s (SWR-driven) | localStorage (12h TTL) |
| Token dedup history | 30s (SWR-driven) | localStorage (7d TTL) |
| Narrative themes | 30s (SWR-driven) | localStorage (7d TTL) |
| Binance market data | 60s | None |
| Accumulation analysis | 5min | None |

## Environment Variables

No environment variables required for deployment. All data sources use public APIs.

## License

Private project. All rights reserved.
