import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { setAccessToken } from '../services/api'
import { getProfile as getProfileApi } from '../services/authApi'
import { getDashboardPath } from '../utils/paths'

export default function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login, setPendingUser, clearPendingUser } = useAuth()

  useEffect(() => {
    async function handleCallback() {
      const status = searchParams.get('status')
      const token = searchParams.get('token')
      const email = searchParams.get('email')
      const name = searchParams.get('name')
      const provider = searchParams.get('provider') || 'Google OAuth'
      const role = searchParams.get('role') || 'customer'

      console.log('[OAuthCallback] Params received:', { status, token: !!token, email, name, provider, role })

      // 1. Pending Approval Handling for Google/Microsoft OAuth Users
      if (status === 'pending_approval') {
        const decodedEmail = email ? decodeURIComponent(email) : ''
        const decodedName = name ? decodeURIComponent(name) : 'Registered User'
        console.log('[OAuthCallback] User pending approval:', decodedEmail)

        setPendingUser({
          name: decodedName,
          email: decodedEmail,
          registrationMethod: provider === 'google' || provider.toLowerCase().includes('google') ? 'Google OAuth' : provider,
          status: 'pending_approval',
          role
        })

        // Clean query string from browser URL for clean navigation
        window.history.replaceState({}, document.title, window.location.pathname)
        navigate('/pending-approval', { replace: true })
        return
      }

      // 2. Rejected Account Handling
      if (status === 'rejected') {
        clearPendingUser()
        navigate('/login?error=account_rejected', { replace: true })
        return
      }

      // 3. Suspended Account Handling
      if (status === 'suspended') {
        clearPendingUser()
        navigate('/login?error=account_suspended', { replace: true })
        return
      }

      // 4. Token handling for active approved users
      if (token) {
        try {
          clearPendingUser()
          setAccessToken(token)
          const res = await getProfileApi()
          if (res && res.user) {
            login(res.user, token, res.organization, res.permissions)
            const userRole = res.user.role || role || 'customer'
            window.history.replaceState({}, document.title, window.location.pathname)
            navigate(getDashboardPath(userRole), { replace: true })
          } else {
            navigate('/login?error=sso_failed', { replace: true })
          }
        } catch (err) {
          console.error("SSO Callback token verification failed:", err)
          navigate('/login?error=sso_failed', { replace: true })
        }
        return
      }

      // Default fallback
      navigate('/login?error=sso_failed', { replace: true })
    }

    handleCallback()
  }, [searchParams, login, setPendingUser, clearPendingUser, navigate])

  return (
    <div className="flex justify-center items-center h-screen w-full" style={{ backgroundColor: 'var(--ds-bg)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--ds-accent)', borderTopColor: 'transparent' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--ds-text-muted)' }}>Completing secure sign-in…</p>
      </div>
    </div>
  )
}
