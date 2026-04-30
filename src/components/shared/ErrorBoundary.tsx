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