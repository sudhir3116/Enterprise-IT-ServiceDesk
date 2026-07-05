import React from 'react'

/**
 * FormField — Standardized form field wrapper.
 * Provides consistent label, input/select/textarea, helper text and error state.
 * 
 * Usage:
 *   <FormField label="Full Name" required helper="Employee's legal name">
 *     <input className="ds-input" ... />
 *   </FormField>
 */
export default function FormField({ 
  label, 
  required = false, 
  helper, 
  error, 
  children, 
  className = '' 
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="ds-label">
          {label}
          {required && (
            <span className="ml-0.5" style={{ color: 'var(--ds-danger)' }}>*</span>
          )}
        </label>
      )}
      {children}
      {error && (
        <p className="text-[11px] font-medium" style={{ color: 'var(--ds-danger)' }}>
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="text-[11px]" style={{ color: 'var(--ds-text-muted)' }}>
          {helper}
        </p>
      )}
    </div>
  )
}
