import { useTheme } from './useTheme'

/**
 * useChartTheme — Returns a complete Recharts color configuration
 * derived from the active design system theme.
 * 
 * Usage:
 *   const chart = useChartTheme()
 *   <CartesianGrid stroke={chart.grid} />
 *   <XAxis tick={{ fill: chart.axis }} />
 *   <Tooltip contentStyle={chart.tooltip} />
 */
export function useChartTheme() {
  const { isDark } = useTheme()

  // Read the actual CSS variable values via computed style
  const getToken = (varName) => {
    if (typeof window === 'undefined') return ''
    return getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim()
  }

  const grid       = getToken('--ds-chart-grid')       || (isDark ? '#21262D' : '#EAEEF2')
  const axis       = getToken('--ds-chart-axis')       || (isDark ? '#6E7681' : '#9198A1')
  const tooltipBg  = getToken('--ds-chart-tooltip-bg') || (isDark ? '#2D333B' : '#FFFFFF')
  const tooltipBdr = getToken('--ds-chart-tooltip-border') || (isDark ? '#444C56' : '#D0D7DE')
  const tooltipTxt = getToken('--ds-chart-tooltip-text') || (isDark ? '#E6EDF3' : '#1F2328')
  const color1     = getToken('--ds-chart-1')          || (isDark ? '#58A6FF' : '#0969DA')
  const color2     = getToken('--ds-chart-2')          || (isDark ? '#3FB950' : '#1A7F37')
  const color3     = getToken('--ds-chart-3')          || (isDark ? '#D29922' : '#9A6700')
  const color4     = getToken('--ds-chart-4')          || (isDark ? '#F85149' : '#D1242F')
  const color5     = getToken('--ds-chart-5')          || (isDark ? '#BC8CFF' : '#6639BA')

  return {
    isDark,
    
    // Individual tokens
    grid,
    axis,
    
    // Recharts tooltip contentStyle
    tooltip: {
      backgroundColor: tooltipBg,
      border: `1px solid ${tooltipBdr}`,
      borderRadius: '8px',
      color: tooltipTxt,
      fontSize: '12px',
      boxShadow: isDark 
        ? '0 4px 12px rgba(0,0,0,0.5)' 
        : '0 4px 12px rgba(31,35,40,0.15)',
    },
    
    // Recharts cursor style
    cursor: {
      fill: isDark ? 'rgba(88, 166, 255, 0.08)' : 'rgba(9, 105, 218, 0.06)',
    },
    
    // Recharts tick style object
    tick: {
      fill: axis,
      fontSize: 11,
    },

    // Color palette (for bars, pies, lines)
    colors: [color1, color2, color3, color4, color5],
    color1, color2, color3, color4, color5,
    
    // Recharts Legend wrapper style
    legend: {
      fontSize: '12px',
      color: axis,
    },

    // CartesianGrid stroke dasharray
    gridDash: '3 3',
    gridOpacity: isDark ? 0.4 : 0.6,

    // Helper: build axis tick props
    axisTick: {
      fill: axis,
      fontSize: 11,
    },

    // Helper: build axis line props
    axisLine: {
      stroke: isDark ? '#30363D' : '#D0D7DE',
    },
  }
}

export default useChartTheme
