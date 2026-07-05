import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Bell, Sun, Moon, ChevronDown, LogOut, User, Settings, LayoutDashboard, TicketCheck } from 'lucide-react'
import api from '../services/api'
import GlobalSearch from './GlobalSearch'

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate()

  const [userMenuOpen,  setUserMenuOpen]  = useState(false)
  const [notifOpen,     setNotifOpen]     = useState(false)
  const [searchOpen,    setSearchOpen]    = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [darkMode, setDarkMode] = useState(() =>
    localStorage.getItem('theme') === 'dark' || !localStorage.getItem('theme')
  )

  // ── Dark mode ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode')
      localStorage.setItem('theme', 'dark')
    } else {
      document.body.classList.remove('dark-mode')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  // ── Load real notifications ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    api.get('/notifications?limit=5')
      .then(res => {
        const data = res.data?.notifications || res.data || []
        setNotifications(Array.isArray(data) ? data.slice(0, 5) : [])
        const unread = Array.isArray(data) ? data.filter(n => !n.read).length : 0
        setUnreadCount(unread)
      })
      .catch(() => {})
  }, [user])

  // ── Cmd+K global search trigger ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Close dropdowns on outside click ────────────────────────────────────
  useEffect(() => {
    const close = () => { setUserMenuOpen(false); setNotifOpen(false) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const role    = user?.role || ''
  const isStaff = ['admin', 'support_engineer'].includes(role)

  function getDashboardPath() {
    if (role === 'admin')            return '/admin'
    if (role === 'support_engineer') return '/employee'
    return '/employee'
  }

  function getProfilePath() {
    if (role === 'admin')            return '/admin/settings'
    if (role === 'support_engineer') return '/engineer/profile'
    return '/employee/profile'
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '??'

  const roleLabel = role === 'admin'
    ? 'Admin'
    : role === 'support_engineer'
    ? 'Engineer'
    : 'Employee'

  return (
    <>
      <nav className="navbar">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>

          {/* Brand */}
          <Link to={getDashboardPath()} className="brand" style={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: '1rem' }}>
            IT HelpDesk
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

            {/* Search button */}
            {user && (
              <button
                onClick={(e) => { e.stopPropagation(); setSearchOpen(true) }}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
                title="Search (⌘K)"
              >
                <Search style={{ width: 14, height: 14 }} />
                <span className="hidden sm:inline">Search</span>
                <kbd style={{
                  fontSize: '0.65rem', padding: '1px 5px', borderRadius: 4,
                  background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.1)',
                  fontFamily: 'inherit',
                }}>⌘K</kbd>
              </button>
            )}

            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(d => !d)}
              className="btn btn-secondary"
              style={{ padding: '5px 10px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              title="Toggle theme"
            >
              {darkMode
                ? <Sun style={{ width: 14, height: 14 }} />
                : <Moon style={{ width: 14, height: 14 }} />
              }
            </button>

            {user ? (
              <>
                {/* Notifications */}
                <div className="dropdown-container" style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setNotifOpen(o => !o); setUserMenuOpen(false) }}
                    className="btn btn-secondary"
                    style={{ position: 'relative', padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    title="Notifications"
                  >
                    <Bell style={{ width: 14, height: 14 }} />
                    {unreadCount > 0 && (
                      <span style={{
                        position: 'absolute', top: 2, right: 2,
                        background: '#ef4444', color: '#fff',
                        borderRadius: '50%', width: 14, height: 14,
                        fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700,
                      }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="dropdown-menu active" style={{ right: 0, minWidth: 300, zIndex: 8000 }} onClick={e => e.stopPropagation()}>
                      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>Notifications</span>
                        {unreadCount > 0 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', background: 'var(--badge-bg)', padding: '2px 6px', borderRadius: 9999 }}>
                            {unreadCount} unread
                          </span>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted)' }}>
                          No new notifications
                        </div>
                      ) : (
                        notifications.map((n, i) => (
                          <div
                            key={n._id || i}
                            style={{
                              padding: '10px 14px',
                              borderBottom: '1px solid var(--card-border)',
                              fontSize: '0.78rem',
                              background: n.read ? 'transparent' : 'rgba(59,130,246,0.04)',
                            }}
                          >
                            <p style={{ margin: 0, color: 'var(--accent)', fontWeight: n.read ? 400 : 600 }}>{n.message || n.text}</p>
                            <span style={{ fontSize: '0.7rem', color: 'var(--muted-2)', marginTop: 2, display: 'block' }}>
                              {n.createdAt ? new Date(n.createdAt).toLocaleString() : n.date}
                            </span>
                          </div>
                        ))
                      )}
                      <div style={{ padding: '8px 14px' }}>
                        <button
                          onClick={() => { navigate(getDashboardPath()); setNotifOpen(false) }}
                          style={{ fontSize: '0.75rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                        >
                          View all →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* User menu */}
                <div className="dropdown-container" style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setUserMenuOpen(o => !o); setNotifOpen(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                      background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                      padding: '5px 10px 5px 6px', borderRadius: 9999,
                    }}
                  >
                    {/* Avatar */}
                    <span style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: '#3b82f6', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {initials}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.name}
                    </span>
                    <ChevronDown style={{ width: 12, height: 12, color: 'var(--muted)', flexShrink: 0 }} />
                  </button>

                  {userMenuOpen && (
                    <div className="dropdown-menu active" style={{ right: 0, minWidth: 220, zIndex: 8000 }} onClick={e => e.stopPropagation()}>
                      {/* User info header */}
                      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--card-border)' }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent)' }}>{user.name}</p>
                        <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--muted)', marginTop: 2 }}>{user.email}</p>
                        <span style={{
                          display: 'inline-block', marginTop: 4, fontSize: '0.65rem', fontWeight: 700,
                          background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: 9999, padding: '2px 8px',
                        }}>
                          {roleLabel}
                        </span>
                      </div>

                      <Link to={getDashboardPath()} className="dropdown-item" onClick={() => setUserMenuOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <LayoutDashboard style={{ width: 14, height: 14 }} /> Dashboard
                      </Link>

                      {!isStaff && (
                        <Link to="/employee/my-tickets" className="dropdown-item" onClick={() => setUserMenuOpen(false)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <TicketCheck style={{ width: 14, height: 14 }} /> My Tickets
                        </Link>
                      )}

                      <Link to={getProfilePath()} className="dropdown-item" onClick={() => setUserMenuOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <User style={{ width: 14, height: 14 }} /> Profile &amp; Settings
                      </Link>

                      <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid var(--card-border)' }} />

                      <button
                        onClick={() => { setUserMenuOpen(false); onLogout() }}
                        className="dropdown-item"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', width: '100%', textAlign: 'left' }}
                      >
                        <LogOut style={{ width: 14, height: 14 }} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login"    className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>Login</Link>
                <Link to="/register" className="btn btn-primary"   style={{ fontSize: '0.85rem' }}>Register</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Global Search Modal */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
