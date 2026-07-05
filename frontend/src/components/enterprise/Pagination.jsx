import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, totalPages, onPageChange, totalItems, pageSize }) {
  if (totalPages <= 1) return null

  const start = ((page - 1) * pageSize) + 1
  const end = Math.min(page * pageSize, totalItems)

  // Generate page numbers
  const getPageNumbers = () => {
    const pages = []
    const delta = 2
    const left = Math.max(1, page - delta)
    const right = Math.min(totalPages, page + delta)
    
    if (left > 1) {
      pages.push(1)
      if (left > 2) pages.push('...')
    }
    for (let i = left; i <= right; i++) pages.push(i)
    if (right < totalPages) {
      if (right < totalPages - 1) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  const btnBase = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '32px',
    minWidth: '32px',
    padding: '0 8px',
    fontSize: '13px',
    fontWeight: '500',
    borderRadius: '6px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.15s',
    userSelect: 'none',
  }

  const btnDefault = {
    ...btnBase,
    backgroundColor: 'var(--ds-surface)',
    borderColor: 'var(--ds-border)',
    color: 'var(--ds-text-secondary)',
  }

  const btnActive = {
    ...btnBase,
    backgroundColor: 'var(--ds-accent)',
    borderColor: 'var(--ds-accent)',
    color: '#FFFFFF',
    fontWeight: '600',
  }

  const btnDisabled = {
    ...btnBase,
    backgroundColor: 'var(--ds-surface-raised)',
    borderColor: 'var(--ds-border)',
    color: 'var(--ds-text-muted)',
    cursor: 'not-allowed',
    opacity: 0.5,
  }

  const pageNums = getPageNumbers()

  return (
    <div 
      className="flex items-center justify-between px-4 py-3 border-t"
      style={{ borderColor: 'var(--ds-divider)', backgroundColor: 'var(--ds-surface)' }}
    >
      {/* Item count */}
      <p className="text-[12px]" style={{ color: 'var(--ds-text-muted)' }}>
        {totalItems ? (
          <>Showing <span className="font-semibold" style={{ color: 'var(--ds-text-primary)' }}>{start}–{end}</span> of <span className="font-semibold" style={{ color: 'var(--ds-text-primary)' }}>{totalItems}</span></>
        ) : (
          <>Page <span className="font-semibold" style={{ color: 'var(--ds-text-primary)' }}>{page}</span> of <span className="font-semibold" style={{ color: 'var(--ds-text-primary)' }}>{totalPages}</span></>
        )}
      </p>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          disabled={page === 1}
          onClick={() => page > 1 && onPageChange(page - 1)}
          style={page === 1 ? btnDisabled : btnDefault}
          onMouseEnter={e => { if (page !== 1) { e.currentTarget.style.backgroundColor = 'var(--ds-hover)'; e.currentTarget.style.borderColor = 'var(--ds-border-strong)' } }}
          onMouseLeave={e => { if (page !== 1) { e.currentTarget.style.backgroundColor = 'var(--ds-surface)'; e.currentTarget.style.borderColor = 'var(--ds-border)' } }}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Page numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {pageNums.map((p, idx) => 
            p === '...' ? (
              <span key={`dots-${idx}`} className="px-2 text-[13px]" style={{ color: 'var(--ds-text-muted)' }}>…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                style={p === page ? btnActive : btnDefault}
                onMouseEnter={e => { if (p !== page) { e.currentTarget.style.backgroundColor = 'var(--ds-hover)'; e.currentTarget.style.borderColor = 'var(--ds-border-strong)' } }}
                onMouseLeave={e => { if (p !== page) { e.currentTarget.style.backgroundColor = 'var(--ds-surface)'; e.currentTarget.style.borderColor = 'var(--ds-border)' } }}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Next */}
        <button
          disabled={page === totalPages}
          onClick={() => page < totalPages && onPageChange(page + 1)}
          style={page === totalPages ? btnDisabled : btnDefault}
          onMouseEnter={e => { if (page !== totalPages) { e.currentTarget.style.backgroundColor = 'var(--ds-hover)'; e.currentTarget.style.borderColor = 'var(--ds-border-strong)' } }}
          onMouseLeave={e => { if (page !== totalPages) { e.currentTarget.style.backgroundColor = 'var(--ds-surface)'; e.currentTarget.style.borderColor = 'var(--ds-border)' } }}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
