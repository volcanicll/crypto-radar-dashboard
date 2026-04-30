# Batch 1: Error Boundary + Layout Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add error boundaries to prevent full-page crashes and persist dashboard layout across page reloads.

**Architecture:** ErrorBoundary is a React class component wrapping each card. Layout uses localStorage with debounced saves. Reset button in StatusBar clears storage.

**Tech Stack:** React, TypeScript, localStorage, react-grid-layout

---

### Task 1: Create ErrorBoundary component

**Files:**
- Create: `src/components/shared/ErrorBoundary.tsx`

- [ ] **Step 1: Create ErrorBoundary.tsx**

```tsx
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
          <div className="text-sm" style={{ color: 'var(--red)' }}>Component error</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {this.state.error?.message || 'Unknown error'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs px-2 py-1 rounded"
            style={{ background: 'var(--border-card)', color: 'var(--text-secondary)' }}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/ErrorBoundary.tsx
git commit -m "feat: add ErrorBoundary component for card-level error isolation"
```

---

### Task 2: Wrap each card in Dashboard with ErrorBoundary

**Files:**
- Modify: `src/components/layout/Dashboard.tsx`

- [ ] **Step 1: Add import and wrap cards**

Add import at top of Dashboard.tsx:
```typescript
import ErrorBoundary from '../shared/ErrorBoundary'
```

Wrap each card component render in `<ErrorBoundary>`. For example, if the current render looks like:
```tsx
<NarrativeRadar data={radar} error={radarErr} />
```
Change to:
```tsx
<ErrorBoundary><NarrativeRadar data={radar} error={radarErr} /></ErrorBoundary>
```

Do this for ALL card components in the Dashboard render function.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Dashboard.tsx
git commit -m "feat: wrap dashboard cards with ErrorBoundary"
```

---

### Task 3: Persist layout to localStorage

**Files:**
- Modify: `src/components/layout/Dashboard.tsx`

- [ ] **Step 1: Add layout persistence logic**

At the top of Dashboard.tsx, add a storage key constant and helper functions:

```typescript
const LAYOUT_KEY = 'dashboard-layout'

function loadLayout(): ReactGridLayout.Layout[] | undefined {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY)
    return raw ? JSON.parse(raw) : undefined
  } catch {
    return undefined
  }
}

function saveLayout(layout: ReactGridLayout.Layout[]): void {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout))
  } catch {
    // ignore storage errors
  }
}
```

- [ ] **Step 2: Initialize state from localStorage**

Change the layout initialization. Find where layouts state is initialized (likely `useState`) and change it to load from localStorage:

Replace the layout state initialization to use `loadLayout()` as the initial value, falling back to the default layouts.

- [ ] **Step 3: Add onLayoutChange callback with debounced save**

Find the `onLayoutChange` callback. Add layout persistence:

```typescript
const saveTimerRef = useRef<ReturnType<typeof setTimeout>>()

const handleLayoutChange = useCallback((layout: ReactGridLayout.Layout[]) => {
  clearTimeout(saveTimerRef.current)
  saveTimerRef.current = setTimeout(() => saveLayout(layout), 300)
}, [])
```

Wire `handleLayoutChange` to the `onLayoutChange` prop of the GridLayout component.

Also add `useRef` and `useCallback` to the React import if not already there.

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Dashboard.tsx
git commit -m "feat: persist dashboard layout to localStorage with debounced saves"
```

---

### Task 4: Add reset layout button to StatusBar

**Files:**
- Modify: `src/components/layout/StatusBar.tsx`

- [ ] **Step 1: Add onResetLayout prop and button**

Add a new optional prop to StatusBar:

```typescript
interface Props {
  // ... existing props
  onResetLayout?: () => void
}
```

Add a reset button in the StatusBar, near the existing controls. Use a simple button:

```tsx
{onResetLayout && (
  <button
    onClick={onResetLayout}
    className="text-xs px-1.5 py-0.5 rounded"
    style={{ color: 'var(--text-muted)', background: 'var(--border-card)' }}
    title="Reset layout"
  >
    ↺
  </button>
)}
```

- [ ] **Step 2: Wire onResetLayout in Dashboard**

In Dashboard.tsx, pass the reset callback to StatusBar:

```tsx
const handleResetLayout = useCallback(() => {
  localStorage.removeItem(LAYOUT_KEY)
  // Reset layouts state to default
  setLayouts(/* default layouts */)
}, [])
```

Pass to StatusBar: `<StatusBar ... onResetLayout={handleResetLayout} />`

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: successful build

- [ ] **Step 5: Commit and push**

```bash
git add src/components/layout/Dashboard.tsx src/components/layout/StatusBar.tsx
git commit -m "feat: add reset layout button to StatusBar"
git push origin master
```
