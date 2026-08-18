import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RoleRoute({ children, role }) {
  const { user, loading } = useAuth()

  console.log(`[RoleRoute] Checking role requirements. Target roles: ${role}, User Role: ${user ? user.role : "Guest"}, Loading: ${loading}`)

  if (loading) {
    console.log("[RoleRoute] App is loading auth state, rendering workspace loader...")
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
    console.log("[RoleRoute] Access blocked: Guest user redirected to login.");
    return <Navigate to="/login" replace />
  }

  // Role comes exclusively from the RBAC system — never from client-side identity checks
  const userRole = (user?.role || '').toString().toLowerCase()

  const allowedRoles = Array.isArray(role)
    ? role.map(r => r.toLowerCase())
    : role.split(',').map(r => r.trim().toLowerCase())

  const isAuthorized = allowedRoles.includes(userRole)

  if (!isAuthorized) {
    console.log(`[RoleRoute] Access denied: User role "${userRole}" not allowed for route. Redirecting to unauthorized.`);
    return <Navigate to="/unauthorized" replace />
  }

  console.log("[RoleRoute] Access granted. Mounting children components.");
  return children
}
