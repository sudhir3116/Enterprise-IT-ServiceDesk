import React from 'react'

export default function SectionHeader({ title, description, className = '' }) {
  return (
    <div className={`mb-4 ${className}`}>
      <h2 className="text-[20px] font-semibold text-primary" style={{ lineHeight: '1.3', letterSpacing: '0.03em' }}>{title}</h2>
      {description && (
        <p className="text-[13px] mt-1 text-tertiary" style={{ lineHeight: '1.6', letterSpacing: '0.01em' }}>{description}</p>
      )}
    </div>
  )
}
