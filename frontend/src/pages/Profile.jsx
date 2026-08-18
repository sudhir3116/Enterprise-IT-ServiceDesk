import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { User, Settings, Save, Lock, AlertCircle, CheckCircle2, Smartphone, Laptop, ShieldAlert, Trash2 } from 'lucide-react'
import Button from '../components/enterprise/Button'
import Badge from '../components/enterprise/Badge'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [profile, setProfile] = useState(user || {})
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const [stats, setStats] = useState({ assigned: 0, resolved: 0, avgResolutionTime: 'N/A' })

  // Session Management States
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true)
      const res = await api.get('/auth/sessions')
      setSessions(res.data.sessions || [])
    } catch (err) {
      console.error("Failed to load active sessions", err)
    } finally {
      setSessionsLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const handleRevokeSession = async (sessionId) => {
    try {
      await api.delete(`/auth/sessions/${sessionId}`)
      setMessage({ type: 'success', text: 'Session revoked successfully.' })
      fetchSessions()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to revoke session.' })
    }
  }

  const handleRevokeAllSessions = async () => {
    if (!window.confirm("Are you sure you want to log out of all other devices?")) return
    try {
      await api.delete('/auth/sessions')
      setMessage({ type: 'success', text: 'All other sessions revoked successfully.' })
      fetchSessions()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to revoke sessions.' })
    }
  }

  useEffect(() => {
    if (user?.role === 'support_engineer') {
      api.get('/tickets?limit=100')
        .then(res => {
          const currentUserId = user._id || user.id
          const myTickets = res.data.filter(t => t.assignedTo?._id === currentUserId || t.assignedTo?.id === currentUserId)
          const resolved = myTickets.filter(t => ['Resolved', 'Closed'].includes(t.status))
          
          const avgTime = resolved.length > 0
            ? (resolved.reduce((acc, curr) => acc + (new Date(curr.updatedAt) - new Date(curr.createdAt)), 0) / resolved.length / 3600000).toFixed(1)
            : 'N/A'

          setStats({
            assigned: myTickets.filter(t => !['Resolved', 'Closed'].includes(t.status)).length,
            resolved: resolved.length,
            avgResolutionTime: avgTime !== 'N/A' ? `${avgTime}h` : 'N/A'
          })
        })
        .catch(err => {
          console.error("Failed to load profile metrics", err)
        })
    }
  }, [])

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      await api.put(`/auth/users/${user.id}`, {
        name: profile.name,
        mobileNumber: profile.mobileNumber
      })
      updateUser({ name: profile.name, mobileNumber: profile.mobileNumber })
      setMessage({ type: 'success', text: 'Profile updated successfully.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      await api.put(`/auth/users/${user.id}/password`, {
        currentPassword: passwords.current,
        newPassword: passwords.new
      })
      setMessage({ type: 'success', text: 'Password updated successfully.' })
      setPasswords({ current: '', new: '', confirm: '' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update password.' })
    } finally {
      setLoading(false)
    }
  }

  const cardStyle = {
    backgroundColor: 'var(--ds-surface)',
    border: '1px solid var(--ds-border)',
    borderRadius: '12px',
    boxShadow: 'var(--ds-shadow-sm)',
    overflow: 'hidden',
  }

  const cardHeaderStyle = {
    borderBottom: '1px solid var(--ds-border)',
    backgroundColor: 'var(--ds-surface-raised)',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }

  const inputClass = 'ds-input'
  const inputDisabledStyle = {
    backgroundColor: 'var(--ds-input-disabled)',
    borderColor: 'var(--ds-border)',
    color: 'var(--ds-text-muted)',
    cursor: 'not-allowed',
    opacity: 0.7,
  }

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--ds-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: '6px',
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-10">
      
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--ds-text-primary)' }}>Account Settings</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--ds-text-muted)' }}>Manage your personal profile and security preferences.</p>
      </div>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            border: '1px solid',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: message.type === 'success' ? 'var(--ds-success-subtle)' : 'var(--ds-danger-subtle)',
            borderColor: message.type === 'success' ? 'var(--ds-success-subtle)' : 'var(--ds-danger-subtle)',
            color: message.type === 'success' ? 'var(--ds-success)' : 'var(--ds-danger)',
          }}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Info Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleProfileSave} style={cardStyle}>
            <div style={cardHeaderStyle}>
              <User className="w-4 h-4" style={{ color: 'var(--ds-text-muted)' }} />
              <h3 className="text-[13px] font-bold" style={{ color: 'var(--ds-text-primary)' }}>Personal Information</h3>
            </div>
            
            <div className="p-5 space-y-4">
              {/* Avatar row */}
              <div
                className="flex items-center gap-4 pb-4"
                style={{ borderBottom: '1px solid var(--ds-border)' }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, var(--ds-accent), var(--ds-accent-hover))' }}
                >
                  {profile.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-[15px] font-bold" style={{ color: 'var(--ds-text-primary)' }}>{profile.name}</h4>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[12px]" style={{ color: 'var(--ds-text-muted)' }}>{profile.email}</span>
                    <Badge color="gray">{profile.role?.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input 
                    type="text" 
                    value={profile.name || ''} 
                    onChange={e => setProfile({...profile, name: e.target.value})}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input 
                    type="email" 
                    value={profile.email || ''} 
                    disabled
                    className={inputClass}
                    style={inputDisabledStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Mobile Number</label>
                  <input 
                    type="text" 
                    value={profile.mobileNumber || ''} 
                    onChange={e => setProfile({...profile, mobileNumber: e.target.value})}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Department</label>
                  <input 
                    type="text" 
                    value={profile.department || 'IT Operations'} 
                    disabled
                    className={inputClass}
                    style={inputDisabledStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Employee ID</label>
                  <input 
                    type="text" 
                    value={profile.employeeId || 'N/A'} 
                    disabled
                    className={inputClass}
                    style={inputDisabledStyle}
                  />
                </div>
              </div>
            </div>

            <div
              className="px-5 py-3 flex justify-end"
              style={{ borderTop: '1px solid var(--ds-border)', backgroundColor: 'var(--ds-surface-raised)' }}
            >
              <Button type="submit" isLoading={loading} icon={Save}>
                Save Changes
              </Button>
            </div>
          </form>

          {/* Security / Password Form */}
          <form onSubmit={handlePasswordSave} style={cardStyle}>
            <div style={cardHeaderStyle}>
              <Lock className="w-4 h-4" style={{ color: 'var(--ds-text-muted)' }} />
              <h3 className="text-[13px] font-bold" style={{ color: 'var(--ds-text-primary)' }}>Security &amp; Password</h3>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label style={labelStyle}>Current Password</label>
                <input 
                  type="password" 
                  required
                  value={passwords.current} 
                  onChange={e => setPasswords({...passwords, current: e.target.value})}
                  className={inputClass}
                  style={{ maxWidth: '320px' }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div>
                  <label style={labelStyle}>New Password</label>
                  <input 
                    type="password" 
                    required
                    value={passwords.new} 
                    onChange={e => setPasswords({...passwords, new: e.target.value})}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Confirm New Password</label>
                  <input 
                    type="password" 
                    required
                    value={passwords.confirm} 
                    onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div
              className="px-5 py-3 flex justify-end"
              style={{ borderTop: '1px solid var(--ds-border)', backgroundColor: 'var(--ds-surface-raised)' }}
            >
              <Button type="submit" isLoading={loading} icon={Save}>
                Update Password
              </Button>
            </div>
          </form>

          {/* Active Sessions Management */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle} className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" style={{ color: 'var(--ds-text-muted)' }} />
                <h3 className="text-[13px] font-bold" style={{ color: 'var(--ds-text-primary)' }}>Active Security Sessions</h3>
              </div>
              {sessions.length > 1 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRevokeAllSessions}
                  style={{ borderColor: 'var(--ds-danger)', color: 'var(--ds-danger)', padding: '4px 10px', fontSize: '11px' }}
                >
                  Terminate Other Sessions
                </Button>
              )}
            </div>
            
            <div className="p-5">
              {sessionsLoading ? (
                <p className="text-xs text-center" style={{ color: 'var(--ds-text-muted)' }}>Loading sessions…</p>
              ) : sessions.length === 0 ? (
                <p className="text-xs text-center" style={{ color: 'var(--ds-text-muted)' }}>No active sessions found.</p>
              ) : (
                <div className="space-y-3">
                  {sessions.map(sess => {
                    const isMobile = /mobile|android|iphone/i.test(sess.deviceInfo || '');
                    return (
                      <div 
                        key={sess._id} 
                        className="flex items-center justify-between p-3.5 rounded-lg border transition-all"
                        style={{ 
                          borderColor: 'var(--ds-border)',
                          backgroundColor: sess.isCurrentSession ? 'var(--ds-surface-raised)' : 'transparent'
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-2 rounded-lg bg-ds-surface-raised border border-ds-border">
                            {isMobile ? (
                              <Smartphone className="w-4 h-4" style={{ color: 'var(--ds-text-muted)' }} />
                            ) : (
                              <Laptop className="w-4 h-4" style={{ color: 'var(--ds-text-muted)' }} />
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[13px] font-bold" style={{ color: 'var(--ds-text-primary)' }}>
                                {sess.deviceInfo || 'Unknown Device'}
                              </span>
                              {sess.isCurrentSession && (
                                <span 
                                  className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                                  style={{ backgroundColor: 'var(--ds-success-subtle)', color: 'var(--ds-success)' }}
                                >
                                  Current Device
                                </span>
                              )}
                            </div>
                            <p className="text-[11px]" style={{ color: 'var(--ds-text-muted)' }}>
                              IP Address: <span className="font-mono">{sess.ipAddress}</span> &bull; Logged in {new Date(sess.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {!sess.isCurrentSession && (
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevokeSession(sess._id)}
                            icon={Trash2}
                            style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--ds-danger)' }}
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar Preferences */}
        <div className="w-full space-y-6">
          
          {user?.role === 'support_engineer' && (
            <div style={cardStyle} className="p-5 space-y-4">
              <h3 className="text-[13px] font-bold flex items-center gap-2" style={{ color: 'var(--ds-text-primary)' }}>
                <User className="w-4 h-4" style={{ color: 'var(--ds-text-muted)' }} /> Ops Performance Metrics
              </h3>
              
              <div className="grid grid-cols-3 gap-2 border-b border-ds-divider pb-4">
                <div className="text-center p-2 rounded-lg bg-ds-surface-raised border border-ds-border">
                  <span className="text-[10px] uppercase font-bold text-tertiary block">Active</span>
                  <span className="text-base font-extrabold text-[var(--brand-primary)] block mt-1">{stats.assigned}</span>
                </div>
                <div className="text-center p-2 rounded-lg bg-ds-surface-raised border border-ds-border">
                  <span className="text-[10px] uppercase font-bold text-tertiary block">Resolved</span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 block mt-1">{stats.resolved}</span>
                </div>
                <div className="text-center p-2 rounded-lg bg-ds-surface-raised border border-ds-border">
                  <span className="text-[9px] uppercase font-bold text-tertiary block">Avg SLA</span>
                  <span className="text-xs font-extrabold text-indigo-500 block mt-1.5">{stats.avgResolutionTime}</span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-tertiary font-medium">Department:</span>
                  <span className="font-semibold text-secondary">{profile.department || 'IT Operations'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-tertiary font-medium">Designation:</span>
                  <span className="font-semibold text-secondary">{profile.designation || 'Technical Analyst'}</span>
                </div>
                <div>
                  <span className="text-tertiary font-medium block mb-2">Core Skills &amp; Qualifications:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Network Routing', 'ITIL v4 Foundation', 'Active Directory', 'SaaS Licensing'].map(skill => (
                      <span key={skill} className="px-2 py-0.5 rounded text-[10px] font-bold bg-ds-surface-raised border border-ds-border text-secondary">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={cardStyle} className="p-5">
            <h3 className="text-[13px] font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--ds-text-primary)' }}>
              <Settings className="w-4 h-4" style={{ color: 'var(--ds-text-muted)' }} /> Preferences
            </h3>
            
            <div className="space-y-4">
              {[
                { id: 'toggle1', label: 'Email Notifications', desc: 'Receive ticket updates via email' },
                { id: 'toggle2', label: 'System Alerts', desc: 'In-app popup notifications' },
              ].map(item => (
                <div key={item.id} className="flex items-center justify-between pb-3 border-b last:border-0 last:pb-0" style={{ borderColor: 'var(--ds-divider)' }}>
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: 'var(--ds-text-primary)' }}>{item.label}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only" defaultChecked />
                    <div className="ds-switch">
                      <div className="ds-switch-thumb"></div>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
