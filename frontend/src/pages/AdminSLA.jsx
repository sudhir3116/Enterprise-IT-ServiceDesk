import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { Clock, Plus, Edit, Trash2, AlertCircle } from 'lucide-react'
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

export default function AdminSLA() {
  const { addToast } = useToast()
  const [slas, setSlas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [searchText, setSearchText] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ 
    name: '', description: '', responseTimeHours: 4, resolutionTimeHours: 24, businessHoursOnly: true, status: 'Active' 
  })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  async function loadData() {
    setLoading(true)
    try {
      const res = await api.get('/slas')
      setSlas(res.data)
    } catch (err) {
      setError('Failed to load SLA policies.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleOpenNew = () => {
    setEditingId(null)
    setForm({ name: '', description: '', responseTimeHours: 4, resolutionTimeHours: 24, businessHoursOnly: true, status: 'Active' })
    setShowForm(true)
  }

  const handleOpenEdit = (sla) => {
    setEditingId(sla._id)
    setForm({ 
      name: sla.name, 
      description: sla.description || '', 
      responseTimeHours: sla.responseTimeHours, 
      resolutionTimeHours: sla.resolutionTimeHours,
      businessHoursOnly: sla.businessHoursOnly,
      status: sla.status 
    })
    setShowForm(true)
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        await api.put(`/slas/${editingId}`, form)
        addToast('SLA Policy updated', 'success')
      } else {
        await api.post('/slas', form)
        addToast('SLA Policy created', 'success')
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
      await api.delete(`/slas/${deleteId}`)
      addToast('SLA Policy removed', 'success')
      setDeleteId(null)
      loadData()
    } catch (err) {
      addToast('Failed to delete SLA Policy', 'error')
    }
  }

  const filtered = slas.filter(s => 
    !searchText || s.name.toLowerCase().includes(searchText.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      
      <PageHeader 
        title="SLA Policies" 
        description="Configure service level agreements, response targets, and business hours."
        icon={Clock}
        breadcrumbs={[
          { name: 'Admin', path: '/admin/dashboard' },
          { name: 'SLA Policies' }
        ]}
        primaryAction={<Button variant="primary" onClick={handleOpenNew} icon={Plus}>Create SLA</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Policies" value={slas.length} icon={Clock} color="indigo" />
        <StatCard title="Active Policies" value={slas.filter(s => s.status === 'Active').length} icon={Clock} color="emerald" />
        <StatCard title="Biz Hours Enforced" value={slas.filter(s => s.businessHoursOnly).length} icon={Clock} color="blue" />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-md text-[13px] font-medium border border-red-200 dark:border-red-500/20 flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <Card noPadding className="flex flex-col overflow-hidden">
        <FilterBar 
          searchPlaceholder="Search policies..." 
          searchValue={searchText} 
          onSearchChange={setSearchText}
        />

        <Table 
          isLoading={loading}
          data={filtered}
          emptyMessage="No SLA policies found."
          columns={[
            {
              header: 'Policy Name',
              accessor: 'name',
              render: s => (
                <div>
                  <div className="font-bold text-[13px] text-primary flex items-center gap-2">
                    {s.name}
                    {s.businessHoursOnly && <span className="text-[10px] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold border border-indigo-200 dark:border-indigo-500/20">Biz Hours Only</span>}
                  </div>
                  <div className="text-[11px] text-tertiary line-clamp-1 max-w-xs">{s.description || 'No description'}</div>
                </div>
              )
            },
            {
              header: 'Response Target',
              accessor: 'responseTimeHours',
              render: s => <span className="text-[13px] font-medium text-secondary">{s.responseTimeHours} hrs</span>
            },
            {
              header: 'Resolution Target',
              accessor: 'resolutionTimeHours',
              render: s => <span className="text-[13px] font-medium text-secondary">{s.resolutionTimeHours} hrs</span>
            },
            {
              header: 'Status',
              accessor: 'status',
              render: s => <Badge color={s.status === 'Active' ? 'emerald' : 'gray'}>{s.status}</Badge>
            },
            {
              header: '',
              sortable: false,
              render: s => (
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(s)} title="Edit">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(s._id)} className="text-red-600 hover:text-red-700 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" title="Delete">
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
        title={editingId ? 'Edit SLA Policy' : 'New SLA Policy'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="slaForm" isLoading={saving}>Save</Button>
          </>
        }
      >
        <form id="slaForm" onSubmit={handleSave} className="space-y-4">
          <SectionHeader title="General Information" />
          <div>
            <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Policy Name</label>
            <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="ds-input" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="ds-textarea" />
          </div>
          
          <SectionHeader title="Targets & Rules" className="mt-6" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Resp. Time (hrs)</label>
              <input required type="number" min="0.5" step="0.5" value={form.responseTimeHours} onChange={e => setForm({...form, responseTimeHours: Number(e.target.value)})} className="ds-input" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Resol. Time (hrs)</label>
              <input required type="number" min="1" step="1" value={form.resolutionTimeHours} onChange={e => setForm({...form, resolutionTimeHours: Number(e.target.value)})} className="ds-input" />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 text-[13px] text-secondary cursor-pointer hover:text-primary transition-colors">
              <input type="checkbox" checked={form.businessHoursOnly} onChange={e => setForm({...form, businessHoursOnly: e.target.checked})} className="rounded border-strong bg-transparent text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
              Enforce during Business Hours only
            </label>
          </div>

          <div className="mt-4">
            <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Status</label>
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="ds-select">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </form>
      </Drawer>

      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete SLA Policy"
        danger
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-[13px] text-secondary">
          Are you sure you want to permanently delete this SLA Policy? This action cannot be undone.
        </p>
      </Modal>

    </div>
  )
}
