import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Search, Plus, Tag, ChevronRight, Pencil, Trash2, AlertCircle, X, Save } from 'lucide-react'
import { getArticles, createArticle, updateArticle, deleteArticle } from '../services/kbApi'
import { useAuth } from '../context/AuthContext'
import Skeleton from '../components/enterprise/SkeletonLoader'
import PageHeader from '../components/enterprise/PageHeader'
import Button from '../components/enterprise/Button'
import Badge from '../components/enterprise/Badge'
import Card from '../components/enterprise/Card'
import Modal from '../components/enterprise/Modal'
import { useToast } from '../hooks/useToast'

const CATEGORIES = ['General', 'Hardware', 'Software', 'Network', 'Security', 'Access', 'Other']

const CAT_COLORS = {
  General:  'gray',
  Hardware: 'blue',
  Software: 'purple',
  Network:  'indigo',
  Security: 'red',
  Access:   'amber',
  Other:    'gray',
}

// ── Article Form (create/edit) ─────────────────────────────────────────────
function ArticleForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(
    initial || { title: '', body: '', category: 'General', tags: '' }
  )
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      title:    form.title.trim(),
      body:     form.body.trim(),
      category: form.category,
      tags:     form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Article Title *</label>
        <input
          value={form.title}
          onChange={e => set('title', e.target.value)}
          required
          placeholder="e.g. How to connect to VPN"
          className="block w-full rounded-md border border-strong bg-surface px-3.5 py-2.5 text-[13px] text-primary placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Category *</label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            className="block w-full rounded-md border border-strong bg-surface px-3.5 py-2.5 text-[13px] text-primary outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Tags (comma-separated)</label>
          <input
            value={form.tags}
            onChange={e => set('tags', e.target.value)}
            placeholder="vpn, network, remote"
            className="block w-full rounded-md border border-strong bg-surface px-3.5 py-2.5 text-[13px] text-primary placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Content *</label>
        <textarea
          value={form.body}
          onChange={e => set('body', e.target.value)}
          required
          rows={12}
          placeholder="Write the article content here. Supports plain text or Markdown."
          className="block w-full rounded-md border border-strong bg-surface px-3.5 py-2.5 text-[13px] text-primary placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y font-mono"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" isLoading={saving} icon={Save}>
          Save Article
        </Button>
      </div>
    </form>
  )
}

// ── Article detail view ────────────────────────────────────────────────────
function ArticleView({ article, onClose, onEdit, onDeleteRequest, isAdmin }) {
  if (!article) return null
  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4 border-b border-default pb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge color={CAT_COLORS[article.category] || 'gray'}>
              {article.category}
            </Badge>
            {article.tags?.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-surface-hover text-secondary rounded border border-default">
                <Tag className="w-2.5 h-2.5" />{tag}
              </span>
            ))}
          </div>
          <h2 className="text-xl font-bold text-primary font-heading">{article.title}</h2>
          <p className="text-[12px] text-tertiary mt-1">
            Last updated: {new Date(article.updatedAt || article.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <>
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDeleteRequest} className="text-red-600 hover:text-red-700 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none text-secondary leading-relaxed whitespace-pre-wrap">
        {article.body}
      </div>
    </div>
  )
}

