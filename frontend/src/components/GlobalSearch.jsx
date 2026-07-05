import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, BookOpen, Users, X, ArrowRight, Clock, AlertCircle } from 'lucide-react'
import { globalSearch } from '../services/kbApi'

// ── Result type configs ──────────────────────────────────────────────────────
const TYPE_CONFIG = {
  ticket: { icon: FileText,  label: 'Ticket',  iconColor: 'var(--ds-accent)',   iconBg: 'var(--ds-accent-subtle)' },
  kb:     { icon: BookOpen,  label: 'Article', iconColor: '#a855f7',            iconBg: 'rgba(168,85,247,0.12)' },
  user:   { icon: Users,     label: 'User',    iconColor: 'var(--ds-text-muted)',iconBg: 'var(--ds-surface-raised)' },
}

const getPriorityStyle = (priority) => {
  const map = {
    Critical: { bg: 'var(--ds-danger-subtle)',  color: 'var(--ds-danger)'   },
    High:     { bg: 'var(--ds-warning-subtle)', color: 'var(--ds-warning)'  },
    Medium:   { bg: 'var(--ds-accent-subtle)',  color: 'var(--ds-accent)'   },
    Low:      { bg: 'var(--ds-hover)',           color: 'var(--ds-text-muted)' },
  }
  return map[priority] || map.Low
}

const getStatusStyle = (status) => {
  const map = {
    Open:           { bg: 'var(--ds-hover)',            color: 'var(--ds-text-secondary)' },
    Assigned:       { bg: 'var(--ds-accent-subtle)',    color: 'var(--ds-accent)'   },
    'In Progress':  { bg: 'var(--ds-accent-subtle)',    color: 'var(--ds-accent)'   },
    Pending:        { bg: 'var(--ds-warning-subtle)',   color: 'var(--ds-warning)'  },
    Resolved:       { bg: 'var(--ds-success-subtle)',   color: 'var(--ds-success)'  },
    Closed:         { bg: 'var(--ds-success-subtle)',   color: 'var(--ds-success)'  },
  }
  return map[status] || map.Open
}

