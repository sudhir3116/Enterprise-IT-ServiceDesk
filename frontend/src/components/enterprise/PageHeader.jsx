import React from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PageHeader({ 
  title, 
  description, 
  actions, 
  primaryAction, 
  secondaryActions, 
  breadcrumbs, 
  icon: Icon 
}) {
  return (
    <div className="flex flex-col gap-3 mb-6">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-0.5 text-[13px] font-medium" style={{ letterSpacing: '0.01em' }}>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path || crumb.name}>
              {index > 0 && (
                <ChevronRight 
                  className="w-3.5 h-3.5 mx-0.5" 
                  style={{ color: 'var(--ds-text-muted)', opacity: 0.5 }} 
                />
              )}
              {crumb.path ? (
                <Link 
                  to={crumb.path} 
                  className="transition-colors"
                  style={{ color: 'var(--ds-text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--ds-text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--ds-text-muted)'}
                >
                  {crumb.name}
                </Link>
              ) : (
                <span className="font-semibold" style={{ color: 'var(--ds-text-primary)' }}>
                  {crumb.name}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Title Row */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            {Icon && (
              <Icon 
                className="w-6 h-6" 
                style={{ color: 'var(--ds-text-muted)' }} 
              />
            )}
            <h1 
              className="text-[30px] font-bold font-heading"
              style={{ color: 'var(--ds-text-primary)', lineHeight: '1.25', letterSpacing: '-0.022em' }}
            >
              {title}
            </h1>
          </div>
          {description && (
            <p 
              className="text-[14px] max-w-2xl mt-1.5"
              style={{ color: 'var(--ds-text-muted)', lineHeight: '1.6', letterSpacing: '0.01em' }}
            >
              {description}
            </p>
          )}
        </div>
        
        {/* Actions */}
        {(actions || primaryAction || secondaryActions) && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {secondaryActions}
            {actions}
            {primaryAction}
          </div>
        )}
      </div>
    </div>
  )
}
