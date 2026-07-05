import React from 'react'

export default function Card({ children, className = '', noPadding = false, style = {} }) {
  return (
    <div 
      className={`rounded-lg border ${noPadding ? '' : 'p-6'} ${className}`}
      style={{ 
        backgroundColor: 'var(--ds-surface)', 
        borderColor: 'var(--ds-border)',
        boxShadow: 'var(--ds-shadow-sm)',
        ...style
      }}
    >
      {children}
    </div>
  )
}

// ── STAT CARD ──
const colorTokens = {
  indigo:  { icon: 'var(--ds-accent)',     bg: 'var(--ds-accent-subtle)' },
  blue:    { icon: '#3B82F6',              bg: 'rgba(59,130,246,0.1)' },
  emerald: { icon: 'var(--ds-success)',    bg: 'var(--ds-success-subtle)' },
  red:     { icon: 'var(--ds-danger)',     bg: 'var(--ds-danger-subtle)' },
  amber:   { icon: 'var(--ds-warning)',    bg: 'var(--ds-warning-subtle)' },
  purple:  { icon: '#A78BFA',              bg: 'rgba(167,139,250,0.1)' },
  slate:   { icon: 'var(--ds-text-muted)', bg: 'var(--ds-hover)' },
}

export function StatCard({ title, value, trend, trendLabel, icon: Icon, color = 'indigo' }) {
  const tokens = colorTokens[color] || colorTokens.indigo
  const isPositiveTrend = trend && (trend.startsWith('+') || trend.startsWith('↑'))
  const isNegativeTrend = trend && (trend.startsWith('-') || trend.startsWith('↓'))

  return (
    <div 
      className="rounded-lg border p-6 flex flex-col justify-between h-full hover:shadow-md transition-shadow duration-200"
      style={{ 
        backgroundColor: 'var(--ds-surface)', 
        borderColor: 'var(--ds-border)',
        boxShadow: 'var(--ds-shadow-sm)'
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <p 
          className="text-[12px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--ds-text-muted)' }}
        >
          {title}
        </p>
        {Icon && (
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: tokens.bg }}
          >
            <Icon className="w-4 h-4" style={{ color: tokens.icon }} />
          </div>
        )}
      </div>
      <div>
        <div 
          className="text-2xl font-bold font-heading tracking-tight mb-1"
          style={{ color: 'var(--ds-text-primary)' }}
        >
          {value}
        </div>
        {trend && (
          <div 
            className="text-[11px] font-medium flex items-center gap-1"
            style={{ 
              color: isPositiveTrend ? 'var(--ds-success)' : isNegativeTrend ? 'var(--ds-danger)' : 'var(--ds-text-muted)'
            }}
          >
            <span>{trend}</span>
            {trendLabel && <span style={{ color: 'var(--ds-text-muted)' }}>{trendLabel}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
