import React, { useEffect, useState, useCallback } from 'react'
import {
  Lightbulb, Search, ThumbsUp, Clock, CheckCircle2, XCircle,
  MessageSquare, RefreshCw, Filter, ChevronDown
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import { getFeedbackList, updateFeedback, deleteFeedback } from '../services/feedbackApi'
import PageHeader from '../components/enterprise/PageHeader'
import Card from '../components/enterprise/Card'
import Badge from '../components/enterprise/Badge'
import Button from '../components/enterprise/Button'
import EmptyState from '../components/enterprise/EmptyState'
import Modal from '../components/enterprise/Modal'
import Table from '../components/enterprise/Table'

const STATUS_COLORS = {
  'Submitted': 'gray', 'Under Review': 'amber', 'Planned': 'blue',
  'In Development': 'indigo', 'Released': 'emerald', 'Rejected': 'red',
}

const ALL_STATUSES = ['Submitted', 'Under Review', 'Planned', 'In Development', 'Released', 'Rejected']

export default function ProductFeedbackManagement() {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Response modal
  const [responseOpen, setResponseOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [responseForm, setResponseForm] = useState({ status: '', adminResponse: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus) params.status = filterStatus
      const data = await getFeedbackList(params)
      const itemList = Array.isArray(data) ? data : (data?.data || data?.feedback || [])
      setItems(itemList)
    } catch (err) {
      addToast('Failed to load feedback', 'error')
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => { load() }, [load])

  const openResponse = (item) => {
    setSelected(item)
    setResponseForm({ status: item.status, adminResponse: item.adminResponse || '' })
    setResponseOpen(true)
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await updateFeedback(selected._id, responseForm)
      addToast('Feedback updated successfully', 'success')
      setResponseOpen(false)
      setSelected(null)
      await load()
    } catch (err) {
      addToast(err.response?.data?.message || 'Update failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this feedback permanently?')) return
    try {
      await deleteFeedback(id)
      addToast('Feedback deleted', 'success')
      await load()
    } catch (err) {
      addToast('Delete failed', 'error')
    }
  }

  const filtered = items.filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.createdBy?.name.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total:         items.length,
    submitted:     items.filter(i => i.status === 'Submitted').length,
    planned:       items.filter(i => ['Planned', 'In Development'].includes(i.status)).length,
    totalVotes:    items.reduce((sum, i) => sum + (i.voteCount || i.votes?.length || 0), 0),
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      <PageHeader
        title="Product Feedback Management"
        description="Review customer feature requests, update statuses, and provide official responses."
        icon={Lightbulb}
        breadcrumbs={[{ name: 'Admin' }, { name: 'Product Feedback' }]}
        primaryAction={
          <Button variant="secondary" icon={RefreshCw} size="sm" onClick={load}>Refresh</Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Feedback', value: stats.total, color: 'var(--ds-text-muted)', icon: Lightbulb },
          { label: 'Awaiting Review', value: stats.submitted, color: '#f59e0b', icon: Clock },
          { label: 'Planned / In Dev', value: stats.planned, color: '#6366f1', icon: CheckCircle2 },
          { label: 'Total Votes', value: stats.totalVotes, color: '#10b981', icon: ThumbsUp },
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
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none"
              style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
              placeholder="Search by title or submitter…"
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
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--ds-accent)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Lightbulb} title="No Feedback Found" description="No customer feedback matching your filters." />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(item => (
            <Card key={item._id} className="hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant={STATUS_COLORS[item.status] || 'gray'} size="sm">{item.status}</Badge>
                      <span className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>{item.category}</span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--ds-text-muted)' }}>
                        <ThumbsUp size={11} /> {item.voteCount || item.votes?.length || 0} votes
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--ds-text-primary)' }}>{item.title}</h3>
                    {item.description && (
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--ds-text-muted)' }}>{item.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: 'var(--ds-text-muted)' }}>
                      <span>by {item.createdBy?.name || 'Unknown'}</span>
                      <span>·</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      {item.adminResponse && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-500 font-medium flex items-center gap-1">
                            <CheckCircle2 size={11} />Responded
                          </span>
                        </>
                      )}
                    </div>
                    {item.adminResponse && (
                      <div className="mt-2 p-2.5 rounded-lg border-l-4" style={{ borderColor: 'var(--ds-accent)', backgroundColor: 'var(--ds-accent)08' }}>
                        <p className="text-xs" style={{ color: 'var(--ds-text-secondary)' }}>{item.adminResponse}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button variant="primary" size="sm" onClick={() => openResponse(item)}>
                      Respond
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item._id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Response Modal */}
      <Modal
        isOpen={responseOpen}
        onClose={() => { setResponseOpen(false); setSelected(null) }}
        title={
          <div className="flex items-center gap-2">
            <MessageSquare size={18} style={{ color: 'var(--ds-accent)' }} />
            Respond to Feedback
          </div>
        }
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--ds-surface-raised)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ds-text-primary)' }}>{selected.title}</p>
              <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>{selected.description}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>Update Status</label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none"
                style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                value={responseForm.status}
                onChange={e => setResponseForm(p => ({ ...p, status: e.target.value }))}
              >
                {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>Admin Response (visible to customer)</label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none resize-none"
                style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                placeholder="Provide an official response or roadmap update…"
                value={responseForm.adminResponse}
                onChange={e => setResponseForm(p => ({ ...p, adminResponse: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="secondary" onClick={() => setResponseOpen(false)}>Cancel</Button>
              <Button variant="primary" isLoading={saving} onClick={handleSave}>Save Response</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
