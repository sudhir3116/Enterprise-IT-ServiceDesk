export function getDashboardPath(role) {
  if (role === 'admin')            return '/admin/dashboard'
  if (role === 'support_engineer') return '/engineer/dashboard'
  return '/employee/dashboard'
}

export function getSettingsPath(role) {
  if (role === 'admin')            return '/admin/settings'
  if (role === 'support_engineer') return '/engineer/profile'
  return '/employee/profile'
}
