import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { Building2, Plus, Edit, Trash2, AlertCircle } from 'lucide-react'
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

export default function AdminDepartments() {
  const { addToast } = useToast()
  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [searchText, setSearchText] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', head: '', status: 'Active' })
  const [saving, setSaving] = useState(false)

  const [deleteId, setDeleteId] = useState(null)

  async function loadData() {
    setLoading(true)
    try {
      const [deptRes, userRes] = await Promise.all([
        api.get('/departments'),
        api.get('/auth/users')
      ])
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : (deptRes.data?.data || deptRes.data?.departments || []))
      setUsers(Array.isArray(userRes.data) ? userRes.data : (userRes.data?.data || userRes.data?.users || []))
    } catch (err) {
      setError('Failed to load departments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleOpenNew = () => {
    setEditingId(null)
    setForm({ name: '', description: '', head: '', status: 'Active' })
    setShowForm(true)
  }

  const handleOpenEdit = (dept) => {
    setEditingId(dept._id)
    setForm({ 
      name: dept.name, 
      description: dept.description || '', 
      head: dept.head?._id || '', 
      status: dept.status 
    })
    setShowForm(true)
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.head) delete payload.head
      
      if (editingId) {
        await api.put(`/departments/${editingId}`, payload)
        addToast('Department updated', 'success')
      } else {
        await api.post('/departments', payload)
        addToast('Department created', 'success')
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
      await api.delete(`/departments/${deleteId}`)
      addToast('Department removed', 'success')
      setDeleteId(null)
      loadData()
    } catch (err) {
      addToast('Failed to delete department', 'error')
    }
  }

  const filtered = departments.filter(d => 
    !searchText || d.name.toLowerCase().includes(searchText.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <PageHeader 
        title="Departments" 
        description="Organize tickets and employees into logical groups."
        icon={Building2}
        breadcrumbs={[
          { name: 'Admin', path: '/admin/dashboard' },
          { name: 'Departments' }
        ]}
        primaryAction={<Button variant="primary" onClick={handleOpenNew} icon={Plus}>Add Department</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Departments" value={departments.length} icon={Building2} color="indigo" />
        <StatCard title="Active Departments" value={departments.filter(d => d.status === 'Active').length} icon={Building2} color="emerald" />
        <StatCard title="Unassigned Departments" value={departments.filter(d => !d.head).length} icon={Building2} color="amber" />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-md text-[13px] font-medium border border-red-200 dark:border-red-500/20 flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <Card noPadding className="flex flex-col overflow-hidden">
        <FilterBar 
          searchPlaceholder="Search departments..." 
          searchValue={searchText} 
          onSearchChange={setSearchText}
        />
        <Table 
          isLoading={loading}
          data={filtered}
          emptyMessage="No departments found."
          columns={[
            {
              header: 'Department Name',
              accessor: 'name',
              render: d => (
                <div>
                  <div className="font-bold text-[13px] text-primary">{d.name}</div>
                  <div className="text-[11px] text-tertiary line-clamp-1 max-w-xs">{d.description || 'No description'}</div>
                </div>
              )
            },
            {
              header: 'Head of Dept',
              sortable: false,
              render: d => (
                <span className="text-[12px] font-medium text-secondary">
                  {d.head?.name || 'Unassigned'}
                </span>
              )
            },
            {
              header: 'Volume',
              accessor: 'ticketCount',
              render: d => <span className="text-[12px] text-tertiary">{d.ticketCount || 0} Tickets</span>
            },
            {
              header: 'Status',
              accessor: 'status',
              render: d => <Badge color={d.status === 'Active' ? 'emerald' : 'gray'}>{d.status}</Badge>
            },
            {
              header: '',
              sortable: false,
              render: d => (
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(d)} title="Edit">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(d._id)} className="text-red-600 hover:text-red-700 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" title="Delete">
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
        title={editingId ? 'Edit Department' : 'New Department'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} isLoading={saving}>Save</Button>
          </>
        }
      >
        <form id="deptForm" onSubmit={handleSave} className="space-y-4">
          <SectionHeader title="General Information" />
          <div>
            <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Name</label>
            <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="ds-input" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="ds-textarea" />
          </div>
          
          <SectionHeader title="Leadership & Status" className="mt-6" />
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Department Head</label>
              <select value={form.head} onChange={e => setForm({...form, head: e.target.value})} className="ds-select">
                <option value="">-- Unassigned --</option>
                {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
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
        title="Delete Department"
        danger
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-[13px] text-secondary">
          Are you sure you want to permanently delete this department? This action cannot be undone.
        </p>
      </Modal>

    </div>
  )
}
