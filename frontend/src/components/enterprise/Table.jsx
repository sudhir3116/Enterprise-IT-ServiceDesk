import React, { useState, useMemo } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, FileSearch } from 'lucide-react'

export default function Table({ 
  columns, 
  data, 
  isLoading, 
  emptyMessage = 'No records found',
  className = ''
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  const handleSort = (key) => {
    if (!key) return
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'
    setSortConfig({ key, direction })
  }

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !data) return data
    return [...data].sort((a, b) => {
      const aVal = String(a[sortConfig.key] ?? '').toLowerCase()
      const bVal = String(b[sortConfig.key] ?? '').toLowerCase()
      if (aVal === bVal) return 0
      const compare = aVal > bVal ? 1 : -1
      return sortConfig.direction === 'asc' ? compare : -compare
    })
  }, [data, sortConfig])

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="w-full overflow-hidden rounded-lg border" style={{ borderColor: 'var(--ds-border)', backgroundColor: 'var(--ds-surface)' }}>
        {/* Header skeleton */}
        <div 
          className="flex px-5 py-3.5 border-b gap-4"
          style={{ backgroundColor: 'var(--ds-surface-raised)', borderColor: 'var(--ds-border)' }}
        >
          {[...Array(4)].map((_, i) => (
            <div 
              key={i} 
              className="h-3 rounded mr-8 ds-skeleton"
              style={{ width: `${[120, 180, 100, 80][i]}px` }}
            />
          ))}
        </div>
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            className="flex items-center px-5 py-4 border-b gap-6"
            style={{ borderColor: 'var(--ds-divider)' }}
          >
            <div className="h-8 w-8 rounded-full ds-skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-3 rounded w-2/3 ds-skeleton" />
              <div className="h-2.5 rounded w-1/3 ds-skeleton" />
            </div>
            <div className="h-6 w-16 rounded ds-skeleton" />
          </div>
        ))}
      </div>
    )
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 rounded-lg border" style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)' }}>
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: 'var(--ds-surface-raised)', border: '1px solid var(--ds-border)' }}
        >
          <FileSearch className="w-5 h-5" style={{ color: 'var(--ds-text-muted)' }} />
        </div>
        <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--ds-text-primary)' }}>
          {typeof emptyMessage === 'string' ? emptyMessage : 'No records found'}
        </p>
        {typeof emptyMessage === 'string' ? null : emptyMessage}
      </div>
    )
  }

  return (
    <div className={`ds-table-container ${className}`}>
      <table className="ds-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={col.sortable !== false && col.accessor ? 'cursor-pointer select-none' : 'select-none'}
                style={{ width: col.width }}
                onClick={() => col.sortable !== false && col.accessor ? handleSort(col.accessor) : undefined}
              >
                <div className="flex items-center gap-1.5">
                  {col.header}
                  {col.sortable !== false && col.accessor && (
                    <span style={{ color: 'var(--ds-text-muted)', opacity: sortConfig.key === col.accessor ? 1 : 0.4 }}>
                      {sortConfig.key === col.accessor ? (
                        sortConfig.direction === 'asc' 
                          ? <ArrowUp className="w-3 h-3 text-ds-accent" />
                          : <ArrowDown className="w-3 h-3 text-ds-accent" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, rowIndex) => (
            <tr key={row._id || rowIndex}>
              {columns.map((col, colIndex) => (
                <td key={colIndex}>
                  {col.render ? col.render(row) : (typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
