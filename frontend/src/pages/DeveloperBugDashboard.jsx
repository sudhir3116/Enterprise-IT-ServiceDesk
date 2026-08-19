import React, { useEffect, useState, useCallback } from 'react'
import {
  Bug, Clock, ChevronRight, MessageSquare, CheckCircle2,
  AlertTriangle, Play, FlaskConical, RefreshCw, ExternalLink
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import { getBugs, updateBug, addBugComment } from '../services/bugApi'
import PageHeader from '../components/enterprise/PageHeader'
import Card from '../components/enterprise/Card'
import Badge from '../components/enterprise/Badge'
import Button from '../components/enterprise/Button'
import EmptyState from '../components/enterprise/EmptyState'

const SEVERITY_COLORS = { Critical: 'red', High: 'orange', Medium: 'blue', Low: 'gray' }
const STATUS_COLORS = {
  Open: 'gray', Assigned: 'blue', 'In Progress': 'indigo',
  Fixed: 'emerald', Testing: 'amber', Verified: 'purple', Closed: 'slate'
}

// Developer can only transition: In Progress → Fixed
const DEV_TRANSITIONS = {
  'Assigned':    'In Progress',
  'In Progress': 'Fixed',
}

export default function DeveloperBugDashboard() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [bugs, setBugs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getBugs()
      setBugs(data)
    } catch (err) {
      addToast('Failed to load assigned bugs', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleTransition = async (bugId, currentStatus) => {
    const nextStatus = DEV_TRANSITIONS[currentStatus]
    if (!nextStatus) return
    setSubmitting(true)
    try {
      await updateBug(bugId, { status: nextStatus })
      addToast(`Bug moved to ${nextStatus}`, 'success')
      await load()
    } catch (err) {
      addToast(err.response?.data?.message || 'Update failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleComment = async (bugId) => {
    if (!commentText.trim()) return
    setSubmitting(true)
    try {
      await addBugComment(bugId, commentText.trim())
      addToast('Comment added', 'success')
      setCommentText('')
      await load()
    } catch (err) {
      addToast('Failed to add comment', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const activeBugs  = bugs.filter(b => !['Verified', 'Closed'].includes(b.status))
  const doneBugs    = bugs.filter(b => ['Fixed', 'Verified', 'Closed'].includes(b.status))

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      <PageHeader
        title="My Bug Queue"
        description={`Hello ${user?.name?.split(' ')[0] || 'Developer'} — here are the bugs assigned to you.`}
        icon={Bug}
        breadcrumbs={[{ name: 'Developer' }, { name: 'My Bugs' }]}
        primaryAction={
          <Button variant="secondary" icon={RefreshCw} size="sm" onClick={load}>Refresh</Button>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active', value: activeBugs.length, color: '#6366f1', icon: Play },
          { label: 'Fixed', value: bugs.filter(b => b.status === 'Fixed').length, color: '#10b981', icon: CheckCircle2 },
          { label: 'Total Assigned', value: bugs.length, color: 'var(--ds-text-muted)', icon: Bug },
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

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--ds-accent)' }} />
        </div>
      ) : bugs.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No Bugs Assigned"
          description="You currently have no bugs assigned to you. Check back later!"
        />
      ) : (
        <>
          {/* Active Bugs */}
          {activeBugs.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--ds-text-muted)' }}>
                Active Bugs ({activeBugs.length})
              </h2>
              <div className="flex flex-col gap-4">
                {activeBugs.map(bug => (
                  <Card key={bug._id}>
                    {/* Bug Header */}
                    <div
                      className="p-4 flex items-start gap-4 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === bug._id ? null : bug._id)}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: '#ef444418' }}>
                        <Bug size={18} style={{ color: '#ef4444' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono font-bold" style={{ color: 'var(--ds-accent)' }}>{bug.bugNumber}</span>
                          <Badge variant={SEVERITY_COLORS[bug.severity] || 'gray'} size="sm">{bug.severity}</Badge>
                          <Badge variant={STATUS_COLORS[bug.status] || 'gray'} size="sm">{bug.status}</Badge>
                        </div>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--ds-text-primary)' }}>{bug.title}</h3>
                        {bug.ticketId && (
                          <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--ds-text-muted)' }}>
                            <ExternalLink size={11} />
                            Linked to ticket: {bug.ticketId.ticketNumber} — {bug.ticketId.title}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {DEV_TRANSITIONS[bug.status] && (
                          <Button
                            variant="primary" size="sm" isLoading={submitting}
                            onClick={(e) => { e.stopPropagation(); handleTransition(bug._id, bug.status) }}
                          >
                            → {DEV_TRANSITIONS[bug.status]}
                          </Button>
                        )}
                        <ChevronRight size={16} style={{ color: 'var(--ds-text-muted)', transform: expandedId === bug._id ? 'rotate(90deg)' : '', transition: 'transform 0.2s' }} />
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedId === bug._id && (
                      <div className="px-4 pb-4 flex flex-col gap-4 border-t" style={{ borderColor: 'var(--ds-border)' }}>
                        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {bug.reproductionSteps && (
                            <div className="sm:col-span-2">
                              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ds-text-muted)' }}>Steps to Reproduce</p>
                              <pre className="text-sm whitespace-pre-wrap p-3 rounded-lg" style={{ backgroundColor: 'var(--ds-surface-raised)', color: 'var(--ds-text-secondary)', fontFamily: 'inherit' }}>{bug.reproductionSteps}</pre>
                            </div>
                          )}
                          {bug.expectedBehaviour && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--ds-text-muted)' }}>Expected</p>
                              <p className="text-sm" style={{ color: 'var(--ds-text-secondary)' }}>{bug.expectedBehaviour}</p>
                            </div>
                          )}
                          {bug.actualBehaviour && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--ds-text-muted)' }}>Actual</p>
                              <p className="text-sm" style={{ color: 'var(--ds-text-secondary)' }}>{bug.actualBehaviour}</p>
                            </div>
                          )}
                          {(bug.environment?.browser || bug.environment?.OS) && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--ds-text-muted)' }}>Environment</p>
                              <p className="text-sm" style={{ color: 'var(--ds-text-secondary)' }}>
                                {[bug.environment.browser, bug.environment.OS, bug.environment.device].filter(Boolean).join(' / ')}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Comments */}
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ds-text-muted)' }}>
                            Technical Discussion ({bug.comments?.length || 0})
                          </p>
                          <div className="flex flex-col gap-2 mb-3 max-h-36 overflow-y-auto">
                            {(bug.comments || []).map((c, i) => (
                              <div key={i} className="flex gap-2">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                                  style={{ background: 'linear-gradient(135deg, var(--ds-accent) 0%, var(--ds-accent-hover) 100%)' }}>
                                  {c.authorName?.[0] || 'U'}
                                </div>
                                <div className="flex-1">
                                  <span className="text-xs font-semibold" style={{ color: 'var(--ds-text-primary)' }}>{c.authorName} </span>
                                  <span className="text-[10px]" style={{ color: 'var(--ds-text-muted)' }}>{new Date(c.createdAt).toLocaleString()}</span>
                                  <p className="text-xs mt-0.5" style={{ color: 'var(--ds-text-secondary)' }}>{c.text}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              className="flex-1 px-3 py-2 text-sm rounded-lg border focus:outline-none"
                              style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                              placeholder="Add technical notes or comments…"
                              value={expandedId === bug._id ? commentText : ''}
                              onChange={e => setCommentText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment(bug._id)}
                            />
                            <Button variant="primary" size="sm" onClick={() => handleComment(bug._id)} isLoading={submitting}>Send</Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Done Bugs */}
          {doneBugs.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--ds-text-muted)' }}>
                Resolved / Closed ({doneBugs.length})
              </h2>
              <div className="flex flex-col gap-2">
                {doneBugs.map(bug => (
                  <Card key={bug._id}>
                    <div className="p-3 flex items-center gap-3">
                      <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                      <span className="text-xs font-mono font-bold" style={{ color: 'var(--ds-accent)' }}>{bug.bugNumber}</span>
                      <span className="text-sm flex-1 truncate" style={{ color: 'var(--ds-text-secondary)' }}>{bug.title}</span>
                      <Badge variant={STATUS_COLORS[bug.status] || 'gray'} size="sm">{bug.status}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
