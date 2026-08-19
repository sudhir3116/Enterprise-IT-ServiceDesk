import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Users, UserPlus, Filter, Download, Trash2, Key, AlertCircle, Upload, Clock } from 'lucide-react'
import PageHeader from '../components/enterprise/PageHeader'
import FilterBar from '../components/enterprise/FilterBar'
import Table from '../components/enterprise/Table'
import Button from '../components/enterprise/Button'
import Card, { StatCard } from '../components/enterprise/Card'
import Modal from '../components/enterprise/Modal'
import SectionHeader from '../components/enterprise/SectionHeader'
import Drawer from '../components/enterprise/Drawer'
import { useToast } from '../hooks/useToast'

export default function AdminUserManagement() {
  const { addToast } = useToast()
  
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [searchText, setSearchText] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [selectedIds, setSelectedIds] = useState([])
  
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', mobileNumber: '', password: '', 
    role: 'employee', department: 'General', designation: 'Staff', employeeId: ''
  })
  const [saving, setSaving] = useState(false)

  // Dialog states
  const [deleteId, setDeleteId] = useState(null)
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [resetUser, setResetUser] = useState(null)
  const [showImport, setShowImport] = useState(false)

  async function loadUsers() {
    try {
      const res = await api.get('/auth/users')
      setUsers(res.data)
      setSelectedIds([])
    } catch (err) {
      setError('Failed to load user directory.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const handleCreate = async (e) => {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      await api.post('/auth/users', form)
      addToast('User provisioned successfully', 'success')
      setShowForm(false)
      setForm({ name: '', email: '', mobileNumber: '', password: '', role: 'employee', department: 'General', designation: 'Staff', employeeId: '' })
      loadUsers()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create user', 'error')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/auth/users/${deleteId}`)
      addToast('User removed', 'success')
      setDeleteId(null)
      loadUsers()
    } catch (err) {
      addToast('Failed to delete user', 'error')
    }
  }

  const confirmBulkDelete = async () => {
    try {
      // Simulate bulk delete by firing multiple requests (since no native bulk route)
      await Promise.all(selectedIds.map(id => api.delete(`/auth/users/${id}`)))
      addToast(`${selectedIds.length} users removed`, 'success')
      setShowBulkDelete(false)
      loadUsers()
    } catch (err) {
      addToast('Failed to delete some users', 'error')
      setShowBulkDelete(false)
      loadUsers()
    }
  }

  const confirmResetPassword = async () => {
    if (!resetUser) return
    try {
      await api.post('/auth/forgot-password', { email: resetUser.email })
      addToast('Password reset link sent', 'success')
      setResetUser(null)
    } catch (err) {
      addToast('Failed to send reset link', 'error')
    }
  }

  const handleRoleChange = async (id, newRole) => {
    try {
      await api.put(`/auth/users/${id}/role`, { role: newRole })
      addToast('User role updated', 'success')
      loadUsers()
    } catch (err) {
      addToast('Failed to update role', 'error')
    }
  }

  const exportCSV = () => {
    if (filteredUsers.length === 0) return
    const headers = ['Name,Email,Role,Department,Mobile']
    const rows = filteredUsers.map(u => `"${u.name}","${u.email}","${u.role}","${u.department || ''}","${u.mobileNumber}"`)
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const simulateImport = () => {
    addToast('Importing users... (Simulation)', 'success')
    setTimeout(() => {
      addToast('3 users imported successfully', 'success')
      setShowImport(false)
    }, 1500)
  }

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredUsers.map(u => u._id))
    } else {
      setSelectedIds([])
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const filteredUsers = users.filter(u => {
    const roleMatch = roleFilter === 'All' || u.role === roleFilter
    const txtMatch = !searchText || u.name.toLowerCase().includes(searchText.toLowerCase()) || u.email.toLowerCase().includes(searchText.toLowerCase())
    return roleMatch && txtMatch
  })

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <PageHeader 
        title="User Directory" 
        description="Manage system access, roles, and employee records."
        icon={Users}
        breadcrumbs={[
          { name: 'Admin', path: '/admin/dashboard' },
          { name: 'Users' }
        ]}
        primaryAction={<Button variant="primary" onClick={() => setShowForm(true)} icon={UserPlus}>Provision User</Button>}
        secondaryActions={
          <>
            <Link to="/admin/approvals">
              <Button variant="primary" style={{ backgroundColor: '#f59e0b' }} icon={Clock}>
                Pending Approvals
              </Button>
            </Link>
            <Button variant="secondary" onClick={() => setShowImport(true)} icon={Upload}>Import</Button>
            <Button variant="secondary" onClick={exportCSV} icon={Download}>Export</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Users" value={users.length} icon={Users} color="indigo" />
        <StatCard title="Active Employees" value={users.filter(u => u.role === 'employee').length} icon={Users} color="blue" />
        <StatCard title="System Admins" value={users.filter(u => u.role === 'admin').length} icon={Key} color="amber" />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-md text-[13px] font-medium border border-red-200 dark:border-red-500/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <Card noPadding className="overflow-hidden">
        <FilterBar 
          searchPlaceholder="Search by name or email..." 
          searchValue={searchText} 
          onSearchChange={setSearchText}
        >
          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-md border border-indigo-200 dark:border-indigo-500/20">
              <span className="text-[12px] font-bold text-indigo-700 dark:text-indigo-400">{selectedIds.length} selected</span>
              <div className="w-px h-3 bg-indigo-300 dark:bg-indigo-500/30"></div>
              <button onClick={() => setShowBulkDelete(true)} className="flex items-center gap-1 text-[12px] font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Bulk Delete
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-tertiary" />
              <select 
                value={roleFilter} 
                onChange={e => setRoleFilter(e.target.value)}
                className="ds-select"
              >
                <option>All</option>
                <option value="admin">Admin</option>
                <option value="support_engineer">Engineer</option>
                <option value="employee">Employee</option>
              </select>
            </div>
          )}
        </FilterBar>

        <Table 
          isLoading={loading}
          data={filteredUsers}
          emptyMessage="No users match your search criteria."
          columns={[
            {
              header: (
                <input 
                  type="checkbox" 
                  checked={selectedIds.length > 0 && selectedIds.length === filteredUsers.length}
                  onChange={toggleSelectAll}
                  className="rounded border-strong bg-transparent text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
              ),
              sortable: false,
              width: '40px',
              render: u => (
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(u._id)}
                  onChange={() => toggleSelect(u._id)}
                  className="rounded border-strong bg-transparent text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
              )
            },
            {
              header: 'Employee',
              accessor: 'name',
              render: u => (
                <div className="flex items-center gap-3 py-1">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[11px] font-bold border border-indigo-100 dark:border-indigo-500/20">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-[13px] text-primary leading-tight">{u.name}</div>
                    <div className="text-[11px] text-tertiary font-mono mt-0.5">{u.employeeId || 'ID Pending'}</div>
                  </div>
                </div>
              )
            },
            {
              header: 'Department',
              accessor: 'department',
              render: u => (
                <div>
                  <div className="text-[13px] text-secondary">{u.department || 'N/A'}</div>
                  <div className="text-[11px] text-tertiary">{u.designation || 'Staff'}</div>
                </div>
              )
            },
            {
              header: 'System Role',
              accessor: 'role',
              render: u => (
                <select 
                  value={u.role}
                  onChange={e => handleRoleChange(u._id, e.target.value)}
                  className="text-[11px] font-bold uppercase tracking-wider border border-default rounded bg-transparent text-slate-700 dark:text-[#A1A1AA] py-1 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="admin">Admin</option>
                  <option value="support_engineer">Engineer</option>
                  <option value="employee">Employee</option>
                </select>
              )
            },
            {
              header: 'Contact',
              accessor: 'email',
              render: u => (
                <div className="text-[12px] text-secondary">
                  <div className="truncate w-40" title={u.email}>{u.email}</div>
                  <div className="truncate w-40 mt-0.5">{u.mobileNumber}</div>
                </div>
              )
            },
            {
              header: '',
              sortable: false,
              render: u => (
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setResetUser(u)} title="Reset Password">
                    <Key className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(u._id)} className="text-red-600 hover:text-red-700 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )
            }
          ]}
        />
      </Card>
      
      {/* ── Drawers & Modals ──────────────────────────────────────────────────────── */}

      <Drawer
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Provision Access"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} isLoading={saving}>Create User</Button>
          </>
        }
      >
        <form id="createUserForm" onSubmit={handleCreate} className="space-y-4">
          <SectionHeader title="General Information" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Full Name</label>
              <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="ds-input" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Email</label>
              <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="ds-input" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Mobile</label>
              <input required type="text" value={form.mobileNumber} onChange={e => setForm({...form, mobileNumber: e.target.value})} className="ds-input" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Emp ID</label>
              <input type="text" value={form.employeeId} onChange={e => setForm({...form, employeeId: e.target.value})} className="ds-input" />
            </div>
          </div>

          <SectionHeader title="Security & Access" className="mt-6" />
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Initial Password</label>
              <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="ds-input" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">System Role</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="ds-select">
                <option value="employee">Employee</option>
                <option value="support_engineer">Engineer</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>
        </form>
      </Drawer>

      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete User"
        danger
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-[13px] text-secondary">
          Are you sure you want to permanently delete this user? This action cannot be undone.
        </p>
      </Modal>

      <Modal
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        title="Bulk Delete Users"
        danger
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowBulkDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={confirmBulkDelete}>Delete {selectedIds.length} Users</Button>
          </>
        }
      >
        <p className="text-[13px] text-secondary">
          Are you sure you want to permanently delete {selectedIds.length} users? This action cannot be undone.
        </p>
      </Modal>

      <Modal
        isOpen={!!resetUser}
        onClose={() => setResetUser(null)}
        title="Reset Password"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetUser(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmResetPassword}>Send Link</Button>
          </>
        }
      >
        <p className="text-[13px] text-secondary">
          Send a password reset link to <strong className="text-primary">{resetUser?.email}</strong>?
        </p>
      </Modal>

      <Modal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        title="Import Users via CSV"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button variant="primary" onClick={simulateImport}>Start Import</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[13px] text-secondary">
            Upload a CSV file containing user records. The file must include Name, Email, and Mobile columns.
          </p>
          <div className="border-2 border-dashed border-strong rounded-lg p-8 text-center flex flex-col items-center">
            <Upload className="w-8 h-8 text-tertiary mb-2" />
            <p className="text-[13px] font-bold text-secondary">Click to upload or drag and drop</p>
            <p className="text-[11px] text-tertiary mt-1">CSV (max. 5MB)</p>
          </div>
        </div>
      </Modal>

    </div>
  )
}