// ── Main KB Page ───────────────────────────────────────────────────────────
export default function KnowledgeBase() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const isAdmin   = user?.role === 'admin'
  const { addToast } = useToast()

  const [articles,  setArticles]  = useState([])
  const [total,     setTotal]     = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [search,    setSearch]    = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [page,      setPage]      = useState(1)

  const [selected,  setSelected]  = useState(null) // article in detail pane
  const [editing,   setEditing]   = useState(false) // edit form open
  const [creating,  setCreating]  = useState(false) // create form open
  const [saving,    setSaving]    = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)

  const LIMIT = 12

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getArticles({ search, category: catFilter, page, limit: LIMIT })
      const articleList = Array.isArray(data) ? data : (data?.data || data?.articles || [])
      setArticles(articleList)
      setTotal(data?.total ?? articleList.length)
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }, [search, catFilter, page])

  useEffect(() => { load() }, [load])

  // Debounce search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  async function handleCreate(data) {
    setSaving(true)
    try {
      await createArticle(data)
      addToast('Article created successfully', 'success')
      setCreating(false)
      load()
    } catch (err) {
      addToast(err.response?.data?.message || err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(data) {
    if (!selected) return
    setSaving(true)
    try {
      await updateArticle(selected._id, data)
      addToast('Article updated successfully', 'success')
      setEditing(false)
      setSelected(null)
      load()
    } catch (err) {
      addToast(err.response?.data?.message || err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!selected) return
    try {
      await deleteArticle(selected._id)
      addToast('Article deleted', 'success')
      setDeleteModal(false)
      setSelected(null)
      load()
    } catch (err) {
      addToast(err.response?.data?.message || err.message, 'error')
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">

      {/* Page Header */}
      <PageHeader 
        title="Knowledge Base"
        description="Self-service IT articles, guides, and troubleshooting references."
        icon={BookOpen}
        actions={isAdmin && (
          <Button variant="primary" icon={Plus} onClick={() => { setCreating(true); setSelected(null); setEditing(false) }}>
            New Article
          </Button>
        )}
      />

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-md text-[13px] font-medium border border-red-200 dark:border-red-500/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left panel: list + filters ─────────────────────────────────── */}
        <div className="lg:col-span-1 flex flex-col gap-4">

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search articles…"
              className="block w-full rounded-md border border-slate-200 dark:border-[#3F3F46] bg-surface pl-9 pr-4 py-2.5 text-[13px] text-primary placeholder:text-slate-400 dark:placeholder:text-[#646470] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Category filter */}
          <div>
            <p className="text-[11px] font-bold text-tertiary uppercase tracking-wider mb-2">Category</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setCatFilter(''); setPage(1) }}
                className={`px-3 py-1.5 rounded text-[11px] font-bold transition-colors border ${
                  !catFilter ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-surface border-default text-secondary hover:bg-surface-hover'
                }`}
              >
                All
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setCatFilter(cat); setPage(1) }}
                  className={`px-3 py-1.5 rounded text-[11px] font-bold transition-colors border ${
                    catFilter === cat ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-surface border-default text-secondary hover:bg-surface-hover'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Article list */}
          <div className="flex flex-col gap-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
            ) : articles.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-8 h-8 text-slate-300 dark:text-[#3F3F46] mx-auto mb-2" />
                <p className="text-[13px] text-tertiary">No articles found</p>
              </div>
            ) : (
              articles.map(article => (
                <button
                  key={article._id}
                  onClick={() => { setSelected(article); setEditing(false); setCreating(false) }}
                  className={`
                    w-full text-left p-3 rounded-md border transition-all
                    ${selected?._id === article._id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                      : 'border-default bg-surface hover:border-strong hover:bg-surface-hover'}
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-primary truncate">{article.title}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Badge color={CAT_COLORS[article.category] || 'gray'}>
                          {article.category}
                        </Badge>
                        <span className="text-[11px] text-tertiary">
                          {new Date(article.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 transition-transform ${selected?._id === article._id ? 'text-indigo-500 rotate-90' : 'text-slate-300 dark:text-[#646470]'}`} />
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-default">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider"
              >
                ← Prev
              </button>
              <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider">Page {page} of {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* ── Right panel: detail / form ──────────────────────────────────── */}
        <Card className="lg:col-span-2 min-h-[500px]">

          {/* Create form */}
          {creating && (
            <>
              <h2 className="text-[16px] font-bold text-primary mb-6 border-b border-default pb-4">New Article</h2>
              <ArticleForm onSave={handleCreate} onCancel={() => setCreating(false)} saving={saving} />
            </>
          )}

          {/* Edit form */}
          {editing && selected && (
            <>
              <h2 className="text-[16px] font-bold text-primary mb-6 border-b border-default pb-4">Edit Article</h2>
              <ArticleForm
                initial={{ ...selected, tags: (selected.tags || []).join(', ') }}
                onSave={handleUpdate}
                onCancel={() => setEditing(false)}
                saving={saving}
              />
            </>
          )}

          {/* Article view */}
          {!creating && !editing && selected && (
            <ArticleView
              article={selected}
              onClose={() => setSelected(null)}
              onEdit={() => setEditing(true)}
              onDeleteRequest={() => setDeleteModal(true)}
              isAdmin={isAdmin}
            />
          )}

          {/* Empty state */}
          {!creating && !editing && !selected && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center mb-4 border border-default">
                <BookOpen className="w-8 h-8 text-slate-300 dark:text-[#3F3F46]" />
              </div>
              <h3 className="text-[14px] font-bold text-primary">Select an article to read</h3>
              <p className="text-[13px] text-tertiary mt-1">Choose from the list on the left, or search for a topic</p>
              {!isAdmin && (
                <div className="mt-8 p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-md max-w-sm">
                  <p className="text-[12px] text-indigo-700 dark:text-indigo-400 font-bold mb-2">Can't find what you're looking for?</p>
                  <Link
                    to="/employee/self-service"
                  >
                    <Button variant="secondary" size="sm" className="w-full justify-center">
                      Try AI Self-Service
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Article"
        danger
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-[13px] text-secondary">
          Are you sure you want to permanently delete this article? This action cannot be undone.
        </p>
      </Modal>

    </div>
  )
}
