# Batch 1: Error Boundary + Layout Persistence Design

## 1. Error Boundary

New file: `src/components/shared/ErrorBoundary.tsx`

- React class component with `componentDidCatch` and `getDerivedStateFromError`
- Props: `children`, `fallback` (optional)
- Default fallback: card title area + "Component error" message + retry button
- Usage: wrap each card component in Dashboard with `<ErrorBoundary>`

## 2. Dashboard Layout Persistence

Modify: `src/components/layout/Dashboard.tsx`

- Save layout to `localStorage('dashboard-layout')` on every `onLayoutChange` callback
- On mount, read from localStorage; fall back to default layout if missing or corrupted
- Debounce saves (300ms) to avoid excessive writes during drag

Modify: `src/components/layout/StatusBar.tsx`

- Add a "Reset Layout" button (icon: ↺) in the status bar
- Clicking clears localStorage and reloads default layout via state reset

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/shared/ErrorBoundary.tsx` | Create | Error boundary wrapper component |
| `src/components/layout/Dashboard.tsx` | Modify | Layout persistence with localStorage |
| `src/components/layout/StatusBar.tsx` | Modify | Add reset layout button |
