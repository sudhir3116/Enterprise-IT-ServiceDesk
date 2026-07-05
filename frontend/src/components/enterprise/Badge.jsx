import React from 'react'

// Semantic badge color tokens mapped to CSS variables
const badgeTokens = {
  gray:    { bg: 'var(--ds-badge-gray-bg)',    text: 'var(--ds-badge-gray-text)' },
  blue:    { bg: 'var(--ds-badge-blue-bg)',    text: 'var(--ds-badge-blue-text)' },
  indigo:  { bg: 'var(--ds-badge-blue-bg)',    text: 'var(--ds-badge-blue-text)' },
  emerald: { bg: 'var(--ds-badge-green-bg)',   text: 'var(--ds-badge-green-text)' },
  green:   { bg: 'var(--ds-badge-green-bg)',   text: 'var(--ds-badge-green-text)' },
  red:     { bg: 'var(--ds-badge-red-bg)',     text: 'var(--ds-badge-red-text)' },
  amber:   { bg: 'var(--ds-badge-yellow-bg)',  text: 'var(--ds-badge-yellow-text)' },
  yellow:  { bg: 'var(--ds-badge-yellow-bg)',  text: 'var(--ds-badge-yellow-text)' },
  purple:  { bg: 'var(--ds-badge-purple-bg)',  text: 'var(--ds-badge-purple-text)' },
  violet:  { bg: 'var(--ds-badge-purple-bg)',  text: 'var(--ds-badge-purple-text)' },
  orange:  { bg: 'var(--ds-badge-yellow-bg)',  text: 'var(--ds-badge-yellow-text)' },
  slate:   { bg: 'var(--ds-badge-gray-bg)',    text: 'var(--ds-badge-gray-text)' },
  teal:    { bg: 'var(--ds-badge-green-bg)',   text: 'var(--ds-badge-green-text)' },
  pink:    { bg: 'var(--ds-badge-purple-bg)',  text: 'var(--ds-badge-purple-text)' },
  cyan:    { bg: 'var(--ds-badge-blue-bg)',    text: 'var(--ds-badge-blue-text)' },
}

const roundedVariants = {
  none: '0',
  sm: '2px',
  md: '4px',
  lg: '6px',
  full: '9999px',
}

export default function Badge({ 
  children, 
  color = 'gray', 
  className = '', 
  rounded = 'full',
  dot = false
}) {
  const tokens = badgeTokens[color] || badgeTokens.gray

  return (
    <span 
      className={`inline-flex items-center justify-center gap-1.5 px-2.5 h-6 text-[11px] font-bold uppercase tracking-wider ${className}`}
      style={{ 
        backgroundColor: tokens.bg,
        color: tokens.text,
        borderRadius: roundedVariants[rounded] || '9999px'
      }}
    >
      {dot && (
        <span 
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: tokens.text }}
        />
      )}
      {children}
    </span>
  )
}
