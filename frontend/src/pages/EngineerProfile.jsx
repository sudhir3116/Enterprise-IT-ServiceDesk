import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { 
  User, Settings, Save, Lock, AlertCircle, CheckCircle2, 
  Mail, Phone, Shield, Award, Clock, CheckCircle
} from 'lucide-react'
import Button from '../components/enterprise/Button'
import Badge from '../components/enterprise/Badge'
import Card from '../components/enterprise/Card'
import PageHeader from '../components/enterprise/PageHeader'
import { useToast } from '../hooks/useToast'

export default function EngineerProfile() {
  const { addToast } = useToast()
  const { user, updateUser } = useAuth()
  
  const [profile, setProfile] = useState(user || {})
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  
  const [stats, setStats] = useState({
    assigned: 0,
    closed: 0,
    slaPerformance: 100,
    resolutionRate: 0,
    recentActivity: []
  })

  useEffect(() => {
    let mounted = true
    api.get('/tickets?limit=100')
      .then(res => {
        if (!mounted) return
        const currentUserId = user._id || user.id
        
        // Tally engineer's queue
        const myTickets = res.data.filter(t => t.assignedTo?._id === currentUserId || t.assignedTo?.id === currentUserId)
        const active = myTickets.filter(t => !['Resolved', 'Closed'].includes(t.status))
        const resolved = myTickets.filter(t => ['Resolved', 'Closed'].includes(t.status))
        
        // SLA Performance: percentage of resolved tickets not breached
        const metSla = resolved.filter(t => !t.slaBreached).length
        const slaPerf = resolved.length > 0 ? Math.round((metSla / resolved.length) * 100) : 100
        
        // Resolution Rate: resolved tickets / total queue
        const resRate = myTickets.length > 0 ? Math.round((resolved.length / myTickets.length) * 100) : 0
        
        // Retrieve engineer's own activities from history logs
        const myLogs = []
        myTickets.forEach(t => {
          if (t.history) {
            t.history.forEach(h => {
              if (h.performedBy === user.name) {
                myLogs.push({
                  ...h,
                  ticketNumber: t.ticketNumber || `#${t._id.slice(-6).toUpperCase()}`,
                  ticketId: t._id
                })
              }
            })
          }
        })
        const sortedLogs = myLogs.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6)

        setStats({
          assigned: active.length,
          closed: resolved.length,
          slaPerformance: slaPerf,
          resolutionRate: resRate,
          recentActivity: sortedLogs
        })
      })
      .catch(err => {
        console.error("Failed to load operational metrics", err)
      })
      
    return () => { mounted = false }
  }, [user.id])

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
      addToast('Profile information updated', 'success')
      setMessage({ type: 'success', text: 'Profile updated successfully.' })
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update profile', 'error')
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match.' })
      addToast('New passwords do not match', 'error')
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      await api.put(`/auth/users/${user.id}/password`, {
        currentPassword: passwords.current,
        newPassword: passwords.new
      })
      addToast('Security password updated', 'success')
      setMessage({ type: 'success', text: 'Password updated successfully.' })
      setPasswords({ current: '', new: '', confirm: '' })
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update password', 'error')
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update password.' })
    } finally {
      setLoading(false)
    }
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
    <div className="flex flex-col gap-6 w-full pb-10">
      
      {/* Page Header */}
      <PageHeader
        title="Support Analyst Profile"
        description="View your ITIL ops credentials, SLA scorecards, and update account settings."
        icon={User}
        breadcrumbs={[{ name: 'Engineer', path: '/engineer/dashboard' }, { name: 'Profile' }]}
      />

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

      {/* Main Double Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Personal Info Form, Password form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Profile Form */}
          <form onSubmit={handleProfileSave}>
            <Card className="p-0 overflow-hidden">
              <div className="p-6 border-b border-[var(--ds-divider)] bg-[var(--ds-surface-raised)] flex items-center gap-2">
                <User className="w-4 h-4 text-[var(--ds-text-muted)]" />
                <h3 className="text-[13px] font-bold text-[var(--ds-text-primary)]">Personal &amp; Contact Information</h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Full Name</label>
                    <input 
                      type="text" 
                      value={profile.name || ''} 
                      onChange={e => setProfile({...profile, name: e.target.value})}
                      className="ds-input"
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Email Address</label>
                    <input 
                      type="email" 
                      value={profile.email || ''} 
                      disabled
                      className="ds-input opacity-70 cursor-not-allowed bg-[var(--ds-input-disabled)]"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Mobile Number</label>
                    <input 
                      type="text" 
                      value={profile.mobileNumber || ''} 
                      onChange={e => setProfile({...profile, mobileNumber: e.target.value})}
                      className="ds-input"
                      placeholder="e.g. +1 555-0199"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Employee ID</label>
                    <input 
                      type="text" 
                      value={profile.employeeId || 'N/A'} 
                      disabled
                      className="ds-input opacity-70 cursor-not-allowed bg-[var(--ds-input-disabled)]"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 flex justify-end border-t border-[var(--ds-divider)] bg-[var(--ds-surface-raised)]">
                <Button type="submit" isLoading={loading} icon={Save}>
                  Save Information
                </Button>
              </div>
            </Card>
          </form>

          {/* Change Password Form */}
          <form onSubmit={handlePasswordSave}>
            <Card className="p-0 overflow-hidden">
              <div className="p-6 border-b border-[var(--ds-divider)] bg-[var(--ds-surface-raised)] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[var(--ds-text-muted)]" />
                <h3 className="text-[13px] font-bold text-[var(--ds-text-primary)]">Security &amp; Password Management</h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label style={labelStyle}>Current Password</label>
                  <input 
                    type="password" 
                    required
                    value={passwords.current} 
                    onChange={e => setPasswords({...passwords, current: e.target.value})}
                    className="ds-input max-w-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>New Password</label>
                    <input 
                      type="password" 
                      required
                      value={passwords.new} 
                      onChange={e => setPasswords({...passwords, new: e.target.value})}
                      className="ds-input"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Confirm New Password</label>
                    <input 
                      type="password" 
                      required
                      value={passwords.confirm} 
                      onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                      className="ds-input"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 flex justify-end border-t border-[var(--ds-divider)] bg-[var(--ds-surface-raised)]">
                <Button type="submit" isLoading={loading} icon={Save}>
                  Update Password
                </Button>
              </div>
            </Card>
          </form>

        </div>

        {/* RIGHT COLUMN: Profile Picture card, Performance KPI metrics, Recent activity timeline */}
        <div className="w-full space-y-6">
          
          {/* Avatar / Credentials Panel */}
          <Card className="p-6 flex flex-col items-center text-center">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-4 border border-[var(--ds-border)] shadow-md"
              style={{ background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-hover) 100%)' }}
            >
              {profile.name?.charAt(0).toUpperCase() || 'E'}
            </div>
            
            <h4 className="text-[15px] font-bold text-[var(--ds-text-primary)] leading-tight">{profile.name}</h4>
            <div className="mt-1 flex items-center gap-1.5 flex-wrap justify-center">
              <span className="text-[12px] text-[var(--ds-text-muted)]">{profile.email}</span>
              <Badge color="indigo">Support Analyst</Badge>
            </div>
            
            <div className="w-full grid grid-cols-2 gap-2.5 border-t border-[var(--ds-divider)] pt-4 mt-4 text-xs">
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-tertiary">Department</span>
                <span className="font-semibold text-secondary truncate">{profile.department || 'IT Operations'}</span>
              </div>
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-tertiary">Designation</span>
                <span className="font-semibold text-secondary truncate">{profile.designation || 'Tier-II Engineer'}</span>
              </div>
            </div>
          </Card>

          {/* Performance KPI Met scorecards */}
          <Card className="space-y-4">
            <h3 className="text-[13px] font-bold text-[var(--ds-text-primary)] flex items-center gap-1.5 border-b border-[var(--ds-divider)] pb-3 uppercase tracking-wider">
              <Award className="w-4 h-4 text-amber-500" /> Operational Metrics
            </h3>
            
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[var(--ds-divider)]">
              <div className="p-3 bg-[var(--ds-surface-subtle)] border border-[var(--ds-border)] rounded-lg text-center">
                <span className="text-[10px] text-tertiary font-bold uppercase block">Active Tickets</span>
                <span className="text-lg font-bold text-[var(--brand-primary)] mt-1.5 block leading-none">{stats.assigned}</span>
              </div>
              <div className="p-3 bg-[var(--ds-surface-subtle)] border border-[var(--ds-border)] rounded-lg text-center">
                <span className="text-[10px] text-tertiary font-bold uppercase block">Closed Tickets</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1.5 block leading-none">{stats.closed}</span>
              </div>
            </div>

            <div className="space-y-4.5 text-xs pt-1">
              {/* SLA Met Rate */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-secondary font-semibold flex items-center gap-1"><Clock size={13} className="text-ds-text-muted"/> SLA Met Rate</span>
                  <span className="font-bold text-[var(--ds-text-primary)]">{stats.slaPerformance}%</span>
                </div>
                <div className="w-full bg-[var(--ds-surface-subtle)] rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ width: `${stats.slaPerformance}%`, backgroundColor: stats.slaPerformance > 85 ? 'var(--ds-success)' : stats.slaPerformance > 70 ? 'var(--ds-warning)' : 'var(--ds-danger)' }}
                  />
                </div>
              </div>

              {/* Resolution rate */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-secondary font-semibold flex items-center gap-1"><CheckCircle size={13} className="text-ds-text-muted"/> Resolution Rate</span>
                  <span className="font-bold text-[var(--ds-text-primary)]">{stats.resolutionRate}%</span>
                </div>
                <div className="w-full bg-[var(--ds-surface-subtle)] rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ width: `${stats.resolutionRate}%`, backgroundColor: 'var(--brand-primary)' }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Recent Operations Log Activities */}
          <Card className="flex flex-col">
            <h3 className="text-[13px] font-bold text-[var(--ds-text-primary)] flex items-center gap-1.5 border-b border-[var(--ds-divider)] pb-3 uppercase tracking-wider">
              <Award className="w-4 h-4 text-[var(--brand-primary)]" /> Recent Activity
            </h3>
            
            <div className="relative border-l border-[var(--ds-divider)] ml-3 space-y-4.5 py-3 pr-1 max-h-[220px] overflow-y-auto pl-5.5">
              {stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((act, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[30px] top-1.5 w-2 h-2 rounded-full bg-[var(--ds-surface)] border-2 border-[var(--ds-border-strong)]" />
                    <div className="flex flex-col gap-0.5 leading-tight">
                      <span className="text-[12.5px] text-[var(--ds-text-primary)]">
                        {act.action.toLowerCase()} on <Link to={`/engineer/ticket/${act.ticketId}`} className="font-bold underline hover:text-[var(--brand-primary)]">{act.ticketNumber}</Link>
                      </span>
                      <span className="text-[10px] text-[var(--ds-text-muted)] uppercase tracking-wider mt-0.5">
                        {new Date(act.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs italic text-[var(--ds-text-muted)] ml-[-12px]">No recent updates recorded.</div>
              )}
            </div>
          </Card>

        </div>

      </div>

    </div>
  )
}
