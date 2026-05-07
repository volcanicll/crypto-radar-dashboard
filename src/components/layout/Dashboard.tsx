import { memo, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { ResponsiveGridLayout, useContainerWidth, verticalCompactor } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import type { LayoutItem } from 'react-grid-layout'
import AccumulationPool from '../cards/AccumulationPool'
import OIMonitor from '../cards/OIMonitor'
import ChaseStrategy from '../cards/ChaseStrategy'
import CombinedStrategy from '../cards/CombinedStrategy'
import ShortFuel from '../cards/ShortFuel'
import AmbushStrategy from '../cards/AmbushStrategy'
import NarrativeRadar from '../cards/NarrativeRadar'
import ErrorBoundary from '../shared/ErrorBoundary'
import CardSkeleton from '../shared/CardSkeleton'
import type { AccumulationResult, OIAlert, ChaseCandidate, CombinedScore, AmbushCandidate, ShortFuelTarget, NarrativeRadarData, LiquidationEvent } from '../../types'
import type { TrackResult } from '../../logic/signal-tracker'

const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: 'narrative', x: 0, y: 0, w: 6, h: 6, minW: 4, minH: 4, maxH: 6 },
  { i: 'combined', x: 6, y: 0, w: 3, h: 6, minW: 2, minH: 4, maxH: 6 },
  { i: 'oi', x: 9, y: 0, w: 3, h: 6, minW: 2, minH: 4, maxH: 6 },
  { i: 'pool', x: 0, y: 6, w: 3, h: 6, minW: 2, minH: 4, maxH: 6 },
  { i: 'chase', x: 3, y: 6, w: 2, h: 6, minW: 2, minH: 4, maxH: 6 },
  { i: 'shortFuel', x: 5, y: 6, w: 4, h: 6, minW: 2, minH: 4, maxH: 6 },
  { i: 'ambush', x: 9, y: 6, w: 3, h: 6, minW: 2, minH: 4, maxH: 6 },
]

const GRID_ROWS = 12
const GRID_MARGIN: [number, number] = [8, 8]
const LAYOUT_KEY = 'dashboard-layout-single-screen-v1'

function normalizeLayout(layout: readonly LayoutItem[] | undefined, cols = 12): LayoutItem[] {
  const savedById = new Map((layout || []).map(item => [item.i, item]))
  const merged = DEFAULT_LAYOUT.map(defaultItem => {
    const saved = savedById.get(defaultItem.i)
    const w = Math.min(saved?.w ?? defaultItem.w, cols)
    const minW = Math.min(defaultItem.minW ?? 1, cols)
    const h = Math.min(Math.max(saved?.h ?? defaultItem.h, defaultItem.minH ?? 1), defaultItem.maxH ?? GRID_ROWS)
    return {
      ...defaultItem,
      ...saved,
      minW,
      w: Math.max(Math.min(w, cols), minW),
      x: Math.min(Math.max(saved?.x ?? defaultItem.x, 0), Math.max(cols - w, 0)),
      y: Math.min(Math.max(saved?.y ?? defaultItem.y, 0), Math.max(GRID_ROWS - h, 0)),
      h,
    }
  })
  return [...verticalCompactor.compact(merged, cols)]
}

function loadLayout(): LayoutItem[] | undefined {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY)
    return raw ? normalizeLayout(JSON.parse(raw)) : undefined
  } catch {
    return undefined
  }
}

function saveLayout(layout: LayoutItem[]): void {
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)) } catch { /* ignore */ }
}

const COLS = { lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }

interface Props {
  pool: AccumulationResult[]
  oiAlerts: OIAlert[]
  chase: ChaseCandidate[]
  combined: CombinedScore[]
  ambush: AmbushCandidate[]
  fuel: ShortFuelTarget[]
  squeeze: ShortFuelTarget[]
  liquidations?: LiquidationEvent[]
  narrative: NarrativeRadarData | undefined
  narrativeError?: unknown
  loading?: {
    narrative?: boolean
    pool?: boolean
    oi?: boolean
    scores?: boolean
    shortFuel?: boolean
  }
  onSelectSymbol: (symbol: string) => void
  signalDiff?: TrackResult
}

