import React from 'react'
import { Search } from 'lucide-react'

export default function FilterBar({ 
  searchPlaceholder = 'Search...', 
  searchValue, 
  onSearchChange,
  children 
}) {
  return (
    <div 
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b"
      style={{ 
        backgroundColor: 'var(--ds-surface-raised)', 
        borderColor: 'var(--ds-divider)' 
      }}
    >
      <div className="relative max-w-xs w-full">
        <Search 
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" 
          style={{ color: 'var(--ds-text-muted)' }}
        />
        <input 
          type="text" 
          placeholder={searchPlaceholder} 
          value={searchValue || ''}
          onChange={e => onSearchChange && onSearchChange(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-[13px] rounded-md border outline-none transition-all"
          style={{ 
            backgroundColor: 'var(--ds-input-bg)',
            borderColor: 'var(--ds-input-border)',
            color: 'var(--ds-text-primary)',
          }}
          onFocus={e => {
            e.target.style.borderColor = 'var(--ds-input-border-focus)'
            e.target.style.boxShadow = '0 0 0 3px var(--ds-focus-ring)'
          }}
          onBlur={e => {
            e.target.style.borderColor = 'var(--ds-input-border)'
            e.target.style.boxShadow = 'none'
          }}
        />
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </div>
  )
}
