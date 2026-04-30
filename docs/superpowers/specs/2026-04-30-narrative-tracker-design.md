# 叙事雷达追踪系统设计

> 将 Python 版 `On-Chain-Narrative-Radar.py` 的四个核心功能移植到前端：安全检查、代币描述、动量追踪、去重/新颖性检测。

## 背景

当前前端项目是一个无状态快照式仪表盘（`api/narratives.ts` → SWR 30s 轮询 → `NarrativeRadar.tsx`），缺少 Python 版的信号逻辑和安全检查。本次设计在不引入外部依赖的前提下，通过 localStorage 实现有状态追踪。

## 架构概览

```
api/narratives.ts (Vercel Serverless)
  ├─ 现有: GMGN/FLAP 数据获取、叙事分类、评分
  ├─ 新增: GoPlus 安全检查 (并发, 前20个高分代币)
  └─ 新增: DexScreener 社交链接/描述 (并发, 前20个高分代币)

src/logic/narrative-tracker.ts (新增)
  ├─ 动量追踪: localStorage 快照对比 → 连续上涨信号
  ├─ 去重: localStorage 记录已见代币地址
  └─ 新颖性: localStorage 记录叙事主题, 模糊匹配

src/api/hooks.ts
  └─ useNarrativeRadar: SWR 刷新后调用 tracker 更新状态

src/components/cards/NarrativeRadar.tsx
  ├─ 动量信号高亮 (绿色火焰)
  ├─ 安全状态标签 (安全/警告/未知)
  ├─ 新叙事徽章 (新/新叙事/升温)
  └─ 手动检查按钮
```

## 功能 1: 安全检查

### API 层改动

在 `api/narratives.ts` 的 `handler` 中，对 `score >= 60` 的代币并发调用 GoPlus 安全 API：

```
GET https://api.gopluslabs.io/api/v1/token_security/{chain}?contract_addresses={addr1},{addr2},...
```

- GoPlus 支持批量查询（逗号分隔地址），减少请求数
- 最多检查前 20 个高分代币
- 超时 5 秒，失败默认 `unknown`，不阻塞主流程
- 判定逻辑：honeypot=true / tax > 20% / 不开源 → `warning`，否则 `safe`

### 类型扩展

```typescript
// NarrativeToken 新增字段
safety: 'safe' | 'warning' | 'unknown'
safetyFlags: string[]  // 如 ['honeypot', 'tax_high', 'not_verified']
```

### UI 展示

- `safe` → 绿色盾牌图标
- `warning` → 红色警告图标 + 悬浮显示具体风险
- `unknown` → 灰色问号

## 功能 2: 代币描述

### API 层改动

在 `handler` 中，对前 20 个高分代币并发调用 DexScreener：

```
GET https://api.dexscreener.com/latest/dex/tokens/{addr}
```

- 超时 5 秒，失败返回空值
- 提取 `description`、`socials`（twitter/telegram/website）

### 类型扩展

```typescript
// NarrativeToken 新增字段
description?: string
socials?: {
  twitter?: string
  telegram?: string
  website?: string
}
```

### UI 展示

- 代币行展开详情时显示描述和社交链接图标

## 功能 3: 动量追踪

### 核心逻辑 (`src/logic/narrative-tracker.ts`)

SWR 每 30 秒返回新数据后：

1. **快照记录** — 对每个代币记录 `{ ts, mc, vol, buys }`
2. **去重跳过** — 与上一条快照完全相同则跳过（GMGN 有缓存）
3. **连续上涨检测** — 取最近 3 个快照，检查每轮市值递增
4. **放量确认** — 买单数是否增加（允许 0.8x 波动）
5. **信号触发** — 连续涨 + 总涨幅 ≥ 5% → 动量信号
6. **信号计数** — 同一代币重复触发时 count++，必须市值高于上次信号时才触发

### 数据结构

```typescript
interface MomentumSnapshot {
  ts: number
  mc: number
  vol: number
  buys: number
}

interface MomentumRecord {
  snapshots: MomentumSnapshot[]  // 最多 20 条
  signalCount: number
  lastSignalMc: number
  lastSignalTs: number
}

// localStorage key: 'narrative-momentum'
// 类型: Record<string, MomentumRecord>
```

### 清理策略

- 每个代币最多 20 个快照
- 12 小时未出现的代币自动清理
- 每次 SWR 刷新时执行清理

### 触发方式

- **自动**: SWR 30s 轮询后自动执行
- **手动**: "检查动量"按钮触发即时对比

### 类型扩展

```typescript
// NarrativeToken 新增字段
momentumSignal?: {
  pctGain: number       // 总涨幅
  rounds: number        // 连涨轮数
  volIncreasing: boolean
  signalCount: number   // 第几次信号
}
```

## 功能 4: 去重/新颖性检测

### 核心逻辑 (`src/logic/narrative-tracker.ts`)

SWR 返回新数据后：

1. **代币去重** — address 查 localStorage，已见过 → `seenCount++`，首次 → 标记"新"
2. **叙事新颖性** — 归一化主题字符串匹配历史，全新 → 标记"新叙事"
3. **热度检测** — 同主题累计 ≥ 3 个不同代币 → 标记"升温"

### 数据结构

```typescript
interface SeenRecord {
  address: string
  name: string
  symbol: string
  firstSeenAt: number
  seenCount: number
  lastSeenAt: number
}

interface ThemeRecord {
  theme: string
  tokenCount: number
  firstSeenAt: number
  lastSeenAt: number
  sampleAddresses: string[]  // 最多 5 个
}

// localStorage keys:
// 'narrative-seen'   → Record<string, SeenRecord>
// 'narrative-themes' → Record<string, ThemeRecord>
```

### 清理策略

- 7 天未见到的代币/主题自动清理
- 每次 SWR 刷新时执行清理

### 类型扩展

```typescript
// NarrativeToken 新增字段
isNew: boolean            // 首次发现
seenCount: number         // 历史出现次数
isNovelNarrative: boolean // 全新叙事
isHeating: boolean        // 叙事升温（同主题≥3代币）
```

## localStorage 容量预估

| 存储项 | 7 天总量 | 说明 |
|--------|---------|------|
| `narrative-momentum` | ~120 KB | 12h 自动清理，活跃代币 ~50 个 |
| `narrative-seen` | ~420 KB | ~200 条/天 × 7 天 × 300B |
| `narrative-themes` | ~84 KB | ~30 条/天 × 7 天 × 400B |
| **总计** | **~624 KB** | 远低于浏览器 5-10 MB 限制 |

## 文件改动清单

| 文件 | 操作 | 改动内容 |
|------|------|---------|
| `api/narratives.ts` | 修改 | 新增 GoPlus 安全检查 + DexScreener 描述获取 |
| `src/types/index.ts` | 修改 | NarrativeToken 新增 8 个字段 |
| `src/logic/narrative-tracker.ts` | **新增** | 动量追踪 + 去重/新颖性逻辑 |
| `src/api/hooks.ts` | 修改 | useNarrativeRadar 调用 tracker |
| `src/components/cards/NarrativeRadar.tsx` | 修改 | 信号高亮 + 安全标签 + 徽章 + 手动按钮 |
