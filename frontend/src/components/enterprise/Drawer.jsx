import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-md'
}) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 transition-opacity"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div 
        className={`w-full ${width} h-full relative z-10 flex flex-col animate-slide-in-right`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        style={{ 
          backgroundColor: 'var(--ds-surface-overlay)',
          borderLeft: '1px solid var(--ds-border)',
          boxShadow: 'var(--ds-shadow-overlay)'
        }}
      >
        {/* Header */}
        <div 
          className="px-5 py-4 border-b flex items-center justify-between shrink-0"
          style={{ 
            borderColor: 'var(--ds-divider)',
            backgroundColor: 'var(--ds-surface-raised)'
          }}
        >
          <h3 
            id="drawer-title" 
            className="text-[15px] font-bold font-heading"
            style={{ color: 'var(--ds-text-primary)' }}
          >
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--ds-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--ds-hover)'; e.currentTarget.style.color = 'var(--ds-text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--ds-text-muted)' }}
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div 
          className="p-5 overflow-y-auto flex-1"
          style={{ color: 'var(--ds-text-secondary)' }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div 
            className="px-5 py-4 border-t flex justify-end gap-3 shrink-0"
            style={{ 
              borderColor: 'var(--ds-divider)',
              backgroundColor: 'var(--ds-surface-raised)'
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
