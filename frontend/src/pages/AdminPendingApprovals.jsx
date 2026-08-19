import React, { useState, useEffect } from 'react'
import { 
  CheckCircle2, XCircle, Clock, ShieldAlert, Search, Filter, 
  UserCheck, UserX, Trash2, Mail, Building, Shield, User, ArrowLeft 
} from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import Card from '../components/enterprise/Card'
import Button from '../components/enterprise/Button'
import Badge from '../components/enterprise/Badge'
import Modal from '../components/enterprise/Modal'
import { useToast } from '../hooks/useToast'

export default function AdminPendingApprovals() {
  const { addToast } = useToast()
  const [pendingUsers, setPendingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [selectedUser, setSelectedUser] = useState(null)
  const [approveRole, setApproveRole] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchPendingUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/users/pending')
      setPendingUsers(res.data)
    } catch (err) {
      console.error('Failed to load pending users:', err)
      addToast(err.response?.data?.message || 'Failed to load pending users.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingUsers()
  }, [])

  const handleApprove = async () => {
    if (!selectedUser || !approveRole) return
    setActionLoading(true)
    try {
      const userId = selectedUser._id || selectedUser.id
      await api.post(`/users/${userId}/approve`, {
        role: approveRole,
      })
      const roleLabel = approveRole === 'admin' 
        ? 'Administrator' 
        : approveRole === 'support_engineer' 
        ? 'Support Engineer' 
        : 'Customer'

      addToast(`User ${selectedUser.name || selectedUser.email} approved as ${roleLabel}! Notification email sent.`, 'success')
      setShowApproveModal(false)
      setSelectedUser(null)
      setApproveRole('')
      await fetchPendingUsers()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to approve user.', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedUser) return
    setActionLoading(true)
    try {
      const userId = selectedUser._id || selectedUser.id
      await api.post(`/users/${userId}/reject`, {
        reason: rejectReason,
      })
      addToast(`User account request for ${selectedUser.name || selectedUser.email} rejected. Rejection notification sent.`, 'info')
      setShowRejectModal(false)
      setSelectedUser(null)
      setRejectReason('')
      await fetchPendingUsers()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to reject user.', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return
    setActionLoading(true)
    try {
      const userId = selectedUser._id || selectedUser.id
      await api.delete(`/users/${userId}`)
      addToast(`Registration request for ${selectedUser.name || selectedUser.email} permanently deleted.`, 'success')
      setShowDeleteModal(false)
      setSelectedUser(null)
      await fetchPendingUsers()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete user request.', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredUsers = pendingUsers.filter(u => 
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderStatusBadge = (status) => {
    const s = (status || 'pending_approval').toLowerCase()
    if (s === 'active') return <Badge color="emerald" dot>Active</Badge>
    if (s === 'rejected') return <Badge color="red" dot>Rejected</Badge>
    return <Badge color="amber" dot>Pending Review</Badge>
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      
      {/* Top Breadcrumb Nav */}
      <div className="flex items-center justify-between shrink-0">
        <Link 
          to="/admin/users"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to User Directory
        </Link>
        <span className="text-xs text-tertiary">
          Enterprise Security Governance &amp; Identity Access Control
        </span>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary font-heading tracking-tight flex items-center gap-2.5">
            <Clock className="text-amber-500" size={24} />
            Pending User Approvals
          </h1>
          <p className="text-xs text-tertiary mt-1">
            Review, authorize access levels, reject, or purge registration requests for workspace onboarding.
          </p>
        </div>

        <Badge color="amber" size="lg" className="self-start md:self-auto px-3 py-1 text-xs">
          {pendingUsers.length} Requests Awaiting Assignment
        </Badge>
      </div>

      {/* Search & Refresh Controls */}
      <Card className="p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
          <input
            type="text"
            placeholder="Search pending requests by name or email…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="ds-input pl-9 text-xs w-full"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={fetchPendingUsers} isLoading={loading} icon={Clock}>
          Refresh Queue
        </Button>
      </Card>

      {/* Main Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-tertiary font-semibold">Loading pending user requests…</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-sm font-bold text-primary">No Pending Approvals</h3>
            <p className="text-xs text-tertiary">All user access requests have been reviewed and role assignments completed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-ds-border bg-ds-surface-raised text-[11px] font-bold text-tertiary uppercase tracking-wider">
                  <th className="p-3.5 pl-4">User / Email</th>
                  <th className="p-3.5">Registration Method</th>
                  <th className="p-3.5">Access Requested</th>
                  <th className="p-3.5">Organization</th>
                  <th className="p-3.5">Requested Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ds-border text-xs">
                {filteredUsers.map(u => {
                  const regMethodLabel = u.registrationMethod || (u.googleId || u.authProvider === 'google' ? 'Google OAuth' : 'Email Registration')
                  const orgNameLabel = u.organization?.name || u.organizationId?.name || 'Your Organization'

                  return (
                    <tr key={u._id || u.id} className="hover:bg-ds-hover transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 font-bold flex items-center justify-center text-xs shrink-0">
                            {u.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-primary leading-tight">{u.name || 'Anonymous User'}</p>
                            <p className="text-[11px] text-tertiary">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <Badge color={regMethodLabel.includes('Google') ? 'blue' : 'gray'} rounded="md">
                          {regMethodLabel}
                        </Badge>
                      </td>
                      <td className="p-3.5 font-semibold text-amber-600 dark:text-amber-400">
                        Pending Assignment
                      </td>
                      <td className="p-3.5 text-tertiary">
                        {orgNameLabel}
                      </td>
                      <td className="p-3.5 text-tertiary">
                        {new Date(u.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="p-3.5">
                        {renderStatusBadge(u.accountStatus)}
                      </td>
                      <td className="p-3.5 pr-4 text-right space-x-1.5">
                        {/* Approve */}
                        <Button
                          variant="primary"
                          size="xs"
                          disabled={actionLoading}
                          onClick={() => {
                            setSelectedUser(u)
                            setApproveRole('')
                            setShowApproveModal(true)
                          }}
                          icon={UserCheck}
                          style={{ backgroundColor: 'var(--ds-success)' }}
                        >
                          Approve
                        </Button>

                        {/* Reject */}
                        <Button
                          variant="danger"
                          size="xs"
                          disabled={actionLoading}
                          onClick={() => {
                            setSelectedUser(u)
                            setShowRejectModal(true)
                          }}
                          icon={UserX}
                        >
                          Reject
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="secondary"
                          size="xs"
                          disabled={actionLoading}
                          onClick={() => {
                            setSelectedUser(u)
                            setShowDeleteModal(true)
                          }}
                          icon={Trash2}
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Approve User Modal */}
      {showApproveModal && selectedUser && (
        <Modal
          isOpen={showApproveModal}
          onClose={() => !actionLoading && setShowApproveModal(false)}
          title="Approve User Account Access"
        >
          <div className="space-y-4 pt-1 text-xs">
            {/* User Information Summary */}
            <div className="p-3 rounded-lg border border-ds-border bg-ds-surface-raised space-y-2">
              <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider block">
                User Information
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-tertiary block text-[10px]">Name</span>
                  <span className="font-bold text-primary">{selectedUser.name}</span>
                </div>
                <div>
                  <span className="text-tertiary block text-[10px]">Email</span>
                  <span className="font-bold text-primary truncate block" title={selectedUser.email}>{selectedUser.email}</span>
                </div>
                <div>
                  <span className="text-tertiary block text-[10px]">Registration Method</span>
                  <span className="font-semibold text-secondary">
                    {selectedUser.registrationMethod || (selectedUser.googleId ? 'Google OAuth' : 'Email Registration')}
                  </span>
                </div>
                <div>
                  <span className="text-tertiary block text-[10px]">Organization</span>
                  <span className="font-semibold text-secondary">
                    {selectedUser.organization?.name || selectedUser.organizationId?.name || 'Your Organization'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-tertiary block text-[10px]">Requested Date</span>
                  <span className="font-semibold text-secondary">
                    {new Date(selectedUser.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Role Assignment */}
            <div className="space-y-1.5">
              <label className="ds-label font-bold text-primary">
                Role Assignment <span className="text-red-500">*</span>
              </label>
              <select
                value={approveRole}
                onChange={e => setApproveRole(e.target.value)}
                className="ds-select text-xs w-full font-semibold"
                disabled={actionLoading}
              >
                <option value="">Select Role</option>
                <option value="customer">Customer (Support portal access)</option>
                <option value="support_engineer">Support Engineer (Ticket management access)</option>
                <option value="admin">Administrator (System management access)</option>
              </select>
              {!approveRole && (
                <p className="text-[11px] text-amber-500 font-medium">
                  Role selection is mandatory before confirming approval.
                </p>
              )}
            </div>

            <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px]">
              Upon approval, status will set to <strong>Active</strong> and an automated confirmation email with assigned role details will be dispatched.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setShowApproveModal(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleApprove} 
                isLoading={actionLoading}
                disabled={!approveRole || actionLoading}
                style={{ backgroundColor: approveRole ? 'var(--ds-success)' : undefined }}
              >
                Confirm &amp; Approve Access
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject User Modal */}
      {showRejectModal && selectedUser && (
        <Modal
          isOpen={showRejectModal}
          onClose={() => !actionLoading && setShowRejectModal(false)}
          title="Reject User Access Request"
        >
          <div className="space-y-4 pt-1 text-xs">
            <p className="text-secondary">
              Rejecting access request for <strong className="text-primary">{selectedUser.name}</strong> ({selectedUser.email}).
            </p>

            <div className="space-y-1.5">
              <label className="ds-label">Rejection Reason (Optional)</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Provide a reason for the rejection (e.g. Invalid organization domain)..."
                rows={3}
                className="ds-textarea text-xs w-full"
                disabled={actionLoading}
              />
            </div>

            <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[11px]">
              This user request will be marked as rejected and removed from the active pending queue.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setShowRejectModal(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={handleReject} 
                isLoading={actionLoading}
                disabled={actionLoading}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => !actionLoading && setShowDeleteModal(false)}
          title="Delete Registration Request"
        >
          <div className="space-y-4 pt-1 text-xs">
            <p className="text-secondary">
              Are you sure you want to delete the registration request for <strong className="text-primary">{selectedUser.name}</strong> ({selectedUser.email}) permanently?
            </p>

            <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[11px] font-bold">
              Warning: Delete this registration request permanently? This action cannot be undone.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setShowDeleteModal(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={handleDelete} 
                isLoading={actionLoading}
                disabled={actionLoading}
              >
                Permanently Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
