# On-Chain Narrative Radar Dashboard

链上叙事雷达仪表盘，整合：

- `On-Chain-Narrative-Radar.py` 的 GMGN / FLAP 叙事扫描思路
- Binance 永续合约收筹池、OI 异动、费率、Short Squeeze 信号
- CoinGecko 趋势热度

前端首页已经改为“叙事优先”的交易工作台：顶部主卡展示链上叙事簇、热点代币、叙事评分、链分布、买卖比和低吸形态。

## 本地开发

```bash
bun install
bun run dev
```

Vite 本地开发只运行静态前端，不会自动启动 Vercel Serverless API；`链上叙事雷达`卡片在本地可能显示 API 未连接。部署到 Vercel 后会读取 `/api/narratives`。

## Vercel 部署

项目已包含 `vercel.json`：

- `installCommand`: `bun install`
- `buildCommand`: `bun run build`
- `outputDirectory`: `dist`
- Serverless API: `api/narratives.ts`
- SPA rewrite: 非 `/api/*` 路由回落到 `index.html`

部署方式：

```bash
vercel
vercel --prod
```

或在 Vercel 控制台导入仓库，Framework 选择 Vite 即可。

## Python 扫描器

`On-Chain-Narrative-Radar.py` 仍作为本机常驻 bot 使用，包含 SQLite 去重、Telegram 推送和 30 秒轮询。Vercel 不适合运行常驻循环和本地 SQLite，因此线上仪表盘使用 `api/narratives.ts` 提供实时快照 API。
