import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, Clock, Calendar, Shield, User, MessageSquare, 
  Activity, Tag, Trash2, CheckCircle2, AlertTriangle, Lock, Unlock, 
  Send, UserCheck, RefreshCw, FileText
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/enterprise/Button'
import Badge from '../components/enterprise/Badge'
import Card from '../components/enterprise/Card'
import Modal from '../components/enterprise/Modal'
import { useToast } from '../hooks/useToast'

export default function UpdateTicket() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { user: currentUser } = useAuth()
  
  const role = currentUser?.role || 'customer'
  const isStaff = ['admin', 'support_engineer', 'agent'].includes(role)
  const currentUserId = currentUser?._id || currentUser?.id

  const getSLAProgress = (t) => {
    if (!t || !t.createdAt) return { pct: 100, color: 'emerald', text: 'OK' }
    const target = t.dueDate ? new Date(t.dueDate) : null
    if (!target) return { pct: 100, color: 'gray', text: 'No SLA' }
    
    const SLA_HOURS = { Critical: 4, High: 24, Medium: 72, Low: 120 }
    const totalHours = SLA_HOURS[t.priority] || 72
    const totalTime = totalHours * 3600000
    
    const created = new Date(t.createdAt).getTime()
    const due = new Date(t.dueDate).getTime()
    const now = Date.now()
    
    const remaining = due - now
    if (remaining < 0) {
      return { pct: 0, color: 'red', text: 'SLA Breached' }
    }
    
    const pct = Math.max(0, Math.min(100, (remaining / totalTime) * 100))
    
    let color = 'emerald'
    let text = 'OK'
    if (pct < 15) {
      color = 'red'
      text = 'Critical Warning'
    } else if (pct < 50) {
      color = 'amber'
      text = 'Warning Threshold'
    }
    
    return { pct, color, text }
  }

  const downloadMockFile = (name) => {
    const element = document.createElement("a")
    let fileContent = ""
    let mimeType = "text/plain"
    
    if (name.endsWith(".txt")) {
      fileContent = "IT DIAGNOSTIC REPORT\nStatus: Error\nLatency: 250ms\nCPU usage: 98%\nTrace: DatabaseConnectionTimeoutException at backend/services/db.js:14"
    } else {
      fileContent = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
      element.href = fileContent
      element.download = name
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      return
    }
    
    const file = new Blob([fileContent], {type: mimeType})
    element.href = URL.createObjectURL(file)
    element.download = name
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }
  
  const [ticket, setTicket] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [postingComment, setPostingComment] = useState(false)
  const [error, setError] = useState(null)
  
  const [activeTab, setActiveTab] = useState('comments') // 'comments' | 'activity'
  const [commentText, setCommentText] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Fetch ticket details
  async function loadTicket() {
    try {
      const res = await api.get(`/tickets/${id}`)
      setTicket(res.data)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Failed to load ticket details.')
    }
  }

  // Fetch support engineers for allocation (admin only)
  async function loadUsers() {
    if (role === 'admin') {
      try {
        const res = await api.get('/auth/users')
        const userList = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.users || [])
        setUsers(userList.filter(u => u.role === 'support_engineer' || u.role === 'agent'))
      } catch (err) {
        console.error('Failed to load analysts', err)
      }
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([loadTicket(), loadUsers()])
      setLoading(false)
    }
    init()
  }, [id])

  // Handle single field updates (status, assignee, due date)
  const handleUpdateField = async (fieldName, value) => {
    setUpdating(true)
    try {
      const payload = {}
      payload[fieldName] = value
      await api.put(`/tickets/${id}`, payload)
      addToast('Ticket details updated successfully', 'success')
      await loadTicket()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update field.', 'error')
    } finally {
      setUpdating(false)
    }
  }

  // Post comment/note
  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setPostingComment(true)
    try {
      await api.post(`/tickets/${id}/comments`, {
        text: commentText.trim(),
        isInternal: isStaff ? isInternal : false
      })
      addToast(isInternal ? 'Internal note added' : 'Public reply posted', 'success')
      setCommentText('')
      await loadTicket()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to submit comment', 'error')
    } finally {
      setPostingComment(false)
    }
  }

  // Delete ticket (admin only)
  const handleDeleteTicket = async () => {
    try {
      await api.delete(`/tickets/${id}`)
      addToast('Ticket has been deleted', 'success')
      setShowDeleteModal(false)
      navigate(role === 'admin' ? '/admin/tickets' : '/employee/my-tickets')
    } catch (err) {
      addToast('Failed to delete ticket', 'error')
    }
  }

  // SLA Calculation display helper
  const getSLAInfo = (t) => {
    if (!t) return null
    if (['Resolved', 'Closed'].includes(t.status)) {
      return { text: 'Met (Resolved)', color: 'emerald', breached: false }
    }
    const target = t.dueDate ? new Date(t.dueDate) : null
    if (!target) return { text: 'No SLA Configured', color: 'gray', breached: false }
    
    const diff = target - new Date()
    if (diff < 0) {
      return { text: 'Breached Deadline', color: 'red', breached: true }
    }
    const hrs = Math.floor(diff / (1000 * 60 * 60))
    if (hrs < 4) {
      return { text: `Critical: ${hrs}h remaining`, color: 'red', breached: false }
    }
    if (hrs < 24) {
      return { text: `Warning: ${hrs}h remaining`, color: 'amber', breached: false }
    }
    return { text: `${Math.floor(hrs / 24)}d remaining`, color: 'blue', breached: false }
  }

  const getPriorityColor = (p) => {
    switch (p) {
      case 'Critical': return 'red'
      case 'High':     return 'amber'
      case 'Medium':   return 'blue'
      default:         return 'gray'
    }
  }

  const getStatusColor = (s) => {
    switch (s) {
      case 'Open':        return 'gray'
      case 'Assigned':    return 'blue'
      case 'In Progress': return 'indigo'
      case 'Pending':     return 'amber'
      case 'Resolved':    return 'emerald'
      case 'Closed':      return 'slate'
      default:            return 'gray'
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 py-8 animate-pulse">
        <div className="h-6 w-48 bg-ds-surface-raised rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-32 bg-ds-surface rounded-lg border border-ds-border" />
            <div className="h-64 bg-ds-surface rounded-lg border border-ds-border" />
          </div>
          <div className="h-96 bg-ds-surface rounded-lg border border-ds-border" />
        </div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="py-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 mb-4">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-[16px] font-bold text-primary mb-1">Ticket Resolution Error</h2>
        <p className="text-[13px] text-tertiary mb-6">{error || 'Incident request could not be fetched.'}</p>
        <Link to={role === 'admin' ? '/admin/tickets' : '/employee/my-tickets'}>
          <Button variant="secondary">Back to Queue</Button>
        </Link>
      </div>
    )
  }

  const slaInfo = getSLAInfo(ticket)

  return (
    <div className="flex flex-col gap-5 w-full pb-12">
      {/* Top Navbar / Nav back */}
      <div className="flex items-center justify-between shrink-0">
        <Link 
          to={isStaff ? (ticket.assignedTo?._id === currentUser.id ? '/engineer/assigned' : '/admin/tickets') : '/employee/my-tickets'}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Ticket Queue
        </Link>
        
        {role === 'admin' && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-600 hover:text-red-700 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 size={15} /> Delete Ticket
          </Button>
        )}
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: incident detail & conversation room */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Title Room */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-tertiary px-2 py-0.5 rounded bg-ds-surface-raised border border-ds-border">
                {ticket.ticketNumber || `#${ticket._id.slice(-6).toUpperCase()}`}
              </span>
              <Badge color={getStatusColor(ticket.status)} dot>{ticket.status}</Badge>
              <Badge color={getPriorityColor(ticket.priority)}>{ticket.priority} Priority</Badge>
              <Badge color={CAT_COLORS[ticket.category] || 'gray'}>{ticket.category}</Badge>
              <Badge color={ticket.source === 'email' ? 'purple' : 'blue'}>
                Source: {ticket.source ? ticket.source.toUpperCase() : 'WEB'}
              </Badge>
            </div>
            
            <h1 className="text-[24px] font-bold text-primary font-heading tracking-tight mt-1 leading-tight">
              {ticket.title}
            </h1>
            
            <p className="text-[12px] text-tertiary mt-2">
              Created {new Date(ticket.createdAt).toLocaleString()} by <span className="font-semibold text-secondary">{ticket.createdBy?.name || 'Requester'}</span>
            </p>
          </div>

          {/* Description Card */}
          <Card>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-ds-divider">
              <FileText size={16} className="text-ds-text-muted" />
              <h3 className="text-[13px] font-bold text-primary uppercase tracking-wider">Description</h3>
            </div>
            <div className="text-[13.5px] leading-relaxed text-secondary whitespace-pre-wrap select-text">
              {ticket.description}
            </div>
          </Card>

          {/* Attachments Card */}
          <Card>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-ds-divider">
              <FileText size={16} className="text-ds-text-muted" />
              <h3 className="text-[13px] font-bold text-primary uppercase tracking-wider">Attachments ({ticket.attachments?.length || 2})</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-ds-border bg-ds-surface-raised">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText size={18} className="text-ds-text-muted shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-primary truncate leading-none">diagnostic_report.txt</p>
                    <p className="text-[10px] text-tertiary mt-1">12 KB • Text Log</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="xs" 
                  className="text-xs font-bold text-[var(--brand-primary)]"
                  onClick={() => downloadMockFile('diagnostic_report.txt')}
                >
                  Download
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-ds-border bg-ds-surface-raised">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText size={18} className="text-ds-text-muted shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-primary truncate leading-none">error_screenshot.png</p>
                    <p className="text-[10px] text-tertiary mt-1">245 KB • PNG Image</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="xs" 
                  className="text-xs font-bold text-[var(--brand-primary)]"
                  onClick={() => downloadMockFile('error_screenshot.png')}
                >
                  Download
                </Button>
              </div>
            </div>
          </Card>

          {/* Tabs Navigation for Comments & History Activity */}
          <div className="flex border-b border-ds-border">
            <button
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 -mb-[2px] transition-all flex items-center gap-2 ${
                activeTab === 'comments'
                  ? 'border-[var(--ds-accent)] text-primary font-bold'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              <MessageSquare size={14} />
              Comments ({ticket.comments?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 -mb-[2px] transition-all flex items-center gap-2 ${
                activeTab === 'activity'
                  ? 'border-[var(--ds-accent)] text-primary font-bold'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              <Activity size={14} />
              Activity Log ({ticket.history?.length || 0})
            </button>
          </div>

          {/* Tab Panel contents */}
          <div className="space-y-6">
            
            {activeTab === 'comments' ? (
              <div className="space-y-6">
                
                {/* Comments List */}
                <div className="space-y-4">
                  {!ticket.comments || ticket.comments.length === 0 ? (
                    <div className="p-8 text-center border border-dashed rounded-lg border-ds-border bg-ds-surface/30">
                      <MessageSquare size={24} className="text-ds-text-muted mx-auto mb-2" />
                      <p className="text-[13px] text-tertiary">No messages on this incident yet. Ask a question or post an update below.</p>
                    </div>
                  ) : (
                    ticket.comments.map((c) => {
                      const commenterInitials = c.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
                      const isInternalNote = c.isInternal
                      
                      return (
                        <div 
                          key={c._id}
                          className={`p-4 rounded-lg border transition-shadow ${
                            isInternalNote 
                              ? 'bg-[rgba(245,158,11,0.03)] border-amber-300 dark:border-amber-500/30' 
                              : 'bg-ds-surface border-ds-border'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2.5">
                            <div className="flex items-center gap-2.5">
                              <div 
                                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                style={{ 
                                  background: isInternalNote
                                    ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                                    : 'linear-gradient(135deg, var(--ds-accent) 0%, var(--ds-accent-hover) 100%)' 
                                }}
                              >
                                {commenterInitials}
                              </div>
                              <div>
                                <span className="text-[13px] font-bold text-primary block leading-none">{c.name}</span>
                                <span className="text-[10.5px] text-tertiary mt-1 block">
                                  {new Date(c.createdAt).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            
                            {isInternalNote && (
                              <Badge color="amber" rounded="md" className="gap-1 px-1.5 h-5 text-[10px]">
                                <Lock size={10} /> Staff Note
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-[13px] leading-relaxed text-secondary whitespace-pre-wrap select-text pl-9">
                            {c.text}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Comment Entry form */}
                <form onSubmit={handleAddComment} className="space-y-3 mt-4">
                  {isStaff && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsInternal(false)}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                          !isInternal 
                            ? 'bg-ds-surface border border-ds-border text-primary font-extrabold' 
                            : 'text-secondary hover:text-primary'
                        }`}
                      >
                        Public Response
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsInternal(true)}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1 ${
                          isInternal 
                            ? 'bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-400 font-extrabold' 
                            : 'text-secondary hover:text-primary'
                        }`}
                      >
                        <Lock size={11} /> Internal Staff Note
                      </button>
                    </div>
                  )}

                  <div className="relative">
                    <textarea
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder={isInternal ? "Write a private note visible only to agents and admins..." : "Type your update or request for info here..."}
                      required
                      rows={4}
                      className="ds-textarea w-full transition-all focus:ring-1 pr-12"
                      style={isInternal ? { borderColor: 'var(--ds-warning)', focusRing: 'rgba(245, 158, 11, 0.4)' } : {}}
                    />
                    <button
                      type="submit"
                      disabled={postingComment || !commentText.trim()}
                      className="absolute right-3.5 bottom-3.5 p-2 rounded-lg text-white hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center shrink-0"
                      style={{ 
                        background: isInternal 
                          ? 'var(--ds-warning)' 
                          : 'var(--ds-accent)' 
                      }}
                      title="Send Comment"
                    >
                      <Send size={14} className={postingComment ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </form>

              </div>
            ) : (
              /* History log activity timeline */
              <div className="relative pl-6 border-l border-ds-border ml-3 space-y-6 py-2">
                {!ticket.history || ticket.history.length === 0 ? (
                  <p className="text-[13px] text-tertiary">No updates recorded on this ticket.</p>
                ) : (
                  [...ticket.history].reverse().map((hist, idx) => (
                    <div key={hist._id || idx} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-ds-bg border-2 border-ds-border-strong flex-shrink-0" />
                      
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] text-primary">
                          <span className="font-semibold text-secondary">{hist.performedBy}</span> {hist.action}
                        </span>
                        {hist.detail && (
                          <span className="text-xs text-tertiary italic">{hist.detail}</span>
                        )}
                        <span className="text-[10px] text-tertiary mt-1 uppercase tracking-wider">
                          {new Date(hist.date).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            
          </div>
        </div>

        {/* Right Side: metadata panels & SLA widgets */}
        <div className="space-y-6 w-full lg:sticky lg:top-6">
          
          {/* Metadata Card */}
          <Card className="p-5 space-y-5">
            
            {/* Support Engineer Quick Actions */}
            {role === 'support_engineer' && (
              <div className="pb-4 border-b border-ds-divider space-y-2">
                <label className="ds-label">Operational Control</label>
                {ticket.assignedTo?._id !== currentUserId && ticket.assignedTo?.id !== currentUserId ? (
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="w-full flex justify-center py-1"
                    onClick={async () => {
                      setUpdating(true)
                      try {
                        await api.put(`/tickets/${id}`, { status: 'In Progress', assignedTo: currentUserId })
                        addToast('Ticket accepted and status set to In Progress', 'success')
                        await loadTicket()
                      } catch (err) {
                        addToast(err.response?.data?.message || 'Failed to accept ticket', 'error')
                      } finally {
                        setUpdating(false)
                      }
                    }}
                    isLoading={updating}
                    icon={UserCheck}
                  >
                    Accept Ticket
                  </Button>
                ) : (
                  <Button 
                    variant="danger" 
                    size="sm" 
                    className="w-full flex justify-center py-1 hover:bg-red-600"
                    onClick={async () => {
                      setUpdating(true)
                      try {
                        await api.put(`/tickets/${id}`, { status: 'Open', assignedTo: null })
                        addToast('Ticket rejected back to queue', 'success')
                        await loadTicket()
                      } catch (err) {
                        addToast(err.response?.data?.message || 'Failed to reject ticket', 'error')
                      } finally {
                        setUpdating(false)
                      }
                    }}
                    isLoading={updating}
                    icon={AlertTriangle}
                  >
                    Reject Ticket
                  </Button>
                )}
              </div>
            )}
            
            {/* Status controller */}
            <div className="space-y-2">
              <label className="ds-label">Ticket Status</label>
              {isStaff ? (
                <select
                  value={ticket.status}
                  onChange={e => handleUpdateField('status', e.target.value)}
                  disabled={updating}
                  className="ds-select"
                >
                  <option value="Open">Open</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending">Pending</option>
                  <option value="Waiting for User">Waiting for User</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                  <option value="Escalated">Escalated</option>
                </select>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex">
                    <Badge color={getStatusColor(ticket.status)} dot>{ticket.status}</Badge>
                  </div>
                  {ticket.status === 'Resolved' && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full flex justify-center py-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleUpdateField('status', 'Closed')}
                      isLoading={updating}
                      icon={CheckCircle2}
                    >
                      Confirm &amp; Close Ticket
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* SLA Widget */}
            <div className="pt-4 border-t border-ds-divider">
              <label className="ds-label">SLA Resolution Target</label>
              {(() => {
                const progress = getSLAProgress(ticket)
                return (
                  <div className="space-y-2">
                    <div 
                      className={`flex items-center gap-2 p-3 rounded-lg border text-[13px] font-bold ${
                        slaInfo.breached
                          ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'
                          : progress.color === 'amber'
                            ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/25 text-amber-700 dark:text-amber-400'
                            : 'bg-ds-surface-raised border-ds-border text-secondary'
                      }`}
                    >
                      <Clock size={15} className="text-ds-text-muted shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate leading-none">{slaInfo.text}</p>
                        {ticket.dueDate && (
                          <p className="text-[10.5px] font-normal text-tertiary mt-1 truncate">
                            Due: {new Date(ticket.dueDate).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* SLA Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-medium text-tertiary">
                        <span>SLA Threshold</span>
                        <span>{Math.round(progress.pct)}%</span>
                      </div>
                      <div className="w-full bg-ds-surface-raised rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${progress.pct}%`, 
                            backgroundColor: progress.color === 'red' 
                              ? 'var(--ds-danger)' 
                              : progress.color === 'amber' 
                                ? 'var(--ds-warning)' 
                                : 'var(--ds-success)' 
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[9.5px] text-tertiary pt-0.5">
                        <span>Business Hours: 8:00 AM - 6:00 PM</span>
                        <span>24/7 Coverage</span>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Ticket Assignment details */}
            <div className="pt-4 border-t border-ds-divider">
              <label className="ds-label">Assignee</label>
              
              {role === 'admin' ? (
                /* Admin dropdown assignee controller */
                <select
                  value={ticket.assignedTo?._id || ''}
                  onChange={e => handleUpdateField('assignedTo', e.target.value || null)}
                  disabled={updating}
                  className="ds-select"
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              ) : role === 'support_engineer' && ticket.assignedTo?._id !== currentUser.id ? (
                /* Engineer claim control */
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-ds-surface-raised border border-ds-border flex items-center justify-center text-xs font-bold text-tertiary">
                      ?
                    </div>
                    <span className="text-[13px] text-tertiary italic">
                      {ticket.assignedTo?.name || 'Unassigned'}
                    </span>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full text-center py-1"
                    onClick={() => handleUpdateField('assignedTo', currentUser.id)}
                    isLoading={updating}
                    icon={UserCheck}
                  >
                    Claim Support Task
                  </Button>
                </div>
              ) : (
                /* Default employee assignee readout */
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-ds-accent-subtle text-ds-accent flex items-center justify-center text-xs font-bold">
                    {ticket.assignedTo?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <span className="text-[13px] font-semibold text-primary">
                    {ticket.assignedTo?.name || 'Unassigned'}
                  </span>
                </div>
              )}
            </div>

            {/* SLA Due date configuration (admin only) */}
            {role === 'admin' && (
              <div className="pt-4 border-t border-ds-divider">
                <label className="ds-label">Manually Configure Due Date</label>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={ticket.dueDate ? new Date(new Date(ticket.dueDate).getTime() - new Date(ticket.dueDate).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                    onChange={e => handleUpdateField('dueDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                    disabled={updating}
                    className="ds-input text-xs"
                  />
                </div>
              </div>
            )}

            {/* Static Incident Parameters */}
            <div className="pt-4 border-t border-ds-divider space-y-3">
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-tertiary font-medium">Impact:</span>
                <span className="font-semibold text-secondary">{ticket.impact}</span>
              </div>
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-tertiary font-medium">Urgency:</span>
                <span className="font-semibold text-secondary">{ticket.urgency}</span>
              </div>
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-tertiary font-medium">Created Time:</span>
                <span className="font-semibold text-secondary">{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

          </Card>

          {/* Reporter profile details card */}
          <Card className="p-5">
            <h3 className="text-[12px] font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
              <User size={14} className="text-ds-text-muted" /> Reporter Profile
            </h3>
            
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
              >
                {ticket.createdBy?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-primary truncate leading-tight">{ticket.createdBy?.name || 'Requester'}</p>
                <p className="text-[11px] text-tertiary truncate mt-0.5">{ticket.createdBy?.email}</p>
              </div>
            </div>

            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between items-center">
                <span className="text-tertiary font-medium">Department:</span>
                <span className="font-semibold text-secondary">{ticket.createdBy?.department || 'IT Operations'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-tertiary font-medium">Designation:</span>
                <span className="font-semibold text-secondary">{ticket.createdBy?.designation || 'Staff'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-tertiary font-medium">Employee ID:</span>
                <span className="font-semibold text-secondary font-mono">{ticket.createdBy?.employeeId || 'N/A'}</span>
              </div>
              {ticket.createdBy?.mobileNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-tertiary font-medium">Contact:</span>
                  <span className="font-semibold text-secondary">{ticket.createdBy.mobileNumber}</span>
                </div>
              )}
            </div>
          </Card>

        </div>

      </div>

      {/* Delete ticket alert modal (admin only) */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Incident Record"
        danger
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteTicket}>Permanently Delete Ticket</Button>
          </>
        }
      >
        <p className="text-[13px] text-secondary">
          Are you sure you want to permanently erase ticket <strong>{ticket.ticketNumber || `#${ticket._id.slice(-6).toUpperCase()}`}</strong>? This will remove all associated comments, timeline entries, and cannot be undone.
        </p>
      </Modal>

    </div>
  )
}

// Mock category color token index
const CAT_COLORS = {
  General:  'gray',
  Hardware: 'blue',
  Software: 'purple',
  Network:  'indigo',
  Security: 'red',
  Access:   'amber',
  'Access/Login': 'amber',
  Other:    'gray',
}
