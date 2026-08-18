import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'


export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  console.log(`[ProtectedRoute] Rendering. User: ${user ? user.email : "Guest"}, Loading: ${loading}`)

  if (loading) {
    console.log("[ProtectedRoute] App is loading auth state, rendering workspace loader...")
    return (
      <div className="flex justify-center items-center h-screen w-full" style={{ backgroundColor: 'var(--ds-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--ds-accent)', borderTopColor: 'transparent' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--ds-text-muted)' }}>Loading workspace…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    console.log("[ProtectedRoute] Access blocked: Guest user redirected to login.");
    return <Navigate to="/login" replace />
  }

  console.log("[ProtectedRoute] Access granted. Mounting children components.");
  return children
}
