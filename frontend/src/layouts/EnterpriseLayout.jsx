import React from 'react'
import { Outlet } from 'react-router-dom'
import AppShell from '../components/enterprise/AppShell'

export default function EnterpriseLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
