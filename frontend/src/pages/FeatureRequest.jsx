import React, { useEffect, useState, useCallback } from 'react'
import {
  Lightbulb, Search, ThumbsUp, Clock, ChevronRight, PlusCircle,
  CheckCircle2, XCircle, RefreshCw, MessageSquare, Send
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import { getFeedbackList, submitFeedback, voteFeedback } from '../services/feedbackApi'
import PageHeader from '../components/enterprise/PageHeader'
import Card from '../components/enterprise/Card'
import Badge from '../components/enterprise/Badge'
import Button from '../components/enterprise/Button'
import EmptyState from '../components/enterprise/EmptyState'
import Modal from '../components/enterprise/Modal'

const STATUS_COLORS = {
  'Submitted': 'gray',
  'Under Review': 'amber',
  'Planned': 'blue',
  'In Development': 'indigo',
  'Released': 'emerald',
  'Rejected': 'red',
}

const CATEGORY_ICONS = {
  'Feature Request': Lightbulb,
  'UI/UX': PlusCircle,
  'Performance': RefreshCw,
  'Integration': ChevronRight,
  'Documentation': MessageSquare,
  'Other': ChevronRight,
}

export default function FeatureRequest() {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  // Submit form state
  const [submitOpen, setSubmitOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'Feature Request' })
  const [submitting, setSubmitting] = useState(false)
  const [votingId, setVotingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus)   params.status   = filterStatus
      if (filterCategory) params.category = filterCategory
      const data = await getFeedbackList(params)
      const itemList = Array.isArray(data) ? data : (data?.data || data?.feedback || [])
      setItems(itemList)
    } catch (err) {
      addToast('Failed to load feature requests', 'error')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterCategory])

  useEffect(() => { load() }, [load])

  const handleSubmit = async () => {
    if (!form.title.trim()) return addToast('Title is required', 'error')
    setSubmitting(true)
    try {
      await submitFeedback(form)
      addToast('Your feature request has been submitted!', 'success')
      setForm({ title: '', description: '', category: 'Feature Request' })
      setSubmitOpen(false)
      await load()
    } catch (err) {
      addToast(err.response?.data?.message || 'Submission failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVote = async (id) => {
    setVotingId(id)
    try {
      const result = await voteFeedback(id)
      addToast(result.hasVoted ? 'Vote added!' : 'Vote removed', 'success')
      await load()
    } catch (err) {
      addToast('Failed to vote', 'error')
    } finally {
      setVotingId(null)
    }
  }

  const userId = user?._id || user?.id
  const filtered = items.filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      <PageHeader
        title="Feature Requests"
        description="Submit ideas, vote for features, and track the progress of product improvements."
        icon={Lightbulb}
        breadcrumbs={[{ name: 'Self Service' }, { name: 'Feature Requests' }]}
        primaryAction={
          <Button variant="primary" icon={PlusCircle} onClick={() => setSubmitOpen(true)}>
            Submit Request
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: items.length, color: 'var(--ds-text-muted)' },
          { label: 'Planned', value: items.filter(i => i.status === 'Planned').length, color: '#3b82f6' },
          { label: 'In Development', value: items.filter(i => i.status === 'In Development').length, color: '#6366f1' },
          { label: 'Released', value: items.filter(i => i.status === 'Released').length, color: '#10b981' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--ds-text-primary)' }}>{value}</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--ds-text-muted)' }}>{label}</p>
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
              placeholder="Search feature requests…"
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
            {['Submitted','Under Review','Planned','In Development','Released','Rejected'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 text-sm rounded-lg border focus:outline-none"
            style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {['Feature Request','UI/UX','Performance','Integration','Documentation','Other'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Feature Request List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--ds-accent)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No Feature Requests Yet"
          description="Be the first to submit a product improvement idea!"
          action={<Button variant="primary" icon={PlusCircle} onClick={() => setSubmitOpen(true)}>Submit Request</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(item => {
            const hasVoted = item.votes?.some(v => (v._id || v) === userId)
            const CatIcon = CATEGORY_ICONS[item.category] || Lightbulb
            return (
              <Card key={item._id} className="hover:shadow-md transition-shadow">
                <div className="p-4 flex items-start gap-4">
                  {/* Vote Button */}
                  <button
                    onClick={() => handleVote(item._id)}
                    disabled={votingId === item._id}
                    className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg border transition-all shrink-0"
                    style={{
                      borderColor: hasVoted ? 'var(--ds-accent)' : 'var(--ds-border)',
                      backgroundColor: hasVoted ? 'var(--ds-accent)15' : 'transparent',
                      color: hasVoted ? 'var(--ds-accent)' : 'var(--ds-text-muted)',
                      minWidth: '52px'
                    }}
                  >
                    <ThumbsUp size={16} />
                    <span className="text-xs font-bold">{item.voteCount || item.votes?.length || 0}</span>
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant={STATUS_COLORS[item.status] || 'gray'} size="sm">{item.status}</Badge>
                      <span className="text-xs flex items-center gap-1" style={{ color: 'var(--ds-text-muted)' }}>
                        <CatIcon size={12} />{item.category}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--ds-text-primary)' }}>{item.title}</h3>
                    {item.description && (
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--ds-text-muted)' }}>{item.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="text-xs flex items-center gap-1" style={{ color: 'var(--ds-text-muted)' }}>
                        <Clock size={11} />{new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      {item.createdBy && (
                        <span className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>by {item.createdBy.name}</span>
                      )}
                    </div>
                    {/* Admin Response */}
                    {item.adminResponse && (
                      <div className="mt-3 p-3 rounded-lg border-l-4" style={{ borderColor: 'var(--ds-accent)', backgroundColor: 'var(--ds-accent)08' }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--ds-accent)' }}>
                          Admin Response {item.respondedBy ? `· ${item.respondedBy.name}` : ''}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--ds-text-secondary)' }}>{item.adminResponse}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Submit Modal */}
      <Modal
        isOpen={submitOpen}
        onClose={() => { setSubmitOpen(false); setForm({ title: '', description: '', category: 'Feature Request' }) }}
        title={
          <div className="flex items-center gap-2">
            <Lightbulb size={18} style={{ color: 'var(--ds-accent)' }} />
            Submit Feature Request
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>Title <span className="text-red-500">*</span></label>
            <input
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2"
              style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
              placeholder="Short, descriptive title for your request"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>Category</label>
            <select
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none"
              style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            >
              {['Feature Request','UI/UX','Performance','Integration','Documentation','Other'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-muted)' }}>Description</label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none resize-none"
              style={{ backgroundColor: 'var(--ds-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
              placeholder="Describe the problem this would solve or the improvement you'd like to see…"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setSubmitOpen(false)}>Cancel</Button>
            <Button variant="primary" icon={Send} isLoading={submitting} onClick={handleSubmit}>Submit Request</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
