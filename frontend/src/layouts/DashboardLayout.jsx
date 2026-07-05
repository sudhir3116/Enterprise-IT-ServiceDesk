import React from 'react'
import { Outlet } from 'react-router-dom'
import AppShell from '../components/enterprise/AppShell'

export default function DashboardLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
