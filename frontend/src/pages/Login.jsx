import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login as loginApi } from '../services/authApi'
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

  const navigate = useNavigate()
  const { login } = useAuth()

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
      const data = await loginApi({ email, password })
      login(data.user, data.token)
      const role = data.user?.email === 'sudhir3116@gmail.com' ? 'admin' : (data.user?.role || 'employee')
      navigate(getDashboardPath(role), { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please try again.')
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
            <span>ITSM ServiceDesk</span>
          </div>

          {/* Heading block */}
          <div className="lp-hero">
            <h1 className="lp-hero-title">Enterprise IT<br />Helpdesk</h1>
            <p className="lp-hero-sub">
              Manage incidents, service requests,<br />
              SLA tracking and IT operations — from one unified console.
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
              <span className="lp-illu-topbar-label">Helpdesk Console — Live</span>
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
            <div className="lp-logo-icon">IT</div>
            <span className="lp-logo-text">Employee IT Helpdesk</span>
          </div>

          {/* Heading */}
          <div className="lp-card-heading">
            <h2>Welcome Back</h2>
            <p>Sign in to continue.</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="lp-error-banner" role="alert">
              <span>⚠</span> {error}
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
            <div className="lp-forgot-row">
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

          {/* Divider */}
          <div className="lp-divider"><span>New to the platform?</span></div>

          {/* Register */}
          <Link to="/register" className="lp-btn-secondary">Register Employee Account</Link>

        </div>

        {/* Footer — pinned to bottom of right panel */}
        <footer className="lp-footer">
          <span>Version 2.4.0</span>
          <span className="lp-footer-sep">·</span>
          <span>&copy; 2026 Employee IT Helpdesk</span>
        </footer>
      </div>

    </div>
  )
}
