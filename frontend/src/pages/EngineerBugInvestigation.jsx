import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bug, Search, Filter, AlertTriangle, Clock, ChevronRight, User,
  MessageSquare, RefreshCw, CheckCircle2, XCircle, Play, Wrench, FlaskConical
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import { getBugs, updateBug, addBugComment } from '../services/bugApi'
import PageHeader from '../components/enterprise/PageHeader'
import Card from '../components/enterprise/Card'
import Badge from '../components/enterprise/Badge'
import Button from '../components/enterprise/Button'
import EmptyState from '../components/enterprise/EmptyState'
import Modal from '../components/enterprise/Modal'

const SEVERITY_COLORS = { Critical: 'red', High: 'orange', Medium: 'blue', Low: 'gray' }
const STATUS_COLORS = {
  Open: 'gray', Assigned: 'blue', 'In Progress': 'indigo',
  Fixed: 'emerald', Testing: 'amber', Verified: 'purple', Closed: 'slate'
}
const STATUS_TRANSITIONS = {
  Open: ['Assigned', 'In Progress'],
  Assigned: ['In Progress'],
  'In Progress': ['Fixed'],
  Fixed: ['Testing'],
  Testing: ['Verified'],
  Verified: ['Closed'],
}

export default function EngineerBugInvestigation() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'

  const [bugs, setBugs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('')

  const [selectedBug, setSelectedBug] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus)   params.status   = filterStatus
      if (filterSeverity) params.severity  = filterSeverity
      const data = await getBugs(params)
      setBugs(data)
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load bug reports', 'error')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterSeverity])

  useEffect(() => { load() }, [load])

  const openDetail = (bug) => { setSelectedBug(bug); setDetailOpen(true) }

  const handleStatusChange = async (bugId, status) => {
    setSubmitting(true)
    try {
      await updateBug(bugId, { status })
      addToast(`Bug status updated to ${status}`, 'success')
      await load()
      if (selectedBug?._id === bugId) {
        setSelectedBug(prev => ({ ...prev, status }))
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update status', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedBug) return
    setSubmitting(true)
    try {
      await addBugComment(selectedBug._id, commentText.trim())
      addToast('Comment added', 'success')
      setCommentText('')
      await load()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to add comment', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = bugs.filter(b =>
    (b.bugNumber + b.title + (b.ticketId?.ticketNumber || '')).toLowerCase().includes(search.toLowerCase())
  )

  const statsMap = {
    total: bugs.length,
    open: bugs.filter(b => b.status === 'Open').length,
    inProgress: bugs.filter(b => b.status === 'In Progress').length,
    fixed: bugs.filter(b => ['Fixed', 'Testing', 'Verified', 'Closed'].includes(b.status)).length,
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      <PageHeader
        title="Bug Investigation"
        description="Track, investigate and manage bug reports linked to customer tickets."
        icon={Bug}
        breadcrumbs={[{ name: 'Workspace' }, { name: 'Bug Investigation' }]}
        primaryAction={
          <Button variant="secondary" icon={RefreshCw} onClick={load} size="sm">Refresh</Button>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Bugs', value: statsMap.total, color: 'var(--ds-text-muted)', icon: Bug },
          { label: 'Open', value: statsMap.open, color: '#ef4444', icon: AlertTriangle },
          { label: 'In Progress', value: statsMap.inProgress, color: '#6366f1', icon: Play },
          { label: 'Fixed / Closed', value: statsMap.fixed, color: '#10b981', icon: CheckCircle2 },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label}>
            <div className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--ds-text-primary)' }}>{value}</p>
                <p className="text-xs font-medium" style={{ color: 'var(--ds-text-muted)' }}>{label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ds-text-muted)' }} />
            <input
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2"
              style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
              placeholder="Search bugs by number, title, or ticket…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 text-sm rounded-lg border focus:outline-none"
            style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {['Open','Assigned','In Progress','Fixed','Testing','Verified','Closed'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 text-sm rounded-lg border focus:outline-none"
            style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value)}
          >
            <option value="">All Severities</option>
            {['Critical','High','Medium','Low'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Bug List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--ds-accent)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bug}
          title="No Bug Reports Found"
          description="Bug reports linked to tickets will appear here. Create one from a ticket's investigation panel."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(bug => (
            <Card key={bug._id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetail(bug)}>
              <div className="p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--ds-surface-raised)' }}>
                  <Bug size={18} style={{ color: 'var(--ds-text-muted)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono font-bold" style={{ color: 'var(--ds-accent)' }}>{bug.bugNumber}</span>
                    <Badge variant={SEVERITY_COLORS[bug.severity] || 'gray'} size="sm">{bug.severity}</Badge>
                    <Badge variant={STATUS_COLORS[bug.status] || 'gray'} size="sm">{bug.status}</Badge>
                  </div>
                  <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--ds-text-primary)' }}>{bug.title}</h3>
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    {bug.ticketId && (
                      <span className="text-xs flex items-center gap-1" style={{ color: 'var(--ds-text-muted)' }}>
                        <ChevronRight size={12} />Ticket: {bug.ticketId.ticketNumber}
                      </span>
                    )}
                    {bug.assignedDeveloper && (
                      <span className="text-xs flex items-center gap-1" style={{ color: 'var(--ds-text-muted)' }}>
                        <User size={12} />{bug.assignedDeveloper.name}
                      </span>
                    )}
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--ds-text-muted)' }}>
                      <Clock size={12} />{new Date(bug.createdAt).toLocaleDateString()}
                    </span>
                    {bug.comments?.length > 0 && (
                      <span className="text-xs flex items-center gap-1" style={{ color: 'var(--ds-text-muted)' }}>
                        <MessageSquare size={12} />{bug.comments.length}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--ds-text-muted)' }} className="shrink-0 mt-1" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Bug Detail Modal */}
      {selectedBug && (
        <Modal
          isOpen={detailOpen}
          onClose={() => { setDetailOpen(false); setSelectedBug(null); setCommentText('') }}
          title={
            <div className="flex items-center gap-2">
              <Bug size={18} style={{ color: 'var(--ds-accent)' }} />
              <span className="font-mono text-sm" style={{ color: 'var(--ds-accent)' }}>{selectedBug.bugNumber}</span>
            </div>
          }
          size="lg"
        >
          <div className="flex flex-col gap-5 max-h-[70vh] overflow-y-auto pr-1">
            {/* Header */}
            <div>
              <h2 className="text-base font-bold mb-2" style={{ color: 'var(--ds-text-primary)' }}>{selectedBug.title}</h2>
              <div className="flex gap-2 flex-wrap">
                <Badge variant={SEVERITY_COLORS[selectedBug.severity] || 'gray'}>{selectedBug.severity}</Badge>
                <Badge variant={STATUS_COLORS[selectedBug.status] || 'gray'}>{selectedBug.status}</Badge>
                {selectedBug.ticketId && (
                  <Badge variant="indigo">Ticket: {selectedBug.ticketId.ticketNumber}</Badge>
                )}
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--ds-surface-raised)' }}>
              {selectedBug.assignedDeveloper && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--ds-text-muted)' }}>Assigned Developer</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--ds-text-primary)' }}>{selectedBug.assignedDeveloper.name}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--ds-text-muted)' }}>Created By</p>
                <p className="text-sm font-medium" style={{ color: 'var(--ds-text-primary)' }}>{selectedBug.createdBy?.name}</p>
              </div>
              {selectedBug.environment?.browser && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--ds-text-muted)' }}>Browser</p>
                  <p className="text-sm" style={{ color: 'var(--ds-text-primary)' }}>{selectedBug.environment.browser}</p>
                </div>
              )}
              {selectedBug.environment?.OS && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--ds-text-muted)' }}>OS</p>
                  <p className="text-sm" style={{ color: 'var(--ds-text-primary)' }}>{selectedBug.environment.OS}</p>
                </div>
              )}
            </div>

            {/* Reproduction */}
            {selectedBug.reproductionSteps && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ds-text-muted)' }}>Steps to Reproduce</p>
                <pre className="text-sm whitespace-pre-wrap p-3 rounded-lg" style={{ backgroundColor: 'var(--ds-surface-raised)', color: 'var(--ds-text-secondary)', fontFamily: 'inherit' }}>{selectedBug.reproductionSteps}</pre>
              </div>
            )}
            {selectedBug.expectedBehaviour && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--ds-text-muted)' }}>Expected Behaviour</p>
                <p className="text-sm" style={{ color: 'var(--ds-text-secondary)' }}>{selectedBug.expectedBehaviour}</p>
              </div>
            )}
            {selectedBug.actualBehaviour && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--ds-text-muted)' }}>Actual Behaviour</p>
                <p className="text-sm" style={{ color: 'var(--ds-text-secondary)' }}>{selectedBug.actualBehaviour}</p>
              </div>
            )}

            {/* Status Actions */}
            {STATUS_TRANSITIONS[selectedBug.status]?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ds-text-muted)' }}>Update Status</p>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_TRANSITIONS[selectedBug.status].map(s => (
                    <Button key={s} variant="secondary" size="sm" isLoading={submitting}
                      onClick={() => handleStatusChange(selectedBug._id, s)}>
                      → {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ds-text-muted)' }}>
                Internal Comments ({selectedBug.comments?.length || 0})
              </p>
              <div className="flex flex-col gap-3 mb-4 max-h-48 overflow-y-auto">
                {(selectedBug.comments || []).map((c, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg, var(--ds-accent) 0%, var(--ds-accent-hover) 100%)' }}>
                      {c.authorName?.[0] || 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold" style={{ color: 'var(--ds-text-primary)' }}>{c.authorName}</span>
                        <span className="text-[10px]" style={{ color: 'var(--ds-text-muted)' }}>{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--ds-text-secondary)' }}>{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-2 text-sm rounded-lg border focus:outline-none"
                  style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                  placeholder="Add internal technical comment…"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                />
                <Button variant="primary" size="sm" onClick={handleAddComment} isLoading={submitting}>Add</Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
