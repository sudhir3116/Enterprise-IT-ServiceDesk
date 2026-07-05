/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'monospace'],
      },
      colors: {
        // Design System tokens — map CSS vars to Tailwind utilities
        ds: {
          bg:                 'var(--ds-bg)',
          surface:            'var(--ds-surface)',
          'surface-raised':   'var(--ds-surface-raised)',
          'surface-overlay':  'var(--ds-surface-overlay)',
          navbar:             'var(--ds-navbar)',
          sidebar:            'var(--ds-sidebar-bg)',
          border:             'var(--ds-border)',
          'border-strong':    'var(--ds-border-strong)',
          divider:            'var(--ds-divider)',
          'text-primary':     'var(--ds-text-primary)',
          'text-secondary':   'var(--ds-text-secondary)',
          'text-muted':       'var(--ds-text-muted)',
          'text-inverse':     'var(--ds-text-inverse)',
          accent:             'var(--ds-accent)',
          'accent-hover':     'var(--ds-accent-hover)',
          'accent-subtle':    'var(--ds-accent-subtle)',
          success:            'var(--ds-success)',
          'success-subtle':   'var(--ds-success-subtle)',
          warning:            'var(--ds-warning)',
          'warning-subtle':   'var(--ds-warning-subtle)',
          danger:             'var(--ds-danger)',
          'danger-subtle':    'var(--ds-danger-subtle)',
          info:               'var(--ds-info)',
          'info-subtle':      'var(--ds-info-subtle)',
          hover:              'var(--ds-hover)',
          selected:           'var(--ds-selected)',
          'input-bg':         'var(--ds-input-bg)',
          'input-border':     'var(--ds-input-border)',
        },
        // Legacy token compat (keep old class names working)
        background:     'var(--ds-bg)',
        surface:        'var(--ds-surface)',
        'surface-hover':'var(--ds-hover)',
        default:        'var(--ds-border)',
        strong:         'var(--ds-border-strong)',
        primary:        'var(--ds-text-primary)',
        secondary:      'var(--ds-text-secondary)',
        tertiary:       'var(--ds-text-muted)',
      },
      boxShadow: {
        'ds-sm':      'var(--ds-shadow-sm)',
        'ds-md':      'var(--ds-shadow-md)',
        'ds-lg':      'var(--ds-shadow-lg)',
        'ds-overlay': 'var(--ds-shadow-overlay)',
        // Card shadow: visible in light, invisible in dark
        'ds-card':    '0 1px 3px rgba(31, 35, 40, 0.08), 0 0 0 1px rgba(31, 35, 40, 0.04)',
      },
      borderColor: {
        default: 'var(--ds-border)',
        strong:  'var(--ds-border-strong)',
      },
      ringColor: {
        DEFAULT: 'var(--ds-focus-ring)',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-down': {
          '0%':   { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        'scale-in': {
          '0%':   { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
      },
      animation: {
        'fade-in':        'fade-in 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-in-down':  'slide-in-down 0.15s ease-out',
        'scale-in':       'scale-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
}
