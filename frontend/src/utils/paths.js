export function getDashboardPath(role) {
  const norm = (role || '').toString().toLowerCase().trim();
  if (norm === 'admin') return '/admin/dashboard';
  if (norm === 'support_engineer' || norm === 'agent') return '/engineer/dashboard';
  if (norm === 'developer') return '/developer/bugs';
  return '/employee/dashboard';
}

export function getSettingsPath(role) {
  const norm = (role || '').toString().toLowerCase().trim();
  if (norm === 'admin') return '/admin/settings';
  if (norm === 'support_engineer' || norm === 'agent') return '/engineer/profile';
  if (norm === 'developer') return '/developer/bugs';
  return '/employee/profile';
}
