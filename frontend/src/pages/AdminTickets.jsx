import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTickets, deleteTicket } from '../services/ticketApi'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Filter, AlertCircle, Ticket, Trash2 } from 'lucide-react'
import PageHeader from '../components/enterprise/PageHeader'
import FilterBar from '../components/enterprise/FilterBar'
import Table from '../components/enterprise/Table'
import Badge from '../components/enterprise/Badge'
import Card, { StatCard } from '../components/enterprise/Card'
import Button from '../components/enterprise/Button'
import Modal from '../components/enterprise/Modal'
import { useToast } from '../hooks/useToast'

export default function AdminTickets({ isEngineerOnly = false }) {
  const { addToast } = useToast()
  const [tickets, setTickets] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user: currentUser } = useAuth()
  const role = currentUser?.role === 'admin' ? 'admin' : 'support_engineer'

  const [deleteId, setDeleteId] = useState(null)
  
  // Bulk action states
  const [selectedIds, setSelectedIds] = useState([])
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [showBulkAssign, setShowBulkAssign] = useState(false)
  const [bulkAssignee, setBulkAssignee] = useState('')

  // Filters
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [priorityFilter, setPriorityFilter] = useState('All Priority')

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [ticketsRes, usersRes] = await Promise.all([
        getTickets(),
        role === 'admin' ? api.get('/auth/users').then(res => res.data) : Promise.resolve([])
      ])
      const ticketsList = Array.isArray(ticketsRes) ? ticketsRes : (ticketsRes?.data || ticketsRes?.tickets || [])
      const usersList = Array.isArray(usersRes) ? usersRes : (usersRes?.data || usersRes?.users || [])
      setTickets(ticketsList)
      if (role === 'admin') setUsers(usersList)
      setSelectedIds([])
    } catch (err) {
      setError('Failed to fetch tickets.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [role])

  async function handleAssignTicket(ticketId, assigneeId) {
    try {
      await api.put(`/tickets/${ticketId}`, { assignedTo: assigneeId })
      addToast('Assignee updated', 'success')
      loadData()
    } catch (err) {
      addToast(err.response?.data?.message || err.message, 'error')
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    try {
      await deleteTicket(deleteId)
      addToast('Ticket deleted', 'success')
      setDeleteId(null)
      loadData()
    } catch (err) {
      addToast('Failed to delete', 'error')
    }
  }

  async function confirmBulkDelete() {
    try {
      await Promise.all(selectedIds.map(id => deleteTicket(id)))
      addToast(`${selectedIds.length} tickets deleted`, 'success')
      setShowBulkDelete(false)
      loadData()
    } catch (err) {
      addToast('Failed to delete some tickets', 'error')
      setShowBulkDelete(false)
      loadData()
    }
  }

  async function confirmBulkAssign() {
    if (!bulkAssignee) return
    try {
      await Promise.all(selectedIds.map(id => api.put(`/tickets/${id}`, { assignedTo: bulkAssignee })))
      addToast(`${selectedIds.length} tickets assigned`, 'success')
      setShowBulkAssign(false)
      setBulkAssignee('')
      loadData()
    } catch (err) {
      addToast('Failed to assign some tickets', 'error')
      setShowBulkAssign(false)
      loadData()
    }
  }

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

  const getSLA = (t) => {
    if (['Resolved', 'Closed'].includes(t.status)) return { text: 'Met', color: 'emerald' }
    let target = t.dueDate ? new Date(t.dueDate) : null
    if (!target) {
      const hrs = t.priority === 'Critical' ? 4 : t.priority === 'High' ? 24 : t.priority === 'Medium' ? 72 : 120
      target = new Date(new Date(t.createdAt).getTime() + (hrs * 60 * 60 * 1000))
    }
    const diff = target - new Date()
    if (diff < 0) return { text: 'Breached', color: 'red' }
    const hrs = Math.floor(diff / (1000 * 60 * 60))
    if (hrs < 24) return { text: `${hrs}h left`, color: 'amber' }
    return { text: `${Math.floor(hrs/24)}d left`, color: 'blue' }
  }

  const getStatusColor = (s) => {
    switch (s) {
      case 'Open': return 'gray'
      case 'Assigned': return 'blue'
      case 'In Progress': return 'indigo'
      case 'Pending': return 'amber'
      case 'Resolved': return 'emerald'
      case 'Closed': return 'slate'
      default: return 'gray'
    }
  }

  // Filter Logic
  let displayTickets = tickets;
  
  if (isEngineerOnly) {
    displayTickets = displayTickets.filter(t => t.assignedTo?._id === currentUser?.id);
  }

  const filteredTickets = displayTickets.filter(t => {
    const sMatch = statusFilter === 'All Status' || t.status === statusFilter
    const pMatch = priorityFilter === 'All Priority' || t.priority === priorityFilter
    const txtMatch = !searchText || t.title.toLowerCase().includes(searchText.toLowerCase()) || t.ticketNumber?.toLowerCase().includes(searchText.toLowerCase())
    return sMatch && pMatch && txtMatch
  })

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredTickets.map(t => t._id))
    } else {
      setSelectedIds([])
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <PageHeader 
        title={isEngineerOnly ? 'Assigned Queue' : 'Service Requests'} 
        description={isEngineerOnly ? 'Manage and resolve your assigned support tickets.' : 'Global view of all service desk tickets.'}
        icon={Ticket}
        breadcrumbs={[
          { name: isEngineerOnly ? 'Engineer' : 'Admin', path: isEngineerOnly ? '/engineer/dashboard' : '/admin/dashboard' },
          { name: 'Tickets' }
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Tickets" value={displayTickets.length} icon={Ticket} color="slate" />
        <StatCard title="Open" value={displayTickets.filter(t => t.status === 'Open').length} icon={Ticket} color="blue" />
        <StatCard title="In Progress" value={displayTickets.filter(t => t.status === 'In Progress').length} icon={Ticket} color="indigo" />
        <StatCard title="Critical" value={displayTickets.filter(t => t.priority === 'Critical' && !['Resolved','Closed'].includes(t.status)).length} icon={AlertCircle} color="red" />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-md text-[13px] font-medium border border-red-200 dark:border-red-500/20 flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <Card noPadding className="flex flex-col overflow-hidden">
        <FilterBar 
          searchPlaceholder="Search tickets by subject or ID..." 
          searchValue={searchText} 
          onSearchChange={setSearchText}
        >
          {selectedIds.length > 0 && role === 'admin' ? (
            <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-md border border-indigo-200 dark:border-indigo-500/20">
              <span className="text-[12px] font-bold text-indigo-700 dark:text-indigo-400">{selectedIds.length} selected</span>
              <div className="w-px h-3 bg-indigo-300 dark:bg-indigo-500/30"></div>
              <button onClick={() => setShowBulkAssign(true)} className="flex items-center gap-1 text-[12px] font-bold text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors">
                Assign
              </button>
              <div className="w-px h-3 bg-indigo-300 dark:bg-indigo-500/30"></div>
              <button onClick={() => setShowBulkDelete(true)} className="flex items-center gap-1 text-[12px] font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-tertiary" />
                <select 
                  value={statusFilter} 
                  onChange={e => setStatusFilter(e.target.value)}
                  className="ds-select"
                >
                  <option>All Status</option>
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                  <option>Closed</option>
                </select>
              </div>
              <select 
                value={priorityFilter} 
                onChange={e => setPriorityFilter(e.target.value)}
                className="ds-select"
              >
                <option>All Priority</option>
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          )}
        </FilterBar>

        <Table 
          isLoading={loading}
          data={filteredTickets}
          emptyMessage="No tickets match your filters."
          columns={role === 'admin' ? [
            {
              header: (
                <input 
                  type="checkbox" 
                  checked={selectedIds.length > 0 && selectedIds.length === filteredTickets.length}
                  onChange={toggleSelectAll}
                  className="rounded border-strong bg-transparent text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
              ),
              sortable: false,
              width: '40px',
              render: t => (
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(t._id)}
                  onChange={() => toggleSelect(t._id)}
                  className="rounded border-strong bg-transparent text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
              )
            },
            {
              header: 'ID',
              sortable: false,
              render: t => <span className="font-mono text-[11px] text-tertiary">#{t._id.slice(-6).toUpperCase()}</span>
            },
            {
              header: 'Subject & Requester',
              accessor: 'title',
              render: t => (
                <div className="max-w-[280px] py-1">
                  <Link to={`/ticket/${t._id}`} className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline truncate block leading-tight">
                    {t.title}
                  </Link>
                  <span className="text-[11px] text-tertiary mt-0.5 truncate block">
                    Req: {t.createdBy?.name || 'System'}
                  </span>
                </div>
              )
            },
            {
              header: 'Priority',
              accessor: 'priority',
              render: t => renderPriority(t.priority)
            },
            {
              header: 'Status',
              accessor: 'status',
              render: t => <Badge color={getStatusColor(t.status)}>{t.status}</Badge>
            },
            {
              header: 'SLA',
              sortable: false,
              render: t => {
                const sla = getSLA(t)
                return <Badge color={sla.color}>{sla.text}</Badge>
              }
            },
            {
              header: 'Assignee',
              sortable: false,
              render: t => (
                role === 'admin' ? (
                  <select 
                    value={t.assignedTo?._id || ''} 
                    onChange={e => handleAssignTicket(t._id, e.target.value)}
                    className="text-[11px] font-bold border border-default rounded bg-transparent text-secondary py-1 px-1.5 w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Unassigned</option>
                    {users.filter(u => u.role === 'support_engineer').map(u => (
                      <option key={u._id} value={u._id}>{u.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[12px] font-medium text-secondary">
                    {t.assignedTo?.name || 'Unassigned'}
                  </span>
                )
              )
            },
            {
              header: '',
              sortable: false,
              render: t => (
                <div className="flex items-center justify-end gap-1.5">
                  <Link to={`/ticket/${t._id}`}>
                    <Button variant="secondary" size="sm">View</Button>
                  </Link>
                  {role === 'admin' && (
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(t._id)} className="text-red-600 hover:text-red-700 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )
            }
          ] : [
            {
              header: 'ID',
              sortable: false,
              render: t => <span className="font-mono text-[11px] text-tertiary">#{t._id.slice(-6).toUpperCase()}</span>
            },
            {
              header: 'Subject & Requester',
              accessor: 'title',
              render: t => (
                <div className="max-w-[280px] py-1">
                  <Link to={`/ticket/${t._id}`} className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline truncate block leading-tight">
                    {t.title}
                  </Link>
                  <span className="text-[11px] text-tertiary mt-0.5 truncate block">
                    Req: {t.createdBy?.name || 'System'}
                  </span>
                </div>
              )
            },
            {
              header: 'Priority',
              accessor: 'priority',
              render: t => renderPriority(t.priority)
            },
            {
              header: 'Status',
              accessor: 'status',
              render: t => <Badge color={getStatusColor(t.status)}>{t.status}</Badge>
            },
            {
              header: 'SLA',
              sortable: false,
              render: t => {
                const sla = getSLA(t)
                return <Badge color={sla.color}>{sla.text}</Badge>
              }
            },
            {
              header: 'Assignee',
              sortable: false,
              render: t => (
                <span className="text-[12px] font-medium text-secondary">
                  {t.assignedTo?.name || 'Unassigned'}
                </span>
              )
            },
            {
              header: '',
              sortable: false,
              render: t => (
                <div className="flex items-center justify-end gap-1.5">
                  <Link to={`/ticket/${t._id}`}>
                    <Button variant="secondary" size="sm">View</Button>
                  </Link>
                </div>
              )
            }
          ]}
        />
      </Card>

      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Ticket"
        danger
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete Ticket</Button>
          </>
        }
      >
        <p className="text-[13px] text-secondary">
          Are you sure you want to permanently delete this ticket? This action cannot be undone.
        </p>
      </Modal>

      <Modal
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        title="Bulk Delete Tickets"
        danger
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowBulkDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={confirmBulkDelete}>Delete {selectedIds.length} Tickets</Button>
          </>
        }
      >
        <p className="text-[13px] text-secondary">
          Are you sure you want to permanently delete {selectedIds.length} tickets? This action cannot be undone.
        </p>
      </Modal>

      <Modal
        isOpen={showBulkAssign}
        onClose={() => setShowBulkAssign(false)}
        title="Bulk Assign Tickets"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowBulkAssign(false)}>Cancel</Button>
            <Button variant="primary" onClick={confirmBulkAssign} disabled={!bulkAssignee}>Assign</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[13px] text-secondary">
            Select an engineer to assign to the {selectedIds.length} selected tickets.
          </p>
          <div>
            <label className="block text-[11px] font-bold text-tertiary uppercase tracking-wider mb-1.5">Assignee</label>
            <select
              value={bulkAssignee}
              onChange={e => setBulkAssignee(e.target.value)}
              className="ds-input"
            >
              <option value="">-- Select Engineer --</option>
              {users.filter(u => u.role === 'support_engineer').map(u => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

    </div>
  )
}