export default function GlobalSearch({ open, onClose }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [selected, setSelected] = useState(-1)

  const inputRef    = useRef(null)
  const navigate    = useNavigate()
  const debounceRef = useRef(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults(null)
      setError(null)
      setSelected(-1)
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [open])

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
      }
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const search = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await globalSearch(q, { limit: 8 })
      setResults(data)
      setSelected(-1)
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed. Try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  const flatResults = results
    ? [...results.results.tickets, ...results.results.kb, ...results.results.users]
    : []

  const goToResult = (result) => {
    onClose()
    if (result.type === 'ticket') navigate(`/ticket/${result._id}`)
    else if (result.type === 'kb') navigate(`/knowledge-base/${result._id}`)
    else if (result.type === 'user') navigate('/admin/users')
  }

  const handleKeyDown = (e) => {
    if (!flatResults.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && selected >= 0) {
      goToResult(flatResults[selected])
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-start justify-center pt-20 px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-xl rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--ds-surface-overlay)',
          border: '1px solid var(--ds-border)',
          boxShadow: 'var(--ds-shadow-overlay)',
        }}
      >
        {/* Search Input */}
        <div
          className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: '1px solid var(--ds-border)' }}
        >
          <Search className="w-5 h-5 shrink-0" style={{ color: 'var(--ds-text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Search tickets, articles, users…"
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: 'var(--ds-text-primary)' }}
          />
          {loading && (
            <div
              className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin shrink-0"
              style={{ borderColor: 'var(--ds-border-strong)', borderTopColor: 'var(--ds-accent)' }}
            />
          )}
          {!loading && query && (
            <button
              onClick={() => { setQuery(''); setResults(null) }}
              style={{ color: 'var(--ds-text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--ds-text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--ds-text-muted)'}
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd
            className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border"
            style={{ backgroundColor: 'var(--ds-surface-raised)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-muted)' }}
          >
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto">

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-4 text-sm" style={{ color: 'var(--ds-danger)' }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && results && results.totalCount === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--ds-text-secondary)' }}>No results found</p>
              <p className="text-xs mt-1" style={{ color: 'var(--ds-text-muted)' }}>Try different keywords</p>
            </div>
          )}

          {/* Tickets section */}
          {results?.results.tickets.length > 0 && (
            <ResultSection title="Tickets" items={results.results.tickets} flatResults={flatResults} selected={selected}
              renderItem={(t) => {
                const globalIdx = flatResults.findIndex(r => r._id === t._id && r.type === t.type)
                const isSelected = globalIdx === selected
                const pStyle = getPriorityStyle(t.priority)
                const sStyle = getStatusStyle(t.status)
                return (
                  <ResultRow key={t._id} isSelected={isSelected} onClick={() => goToResult(t)} type="ticket" title={t.title} meta={t.ticketNumber}>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: pStyle.bg, color: pStyle.color }}>{t.priority}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: sStyle.bg, color: sStyle.color }}>{t.status}</span>
                  </ResultRow>
                )
              }}
            />
          )}

          {/* KB section */}
          {results?.results.kb.length > 0 && (
            <ResultSection title="Knowledge Base" items={results.results.kb} flatResults={flatResults} selected={selected}
              renderItem={(a) => {
                const globalIdx = flatResults.findIndex(r => r._id === a._id && r.type === a.type)
                return (
                  <ResultRow key={a._id} isSelected={globalIdx === selected} onClick={() => goToResult(a)} type="kb" title={a.title} meta={a.category} />
                )
              }}
            />
          )}

          {/* Users section */}
          {results?.results.users?.length > 0 && (
            <ResultSection title="Users" items={results.results.users} flatResults={flatResults} selected={selected}
              renderItem={(u) => {
                const globalIdx = flatResults.findIndex(r => r._id === u._id && r.type === u.type)
                return (
                  <ResultRow key={u._id} isSelected={globalIdx === selected} onClick={() => goToResult(u)} type="user" title={u.name} meta={u.email} />
                )
              }}
            />
          )}

          {/* Idle state */}
          {!query && !results && (
            <div className="px-4 py-5">
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--ds-text-muted)' }}>Quick Navigation</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'My Tickets',     icon: Clock,     path: '/employee/my-tickets' },
                  { label: 'Create Ticket',  icon: FileText,  path: '/employee/create-ticket' },
                  { label: 'Knowledge Base', icon: BookOpen,  path: '/knowledge-base' },
                  { label: 'Dashboard',      icon: ArrowRight, path: '/' },
                ].map(item => (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); onClose() }}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-left"
                    style={{ backgroundColor: 'var(--ds-surface-raised)', color: 'var(--ds-text-secondary)' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--ds-hover)'; e.currentTarget.style.color = 'var(--ds-text-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--ds-surface-raised)'; e.currentTarget.style.color = 'var(--ds-text-secondary)' }}
                  >
                    <item.icon className="w-4 h-4" style={{ color: 'var(--ds-text-muted)' }} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-4 px-4 py-2.5 text-xs border-t"
          style={{ backgroundColor: 'var(--ds-surface-raised)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-muted)' }}
        >
          {[['↑↓', 'Navigate'], ['↵', 'Open'], ['Esc', 'Close']].map(([key, label]) => (
            <span key={key} className="flex items-center gap-1">
              <kbd
                className="rounded px-1 border"
                style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}
              >
                {key}
              </kbd>
              {label}
            </span>
          ))}
          {results && (
            <span className="ml-auto">{results.totalCount} result{results.totalCount !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────
function ResultSection({ title, items, flatResults, selected, renderItem }) {
  return (
    <div>
      <div className="px-4 pt-3 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--ds-text-muted)' }}>{title}</p>
      </div>
      {items.map((item, idx) => renderItem(item, idx))}
    </div>
  )
}

function ResultRow({ isSelected, onClick, type, title, meta, children }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.ticket
  const Icon = cfg.icon

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
      style={{ backgroundColor: isSelected ? 'var(--ds-selected)' : 'transparent' }}
      onMouseEnter={e => !isSelected && (e.currentTarget.style.backgroundColor = 'var(--ds-hover)')}
      onMouseLeave={e => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <div className="p-1.5 rounded-md shrink-0" style={{ backgroundColor: cfg.iconBg }}>
        <Icon className="w-3.5 h-3.5" style={{ color: cfg.iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--ds-text-primary)' }}>{title}</p>
        {meta && <p className="text-xs truncate" style={{ color: 'var(--ds-text-muted)' }}>{meta}</p>}
      </div>
      {children && <div className="flex items-center gap-1.5 shrink-0">{children}</div>}
      {isSelected && <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--ds-accent)' }} />}
    </button>
  )
}
