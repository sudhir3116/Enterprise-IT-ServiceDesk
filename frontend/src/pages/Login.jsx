import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login as loginApi, resendVerification } from '../services/authApi'
import { useAuth } from '../context/AuthContext'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  LayoutDashboard,
  Activity,
  ShieldCheck,
  Package,
  CheckCircle2,
  TicketCheck,
  Clock,
} from 'lucide-react'
import '../styles/login-page.css'
import { getDashboardPath } from '../utils/paths'

export default function Login() {
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [emailErr, setEmailErr]       = useState('')
  const [passErr, setPassErr]         = useState('')
  const [capsLockOn, setCapsLockOn]   = useState(false)
  const [showResend, setShowResend]   = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccessMessage, setResendSuccessMessage] = useState('')
  const [rememberMe, setRememberMe]   = useState(false)

  const navigate = useNavigate()
  const { login } = useAuth()

  async function handleResend() {
    if (!email) return
    setResendLoading(true)
    setError(null)
    setResendSuccessMessage('')
    try {
      const res = await resendVerification(email)
      setResendSuccessMessage(res.message || 'Verification email has been resent!')
      setShowResend(false)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to resend verification email.')
    } finally {
      setResendLoading(false)
    }
  }

  const validateEmail = (v) => {
    if (!v)                                  return setEmailErr('Email is required.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setEmailErr('Enter a valid email address.')
    setEmailErr('')
  }

  const validatePass = (v) => {
    if (!v)          return setPassErr('Password is required.')
    if (v.length < 8) return setPassErr('Password must be at least 8 characters.')
    setPassErr('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    validateEmail(email)
    validatePass(password)
    if (!email || !password || emailErr || passErr) return

    setLoading(true)
    try {
      const data = await loginApi({ email, password, rememberMe })
      login(data.user, data.accessToken)
      // Role comes exclusively from the API (RBAC system) — never from client-side identity checks
      const role = data.user?.role || 'employee'
      navigate(getDashboardPath(role), { replace: true })
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Login failed. Please try again.'
      setError(errMsg)
      if (errMsg.toLowerCase().includes('email not verified') || errMsg.toLowerCase().includes('verified')) {
        setShowResend(true)
      } else {
        setShowResend(false)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lp-root">

      {/* ─── LEFT PANEL ─────────────────────────────────────────── */}
      <div className="lp-left">
        {/* subtle grid overlay */}
        <div className="lp-grid-overlay" aria-hidden="true" />

        <div className="lp-left-inner">

          {/* Brand */}
          <div className="lp-brand">
            <div className="lp-brand-icon">
              <LayoutDashboard size={22} />
            </div>
            <span>Product Support Portal</span>
          </div>

          {/* Heading block */}
          <div className="lp-hero">
            <h1 className="lp-hero-title">Product Support<br />Portal</h1>
            <p className="lp-hero-sub">
              Manage incidents, service requests,<br />
              SLA tracking and operations — from one unified console.
            </p>
          </div>

          {/* Dashboard illustration — real data, no fake rectangles */}
          <div className="lp-illustration">
            <div className="lp-illu-topbar">
              <div className="lp-illu-topbar-left">
                <div className="lp-illu-dot red" />
                <div className="lp-illu-dot amber" />
                <div className="lp-illu-dot green" />
              </div>
              <span className="lp-illu-topbar-label">Product Support Portal — Live</span>
            </div>

            <div className="lp-illu-stats">
              <div className="lp-stat-card blue">
                <TicketCheck size={16} />
                <div>
                  <div className="lp-stat-value">284</div>
                  <div className="lp-stat-label">Open Tickets</div>
                </div>
              </div>
              <div className="lp-stat-card emerald">
                <CheckCircle2 size={16} />
                <div>
                  <div className="lp-stat-value">1,492</div>
                  <div className="lp-stat-label">Resolved</div>
                </div>
              </div>
              <div className="lp-stat-card amber">
                <Clock size={16} />
                <div>
                  <div className="lp-stat-value">4.2h</div>
                  <div className="lp-stat-label">Avg. MTTR</div>
                </div>
              </div>
            </div>

            <div className="lp-illu-rows">
              {[
                { id: '#INC-8821', title: 'VPN access failure — Finance', priority: 'High',   status: 'Open',       dot: 'red' },
                { id: '#INC-8820', title: 'Outlook not syncing — Riya S.', priority: 'Medium', status: 'In Progress', dot: 'amber' },
                { id: '#INC-8817', title: 'Printer offline — Floor 3',     priority: 'Low',    status: 'Resolved',   dot: 'green' },
              ].map(t => (
                <div key={t.id} className="lp-illu-row">
                  <span className="lp-illu-row-id">{t.id}</span>
                  <span className="lp-illu-row-title">{t.title}</span>
                  <span className={`lp-illu-badge ${t.dot}`}>{t.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feature cards */}
          <div className="lp-features">
            <div className="lp-feature-card">
              <div className="lp-feature-icon blue"><Activity size={18} /></div>
              <div>
                <div className="lp-feature-title">Incident Management</div>
                <div className="lp-feature-desc">Triage, assign, and resolve support tickets with SLA enforcement.</div>
              </div>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feature-icon emerald"><ShieldCheck size={18} /></div>
              <div>
                <div className="lp-feature-title">SLA Tracking &amp; Security</div>
                <div className="lp-feature-desc">Enforce response targets by priority with full audit trails.</div>
              </div>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feature-icon amber"><Package size={18} /></div>
              <div>
                <div className="lp-feature-title">Asset Management</div>
                <div className="lp-feature-desc">Map corporate hardware inventory and software licenses.</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ─── RIGHT PANEL ────────────────────────────────────────── */}
      <div className="lp-right">

        {/* Login card */}
        <div className="lp-card">

          {/* Logo */}
          <div className="lp-card-logo">
            <div className="lp-logo-icon">PSP</div>
            <span className="lp-logo-text">Product Support Portal</span>
          </div>

          {/* Heading */}
          <div className="lp-card-heading">
            <h2>Welcome Back</h2>
            <p>Sign in to continue.</p>
          </div>

          {/* Error/Success banners */}
          {error && (
            <div className="lp-error-banner" role="alert">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
                {showResend && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendLoading}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      textAlign: 'left',
                      fontSize: '0.78rem',
                      textDecoration: 'underline',
                      fontWeight: 600,
                      color: 'var(--ds-primary, #2563eb)',
                      cursor: 'pointer',
                      marginTop: '4px'
                    }}
                  >
                    {resendLoading ? 'Resending verification email...' : 'Didn\'t receive the email? Click here to resend.'}
                  </button>
                )}
              </div>
            </div>
          )}

          {resendSuccessMessage && (
            <div className="lp-success-banner" role="alert">
              <span>✓</span>
              <span>{resendSuccessMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="lp-form" noValidate>

            {/* Email */}
            <div className="lp-field">
              <label htmlFor="lp-email">Email Address</label>
              <div className="lp-input-wrap">
                <Mail className="lp-input-icon" size={18} />
                <input
                  id="lp-email"
                  type="email"
                  placeholder="name@company.com"
                  autoComplete="email"
                  name="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (emailErr) validateEmail(e.target.value) }}
                  onBlur={e => validateEmail(e.target.value)}
                  aria-invalid={!!emailErr}
                  aria-label="Email address"
                  className={emailErr ? 'lp-input lp-input-error' : 'lp-input'}
                  required
                />
              </div>
              {emailErr && <span className="lp-field-error">{emailErr}</span>}
            </div>

            {/* Password */}
            <div className="lp-field">
              <label htmlFor="lp-password">Password</label>
              <div className="lp-input-wrap">
                <Lock className="lp-input-icon" size={18} />
                <input
                  id="lp-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  name="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); if (passErr) validatePass(e.target.value) }}
                  onBlur={e => validatePass(e.target.value)}
                  onKeyUp={e => setCapsLockOn(e.getModifierState?.('CapsLock') ?? false)}
                  aria-invalid={!!passErr}
                  aria-label="Password"
                  className={passErr ? 'lp-input lp-input-error' : 'lp-input'}
                  required
                />
                <button
                  type="button"
                  className="lp-toggle-pass"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {capsLockOn && (
                <span className="lp-field-error" style={{ color: 'var(--ds-warning)' }}>
                  ⇪ Caps Lock is on
                </span>
              )}
              {passErr && <span className="lp-field-error">{passErr}</span>}
            </div>

            {/* Forgot password (inline text link) */}
            <div className="lp-forgot-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '-6px', marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--ds-text-muted)', cursor: 'pointer', fontWeight: 500 }}>
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={e => setRememberMe(e.target.checked)} 
                  style={{ width: '14px', height: '14px', accentColor: 'var(--ds-primary, #2563eb)', cursor: 'pointer' }}
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="lp-link">Forgot Password?</Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="lp-btn-primary"
              disabled={loading || !!emailErr || !!passErr}
            >
              {loading
                ? <><Loader2 size={18} className="lp-spin" /> Signing in…</>
                : 'Sign In'}
            </button>

          </form>

          {/* OR Divider for OAuth */}
          <div className="lp-divider"><span>OR</span></div>

          {/* Google Login Button */}
          <button
            type="button"
            className="lp-btn-google"
            onClick={() => {
              window.location.href = 'http://localhost:8001/api/auth/google';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '2px' }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="lp-divider"><span>New to the platform?</span></div>

          {/* Register */}
          <Link to="/register" className="lp-btn-secondary">Create Account</Link>

        </div>

        {/* Footer — pinned to bottom of right panel */}
        <footer className="lp-footer">
          <span>Version 2.4.0</span>
          <span className="lp-footer-sep">·</span>
          <span>&copy; 2026 Product Support Portal</span>
        </footer>
      </div>

    </div>
  )
}
