import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Search, Bell, Sun, Moon, LogOut, Settings, ChevronRight, Monitor } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../hooks/useTheme'
import { getNotifications, markAllNotificationsRead } from '../../services/notificationApi'

export default function Navbar({ setMobileMenuOpen, setSearchOpen }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifMenu, setShowNotifMenu] = useState(false)
  const { themeMode, setThemeMode, isDark: isDarkMode } = useTheme()

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications()
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.read).length)
    } catch (err) {}
  }

  useEffect(() => {
    if (user) {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 15000)
      return () => clearInterval(interval)
    }
  }, [user])

  const onMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      fetchNotifications()
    } catch (err) {}
  }

  useEffect(() => {
    const handleOutsideClick = () => {
      setShowNotifMenu(false)
      setShowUserMenu(false)
      setShowThemeMenu(false)
    }
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [])

  const role = user && user.email === 'sudhir3116@gmail.com' ? 'admin' : (user?.role || 'employee')
  const getSettingsPath = () => {
    if (role === 'admin') return '/admin/settings'
    if (role === 'support_engineer') return '/engineer/profile'
    return '/employee/profile'
  }

  const pathnames = location.pathname.split('/').filter(x => x)
  const breadcrumbs = pathnames.map((name, index) => {
    const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`
    return { name: name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' '), path: routeTo }
  })

  const themeOptions = [
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'dark', label: 'Dark', icon: Moon },
    { key: 'system', label: 'System', icon: Monitor },
  ]

  const userInitials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'

  return (
    <header 
      className="h-14 border-b flex items-center justify-between px-4 lg:px-5 shrink-0 z-30 sticky top-0"
      style={{ 
        backgroundColor: 'var(--ds-navbar)', 
        borderColor: 'var(--ds-border)',
        boxShadow: 'var(--ds-shadow-sm)'
      }}
    >
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden p-1.5 -ml-1 rounded-md transition-colors"
          style={{ color: 'var(--ds-text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--ds-hover)'; e.currentTarget.style.color = 'var(--ds-text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--ds-text-muted)' }}
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Breadcrumbs */}
        <nav className="hidden md:flex items-center gap-1 text-[13px] font-medium">
          <Link 
            to="/" 
            className="transition-colors"
            style={{ color: 'var(--ds-text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--ds-text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--ds-text-muted)'}
          >
            Home
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" style={{ color: 'var(--ds-text-muted)' }} />
              <Link 
                to={crumb.path}
                className="transition-colors"
                style={{ 
                  color: index === breadcrumbs.length - 1 ? 'var(--ds-text-primary)' : 'var(--ds-text-muted)',
                  fontWeight: index === breadcrumbs.length - 1 ? '600' : '500'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--ds-text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = index === breadcrumbs.length - 1 ? 'var(--ds-text-primary)' : 'var(--ds-text-muted)'}
              >
                {crumb.name}
              </Link>
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-[13px] rounded-md border transition-all"
          style={{ 
            backgroundColor: 'var(--ds-surface-raised)', 
            borderColor: 'var(--ds-border)',
            color: 'var(--ds-text-muted)'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--ds-border-strong)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ds-border)'}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
          <kbd 
            className="text-[10px] font-bold rounded px-1.5 border font-sans"
            style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-muted)' }}
          >
            ⌘K
          </kbd>
        </button>

        <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--ds-divider)' }} />

        {/* Theme Switcher */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => { setShowThemeMenu(!showThemeMenu); setShowNotifMenu(false); setShowUserMenu(false) }}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--ds-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--ds-hover)'; e.currentTarget.style.color = 'var(--ds-text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--ds-text-muted)' }}
            title="Theme"
          >
            {themeMode === 'light' ? <Sun className="w-4 h-4" /> : themeMode === 'dark' ? <Moon className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
          </button>
          
          {showThemeMenu && (
            <div 
              className="absolute right-0 top-full mt-1.5 w-36 rounded-lg border overflow-hidden shadow-lg z-50 py-1 animate-slide-in-down"
              style={{ 
                backgroundColor: 'var(--ds-surface-overlay)', 
                borderColor: 'var(--ds-border)',
                boxShadow: 'var(--ds-shadow-overlay)'
              }}
            >
              {themeOptions.map(({ key, label, icon: TIcon }) => (
                <button
                  key={key}
                  onClick={() => { setThemeMode(key); setShowThemeMenu(false) }}
                  className="w-full text-left px-3 py-2 text-[13px] flex items-center gap-2.5 transition-colors"
                  style={{ 
                    backgroundColor: themeMode === key ? 'var(--ds-hover)' : 'transparent',
                    color: themeMode === key ? 'var(--ds-text-primary)' : 'var(--ds-text-secondary)',
                    fontWeight: themeMode === key ? '600' : '500'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--ds-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = themeMode === key ? 'var(--ds-hover)' : 'transparent'}
                >
                  <TIcon className="w-3.5 h-3.5" />
                  {label}
                  {themeMode === key && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--ds-accent)' }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => { setShowNotifMenu(!showNotifMenu); setShowThemeMenu(false); setShowUserMenu(false) }}
            className="p-1.5 rounded-md transition-colors relative"
            style={{ color: 'var(--ds-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--ds-hover)'; e.currentTarget.style.color = 'var(--ds-text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--ds-text-muted)' }}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span 
                className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full border-2"
                style={{ backgroundColor: 'var(--ds-danger)', borderColor: 'var(--ds-navbar)' }}
              />
            )}
          </button>
          
          {showNotifMenu && (
            <div 
              className="absolute right-0 top-full mt-1.5 w-80 rounded-lg border overflow-hidden shadow-lg z-50 animate-slide-in-down"
              style={{ 
                backgroundColor: 'var(--ds-surface-overlay)', 
                borderColor: 'var(--ds-border)',
                boxShadow: 'var(--ds-shadow-overlay)'
              }}
            >
              <div 
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: 'var(--ds-divider)', backgroundColor: 'var(--ds-surface-raised)' }}
              >
                <h4 className="text-[13px] font-semibold" style={{ color: 'var(--ds-text-primary)' }}>
                  Inbox
                  {unreadCount > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full" style={{ backgroundColor: 'var(--ds-danger)', color: '#fff' }}>
                      {unreadCount}
                    </span>
                  )}
                </h4>
                {unreadCount > 0 && (
                  <button onClick={onMarkAllRead} className="text-[11px] font-medium" style={{ color: 'var(--ds-accent)' }}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-[12px] text-center py-8" style={{ color: 'var(--ds-text-muted)' }}>All caught up! 🎉</p>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n._id}
                      onClick={() => { 
                        if (n.ticketId) {
                          const target = user?.role === 'support_engineer'
                            ? `/engineer/ticket/${n.ticketId._id || n.ticketId}`
                            : user?.role === 'employee'
                              ? `/employee/ticket/${n.ticketId._id || n.ticketId}`
                              : `/ticket/${n.ticketId._id || n.ticketId}`
                          navigate(target)
                        } 
                        setShowNotifMenu(false) 
                      }}
                      className="px-4 py-3 border-b cursor-pointer transition-colors"
                      style={{ borderColor: 'var(--ds-divider)', backgroundColor: !n.read ? 'var(--ds-accent-subtle)' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--ds-hover)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = !n.read ? 'var(--ds-accent-subtle)' : 'transparent'}
                    >
                      <div 
                        className="text-[13px] leading-snug"
                        style={{ color: 'var(--ds-text-primary)', fontWeight: !n.read ? '600' : '500' }}
                      >
                        {n.title}
                      </div>
                      <div className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--ds-text-muted)' }}>
                        {n.message}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 mx-1 hidden sm:block" style={{ backgroundColor: 'var(--ds-divider)' }} />

        {/* User Menu */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowThemeMenu(false); setShowNotifMenu(false) }}
            className="flex items-center gap-2 p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--ds-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--ds-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
            title="Account"
          >
            <div 
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #1F6FEB 0%, #58A6FF 100%)' }}
            >
              {userInitials}
            </div>
          </button>
          
          {showUserMenu && (
            <div 
              className="absolute right-0 top-full mt-1.5 w-52 rounded-lg border overflow-hidden shadow-lg z-50 py-1 animate-slide-in-down"
              style={{ 
                backgroundColor: 'var(--ds-surface-overlay)', 
                borderColor: 'var(--ds-border)',
                boxShadow: 'var(--ds-shadow-overlay)'
              }}
            >
              <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--ds-divider)' }}>
                <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--ds-text-primary)' }}>{user?.name}</p>
                <p className="text-[11px] truncate" style={{ color: 'var(--ds-text-muted)' }}>{user?.email}</p>
              </div>
              <button
                onClick={() => { navigate(getSettingsPath()); setShowUserMenu(false) }}
                className="w-full text-left px-4 py-2 text-[13px] flex items-center gap-2.5 font-medium transition-colors"
                style={{ color: 'var(--ds-text-secondary)' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--ds-hover)'; e.currentTarget.style.color = 'var(--ds-text-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--ds-text-secondary)' }}
              >
                <Settings className="w-4 h-4" style={{ color: 'var(--ds-text-muted)' }} />
                My Settings
              </button>
              <div className="my-1" style={{ borderTop: '1px solid var(--ds-divider)' }} />
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-[13px] flex items-center gap-2.5 font-medium transition-colors"
                style={{ color: 'var(--ds-danger)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--ds-danger-subtle)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
