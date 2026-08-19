import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { Clock, Plus, Edit, Trash2, AlertCircle, ShieldAlert, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react'
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
  const [priorityFilter, setPriorityFilter] = useState('All')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ 
    name: '', priority: 'Critical', firstResponseTime: 15, resolutionTime: 120, businessHours: true, isActive: true 
  })
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [seeding, setSeeding] = useState(false)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/slas')
      setSlas(res.data)
    } catch (err) {
      console.error('Failed to load SLA policies:', err)
      setError('Failed to load SLA policies from backend.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleOpenNew = () => {
    setEditingId(null)
    setForm({ name: '', priority: 'Critical', firstResponseTime: 15, resolutionTime: 120, businessHours: true, isActive: true })
    setShowForm(true)
  }

  const handleOpenEdit = (sla) => {
    setEditingId(sla._id)
    setForm({ 
      name: sla.name, 
      priority: sla.priority || 'Critical',
      firstResponseTime: sla.firstResponseTime || 15, 
      resolutionTime: sla.resolutionTime || 120,
      businessHours: !!sla.businessHours,
      isActive: sla.isActive !== undefined ? sla.isActive : true
    })
    setShowForm(true)
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        await api.put(`/slas/${editingId}`, form)
        addToast('SLA Policy updated successfully', 'success')
      } else {
        await api.post('/slas', form)
        addToast('SLA Policy created successfully', 'success')
      }
      setShowForm(false)
      loadData()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save SLA policy', 'error')
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

  const handleSeedDefaults = async () => {
    setSeeding(true)
    try {
      await api.post('/slas/seed-defaults')
      addToast('Default Enterprise SLA policies provisioned!', 'success')
      loadData()
    } catch (err) {
      addToast('Failed to seed default SLA policies', 'error')
    } finally {
      setSeeding(false)
    }
  }

  const filtered = slas.filter(s => {
    const priorityMatch = priorityFilter === 'All' || s.priority === priorityFilter
    const textMatch = !searchText || s.name.toLowerCase().includes(searchText.toLowerCase())
    return priorityMatch && textMatch
  })

  const formatMins = (mins) => {
    if (!mins) return 'N/A'
    if (mins < 60) return `${mins} mins`
    const hrs = Math.round((mins / 60) * 10) / 10
    return `${hrs} hrs (${mins}m)`
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      
      <PageHeader 
        title="SLA Policies" 
        description="Configure service level agreement response targets, resolution deadlines, and business hours rules."
        icon={Clock}
        breadcrumbs={[
          { name: 'Admin', path: '/admin/dashboard' },
          { name: 'SLA Policies' }
        ]}
        primaryAction={<Button variant="primary" onClick={handleOpenNew} icon={Plus}>Create SLA Policy</Button>}
        secondaryActions={
          <Button variant="secondary" onClick={handleSeedDefaults} isLoading={seeding} icon={Sparkles}>
            Seed Default Rules
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total SLA Policies" value={slas.length} icon={Clock} color="indigo" />
        <StatCard title="Active Policies" value={slas.filter(s => s.isActive !== false).length} icon={CheckCircle2} color="emerald" />
        <StatCard title="Business Hours Enforced" value={slas.filter(s => s.businessHours).length} icon={Clock} color="blue" />
        <StatCard title="24/7 Continuous Rules" value={slas.filter(s => !s.businessHours).length} icon={ShieldAlert} color="amber" />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-md text-[13px] font-medium border border-red-200 dark:border-red-500/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <Card noPadding className="flex flex-col overflow-hidden">
        <FilterBar 
          searchPlaceholder="Search SLA policies by name..." 
          searchValue={searchText} 
          onSearchChange={setSearchText}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-tertiary font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="ds-select text-xs py-1"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </FilterBar>

        <Table 
          isLoading={loading}
          data={filtered}
          emptyMessage="No SLA policies found. Click 'Seed Default Rules' or 'Create SLA Policy' to get started."
          columns={[
            {
              header: 'Policy Name',
              accessor: 'name',
              render: s => (
                <div>
                  <div className="font-bold text-[13px] text-primary flex items-center gap-2">
                    {s.name}
                    {s.businessHours ? (
                      <span className="text-[10px] bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold border border-blue-200 dark:border-blue-500/20">
                        Business Hours
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold border border-emerald-200 dark:border-emerald-500/20">
                        24/7 Coverage
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-tertiary mt-0.5 font-mono">
                    {s.organizationId?.name || 'Default Enterprise Plan'}
                  </div>
                </div>
              )
            },
            {
              header: 'Priority',
              accessor: 'priority',
              render: s => {
                const colors = { Critical: 'red', High: 'amber', Medium: 'blue', Low: 'gray' }
                return <Badge color={colors[s.priority] || 'gray'}>{s.priority}</Badge>
              }
            },
            {
              header: 'First Response Target',
              accessor: 'firstResponseTime',
              render: s => <span className="text-[13px] font-semibold text-secondary">{formatMins(s.firstResponseTime)}</span>
            },
            {
              header: 'Resolution Target',
              accessor: 'resolutionTime',
              render: s => <span className="text-[13px] font-semibold text-secondary">{formatMins(s.resolutionTime)}</span>
            },
            {
              header: 'Status',
              accessor: 'isActive',
              render: s => <Badge color={s.isActive !== false ? 'emerald' : 'gray'}>{s.isActive !== false ? 'Active' : 'Disabled'}</Badge>
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
            <Button variant="primary" type="submit" form="slaForm" isLoading={saving}>Save SLA Policy</Button>
          </>
        }
      >
        <form id="slaForm" onSubmit={handleSave} className="space-y-4">
          <SectionHeader title="General Policy Details" />
          <div>
            <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Policy Name</label>
            <input required type="text" placeholder="e.g. Critical Response SLA" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="ds-input" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Ticket Priority Level</label>
            <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="ds-select">
              <option value="Critical">Critical (P1)</option>
              <option value="High">High (P2)</option>
              <option value="Medium">Medium (P3)</option>
              <option value="Low">Low (P4)</option>
            </select>
          </div>
          
          <SectionHeader title="SLA Targets (Minutes)" className="mt-6" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">First Response (mins)</label>
              <input required type="number" min="1" step="1" value={form.firstResponseTime} onChange={e => setForm({...form, firstResponseTime: Number(e.target.value)})} className="ds-input" />
              <p className="text-[10px] text-tertiary mt-1">15 mins = 15, 1 hr = 60</p>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Resolution (mins)</label>
              <input required type="number" min="1" step="1" value={form.resolutionTime} onChange={e => setForm({...form, resolutionTime: Number(e.target.value)})} className="ds-input" />
              <p className="text-[10px] text-tertiary mt-1">2 hrs = 120, 24 hrs = 1440</p>
            </div>
          </div>

          <SectionHeader title="Schedule & Governance" className="mt-6" />
          <div className="pt-1">
            <label className="flex items-center gap-2.5 text-[13px] text-secondary cursor-pointer hover:text-primary transition-colors">
              <input type="checkbox" checked={form.businessHours} onChange={e => setForm({...form, businessHours: e.target.checked})} className="rounded border-strong bg-transparent text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
              Evaluate SLA target only during Business Hours (Mon-Fri 9am-5pm)
            </label>
          </div>

          <div className="mt-4">
            <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Policy Status</label>
            <select value={form.isActive} onChange={e => setForm({...form, isActive: e.target.value === 'true'})} className="ds-select">
              <option value="true">Active</option>
              <option value="false">Disabled / Inactive</option>
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
            <Button variant="danger" onClick={confirmDelete}>Delete Policy</Button>
          </>
        }
      >
        <p className="text-[13px] text-secondary">
          Are you sure you want to permanently delete this SLA Policy? Active tickets relying on this rule will revert to default organization SLA commitments.
        </p>
      </Modal>

    </div>
  )
}
