import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, Clock, Calendar, Shield, User, MessageSquare, 
  Activity, Tag, Trash2, CheckCircle2, AlertTriangle, Lock, Unlock, 
  Send, UserCheck, Play, Check, XCircle, FileText, Download, Building,
  Bug, BookOpen, ChevronDown, ChevronUp, Save, FlaskConical
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/enterprise/Button'
import Badge from '../components/enterprise/Badge'
import Card from '../components/enterprise/Card'
import PageHeader from '../components/enterprise/PageHeader'
import Modal from '../components/enterprise/Modal'
import { useToast } from '../hooks/useToast'
import { saveInvestigation, createBug, createArticleFromTicket } from '../services/bugApi'

export default function EngineerTicketDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { user: currentUser } = useAuth()
  
  const currentUserId = currentUser?._id || currentUser?.id

  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [postingComment, setPostingComment] = useState(false)
  const [error, setError] = useState(null)
  
  const [activeNoteTab, setActiveNoteTab] = useState('public') // 'public' | 'internal'
  const [commentText, setCommentText] = useState('')

  // ── Module 8: Investigation Panel ─────────────────────────────────────────
  const [investigationOpen, setInvestigationOpen] = useState(false)
  const [investigation, setInvestigation] = useState({
    issueType: 'Bug', severity: 'Medium', reproducible: 'Yes',
    appVersion: '', technicalNotes: '',
    stepsToReproduce: '', expectedBehavior: '', actualBehavior: ''
  })
  const [savingInvestigation, setSavingInvestigation] = useState(false)

  // ── Module 8: Bug Report Modal ─────────────────────────────────────────────
  const [bugModalOpen, setBugModalOpen] = useState(false)
  const [bugForm, setBugForm] = useState({ title: '', description: '', severity: 'Medium', assignedDeveloper: '' })
  const [creatingBug, setCreatingBug] = useState(false)

  // ── Module 8: Create KB Article Modal ─────────────────────────────────────
  const [kbModalOpen, setKbModalOpen] = useState(false)
  const [kbForm, setKbForm] = useState({ title: '', content: '', category: '', visibility: 'internal' })
  const [creatingArticle, setCreatingArticle] = useState(false)

  const insertFormatting = (prefix, suffix = '') => {
    const textarea = document.getElementById('comment-editor')
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    
    const selectedText = text.substring(start, end)
    const replacement = prefix + selectedText + suffix
    
    setCommentText(
      text.substring(0, start) + replacement + text.substring(end)
    )
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length)
    }, 0)
  }

  const renderMarkdown = (text) => {
    if (!text) return ''
    let parsed = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
    
    parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    parsed = parsed.replace(/\*(.*?)\*/g, '<em>$1</em>')
    parsed = parsed.replace(/`([^`]+)`/g, '<code class="bg-ds-surface-raised px-1 py-0.5 rounded border border-ds-border font-mono text-[11px]">$1</code>')
    parsed = parsed.replace(/```([\s\S]*?)```/g, '<pre class="bg-ds-surface-raised p-3 rounded border border-ds-border font-mono text-xs my-2 overflow-x-auto block">$1</pre>')
    
    parsed = parsed.split('\n').map(line => {
      if (line.startsWith('&gt; ')) {
        return `<blockquote class="border-l-2 border-ds-border-strong pl-2.5 italic text-[var(--ds-text-muted)] my-1.5">${line.substring(5)}</blockquote>`
      }
      if (line.startsWith('- ')) {
        return `<li class="ml-4 list-disc text-secondary">${line.substring(2)}</li>`
      }
      return line
    }).join('\n')
    
    return <div className="space-y-1 select-text" dangerouslySetInnerHTML={{ __html: parsed }} />
  }

  async function loadTicket() {
    try {
      const res = await api.get(`/tickets/${id}`)
      setTicket(res.data)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Failed to load ticket details.')
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      await loadTicket()
      setLoading(false)
    }
    init()
  }, [id])

  // Handle updates (status, assignedTo)
  const handleUpdateStatus = async (statusVal) => {
    setUpdating(true)
    try {
      await api.put(`/tickets/${id}`, { status: statusVal })
      addToast(`Status updated to ${statusVal}`, 'success')
      await loadTicket()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update status.', 'error')
    } finally {
      setUpdating(false)
    }
  }

  const handleAccept = async () => {
    setUpdating(true)
    try {
      await api.put(`/tickets/${id}`, { status: 'In Progress', assignedTo: currentUserId })
      addToast('Ticket accepted successfully', 'success')
      await loadTicket()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to accept ticket.', 'error')
    } finally {
      setUpdating(false)
    }
  }

  const handleConfirmResolution = async () => {
    setUpdating(true)
    try {
      await api.post(`/tickets/${id}/confirm-resolution`)
      addToast('Resolution confirmed. Ticket is now Closed.', 'success')
      await loadTicket()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to confirm resolution.', 'error')
    } finally {
      setUpdating(false)
    }
  }

  const handleReopen = async () => {
    if (!window.confirm("Are you sure you want to reopen this ticket?")) return
    setUpdating(true)
    try {
      await api.post(`/tickets/${id}/reopen`)
      addToast('Ticket reopened. Status changed back to In Progress.', 'success')
      await loadTicket()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to reopen ticket.', 'error')
    } finally {
      setUpdating(false)
    }
  }

  // Post comment
  const handlePostComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setPostingComment(true)
    const isInternal = activeNoteTab === 'internal'
    try {
      await api.post(`/tickets/${id}/comments`, {
        text: commentText.trim(),
        isInternal: isInternal
      })
      addToast(isInternal ? 'Internal staff note added' : 'Public comment sent', 'success')
      setCommentText('')
      await loadTicket()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to post message', 'error')
    } finally {
      setPostingComment(false)
    }
  }

  // ── Module 8 Handlers ─────────────────────────────────────────────────────

  const handleSaveInvestigation = async () => {
    setSavingInvestigation(true)
    try {
      await saveInvestigation(id, investigation)
      addToast('Investigation details saved', 'success')
      await loadTicket()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save investigation', 'error')
    } finally {
      setSavingInvestigation(false)
    }
  }

  const openBugModal = () => {
    if (ticket) {
      setBugForm({
        title: ticket.title,
        description: ticket.description || '',
        severity: ticket.investigation?.severity || ticket.priority || 'Medium',
        assignedDeveloper: ''
      })
    }
    setBugModalOpen(true)
  }

  const handleCreateBug = async () => {
    if (!bugForm.title.trim()) return addToast('Bug title is required', 'error')
    setCreatingBug(true)
    try {
      const result = await createBug({
        ticketId: id,
        ...bugForm,
        reproductionSteps: investigation.stepsToReproduce || ticket?.issueDetails?.stepsToReproduce || '',
        expectedBehaviour: investigation.expectedBehavior  || ticket?.issueDetails?.expectedBehavior || '',
        actualBehaviour:   investigation.actualBehavior    || ticket?.issueDetails?.actualBehavior   || '',
        environment: {
          browser:    ticket?.environment?.browser || '',
          OS:         ticket?.environment?.OS || '',
          device:     ticket?.environment?.device || '',
          appVersion: investigation.appVersion || '',
        }
      })
      addToast(`Bug report ${result.bug?.bugNumber} created!`, 'success')
      setBugModalOpen(false)
      await loadTicket()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create bug report', 'error')
    } finally {
      setCreatingBug(false)
    }
  }

  const openKbModal = () => {
    if (ticket) {
      setKbForm({
        title: ticket.title,
        content: '',
        category: ticket.category || '',
        visibility: 'internal'
      })
    }
    setKbModalOpen(true)
  }

  const handleCreateArticle = async () => {
    if (!kbForm.title.trim()) return addToast('Article title is required', 'error')
    setCreatingArticle(true)
    try {
      const result = await createArticleFromTicket(id, kbForm)
      addToast('Knowledge article created as draft!', 'success')
      setKbModalOpen(false)
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create article', 'error')
    } finally {
      setCreatingArticle(false)
    }
  }

  // SLA Calculation display helper
  const getSLAProgress = (t) => {
    if (!t || !t.createdAt) return { pct: 100, color: 'emerald', text: 'Met' }
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
    let text = `${Math.floor(remaining / 3600000)}h left`
    if (pct < 15) {
      color = 'red'
      text = `Critical: ${Math.floor(remaining / 3600000)}h left`
    } else if (pct < 50) {
      color = 'amber'
      text = `Warning: ${Math.floor(remaining / 3600000)}h left`
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

  const priorityColors = { Critical: 'red', High: 'amber', Medium: 'blue', Low: 'gray' }
  const statusColors = { 
    Open: 'gray', 
    Assigned: 'blue', 
    'In Progress': 'indigo', 
    Pending: 'amber', 
    'Waiting for User': 'amber', 
    Resolved: 'emerald', 
    Closed: 'slate',
    Escalated: 'red'
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 py-8 animate-pulse">
        <div className="h-6 w-48 bg-ds-surface-raised rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="h-64 bg-ds-surface rounded-lg border border-ds-border" />
          </div>
          <div className="lg:col-span-2 h-96 bg-ds-surface rounded-lg border border-ds-border" />
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
        <h2 className="text-[16px] font-bold text-primary mb-1">Incident Request Error</h2>
        <p className="text-[13px] text-tertiary mb-6">{error || 'Incident request could not be fetched.'}</p>
        <Link to="/engineer/assigned">
          <Button variant="secondary">Back to Queue</Button>
        </Link>
      </div>
    )
  }

  const slaProgress = getSLAProgress(ticket)
  const isAssignedToMe = ticket.assignedTo?._id === currentUserId || ticket.assignedTo?.id === currentUserId
  const isCreator = ticket.createdBy?._id === currentUserId || ticket.createdBy?.id === currentUserId || ticket.createdBy === currentUserId

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      
      {/* Top Breadcrumb Nav */}
      <div className="flex items-center justify-between shrink-0">
        <Link 
          to="/engineer/assigned"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Assigned Queue
        </Link>
        
        {/* Actions Button panel */}
        <div className="flex items-center gap-2">
          {/* Support Staff Operations */}
          {['admin', 'support_engineer', 'agent'].includes(currentUser?.role) && (
            <>
              {!isAssignedToMe && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={handleAccept}
                  isLoading={updating}
                  icon={UserCheck}
                >
                  Accept &amp; Claim
                </Button>
              )}
              
              {isAssignedToMe && ticket.status !== 'In Progress' && ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => handleUpdateStatus('In Progress')}
                  isLoading={updating}
                  icon={Play}
                >
                  Start Progress
                </Button>
              )}

              {isAssignedToMe && ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => handleUpdateStatus('Resolved')}
                  isLoading={updating}
                  icon={Check}
                  style={{ backgroundColor: 'var(--ds-success)' }}
                >
                  Resolve Ticket
                </Button>
              )}

              {isAssignedToMe && ticket.status === 'Resolved' && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => handleUpdateStatus('Closed')}
                  isLoading={updating}
                  icon={XCircle}
                >
                  Close Ticket
                </Button>
              )}
            </>
          )}

          {/* Customer Confirmation loop */}
          {isCreator && ticket.status === 'Resolved' && (
            <>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleConfirmResolution}
                isLoading={updating}
                icon={CheckCircle2}
                style={{ backgroundColor: 'var(--ds-success)' }}
              >
                Confirm Resolution
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReopen}
                isLoading={updating}
                icon={AlertTriangle}
                style={{ borderColor: 'var(--ds-danger)', color: 'var(--ds-danger)' }}
              >
                Reopen Ticket
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Double Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Ticket Information, Requester Profile, SLA Progress */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Ticket Information */}
          <Card className="space-y-4">
            <h3 className="text-[13px] font-bold text-primary uppercase tracking-wider border-b border-ds-divider pb-3 flex items-center gap-2">
              <FileText size={15} className="text-ds-text-muted" /> Ticket Information
            </h3>
            
            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider block">Ticket ID</span>
                <span className="font-mono text-xs font-bold text-secondary mt-1 block">
                  {ticket.ticketNumber || `#${ticket._id.slice(-6).toUpperCase()}`}
                </span>
              </div>
              
              <div>
                <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider block">Subject</span>
                <span className="text-[13.5px] font-bold text-primary mt-1 block leading-tight">{ticket.title}</span>
              </div>
              
              <div>
                <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider block">Description</span>
                <div className="text-[13px] text-secondary mt-1 leading-relaxed whitespace-pre-wrap">{ticket.description}</div>
              </div>
            </div>
          </Card>

          {/* Requester Information */}
          <Card className="space-y-4">
            <h3 className="text-[13px] font-bold text-primary uppercase tracking-wider border-b border-ds-divider pb-3 flex items-center gap-2">
              <User size={15} className="text-ds-text-muted" /> Requester Profile
            </h3>
            
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-hover) 100%)' }}
              >
                {ticket.createdBy?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-primary truncate leading-none">{ticket.createdBy?.name || 'Requester'}</p>
                <p className="text-[11px] text-tertiary truncate mt-1">{ticket.createdBy?.email}</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs border-t border-ds-divider pt-3.5">
              <div className="flex justify-between items-center">
                <span className="text-tertiary font-medium flex items-center gap-1"><Building size={12}/> Department:</span>
                <span className="font-semibold text-secondary">{ticket.createdBy?.department || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-tertiary font-medium">Designation:</span>
                <span className="font-semibold text-secondary">{ticket.createdBy?.designation || 'N/A'}</span>
              </div>
              {ticket.createdBy?.mobileNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-tertiary font-medium">Contact:</span>
                  <span className="font-semibold text-secondary">{ticket.createdBy.mobileNumber}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Classification & SLA Panel */}
          <Card className="space-y-4">
            <h3 className="text-[13px] font-bold text-primary uppercase tracking-wider border-b border-ds-divider pb-3 flex items-center gap-2">
              <Clock size={15} className="text-ds-text-muted" /> Classification &amp; SLA
            </h3>
            
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-tertiary font-medium">Category:</span>
                <Badge color="gray">{ticket.category}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-tertiary font-medium">Priority:</span>
                <Badge color={priorityColors[ticket.priority] || 'gray'}>{ticket.priority}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-tertiary font-medium">Status:</span>
                <Badge color={statusColors[ticket.status] || 'gray'}>{ticket.status}</Badge>
              </div>
              
              {/* SLA details and countdown progress indicator */}
              <div className="border-t border-ds-divider pt-3.5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-tertiary font-medium">SLA Resolution Target:</span>
                  <span className="font-bold" style={{ color: slaProgress.color === 'red' ? 'var(--ds-danger)' : slaProgress.color === 'amber' ? 'var(--ds-warning)' : 'var(--ds-success)' }}>
                    {slaProgress.text}
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-ds-surface-raised rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${slaProgress.pct}%`, 
                      backgroundColor: slaProgress.color === 'red' 
                        ? 'var(--ds-danger)' 
                        : slaProgress.color === 'amber' 
                          ? 'var(--ds-warning)' 
                          : 'var(--ds-success)' 
                    }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-tertiary">
                  <span>Coverage: 24/7 Ops</span>
                  <span>Due: {ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>
          </Card>

        </div>

        {/* RIGHT COLUMN: Conversation Timeline, Activity Log, Attachments */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Attachments Section */}
          <Card className="space-y-4">
            <h3 className="text-[13px] font-bold text-primary uppercase tracking-wider border-b border-ds-divider pb-3 flex items-center gap-2">
              <FileText size={15} className="text-ds-text-muted" /> Attachments
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-ds-border bg-ds-surface-raised">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText size={18} className="text-ds-text-muted shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-primary truncate leading-none">diagnostic_report.txt</p>
                    <p className="text-[10px] text-tertiary mt-1">12 KB • Log File</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="xs" 
                  className="text-xs font-bold text-[var(--brand-primary)]"
                  onClick={() => downloadMockFile('diagnostic_report.txt')}
                >
                  <Download size={13} className="mr-1" /> Download
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
                  <Download size={13} className="mr-1" /> Download
                </Button>
              </div>
            </div>
          </Card>

          {/* Conversation Timeline */}
          <Card className="space-y-4">
            <h3 className="text-[13px] font-bold text-primary uppercase tracking-wider border-b border-ds-divider pb-3 flex items-center gap-2">
              <MessageSquare size={15} className="text-ds-text-muted" /> Conversation Timeline
            </h3>
            
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {!ticket.comments || ticket.comments.length === 0 ? (
                <div className="text-center py-6 text-sm text-tertiary italic">No timeline messages found.</div>
              ) : (
                ticket.comments.map((c) => {
                  const commenterInitials = c.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
                  const isInternalNote = c.isInternal
                  
                  return (
                    <div 
                      key={c._id}
                      className={`p-3.5 rounded-lg border transition-shadow ${
                        isInternalNote 
                          ? 'bg-[rgba(245,158,11,0.03)] border-amber-300 dark:border-amber-500/30' 
                          : 'bg-ds-surface border-ds-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                            style={{ 
                              background: isInternalNote
                                ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                                : 'linear-gradient(135deg, var(--ds-accent) 0%, var(--ds-accent-hover) 100%)' 
                            }}
                          >
                            {commenterInitials}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[12.5px] font-bold text-primary block leading-none">{c.name}</span>
                              {c.user?.role && (
                                <Badge 
                                  color={c.user.role === 'admin' ? 'red' : c.user.role === 'support_engineer' ? 'indigo' : 'blue'} 
                                  rounded="md" 
                                  className="px-1.5 h-4.5 text-[9px] uppercase tracking-wider"
                                >
                                  {c.user.role.replace('_', ' ')}
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-tertiary mt-1 block">
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        
                        {isInternalNote && (
                          <Badge color="amber" rounded="md" className="gap-1 px-1.5 h-4.5 text-[9px]">
                            <Lock size={9} /> Internal Note
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-[13px] leading-relaxed text-secondary select-text pl-8">
                        {renderMarkdown(c.text)}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>

          {/* Activity Timeline (Audit History logs) */}
          <Card className="space-y-4">
            <h3 className="text-[13px] font-bold text-primary uppercase tracking-wider border-b border-ds-divider pb-3 flex items-center gap-2">
              <Activity size={15} className="text-ds-text-muted" /> Activity Timeline
            </h3>
            
            <div className="relative pl-6 border-l border-ds-border ml-3 space-y-5 py-2 max-h-[250px] overflow-y-auto pr-1">
              {!ticket.history || ticket.history.length === 0 ? (
                <p className="text-xs text-tertiary italic">No timeline entries found.</p>
              ) : (
                [...ticket.history].reverse().map((hist, idx) => (
                  <div key={hist._id || idx} className="relative">
                    {/* Timeline dot */}
                    <div className="absolute -left-[31px] top-1.5 w-2 h-2 rounded-full bg-ds-bg border border-ds-border-strong flex-shrink-0" />
                    
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-primary">
                        <span className="font-semibold text-secondary">{hist.performedBy}</span> {hist.action}
                      </span>
                      {hist.detail && (
                        <span className="text-[11px] text-tertiary italic">{hist.detail}</span>
                      )}
                      <span className="text-[9px] text-tertiary mt-0.5 uppercase tracking-wider">
                        {new Date(hist.date).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

        </div>

      </div>

      {/* BOTTOM SECTION: Conversation Editor (Public / Internal Note inputs) */}
      {ticket.status !== 'Closed' ? (
        <Card className="space-y-4">
          <div className="flex border-b border-ds-border pb-2.5">
            <button
              onClick={() => setActiveNoteTab('public')}
              className={`px-4 py-2 text-xs font-bold border-b-2 -mb-[12px] transition-all flex items-center gap-1.5 ${
                activeNoteTab === 'public'
                  ? 'border-[var(--ds-accent)] text-primary font-extrabold'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              <MessageSquare size={13} />
              Public Reply (Visible to Employee)
            </button>
            
            {['admin', 'support_engineer', 'agent'].includes(currentUser?.role) && (
              <button
                onClick={() => setActiveNoteTab('internal')}
                className={`px-4 py-2 text-xs font-bold border-b-2 -mb-[12px] transition-all flex items-center gap-1.5 ${
                  activeNoteTab === 'internal'
                    ? 'border-amber-400 text-amber-800 dark:text-amber-400 font-extrabold'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                <Lock size={12} />
                Internal Staff Note (Engineers &amp; Admins Only)
              </button>
            )}
          </div>

          <form onSubmit={handlePostComment} className="space-y-0 pt-3">
            {/* Rich text editing toolbar */}
            <div className="flex items-center gap-1 px-3 py-1.5 border border-b-0 border-ds-border bg-ds-surface-raised rounded-t-lg">
              <button 
                type="button" 
                title="Bold" 
                onClick={() => insertFormatting('**', '**')} 
                className="p-1 rounded hover:bg-ds-hover text-secondary font-bold text-xs"
              >
                B
              </button>
              <button 
                type="button" 
                title="Italic" 
                onClick={() => insertFormatting('*', '*')} 
                className="p-1 rounded hover:bg-ds-hover text-secondary italic text-xs"
              >
                I
              </button>
              <button 
                type="button" 
                title="Inline Code" 
                onClick={() => insertFormatting('`', '`')} 
                className="p-1 rounded hover:bg-ds-hover text-secondary font-mono text-[10px]"
              >
                `c`
              </button>
              <button 
                type="button" 
                title="Code Block" 
                onClick={() => insertFormatting('```\n', '\n```')} 
                className="p-1 rounded hover:bg-ds-hover text-secondary font-mono text-[11px]"
              >
                &lt;/&gt;
              </button>
              <button 
                type="button" 
                title="Quote" 
                onClick={() => insertFormatting('> ')} 
                className="p-1 rounded hover:bg-ds-hover text-secondary text-xs"
              >
                &ldquo;
              </button>
              <button 
                type="button" 
                title="Bullet List" 
                onClick={() => insertFormatting('- ')} 
                className="p-1 rounded hover:bg-ds-hover text-secondary text-xs"
              >
                &bull; List
              </button>
            </div>

            <div className="relative">
              <textarea
                id="comment-editor"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={activeNoteTab === 'internal' ? "Write a private note visible only to support staff..." : "Send an update or request clarification from the employee..."}
                required
                rows={4}
                className="ds-textarea w-full transition-all pr-12 focus:ring-1 rounded-t-none rounded-b-lg"
                style={activeNoteTab === 'internal' ? { borderColor: 'var(--ds-warning)', focusRing: 'rgba(245, 158, 11, 0.4)' } : {}}
              />
              
              <button
                type="submit"
                disabled={postingComment || !commentText.trim()}
                className="absolute right-3.5 bottom-3.5 p-2 rounded-lg text-white hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center shrink-0"
                style={{ 
                  background: activeNoteTab === 'internal' 
                    ? 'var(--ds-warning)' 
                    : 'var(--ds-accent)' 
                }}
                title="Post Message"
              >
                <Send size={13} className={postingComment ? 'animate-spin' : ''} />
              </button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="p-6 text-center border" style={{ borderColor: 'var(--ds-border)', backgroundColor: 'var(--ds-surface-raised)' }}>
          <Lock className="w-5 h-5 mx-auto mb-2" style={{ color: 'var(--ds-text-muted)' }} />
          <h4 className="text-[13px] font-bold" style={{ color: 'var(--ds-text-primary)' }}>This support ticket is closed.</h4>
          <p className="text-[11.5px] mt-1" style={{ color: 'var(--ds-text-muted)' }}>Replies and internal notes are no longer permitted on this incident request.</p>
        </Card>
      )}

      {/* ── Module 8: Investigation Panel (Engineer / Admin only) ─────────────── */}
      {['admin', 'support_engineer', 'agent'].includes(currentUser?.role) && (
        <Card>
          <button
            onClick={() => setInvestigationOpen(o => !o)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-[var(--ds-surface-raised)] transition-colors rounded-lg"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#6366f118' }}>
                <FlaskConical size={16} style={{ color: '#6366f1' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--ds-text-primary)' }}>Bug Investigation Panel</p>
                <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>Internal only — document issue type, severity, and reproduction details</p>
              </div>
            </div>
            {investigationOpen ? <ChevronUp size={16} style={{ color: 'var(--ds-text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--ds-text-muted)' }} />}
          </button>

          {investigationOpen && (
            <div className="px-4 pb-4 border-t flex flex-col gap-4" style={{ borderColor: 'var(--ds-border)' }}>
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>Issue Type</label>
                  <select
                    className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none"
                    style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                    value={investigation.issueType}
                    onChange={e => setInvestigation(p => ({ ...p, issueType: e.target.value }))}
                  >
                    {['Bug', 'Question', 'Feature Request', 'Configuration Issue'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>Severity</label>
                  <select
                    className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none"
                    style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                    value={investigation.severity}
                    onChange={e => setInvestigation(p => ({ ...p, severity: e.target.value }))}
                  >
                    {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>Reproducible?</label>
                  <select
                    className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none"
                    style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                    value={investigation.reproducible}
                    onChange={e => setInvestigation(p => ({ ...p, reproducible: e.target.value }))}
                  >
                    {['Yes', 'No', 'Intermittent'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>App Version (optional)</label>
                  <input
                    className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none"
                    style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                    placeholder="e.g. v2.4.1"
                    value={investigation.appVersion}
                    onChange={e => setInvestigation(p => ({ ...p, appVersion: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>Steps to Reproduce</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none resize-none"
                    style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                    placeholder="1. Navigate to... 2. Click on... 3. Observe..."
                    value={investigation.stepsToReproduce}
                    onChange={e => setInvestigation(p => ({ ...p, stepsToReproduce: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-3 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>Expected Behaviour</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none resize-none"
                      style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                      value={investigation.expectedBehavior}
                      onChange={e => setInvestigation(p => ({ ...p, expectedBehavior: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>Actual Behaviour</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none resize-none"
                      style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                      value={investigation.actualBehavior}
                      onChange={e => setInvestigation(p => ({ ...p, actualBehavior: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>Technical Notes (internal only)</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none resize-none"
                    style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                    placeholder="Paste error logs, stack traces, internal findings…"
                    value={investigation.technicalNotes}
                    onChange={e => setInvestigation(p => ({ ...p, technicalNotes: e.target.value }))}
                  />
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t" style={{ borderColor: 'var(--ds-border)' }}>
                <Button variant="primary" size="sm" icon={Save} isLoading={savingInvestigation} onClick={handleSaveInvestigation}>
                  Save Investigation
                </Button>
                <Button variant="secondary" size="sm" icon={Bug} onClick={openBugModal}>
                  Create Bug Report
                </Button>
                {['Resolved', 'Closed'].includes(ticket?.status) && (
                  <Button variant="secondary" size="sm" icon={BookOpen} onClick={openKbModal}>
                    Create Knowledge Article
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* KB Article button for resolved tickets (outside investigation panel) */}
      {['admin', 'support_engineer', 'agent'].includes(currentUser?.role) &&
       ['Resolved', 'Closed'].includes(ticket?.status) && !investigationOpen && (
        <Card>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#10b98118' }}>
                <BookOpen size={16} style={{ color: '#10b981' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--ds-text-primary)' }}>Ticket Resolved</p>
                <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>Convert this resolution into a reusable knowledge article</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" icon={BookOpen} onClick={openKbModal}>
              Create Knowledge Article
            </Button>
          </div>
        </Card>
      )}

      {/* ── Bug Report Modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={bugModalOpen}
        onClose={() => setBugModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Bug size={18} style={{ color: '#ef4444' }} />
            Create Bug Report
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>Bug Title <span className="text-red-500">*</span></label>
            <input
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none"
              style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
              value={bugForm.title}
              onChange={e => setBugForm(p => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>Severity</label>
            <select
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none"
              style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
              value={bugForm.severity}
              onChange={e => setBugForm(p => ({ ...p, severity: e.target.value }))}
            >
              {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>Description</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none resize-none"
              style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
              placeholder="Summary of the bug for the developer…"
              value={bugForm.description}
              onChange={e => setBugForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>
            Reproduction steps, environment, and expected/actual behaviour will be automatically copied from the investigation panel.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setBugModalOpen(false)}>Cancel</Button>
            <Button variant="primary" icon={Bug} isLoading={creatingBug} onClick={handleCreateBug}>Create Bug Report</Button>
          </div>
        </div>
      </Modal>

      {/* ── KB Article Modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={kbModalOpen}
        onClose={() => setKbModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <BookOpen size={18} style={{ color: '#10b981' }} />
            Create Knowledge Article
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>Article Title <span className="text-red-500">*</span></label>
            <input
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none"
              style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
              value={kbForm.title}
              onChange={e => setKbForm(p => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>Category</label>
              <input
                className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none"
                style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                value={kbForm.category}
                onChange={e => setKbForm(p => ({ ...p, category: e.target.value }))}
                placeholder="e.g. Troubleshooting"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>Visibility</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none"
                style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                value={kbForm.visibility}
                onChange={e => setKbForm(p => ({ ...p, visibility: e.target.value }))}
              >
                <option value="internal">Internal (Staff only)</option>
                <option value="organization">Organization</option>
                <option value="public">Public</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>Content (optional — auto-generated from ticket)</label>
            <textarea
              rows={5}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none resize-none"
              style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
              placeholder="Leave blank to auto-generate from ticket description, steps, and resolution summary."
              value={kbForm.content}
              onChange={e => setKbForm(p => ({ ...p, content: e.target.value }))}
            />
          </div>
          <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>
            Article will be saved as <strong>draft</strong> — review and publish it from the Knowledge Base.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setKbModalOpen(false)}>Cancel</Button>
            <Button variant="primary" icon={BookOpen} isLoading={creatingArticle} onClick={handleCreateArticle}>Create Article</Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
