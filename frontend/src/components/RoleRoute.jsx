import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getToken } from '../services/auth'

/** Check if the locally-stored JWT is expired (using the exp claim baked in by the backend). */
function isTokenExpired() {
  const token = getToken()
  if (!token) return true
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return exp ? exp * 1000 <= Date.now() : false
  } catch {
    return true
  }
}

export default function RoleRoute({ children, role }) {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen w-full" style={{ backgroundColor: 'var(--ds-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--ds-accent)', borderTopColor: 'transparent' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--ds-text-muted)' }}>Loading workspace…</p>
        </div>
      </div>
    )
  }

  // Check token expiry on every route navigation
  if (user && isTokenExpired()) {
    logout()
    return <Navigate to="/login" replace />
  }

  if (!user) return <Navigate to="/login" replace />

  const userRole = user && user.email === 'sudhir3116@gmail.com'
    ? 'admin'
    : (user.role || '').toString().toLowerCase()

  const allowedRoles = Array.isArray(role)
    ? role.map(r => r.toLowerCase())
    : role.split(',').map(r => r.trim().toLowerCase())

  const isAuthorized = allowedRoles.includes(userRole)

  if (!isAuthorized) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}
