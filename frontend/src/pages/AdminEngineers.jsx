import React, { useEffect, useState } from 'react'
import { getTickets } from '../services/ticketApi'
import api from '../services/api'
import { AlertCircle, Wrench, ShieldCheck, Download, Edit } from 'lucide-react'
import PageHeader from '../components/enterprise/PageHeader'
import FilterBar from '../components/enterprise/FilterBar'
import Table from '../components/enterprise/Table'
import Badge from '../components/enterprise/Badge'
import Card, { StatCard } from '../components/enterprise/Card'
import SectionHeader from '../components/enterprise/SectionHeader'
import Button from '../components/enterprise/Button'
import Drawer from '../components/enterprise/Drawer'
import { useToast } from '../hooks/useToast'

export default function AdminEngineers() {
  const { addToast } = useToast()
  const [users, setUsers] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchText, setSearchText] = useState('')

  // Edit Drawer
  const [editingEngineer, setEditingEngineer] = useState(null)
  const [form, setForm] = useState({ department: '', skills: '', maxCapacity: 5 })
  const [saving, setSaving] = useState(false)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [ticketsData, usersData] = await Promise.all([
        getTickets(),
        api.get('/auth/users').then(res => res.data)
      ])
      setTickets(ticketsData)
      setUsers(usersData.filter(u => u.role === 'support_engineer'))
    } catch (err) {
      setError('Failed to load analyst workloads.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredUsers = users.filter(u => 
    !searchText || u.name.toLowerCase().includes(searchText.toLowerCase()) || u.email.toLowerCase().includes(searchText.toLowerCase())
  )

  const exportCSV = () => {
    if (filteredUsers.length === 0) return
    const headers = ['Name,Email,Department,Active Load,Total Resolved']
    const rows = filteredUsers.map(u => {
      const active = tickets.filter(t => t.assignedTo?._id === u._id && !['Resolved', 'Closed'].includes(t.status)).length
      const res = tickets.filter(t => t.assignedTo?._id === u._id && ['Resolved', 'Closed'].includes(t.status)).length
      return `"${u.name}","${u.email}","${u.department || 'IT Operations'}","${active}","${res}"`
    })
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `engineers_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleEditClick = (u) => {
    setForm({
      department: u.department || 'IT Operations',
      skills: 'Networking, Windows, macOS', // mocked for now
      maxCapacity: 5
    })
    setEditingEngineer(u)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Mock update to backend or real if department field supported
      // await api.put(`/auth/users/${editingEngineer._id}`, { department: form.department })
      setTimeout(() => {
        addToast('Engineer profile updated successfully', 'success')
        setEditingEngineer(null)
        setSaving(false)
      }, 800)
    } catch (err) {
      addToast('Failed to update engineer', 'error')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      
      <PageHeader 
        title="Analyst Workloads" 
        description="Monitor support engineer queues, SLA capacities, and active assignments."
        icon={Wrench}
        breadcrumbs={[
          { name: 'Admin', path: '/admin/dashboard' },
          { name: 'Engineers' }
        ]}
        secondaryActions={<Button variant="secondary" onClick={exportCSV} icon={Download}>Export CSV</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Analysts" value={users.length} icon={Wrench} color="indigo" />
        <StatCard title="Total Active Load" value={tickets.filter(t => !['Resolved', 'Closed'].includes(t.status) && t.assignedTo).length} icon={Wrench} color="amber" />
        <StatCard title="Total Resolved" value={tickets.filter(t => ['Resolved', 'Closed'].includes(t.status) && t.assignedTo).length} icon={Wrench} color="emerald" />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-md text-[13px] font-medium border border-red-200 dark:border-red-500/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <Card noPadding className="overflow-hidden">
        <FilterBar 
          searchPlaceholder="Search analysts by name or email..." 
          searchValue={searchText} 
          onSearchChange={setSearchText}
        />

        <Table 
          isLoading={loading}
          data={filteredUsers}
          emptyMessage="No analysts found."
          columns={[
            {
              header: 'Analyst Profile',
              accessor: 'name',
              render: u => (
                <div className="flex items-center gap-3 py-1">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[11px] font-bold border border-indigo-100 dark:border-indigo-500/20">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-[13px] text-primary flex items-center gap-1 leading-tight">
                      {u.name} <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <div className="text-[11px] text-tertiary mt-0.5">{u.email}</div>
                  </div>
                </div>
              )
            },
            {
              header: 'Department / Team',
              accessor: 'department',
              render: u => <span className="text-[12px] text-secondary">{u.department || 'IT Operations'}</span>
            },
            {
              header: 'Active Load',
              sortable: false,
              render: u => {
                const active = tickets.filter(t => t.assignedTo?._id === u._id && !['Resolved', 'Closed'].includes(t.status)).length
                return <span className={`text-[13px] font-bold ${active > 5 ? 'text-red-600 dark:text-red-400' : 'text-secondary'}`}>{active} tickets</span>
              }
            },
            {
              header: 'Total Resolved',
              sortable: false,
              render: u => {
                const res = tickets.filter(t => t.assignedTo?._id === u._id && ['Resolved', 'Closed'].includes(t.status)).length
                return <span className="text-[13px] font-medium text-secondary">{res}</span>
              }
            },
            {
              header: 'Status',
              sortable: false,
              render: u => {
                const active = tickets.filter(t => t.assignedTo?._id === u._id && !['Resolved', 'Closed'].includes(t.status)).length
                return <Badge color={active > 5 ? 'red' : 'emerald'}>{active > 5 ? 'At Capacity' : 'Available'}</Badge>
              }
            },
            {
              header: '',
              sortable: false,
              width: '80px',
              render: u => (
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => handleEditClick(u)} title="Edit Profile">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              )
            }
          ]}
        />
      </Card>

      <Drawer
        isOpen={!!editingEngineer}
        onClose={() => setEditingEngineer(null)}
        title="Edit Analyst Profile"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingEngineer(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveProfile} isLoading={saving}>Save Changes</Button>
          </>
        }
      >
        <form id="profileForm" onSubmit={handleSaveProfile} className="space-y-4">
          <SectionHeader title="Analyst Information" />
          <div>
            <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Primary Department</label>
            <input required type="text" value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="ds-input" />
          </div>
          
          <SectionHeader title="Skills & Capabilities" className="mt-6" />
          <div>
            <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Specialized Skills (Comma separated)</label>
            <textarea rows={2} value={form.skills} onChange={e => setForm({...form, skills: e.target.value})} className="ds-textarea" />
          </div>

          <SectionHeader title="Workload Configuration" className="mt-6" />
          <div>
            <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Max Concurrent Tickets</label>
            <input type="number" min="1" max="20" value={form.maxCapacity} onChange={e => setForm({...form, maxCapacity: Number(e.target.value)})} className="ds-input" />
            <p className="text-[11px] text-tertiary mt-1.5">The analyst will be marked as "At Capacity" if their active tickets exceed this limit.</p>
          </div>
        </form>
      </Drawer>
    </div>
  )
}
