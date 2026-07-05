import React from 'react'

function SkeletonBlock({ width = '100%', height = '14px', className = '' }) {
  return (
    <div 
      className={className}
      style={{ 
        width,
        height,
        borderRadius: '4px',
        background: `linear-gradient(90deg, var(--ds-surface-raised) 25%, var(--ds-hover) 50%, var(--ds-surface-raised) 75%)`,
        backgroundSize: '200% 100%',
        animation: 'ds-shimmer 1.8s infinite',
      }} 
    />
  )
}

export default function SkeletonLoader({ type = 'row', count = 1, className = '' }) {
  if (type === 'table') {
    return (
      <div className="w-full">
        {/* Header */}
        <div 
          className="flex px-4 py-2.5 border-b gap-4"
          style={{ backgroundColor: 'var(--ds-surface-raised)', borderColor: 'var(--ds-divider)' }}
        >
          {[120, 180, 140, 80].map((w, i) => <SkeletonBlock key={i} width={`${w}px`} height="12px" />)}
        </div>
        {[...Array(count)].map((_, i) => (
          <div 
            key={i} 
            className="flex items-center px-4 py-3.5 gap-4 border-b"
            style={{ borderColor: 'var(--ds-divider)' }}
          >
            <SkeletonBlock width="32px" height="32px" className="rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock width="60%" height="13px" />
              <SkeletonBlock width="35%" height="11px" />
            </div>
            <SkeletonBlock width="60px" height="22px" />
          </div>
        ))}
      </div>
    )
  }

  if (type === 'card') {
    return (
      <div 
        className={`p-5 rounded-lg border ${className}`}
        style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)' }}
      >
        <div className="flex justify-between items-start mb-4">
          <SkeletonBlock width="45%" height="12px" />
          <SkeletonBlock width="32px" height="32px" className="rounded-lg" />
        </div>
        <SkeletonBlock width="50%" height="28px" />
        <div className="mt-2">
          <SkeletonBlock width="30%" height="10px" />
        </div>
      </div>
    )
  }

  if (type === 'form') {
    return (
      <div className={`space-y-5 ${className}`}>
        {[...Array(count)].map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonBlock width="100px" height="10px" />
            <SkeletonBlock width="100%" height="36px" />
          </div>
        ))}
      </div>
    )
  }

  if (type === 'stat') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(count || 3)].map((_, i) => (
          <div 
            key={i} 
            className="p-5 rounded-lg border"
            style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)' }}
          >
            <div className="flex justify-between mb-3">
              <SkeletonBlock width="120px" height="12px" />
              <SkeletonBlock width="32px" height="32px" className="rounded-lg" />
            </div>
            <SkeletonBlock width="70px" height="28px" />
          </div>
        ))}
      </div>
    )
  }

  // Default: row skeletons
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {[...Array(count)].map((_, i) => (
        <SkeletonBlock key={i} width="100%" height="14px" />
      ))}
    </div>
  )
}
