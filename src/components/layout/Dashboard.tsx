import { useState, useCallback, useRef } from 'react'
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import type { Compactor, LayoutItem } from 'react-grid-layout'
import AccumulationPool from '../cards/AccumulationPool'
import OIMonitor from '../cards/OIMonitor'
import ChaseStrategy from '../cards/ChaseStrategy'
import CombinedStrategy from '../cards/CombinedStrategy'
import ShortFuel from '../cards/ShortFuel'
import AmbushStrategy from '../cards/AmbushStrategy'
import NarrativeRadar from '../cards/NarrativeRadar'
import ErrorBoundary from '../shared/ErrorBoundary'
import type { AccumulationResult, OIAlert, ChaseCandidate, CombinedScore, AmbushCandidate, ShortFuelTarget, NarrativeRadarData, LiquidationEvent } from '../../types'

const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: 'narrative', x: 0, y: 0, w: 8, h: 9, minW: 5, minH: 6 },
  { i: 'combined', x: 8, y: 0, w: 4, h: 9, minW: 3, minH: 5 },
  { i: 'pool', x: 0, y: 9, w: 6, h: 8, minW: 3, minH: 4 },
  { i: 'oi', x: 6, y: 9, w: 6, h: 8, minW: 3, minH: 4 },
  { i: 'chase', x: 0, y: 17, w: 4, h: 6, minW: 2, minH: 3 },
  { i: 'shortFuel', x: 4, y: 17, w: 4, h: 6, minW: 2, minH: 3 },
  { i: 'ambush', x: 8, y: 17, w: 4, h: 6, minW: 2, minH: 3 },
]

const LAYOUT_KEY = 'dashboard-layout'

function loadLayout(): LayoutItem[] | undefined {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY)
    return raw ? JSON.parse(raw) : undefined
  } catch {
    return undefined
  }
}

function saveLayout(layout: LayoutItem[]): void {
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)) } catch { /* ignore */ }
}

const COLS = { lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }
const preserveLayout: Compactor = {
  type: 'vertical',
  allowOverlap: false,
  compact: (layout) => layout,
}

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
  onSelectSymbol: (symbol: string) => void
}

export default function Dashboard({
  pool, oiAlerts, chase, combined, ambush, fuel, squeeze, liquidations, narrative, narrativeError, onSelectSymbol,
}: Props) {
  const { width, containerRef, mounted } = useContainerWidth()
  const [layouts, setLayouts] = useState<LayoutItem[]>(() => loadLayout() || DEFAULT_LAYOUT)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const onLayoutChange = useCallback((newLayout: readonly LayoutItem[]) => {
    const next = [...newLayout]
    setLayouts(next)
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveLayout(next), 300)
  }, [])

  if (!mounted) {
    return <div ref={containerRef} className="px-2 pb-4" style={{ minHeight: 400 }} />
  }

  return (
    <div ref={containerRef} className="px-2 pb-4">
      <ResponsiveGridLayout
        width={width}
        className="layout"
        layouts={{ lg: layouts, md: layouts, sm: layouts, xs: layouts, xxs: layouts }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={COLS}
        rowHeight={40}
        onLayoutChange={onLayoutChange}
        dragConfig={{ handle: '.drag-handle' }}
        compactor={preserveLayout}
        margin={[8, 8] as [number, number]}
      >
        <div key="narrative">
          <ErrorBoundary><NarrativeRadar data={narrative} error={narrativeError} /></ErrorBoundary>
        </div>
        <div key="pool">
          <ErrorBoundary><AccumulationPool data={pool} onSelect={onSelectSymbol} /></ErrorBoundary>
        </div>
        <div key="oi">
          <ErrorBoundary><OIMonitor data={oiAlerts} onSelect={onSelectSymbol} /></ErrorBoundary>
        </div>
        <div key="chase">
          <ErrorBoundary><ChaseStrategy data={chase} onSelect={onSelectSymbol} /></ErrorBoundary>
        </div>
        <div key="combined">
          <ErrorBoundary><CombinedStrategy data={combined} onSelect={onSelectSymbol} /></ErrorBoundary>
        </div>
        <div key="shortFuel">
          <ErrorBoundary><ShortFuel fuel={fuel} squeeze={squeeze} liquidations={liquidations} onSelect={onSelectSymbol} /></ErrorBoundary>
        </div>
        <div key="ambush">
          <ErrorBoundary><AmbushStrategy data={ambush} onSelect={onSelectSymbol} /></ErrorBoundary>
        </div>
      </ResponsiveGridLayout>
    </div>
  )
}
