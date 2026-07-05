import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-md',
  danger = false
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 transition-opacity"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div 
        className={`w-full ${maxWidth} relative z-10 flex flex-col overflow-hidden rounded-xl border animate-scale-in`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{ 
          backgroundColor: 'var(--ds-surface-overlay)',
          borderColor: 'var(--ds-border)',
          boxShadow: 'var(--ds-shadow-overlay)'
        }}
      >
        {/* Header */}
        <div 
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ 
            borderColor: 'var(--ds-divider)',
            backgroundColor: danger ? 'var(--ds-danger-subtle)' : 'var(--ds-surface-raised)'
          }}
        >
          <h3 
            id="modal-title" 
            className="text-[15px] font-bold font-heading"
            style={{ color: danger ? 'var(--ds-danger)' : 'var(--ds-text-primary)' }}
          >
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--ds-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--ds-hover)'; e.currentTarget.style.color = 'var(--ds-text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--ds-text-muted)' }}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto" style={{ color: 'var(--ds-text-secondary)' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div 
            className="px-5 py-4 border-t flex justify-end gap-3"
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
