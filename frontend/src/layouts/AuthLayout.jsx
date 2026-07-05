import React from 'react'
import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="w-full h-full m-0 p-0 overflow-auto" style={{ backgroundColor: 'var(--ds-bg)' }}>
      <Outlet />
    </div>
  )
}
