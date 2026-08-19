import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles, role }) {
  const { user, isAuthenticated, isLoading, pendingUser } = useAuth()
  const location = useLocation()

  console.log("AUTH STATE", {
    user: user ? user.email : null,
    isAuthenticated,
    isLoading,
    pendingUser: pendingUser ? pendingUser.email : null,
    pathname: location.pathname
  })

  // 1. Loading screen while AuthContext initializes
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen w-full" style={{ backgroundColor: 'var(--ds-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--ds-accent)', borderTopColor: 'transparent' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--ds-text-muted)' }}>Verifying session…</p>
        </div>
      </div>
    )
  }

  // 2. Unauthenticated handling (No JWT / Session)
  if (!isAuthenticated || !user) {
    // If user is unauthenticated BUT has pendingUser state AND is visiting /pending-approval -> ALLOW
    if (pendingUser && location.pathname === '/pending-approval') {
      return children
    }
    // If user has pendingUser state but tries to access any other protected route -> redirect to /pending-approval
    if (pendingUser) {
      return <Navigate to="/pending-approval" replace />
    }
    // No auth and no pendingUser -> redirect to /login
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // 3. Authenticated user pending approval check
  if (user.accountStatus === 'pending_approval' || user.isApproved === false) {
    if (location.pathname === '/pending-approval') {
      return children
    }
    return <Navigate to="/pending-approval" replace />
  }

  // 4. Role-based authorization check
  const targetRoles = allowedRoles || (role ? (Array.isArray(role) ? role : role.split(',')) : null)

  if (targetRoles && targetRoles.length > 0) {
    const normalizeRole = (r) => {
      const lower = (r || '').toString().toLowerCase().trim()
      if (lower === 'employee' || lower === 'requester') return 'customer'
      if (lower === 'agent' || lower === 'support_agent') return 'support_engineer'
      return lower
    }

    const userRole = normalizeRole(user.role || user.dbRole)
    const allowedSet = new Set(targetRoles.map(r => normalizeRole(r)))

    if (!allowedSet.has(userRole)) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return children
}
