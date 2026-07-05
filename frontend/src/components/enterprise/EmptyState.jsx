import React from 'react'
import { PackageOpen } from 'lucide-react'

export default function EmptyState({ 
  icon: Icon = PackageOpen, 
  title = 'No records found', 
  description, 
  action,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div 
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--ds-surface-raised)' }}
      >
        <Icon className="w-6 h-6" style={{ color: 'var(--ds-text-muted)' }} />
      </div>
      <h3 
        className="text-[14px] font-semibold mb-1.5"
        style={{ color: 'var(--ds-text-primary)' }}
      >
        {title}
      </h3>
      {description && (
        <p 
          className="text-[13px] max-w-sm leading-relaxed mb-4"
          style={{ color: 'var(--ds-text-muted)' }}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
