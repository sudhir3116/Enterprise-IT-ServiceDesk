import React, { useState, useEffect } from 'react'
import { 
  User, Mail, Building2, Shield, Clock, CheckCircle2, Lock, 
  KeyRound, Laptop, Smartphone, AlertCircle, Save, X, Sparkles, LogOut, Check 
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Card from '../components/enterprise/Card'
import Button from '../components/enterprise/Button'
import Badge from '../components/enterprise/Badge'
import PageHeader from '../components/enterprise/PageHeader'
import { useToast } from '../hooks/useToast'
import api from '../services/api'

export default function Profile() {
  const { user, updateUser, logout } = useAuth()
  const { addToast } = useToast()

  const [name, setName] = useState(user?.name || '')
  const [nameError, setNameError] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)

  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [passError, setPassError] = useState('')
  const [savingPass, setSavingPass] = useState(false)

  const [sessions, setSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  // Sync user state when loaded
  useEffect(() => {
    if (user?.name) {
      setName(user.name)
    }
  }, [user])

  const fetchSessions = async () => {
    setLoadingSessions(true)
    try {
      const res = await api.get('/auth/sessions')
      setSessions(res.data.sessions || [])
    } catch (err) {
      console.error('Failed to load active sessions:', err)
    } finally {
      setLoadingSessions(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  // Name Validation
  const validateNameInput = (val) => {
    const trimmed = val.trim()
    if (!trimmed) {
      setNameError('Full name is required.')
      return false
    }
    if (trimmed.length < 3) {
      setNameError('Name must be at least 3 characters.')
      return false
    }
    if (trimmed.length > 50) {
      setNameError('Name cannot exceed 50 characters.')
      return false
    }
    setNameError('')
    return true
  }

  const handleSaveName = async (e) => {
    e.preventDefault()
    if (!validateNameInput(name)) return

    setSavingName(true)
    try {
      const res = await api.patch('/users/profile', { name: name.trim() })
      const updatedName = res.data?.user?.name || name.trim()
      
      updateUser({ name: updatedName })
      addToast('Profile name updated successfully!', 'success')
      setIsEditingName(false)
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to update name.'
      setNameError(errMsg)
      addToast(errMsg, 'error')
    } finally {
      setSavingName(false)
    }
  }

  const handleCancelName = () => {
    setName(user?.name || '')
    setNameError('')
    setIsEditingName(false)
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (!passwords.current || !passwords.new) {
      setPassError('Please enter your current and new password.')
      return
    }
    if (passwords.new !== passwords.confirm) {
      setPassError('New password and confirmation do not match.')
      return
    }

    setSavingPass(true)
    setPassError('')
    try {
      await api.put(`/auth/users/${user?.id || user?._id}/password`, {
        currentPassword: passwords.current,
        newPassword: passwords.new
      })
      addToast('Password updated successfully!', 'success')
      setPasswords({ current: '', new: '', confirm: '' })
    } catch (err) {
      const msg = err.response?.data?.message || 'Password change failed.'
      setPassError(msg)
      addToast(msg, 'error')
    } finally {
      setSavingPass(false)
    }
  }

  const handleRevokeSession = async (sessionId) => {
    try {
      await api.delete(`/auth/sessions/${sessionId}`)
      addToast('Session revoked successfully.', 'success')
      fetchSessions()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to revoke session.', 'error')
    }
  }

  const userInitials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'
  const isGoogleAccount = user?.authProvider === 'google' || !!user?.googleId
  const regMethodLabel = isGoogleAccount ? 'Google OAuth' : 'Email Registration'
  const orgName = user?.organization?.name || user?.organizationId?.name || 'Product Support Portal'

  const formattedDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
    : 'N/A'

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      
      {/* Page Header */}
      <PageHeader 
        title="Account & Profile Settings"
        description="Manage your personal identity, enterprise organization details, and security controls."
        breadcrumbs={[
          { name: 'Workspace', path: '/employee/dashboard' },
          { name: 'Profile & Account' }
        ]}
      />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: User Identity Card */}
        <Card className="p-6 space-y-6 lg:col-span-1 border-ds-border bg-ds-surface shadow-md">
          
          <div className="flex flex-col items-center text-center space-y-3">
            {/* Avatar */}
            <div className="relative">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-extrabold text-white shadow-lg"
                style={{ background: 'linear-gradient(135deg, var(--ds-accent) 0%, var(--ds-accent-hover) 100%)' }}
              >
                {userInitials}
              </div>
              <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-ds-surface flex items-center justify-center">
                <Check size={12} className="text-white font-bold" />
              </span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-primary">{user?.name}</h2>
              <p className="text-xs text-tertiary truncate max-w-[220px]" title={user?.email}>{user?.email}</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              <Badge color="blue" rounded="md" className="capitalize">
                {(user?.role || 'customer').replace('_', ' ')}
              </Badge>
              <Badge color="emerald" rounded="md">
                Active Account
              </Badge>
            </div>
          </div>

          <div className="border-t border-ds-border pt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-tertiary flex items-center gap-1.5">
                <Building2 size={14} className="text-indigo-500" />
                Organization
              </span>
              <span className="font-semibold text-primary truncate max-w-[140px]" title={orgName}>
                {orgName}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-tertiary flex items-center gap-1.5">
                <Shield size={14} className="text-blue-500" />
                Auth Method
              </span>
              <span className="font-semibold text-primary">
                {regMethodLabel}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-tertiary flex items-center gap-1.5">
                <Clock size={14} className="text-emerald-500" />
                Joined Date
              </span>
              <span className="font-semibold text-primary">
                {formattedDate}
              </span>
            </div>
          </div>

          <div className="border-t border-ds-border pt-4">
            <Button
              variant="secondary"
              className="w-full justify-center text-red-500 hover:text-red-600 hover:bg-red-500/10"
              onClick={logout}
              icon={LogOut}
            >
              Sign Out of Account
            </Button>
          </div>

        </Card>

        {/* Right Column: Personal & Security Settings */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Section 1: Personal Information */}
          <Card className="p-6 space-y-4 border-ds-border bg-ds-surface shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-ds-border">
              <div>
                <h3 className="text-base font-bold text-primary flex items-center gap-2">
                  <User size={18} className="text-indigo-500" />
                  Personal Information
                </h3>
                <p className="text-xs text-tertiary">Update your display name across workspace operations.</p>
              </div>

              {!isEditingName && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setIsEditingName(true)}
                >
                  Edit Profile
                </Button>
              )}
            </div>

            {isEditingName ? (
              <form onSubmit={handleSaveName} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <label className="ds-label font-bold text-primary">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => {
                      setName(e.target.value)
                      if (nameError) validateNameInput(e.target.value)
                    }}
                    className={`ds-input text-xs w-full ${nameError ? 'border-red-500 focus:border-red-500' : ''}`}
                    placeholder="Enter your full name"
                    disabled={savingName}
                    autoFocus
                  />
                  {nameError && (
                    <p className="text-[11px] text-red-500 font-medium flex items-center gap-1">
                      <AlertCircle size={12} />
                      {nameError}
                    </p>
                  )}
                  <p className="text-[11px] text-tertiary">
                    Must be between 3 and 50 characters long.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={savingName}
                    disabled={savingName || !!nameError || !name.trim()}
                    icon={Save}
                  >
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCancelName}
                    disabled={savingName}
                    icon={X}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                <div className="p-3 rounded-lg border border-ds-border bg-ds-surface-raised space-y-1">
                  <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider block">Full Name</span>
                  <span className="font-bold text-primary text-sm">{user?.name}</span>
                </div>
                <div className="p-3 rounded-lg border border-ds-border bg-ds-surface-raised space-y-1">
                  <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider block">Email Address</span>
                  <span className="font-bold text-primary truncate block" title={user?.email}>{user?.email}</span>
                </div>
              </div>
            )}

            {/* Identity Control Lock Notice */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-600 dark:text-amber-400">
              <Lock size={16} className="shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Enterprise Identity Governance Notice</strong>
                Email address, application role, organization, and status are governed by system policies and can only be updated by administrators.
              </div>
            </div>
          </Card>

          {/* Section 2: Security Information */}
          <Card className="p-6 space-y-4 border-ds-border bg-ds-surface shadow-md">
            <div className="pb-3 border-b border-ds-border">
              <h3 className="text-base font-bold text-primary flex items-center gap-2">
                <KeyRound size={18} className="text-blue-500" />
                Security &amp; Password
              </h3>
              <p className="text-xs text-tertiary">Manage authentication credentials and active login sessions.</p>
            </div>

            {isGoogleAccount ? (
              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-secondary space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400 text-sm">
                  <Shield size={16} />
                  Managed via Google Single Sign-On (SSO)
                </div>
                <p>
                  Your account uses Google OAuth for authentication. Passwords and multi-factor authentication controls are managed directly through your Google account security workspace.
                </p>
              </div>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4 text-xs pt-1">
                {passError && (
                  <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
                    {passError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="ds-label font-bold text-primary">Current Password</label>
                    <input
                      type="password"
                      value={passwords.current}
                      onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                      className="ds-input text-xs w-full"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="ds-label font-bold text-primary">New Password</label>
                    <input
                      type="password"
                      value={passwords.new}
                      onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                      className="ds-input text-xs w-full"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="ds-label font-bold text-primary">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwords.confirm}
                      onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                      className="ds-input text-xs w-full"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={savingPass}
                  disabled={savingPass || !passwords.current || !passwords.new}
                >
                  Update Password
                </Button>
              </form>
            )}

            {/* Active Sessions */}
            <div className="pt-2 space-y-3">
              <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider block">
                Active Device Sessions ({sessions.length})
              </span>
              
              {loadingSessions ? (
                <p className="text-xs text-tertiary">Loading active sessions…</p>
              ) : sessions.length === 0 ? (
                <p className="text-xs text-tertiary">No other active sessions detected.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map(s => (
                    <div key={s._id} className="p-3 rounded-lg border border-ds-border bg-ds-surface-raised flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <Laptop size={16} className="text-indigo-500" />
                        <div>
                          <p className="font-bold text-primary leading-tight">{s.deviceInfo || 'Browser Session'}</p>
                          <p className="text-[10px] text-tertiary">Started: {new Date(s.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => handleRevokeSession(s._id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        Revoke
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

        </div>

      </div>

    </div>
  )
}
