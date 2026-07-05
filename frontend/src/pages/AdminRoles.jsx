import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { Shield, Plus, Edit, Trash2, AlertCircle } from 'lucide-react'
import PageHeader from '../components/enterprise/PageHeader'
import FilterBar from '../components/enterprise/FilterBar'
import Table from '../components/enterprise/Table'
import Button from '../components/enterprise/Button'
import Card, { StatCard } from '../components/enterprise/Card'
import SectionHeader from '../components/enterprise/SectionHeader'
import Drawer from '../components/enterprise/Drawer'
import Modal from '../components/enterprise/Modal'
import { useToast } from '../hooks/useToast'

export default function AdminRoles() {
  const { addToast } = useToast()
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [searchText, setSearchText] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ 
    name: '', description: '', 
    permissions: { manageUsers: false, manageTickets: false, manageSettings: false, viewReports: false } 
  })
  const [saving, setSaving] = useState(false)

  const [deleteRole, setDeleteRole] = useState(null)

  async function loadRoles() {
    setLoading(true)
    try {
      const res = await api.get('/roles')
      setRoles(res.data)
    } catch (err) {
      setError('Failed to load roles.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRoles() }, [])

  const handleOpenNew = () => {
    setEditingId(null)
    setForm({ 
      name: '', description: '', 
      permissions: { manageUsers: false, manageTickets: false, manageSettings: false, viewReports: false } 
    })
    setShowForm(true)
  }

  const handleOpenEdit = (role) => {
    if (role.isSystem) {
      addToast('System roles cannot be edited', 'error')
      return
    }
    setEditingId(role._id)
    setForm({ 
      name: role.name, 
      description: role.description || '', 
      permissions: role.permissions || { manageUsers: false, manageTickets: false, manageSettings: false, viewReports: false } 
    })
    setShowForm(true)
  }

  const handleCheckboxChange = (perm) => {
    setForm({
      ...form,
      permissions: { ...form.permissions, [perm]: !form.permissions[perm] }
    })
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        await api.put(`/roles/${editingId}`, form)
        addToast('Role updated', 'success')
      } else {
        await api.post('/roles', form)
        addToast('Role created', 'success')
      }
      setShowForm(false)
      loadRoles()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRequest = (role) => {
    if (role.isSystem) {
      addToast('System roles cannot be deleted', 'error')
      return
    }
    setDeleteRole(role)
  }

  const confirmDelete = async () => {
    if (!deleteRole) return
    try {
      await api.delete(`/roles/${deleteRole._id}`)
      addToast('Role removed', 'success')
      setDeleteRole(null)
      loadRoles()
    } catch (err) {
      addToast('Failed to delete role', 'error')
    }
  }

  const filtered = roles.filter(r => 
    !searchText || r.name.toLowerCase().includes(searchText.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      
      <PageHeader 
        title="System Roles" 
        description="Configure RBAC policies and permission matrices."
        icon={Shield}
        breadcrumbs={[
          { name: 'Admin', path: '/admin/dashboard' },
          { name: 'Roles' }
        ]}
        primaryAction={<Button variant="primary" onClick={handleOpenNew} icon={Plus}>Create Role</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Roles" value={roles.length} icon={Shield} color="indigo" />
        <StatCard title="Custom Roles" value={roles.filter(r => !r.isSystem).length} icon={Shield} color="blue" />
        <StatCard title="System Roles" value={roles.filter(r => r.isSystem).length} icon={Shield} color="slate" />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-md text-[13px] font-medium border border-red-200 dark:border-red-500/20 flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <Card noPadding className="flex flex-col overflow-hidden">
        <FilterBar 
          searchPlaceholder="Search roles..." 
          searchValue={searchText} 
          onSearchChange={setSearchText}
        />
        <Table 
          isLoading={loading}
          data={filtered}
          emptyMessage="No roles found."
          columns={[
            {
              header: 'Role Name',
              accessor: 'name',
              render: r => (
                <div>
                  <div className="font-bold text-[13px] text-primary flex items-center gap-2">
                    {r.name}
                    {r.isSystem && <span className="text-[10px] bg-surface-hover text-slate-600 dark:text-[#E2E2E6] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-default">System</span>}
                  </div>
                  <div className="text-[11px] text-tertiary line-clamp-1 max-w-xs mt-0.5">{r.description || 'No description'}</div>
                </div>
              )
            },
            {
              header: 'Permissions',
              sortable: false,
              render: r => (
                <div className="flex flex-wrap gap-1.5">
                  {r.permissions?.manageUsers && <span className="text-[10px] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20 font-medium">Manage Users</span>}
                  {r.permissions?.manageTickets && <span className="text-[10px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20 font-medium">Manage Tickets</span>}
                  {r.permissions?.viewReports && <span className="text-[10px] bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-500/20 font-medium">View Reports</span>}
                  {r.permissions?.manageSettings && <span className="text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-500/20 font-medium">Manage Settings</span>}
                  {!r.permissions?.manageUsers && !r.permissions?.manageTickets && !r.permissions?.viewReports && !r.permissions?.manageSettings && (
                    <span className="text-[11px] text-tertiary italic">No admin rights</span>
                  )}
                </div>
              )
            },
            {
              header: '',
              sortable: false,
              render: r => (
                <div className="flex items-center justify-end gap-1">
                  {!r.isSystem && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(r)} title="Edit">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteRequest(r)} className="text-red-600 hover:text-red-700 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              )
            }
          ]}
        />
      </Card>

      <Drawer
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Edit Role' : 'New Role'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="roleForm" isLoading={saving}>Save</Button>
          </>
        }
      >
        <form id="roleForm" onSubmit={handleSave} className="space-y-4">
          <SectionHeader title="General Information" />
          <div>
            <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Name</label>
            <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="ds-input" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="ds-textarea" />
          </div>

          <SectionHeader title="Permissions Matrix" className="mt-6" />
          <div className="pt-2">
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 text-[13px] text-secondary cursor-pointer hover:text-primary transition-colors">
                <input type="checkbox" checked={form.permissions.manageUsers} onChange={() => handleCheckboxChange('manageUsers')} className="rounded border-strong bg-transparent text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                Manage Users & Provisioning
              </label>
              <label className="flex items-center gap-2.5 text-[13px] text-secondary cursor-pointer hover:text-primary transition-colors">
                <input type="checkbox" checked={form.permissions.manageTickets} onChange={() => handleCheckboxChange('manageTickets')} className="rounded border-strong bg-transparent text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                Manage All Tickets (Global)
              </label>
              <label className="flex items-center gap-2.5 text-[13px] text-secondary cursor-pointer hover:text-primary transition-colors">
                <input type="checkbox" checked={form.permissions.viewReports} onChange={() => handleCheckboxChange('viewReports')} className="rounded border-strong bg-transparent text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                View Reports & Analytics
              </label>
              <label className="flex items-center gap-2.5 text-[13px] text-secondary cursor-pointer hover:text-primary transition-colors">
                <input type="checkbox" checked={form.permissions.manageSettings} onChange={() => handleCheckboxChange('manageSettings')} className="rounded border-strong bg-transparent text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                Manage System Settings & SLAs
              </label>
            </div>
          </div>
        </form>
      </Drawer>

      <Modal
        isOpen={!!deleteRole}
        onClose={() => setDeleteRole(null)}
        title="Delete Role"
        danger
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteRole(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete Role</Button>
          </>
        }
      >
        <p className="text-[13px] text-secondary">
          Are you sure you want to permanently delete the <strong className="text-primary">{deleteRole?.name}</strong> role? This action cannot be undone.
        </p>
      </Modal>

    </div>
  )
}
