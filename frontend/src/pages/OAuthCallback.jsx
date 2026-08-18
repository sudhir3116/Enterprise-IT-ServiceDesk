import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { saveToken } from '../services/auth'
import api from '../services/api'
import { getDashboardPath } from '../utils/paths'

export default function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    async function handleCallback() {
      const token = searchParams.get('token')
      if (!token) {
        navigate('/login?error=sso_failed', { replace: true })
        return
      }

      try {
        // Save the token to local storage so interceptor can pick it up
        saveToken(token)
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`

        // Fetch user profile to populate AuthContext state
        const res = await api.get('/auth/profile')
        if (res.data && res.data.user) {
          login(res.data.user, token)
          const role = res.data.user.role || 'employee'
          navigate(getDashboardPath(role), { replace: true })
        } else {
          navigate('/login?error=sso_failed', { replace: true })
        }
      } catch (err) {
        console.error("SSO Callback failed:", err)
        navigate('/login?error=sso_failed', { replace: true })
      }
    }

    handleCallback()
  }, [searchParams, login, navigate])

  return (
    <div className="flex justify-center items-center h-screen w-full" style={{ backgroundColor: 'var(--ds-bg)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--ds-accent)', borderTopColor: 'transparent' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--ds-text-muted)' }}>Completing secure sign-in…</p>
      </div>
    </div>
  )
}
