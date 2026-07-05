import React from 'react'

export default function Button({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary',
  size = 'md',
  icon: Icon,
  disabled = false,
  isLoading = false,
  className = '',
  title,
  form,
  ...props 
}) {
  // Base styles — no color, only layout & behavior
  const base = `
    inline-flex items-center justify-center font-medium rounded-md 
    transition-all duration-150 cursor-pointer select-none
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
  `
  
  // Size definitions
  const sizes = {
    xs: 'h-6 px-2 text-[11px] gap-1',
    sm: 'h-7 px-2.5 text-[12px] gap-1.5',
    md: 'h-10 px-[18px] text-[14px] font-semibold gap-1.5',
    lg: 'h-11 px-5 text-[15px] font-semibold gap-2',
  }

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4 h-4',
  }

  // Variant styles — pure CSS vars, no Tailwind color classes
  const variantStyles = {
    primary: {
      backgroundColor: 'var(--ds-accent)',
      color: 'var(--brand-primary-text, #FFFFFF)',
      border: '1px solid transparent',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
    },
    secondary: {
      backgroundColor: 'var(--ds-surface)',
      color: 'var(--ds-text-secondary)',
      border: '1px solid var(--ds-border)',
      boxShadow: 'var(--ds-shadow-sm)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--ds-text-secondary)',
      border: '1px solid transparent',
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--ds-accent)',
      border: '1px solid var(--ds-accent)',
    },
    danger: {
      backgroundColor: 'var(--ds-danger)',
      color: '#FFFFFF',
      border: '1px solid transparent',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
    },
    success: {
      backgroundColor: 'var(--ds-success)',
      color: '#FFFFFF',
      border: '1px solid transparent',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
    },
    link: {
      backgroundColor: 'transparent',
      color: 'var(--ds-accent)',
      border: '1px solid transparent',
      padding: '0',
      height: 'auto',
      textDecoration: 'underline',
    },
  }

  const hoverStyles = {
    primary: { backgroundColor: 'var(--ds-accent-hover)' },
    secondary: { backgroundColor: 'var(--ds-hover)', borderColor: 'var(--ds-border-strong)' },
    ghost: { backgroundColor: 'var(--ds-hover)', color: 'var(--ds-text-primary)' },
    outline: { backgroundColor: 'var(--ds-accent-subtle)' },
    danger: { backgroundColor: '#B91C1C' },
    success: { backgroundColor: '#15803D' },
    link: { opacity: 0.8 },
  }

  const [isHovered, setIsHovered] = React.useState(false)
  const currentStyle = {
    ...variantStyles[variant] || variantStyles.ghost,
    ...(isHovered && !disabled && !isLoading ? hoverStyles[variant] || {} : {}),
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      title={title}
      form={form}
      className={`${base} ${sizes[size] || sizes.md} ${className}`}
      style={currentStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {isLoading ? (
        <svg 
          className={`animate-spin ${iconSizes[size] || iconSizes.md}`} 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
          style={{ color: 'currentColor' }}
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : Icon ? (
        <Icon className={iconSizes[size] || iconSizes.md} />
      ) : null}
      {children}
    </button>
  )
}
