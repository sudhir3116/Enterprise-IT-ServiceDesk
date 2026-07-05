import React, { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Button from './enterprise/Button'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorId: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    const errorId = 'ERR-' + Math.random().toString(36).substring(2, 9).toUpperCase()
    this.setState({ errorId })
    console.error(`[Error Boundary] ${errorId}:`, error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[85vh] w-full px-4" style={{ backgroundColor: 'var(--ds-bg)' }}>
          <div 
            className="max-w-md w-full p-8 rounded-xl border text-center space-y-6"
            style={{ 
              backgroundColor: 'var(--ds-surface)', 
              borderColor: 'var(--ds-border)',
              boxShadow: 'var(--ds-shadow-sm)'
            }}
          >
            <div className="inline-flex p-3.5 bg-red-50 dark:bg-red-500/10 rounded-full text-red-600 dark:text-red-400">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-primary">An unexpected error occurred</h2>
              <p className="text-[13px] text-tertiary">
                The application encountered an issue. The error has been logged for our engineering team.
              </p>
            </div>

            {this.state.error && (
              <div 
                className="p-3.5 rounded-lg border text-left font-mono text-[11px] text-red-600 dark:text-red-400 bg-ds-surface-raised overflow-auto max-h-32"
                style={{ borderColor: 'var(--ds-border)' }}
              >
                <span className="font-bold text-tertiary block mb-1">Error ID: {this.state.errorId || 'Computing...'}</span>
                {this.state.error.message || this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button 
                variant="primary" 
                icon={RefreshCw} 
                onClick={this.handleReload}
                className="w-full sm:w-auto"
              >
                Reload Application
              </Button>
              <Button 
                variant="secondary" 
                icon={Home} 
                onClick={this.handleGoHome}
                className="w-full sm:w-auto"
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
