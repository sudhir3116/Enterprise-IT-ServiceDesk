import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { FolderTree, Plus, Edit, Trash2, AlertCircle } from 'lucide-react'
import PageHeader from '../components/enterprise/PageHeader'
import FilterBar from '../components/enterprise/FilterBar'
import Table from '../components/enterprise/Table'
import Button from '../components/enterprise/Button'
import Badge from '../components/enterprise/Badge'
import Card, { StatCard } from '../components/enterprise/Card'
import SectionHeader from '../components/enterprise/SectionHeader'
import Drawer from '../components/enterprise/Drawer'
import Modal from '../components/enterprise/Modal'
import { useToast } from '../hooks/useToast'

export default function AdminCategories() {
  const { addToast } = useToast()
  const [categories, setCategories] = useState([])
  const [departments, setDepartments] = useState([])
  const [slas, setSlas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [searchText, setSearchText] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ 
    name: '', description: '', department: '', defaultPriority: 'Medium', sla: '', status: 'Active' 
  })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  async function loadData() {
    setLoading(true)
    try {
      const [catRes, deptRes, slaRes] = await Promise.all([
        api.get('/categories'),
        api.get('/departments'),
        api.get('/slas')
      ])
      setCategories(Array.isArray(catRes.data) ? catRes.data : (catRes.data?.data || catRes.data?.categories || []))
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : (deptRes.data?.data || deptRes.data?.departments || []))
      setSlas(Array.isArray(slaRes.data) ? slaRes.data : (slaRes.data?.data || slaRes.data?.slas || []))
    } catch (err) {
      setError('Failed to load category data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleOpenNew = () => {
    setEditingId(null)
    setForm({ name: '', description: '', department: '', defaultPriority: 'Medium', sla: '', status: 'Active' })
    setShowForm(true)
  }

  const handleOpenEdit = (cat) => {
    setEditingId(cat._id)
    setForm({ 
      name: cat.name, 
      description: cat.description || '', 
      department: cat.department?._id || '', 
      defaultPriority: cat.defaultPriority || 'Medium',
      sla: cat.sla?._id || '',
      status: cat.status 
    })
    setShowForm(true)
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.department) delete payload.department
      if (!payload.sla) delete payload.sla

      if (editingId) {
        await api.put(`/categories/${editingId}`, payload)
        addToast('Category updated', 'success')
      } else {
        await api.post('/categories', payload)
        addToast('Category created', 'success')
      }
      setShowForm(false)
      loadData()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/categories/${deleteId}`)
      addToast('Category removed', 'success')
      setDeleteId(null)
      loadData()
    } catch (err) {
      addToast('Failed to delete category', 'error')
    }
  }

  const filtered = categories.filter(c => 
    !searchText || c.name.toLowerCase().includes(searchText.toLowerCase())
  )

  const renderPriority = (priority) => {
    const map = {
      Critical: { color: 'red' },
      High:     { color: 'amber' },
      Medium:   { color: 'blue' },
      Low:      { color: 'gray' }
    }
    const color = map[priority]?.color || 'gray'
    return <Badge color={color}>{priority}</Badge>
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      
      <PageHeader 
        title="Categories" 
        description="Map issue types to departments and SLAs."
        icon={FolderTree}
        breadcrumbs={[
          { name: 'Admin', path: '/admin/dashboard' },
          { name: 'Categories' }
        ]}
        primaryAction={<Button variant="primary" onClick={handleOpenNew} icon={Plus}>Add Category</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Categories" value={categories.length} icon={FolderTree} color="indigo" />
        <StatCard title="Active Categories" value={categories.filter(c => c.status === 'Active').length} icon={FolderTree} color="emerald" />
        <StatCard title="Total Departments" value={departments.length} icon={FolderTree} color="blue" />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-md text-[13px] font-medium border border-red-200 dark:border-red-500/20 flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <Card noPadding className="flex flex-col overflow-hidden">
        <FilterBar 
          searchPlaceholder="Search categories..." 
          searchValue={searchText} 
          onSearchChange={setSearchText}
        />
        
        <Table 
          isLoading={loading}
          data={filtered}
          emptyMessage="No categories found."
          columns={[
            {
              header: 'Category Name',
              accessor: 'name',
              render: c => (
                <div>
                  <div className="font-bold text-[13px] text-primary">{c.name}</div>
                  <div className="text-[11px] text-tertiary line-clamp-1 max-w-xs">{c.description || 'No description'}</div>
                </div>
              )
            },
            {
              header: 'Department Routing',
              sortable: false,
              render: c => (
                <span className="text-[12px] font-medium text-secondary">
                  {c.department?.name || 'Unassigned'}
                </span>
              )
            },
            {
              header: 'Priority',
              accessor: 'defaultPriority',
              render: c => renderPriority(c.defaultPriority)
            },
            {
              header: 'SLA Policy',
              sortable: false,
              render: c => (
                <span className="text-[12px] text-secondary">
                  {c.sla ? `${c.sla.name} (${c.sla.resolutionTimeHours}h)` : 'Default SLA'}
                </span>
              )
            },
            {
              header: 'Status',
              accessor: 'status',
              render: c => <Badge color={c.status === 'Active' ? 'emerald' : 'gray'}>{c.status}</Badge>
            },
            {
              header: '',
              sortable: false,
              render: c => (
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(c)} title="Edit">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(c._id)} className="text-red-600 hover:text-red-700 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )
            }
          ]}
        />
      </Card>

      <Drawer
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Edit Category' : 'New Category'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="catForm" isLoading={saving}>Save</Button>
          </>
        }
      >
        <form id="catForm" onSubmit={handleSave} className="space-y-4">
          <SectionHeader title="General Information" />
          <div>
            <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Name</label>
            <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="ds-input" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="ds-textarea" />
          </div>
          
          <SectionHeader title="Routing & Assignment" className="mt-6" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Assign to Department</label>
              <select value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="ds-select">
                <option value="">-- No specific department --</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Default Priority</label>
              <select value={form.defaultPriority} onChange={e => setForm({...form, defaultPriority: e.target.value})} className="ds-select">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
          
          <SectionHeader title="Policy & Status" className="mt-6" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">SLA Policy</label>
              <select value={form.sla} onChange={e => setForm({...form, sla: e.target.value})} className="ds-select">
                <option value="">-- Default System SLA --</option>
                {slas.map(s => <option key={s._id} value={s._id}>{s.name} ({s.resolutionTimeHours}h)</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="ds-select">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </form>
      </Drawer>

      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Category"
        danger
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-[13px] text-secondary">
          Are you sure you want to permanently delete this category? This action cannot be undone.
        </p>
      </Modal>

    </div>
  )
}
