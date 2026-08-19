import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Clock, ShieldAlert, LogOut, RefreshCw, Mail, CheckCircle2, 
  Building2, UserCheck, Lock, Sparkles, AlertCircle, ArrowRight
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/enterprise/Button'
import Card from '../components/enterprise/Card'
import Badge from '../components/enterprise/Badge'
import { useToast } from '../hooks/useToast'
import api from '../services/api'

export default function PendingApproval() {
  const { user, organization, logout, refreshSession, pendingUser, clearPendingUser } = useAuth()
  const navigate = useNavigate()
  const { addToast } = useToast()
  
  const [checking, setChecking] = useState(false)
  const [statusData, setStatusData] = useState(null)

  const activeEmail = pendingUser?.email || user?.email || ''

  const handleApprovedRedirect = (role) => {
    const normRole = (role || '').toLowerCase()
    if (normRole === 'admin') {
      navigate('/admin/dashboard', { replace: true })
    } else if (normRole === 'support_engineer') {
      navigate('/engineer/dashboard', { replace: true })
    } else {
      navigate('/employee/dashboard', { replace: true })
    }
  }

  // Fetch live approval status on mount or when email exists
  useEffect(() => {
    let isMounted = true
    async function fetchStatus() {
      if (!activeEmail) return
      try {
        const res = await api.get(`/auth/approval-status?email=${encodeURIComponent(activeEmail)}`)
        if (isMounted && res.data) {
          setStatusData(res.data)
          // Auto-redirect if already approved
          if (res.data.status === 'active' || res.data.isApproved) {
            addToast('Account approved! Proceeding to workspace...', 'success')
            clearPendingUser()
            const token = await refreshSession()
            if (token) {
              handleApprovedRedirect(res.data.role)
            } else {
              navigate('/login?approved=true', { replace: true })
            }
          }
        }
      } catch (err) {
        console.log('[PendingApproval] Live status check notice:', err.message)
      }
    }
    fetchStatus()
    return () => { isMounted = false }
  }, [activeEmail])

  const handleCheckStatus = async () => {
    setChecking(true)
    try {
      if (activeEmail) {
        const res = await api.get(`/auth/approval-status?email=${encodeURIComponent(activeEmail)}`)
        if (res.data) {
          setStatusData(res.data)
          if (res.data.status === 'active' || res.data.isApproved) {
            addToast('Account approved! Redirecting...', 'success')
            clearPendingUser()
            const token = await refreshSession()
            if (token) {
              handleApprovedRedirect(res.data.role)
            } else {
              navigate('/login?approved=true', { replace: true })
            }
            return
          }
        }
      }

      // Fallback refresh token session check
      const token = await refreshSession()
      if (token && (user?.accountStatus === 'active' || user?.isApproved)) {
        addToast('Account approved! Redirecting to workspace...', 'success')
        clearPendingUser()
        handleApprovedRedirect(user?.role)
      } else {
        addToast('Your access request is currently pending administrator review.', 'info')
      }
    } catch (err) {
      addToast('Your access request is still under review by an administrator.', 'info')
    } finally {
      setChecking(false)
    }
  }

  const handleSignOut = () => {
    clearPendingUser()
    logout()
  }

  // Dynamic values derived from PendingUser / AuthContext / API response
  const orgName = statusData?.organization?.name || organization?.name || user?.organization?.name || 'Your Organization'
  const userName = statusData?.user?.name || pendingUser?.name || user?.name || 'Registered User'
  const userEmail = activeEmail || 'N/A'
  
  const regMethod = statusData?.user?.registrationMethod || pendingUser?.registrationMethod || 
    (user?.authProvider === 'google' || user?.googleId ? 'Google OAuth' : 'Email Registration')

  const formattedDate = statusData?.requestedAt || user?.createdAt 
    ? new Date(statusData?.requestedAt || user.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
    : new Date().toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-6 bg-ds-bg transition-colors duration-200">
      <div className="w-full max-w-xl space-y-6">
        
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-lg shadow-amber-500/5">
            <Clock size={28} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-primary font-heading tracking-tight">
              Account Verification Pending
            </h1>
            <p className="text-xs lg:text-sm text-tertiary mt-1">
              Your access request has been submitted successfully.
            </p>
          </div>

          {/* Current Status Pill Badge */}
          <div className="pt-1 flex justify-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              PENDING ADMINISTRATOR REVIEW
            </span>
          </div>
        </div>

        {/* Main Status Card */}
        <Card className="p-6 lg:p-8 space-y-6 border-amber-500/25 bg-ds-surface shadow-xl">
          
          {/* Welcome Banner */}
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
            <ShieldAlert size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h3 className="font-bold text-primary text-sm">
                Welcome, {userName}
              </h3>
              <p className="text-secondary leading-relaxed">
                Your administrator will review your account and assign the appropriate access level for 
                <strong className="text-primary"> {orgName}</strong>.
              </p>
            </div>
          </div>

          {/* Status Timeline Stepper (4 Steps) */}
          <div className="space-y-3 pt-1">
            <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider block">
              Verification Lifecycle
            </span>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              
              {/* Step 1: Account Created */}
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex flex-col items-center text-center gap-1.5">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  Account Created
                </span>
                <span className="text-[9px] text-tertiary">✓ Verified</span>
              </div>

              {/* Step 2: Request Submitted */}
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex flex-col items-center text-center gap-1.5">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  Request Submitted
                </span>
                <span className="text-[9px] text-tertiary">✓ Logged</span>
              </div>

              {/* Step 3: Administrator Review */}
              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex flex-col items-center text-center gap-1.5 shadow-sm">
                <Clock size={18} className="text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  Administrator Review
                </span>
                <span className="text-[9px] text-amber-600/80 dark:text-amber-400/80 font-bold">◉ In Progress</span>
              </div>

              {/* Step 4: Account Activated */}
              <div className="p-3 rounded-lg border border-ds-border bg-ds-surface-raised opacity-60 flex flex-col items-center text-center gap-1.5">
                <Lock size={18} className="text-tertiary" />
                <span className="text-[11px] font-bold text-tertiary">
                  Account Activated
                </span>
                <span className="text-[9px] text-tertiary">○ Pending</span>
              </div>

            </div>
          </div>

          {/* Access Request Details Section */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider block">
              ACCESS REQUEST DETAILS
            </span>
            <div className="p-4 rounded-xl border border-ds-border bg-ds-surface-raised grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              <div>
                <span className="text-tertiary block text-[10px] uppercase font-bold tracking-wider mb-0.5">Organization</span>
                <span className="font-bold text-primary flex items-center gap-1.5">
                  <Building2 size={14} className="text-indigo-500" />
                  {orgName}
                </span>
              </div>

              <div>
                <span className="text-tertiary block text-[10px] uppercase font-bold tracking-wider mb-0.5">Account Email</span>
                <span className="font-bold text-primary truncate block" title={userEmail}>
                  {userEmail}
                </span>
              </div>

              <div>
                <span className="text-tertiary block text-[10px] uppercase font-bold tracking-wider mb-0.5">Registration Method</span>
                <span className="font-semibold text-secondary">
                  {regMethod}
                </span>
              </div>

              <div>
                <span className="text-tertiary block text-[10px] uppercase font-bold tracking-wider mb-0.5">Requested Access</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  Awaiting administrator assignment
                </span>
              </div>

              <div>
                <span className="text-tertiary block text-[10px] uppercase font-bold tracking-wider mb-0.5">Registration Date</span>
                <span className="font-semibold text-secondary">
                  {formattedDate}
                </span>
              </div>

              <div>
                <span className="text-tertiary block text-[10px] uppercase font-bold tracking-wider mb-0.5">Approval Status</span>
                <Badge color="amber">Pending Administrator Review</Badge>
              </div>

            </div>
          </div>

          {/* Next Steps Checklist */}
          <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-2.5 text-xs text-secondary">
            <h4 className="font-bold text-primary flex items-center gap-2">
              <Sparkles size={16} className="text-blue-500" />
              What happens next?
            </h4>
            <ol className="space-y-1.5 list-decimal pl-4 text-tertiary font-medium">
              <li>An administrator reviews your account request and identity details.</li>
              <li>Your appropriate application role and permissions are assigned.</li>
              <li>You receive an email confirmation upon approval.</li>
              <li>You gain access to your designated workspace.</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button
              variant="primary"
              className="w-full justify-center py-2.5"
              onClick={handleCheckStatus}
              isLoading={checking}
              icon={RefreshCw}
            >
              Check Approval Status
            </Button>

            <Button
              variant="secondary"
              className="w-full justify-center py-2.5 text-tertiary hover:text-primary"
              onClick={handleSignOut}
              icon={LogOut}
            >
              Sign Out
            </Button>
          </div>

        </Card>

        {/* Footer Support Notice */}
        <p className="text-center text-xs text-tertiary">
          Product Support Portal &bull; Enterprise Governance Policy
        </p>

      </div>
    </div>
  )
}