function Dashboard({
  pool, oiAlerts, chase, combined, ambush, fuel, squeeze, liquidations, narrative, narrativeError, loading, onSelectSymbol, signalDiff,
}: Props) {
  const { width, containerRef, mounted } = useContainerWidth()
  const [layouts, setLayouts] = useState<LayoutItem[]>(() => loadLayout() || DEFAULT_LAYOUT)
  const [isDragging, setIsDragging] = useState(false)
  const [gridHeight, setGridHeight] = useState(560)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const rowHeight = useMemo(() => {
    const available = gridHeight - GRID_MARGIN[1] * (GRID_ROWS - 1)
    return Math.max(24, Math.floor(available / GRID_ROWS))
  }, [gridHeight])
  const responsiveLayouts = useMemo(() => ({
    lg: normalizeLayout(layouts, COLS.lg),
    md: normalizeLayout(layouts, COLS.md),
    sm: normalizeLayout(layouts, COLS.sm),
    xs: normalizeLayout(layouts, COLS.xs),
    xxs: normalizeLayout(layouts, COLS.xxs),
  }), [layouts])

  const onLayoutChange = useCallback((newLayout: readonly LayoutItem[]) => {
    const next = normalizeLayout(newLayout)
    setLayouts(next)
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveLayout(next), 300)
  }, [])

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const measure = () => setGridHeight(Math.max(360, node.clientHeight))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [containerRef])

  if (!mounted) {
    return <div ref={containerRef} className="dashboard-grid px-2 pb-2 min-h-0 flex-1" />
  }

  return (
    <div ref={containerRef} className={`dashboard-grid px-2 pb-2 min-h-0 flex-1 ${isDragging ? 'dashboard-grid--dragging' : ''}`}>
      <ResponsiveGridLayout
        width={width}
        className="layout"
        style={{ height: '100%' }}
        layouts={responsiveLayouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={COLS}
        rowHeight={rowHeight}
        autoSize={false}
        onLayoutChange={onLayoutChange}
        onDragStart={() => setIsDragging(true)}
        onDragStop={() => setIsDragging(false)}
        dragConfig={{ handle: '.drag-handle', cancel: 'button,input,select,a', bounded: true, threshold: 4 }}
        resizeConfig={{ enabled: false }}
        compactor={verticalCompactor}
        margin={GRID_MARGIN}
      >
        <div key="narrative" data-card-id="narrative">
          <ErrorBoundary>
            {loading?.narrative ? <CardSkeleton title="链上叙事雷达" icon="🛰️" rows={9} /> : <NarrativeRadar data={narrative} error={narrativeError} signalStatus={signalDiff?.narrativeMomentum} />}
          </ErrorBoundary>
        </div>
        <div key="pool" data-card-id="pool">
          <ErrorBoundary>
            {loading?.pool ? <CardSkeleton title="收筹标的池" icon="🏦" rows={8} /> : <AccumulationPool data={pool} onSelect={onSelectSymbol} signalStatus={signalDiff?.pool} />}
          </ErrorBoundary>
        </div>
        <div key="oi" data-card-id="oi">
          <ErrorBoundary>
            {loading?.oi ? <CardSkeleton title="OI 异动" icon="📊" rows={8} /> : <OIMonitor data={oiAlerts} onSelect={onSelectSymbol} signalStatus={signalDiff?.oiAlerts} />}
          </ErrorBoundary>
        </div>
        <div key="chase">
          <ErrorBoundary>
            {loading?.scores ? <CardSkeleton title="追多策略" icon="🔥" rows={6} /> : <ChaseStrategy data={chase} onSelect={onSelectSymbol} />}
          </ErrorBoundary>
        </div>
        <div key="combined">
          <ErrorBoundary>
            {loading?.scores ? <CardSkeleton title="综合策略" icon="📊" rows={7} /> : <CombinedStrategy data={combined} onSelect={onSelectSymbol} />}
          </ErrorBoundary>
        </div>
        <div key="shortFuel" data-card-id="shortFuel">
          <ErrorBoundary>
            {loading?.shortFuel ? <CardSkeleton title="空头燃料 + 热度" icon="🔥" rows={6} /> : <ShortFuel fuel={fuel} squeeze={squeeze} liquidations={liquidations} onSelect={onSelectSymbol} signalStatus={signalDiff?.squeeze} />}
          </ErrorBoundary>
        </div>
        <div key="ambush" data-card-id="ambush">
          <ErrorBoundary>
            {loading?.scores ? <CardSkeleton title="埋伏策略" icon="🎯" rows={6} /> : <AmbushStrategy data={ambush} onSelect={onSelectSymbol} signalStatus={signalDiff?.ambush} />}
          </ErrorBoundary>
        </div>
      </ResponsiveGridLayout>
    </div>
  )
}

export default memo(Dashboard)
