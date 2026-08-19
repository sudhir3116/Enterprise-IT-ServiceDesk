import React from 'react'
import ProtectedRoute from './ProtectedRoute'

export default function RoleRoute({ children, role }) {
  return (
    <ProtectedRoute allowedRoles={role}>
      {children}
    </ProtectedRoute>
  )
}
