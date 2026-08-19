import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ticket, Search, Filter, AlertTriangle, Eye, CheckCircle2, UserCheck } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/enterprise/PageHeader'
import FilterBar from '../components/enterprise/FilterBar'
import Table from '../components/enterprise/Table'
import Badge from '../components/enterprise/Badge'
import Card from '../components/enterprise/Card'
import Button from '../components/enterprise/Button'
import { useToast } from '../hooks/useToast'

export default function EngineerTickets() {
  const { addToast } = useToast()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const currentUserId = currentUser?._id || currentUser?.id

  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters and sorting states
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [priorityFilter, setPriorityFilter] = useState('All Priority')
  const [queueFilter, setQueueFilter] = useState('My Assignments') // 'My Assignments' | 'Unassigned Team Issues'
  
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  async function loadTickets() {
    setLoading(true)
    setError(null)
    try {
      // Scoped ticket fetch (engineers retrieve tickets assigned to them, created by them, or matching their team category)
      const res = await api.get('/tickets?limit=100')
      setTickets(res.data)
    } catch (err) {
      console.error(err)
      setError('Failed to fetch tickets queue. Please reload the page.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [])

  // Action: Accept Ticket (status -> In Progress, assignedTo -> current user)
  const handleAccept = async (ticketId) => {
    try {
      await api.put(`/tickets/${ticketId}`, { status: 'In Progress', assignedTo: currentUserId })
      addToast('Ticket accepted successfully', 'success')
      loadTickets()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to accept ticket', 'error')
    }
  }

  // Action: Assign to Me (assignedTo -> current user)
  const handleClaim = async (ticketId) => {
    try {
      await api.put(`/tickets/${ticketId}`, { assignedTo: currentUserId })
      addToast('Ticket assigned to you', 'success')
      loadTickets()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to claim ticket', 'error')
    }
  }

  // SLA time remaining calculation helper
  const getRemainingTimeText = (dueDate) => {
    if (!dueDate) return 'N/A'
    const diff = new Date(dueDate) - new Date()
    if (diff < 0) return 'Breached'
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) {
      const minutes = Math.floor(diff / 60000)
      return `${minutes}m remaining`
    }
    if (hours < 24) {
      return `${hours}h remaining`
    }
    return `${Math.floor(hours/24)}d remaining`
  }

  const getSlaBadgeColor = (dueDate) => {
    if (!dueDate) return 'gray'
    const diff = new Date(dueDate) - new Date()
    if (diff < 0) return 'red'
    const hours = diff / 3600000
    if (hours < 4) return 'red'
    if (hours < 24) return 'amber'
    return 'green'
  }

  // Priority color index
  const priorityColors = { Critical: 'red', High: 'amber', Medium: 'blue', Low: 'gray' }
  // Status color index
  const statusColors = { 
    Open: 'gray', 
    Assigned: 'blue', 
    'In Progress': 'indigo', 
    Pending: 'amber', 
    'Waiting for User': 'amber', 
    Resolved: 'emerald', 
    Closed: 'slate',
    Escalated: 'red'
  }

  // ── FILTERING LOGIC ──────────────────────────────────────────────────────
  let filtered = tickets.filter(t => {
    const isAssignedToMe = t.assignedTo?._id === currentUserId || t.assignedTo?.id === currentUserId
    
    if (queueFilter === 'My Assignments') {
      return isAssignedToMe
    } else {
      // Unassigned Team issues (matching team category and unallocated)
      const isUnassigned = !t.assignedTo
      const isMatchingTeam = t.category && currentUser?.team && t.category.toLowerCase() === currentUser.team.toLowerCase()
      return isUnassigned && isMatchingTeam
    }
  })

  // Text search (matches title, description, ticket number)
  if (search.trim()) {
    const query = search.toLowerCase()
    filtered = filtered.filter(t => 
      t.title?.toLowerCase().includes(query) || 
      t.description?.toLowerCase().includes(query) ||
      t.ticketNumber?.toLowerCase().includes(query)
    )
  }

  // Status Filter
  if (statusFilter !== 'All Status') {
    filtered = filtered.filter(t => t.status === statusFilter)
  }

  // Priority Filter
  if (priorityFilter !== 'All Priority') {
    filtered = filtered.filter(t => t.priority === priorityFilter)
  }

  // ── SORTING LOGIC ────────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    let fieldA = a[sortBy]
    let fieldB = b[sortBy]

    // Special cases
    if (sortBy === 'dueDate') {
      fieldA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
      fieldB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
    } else if (sortBy === 'createdAt') {
      fieldA = new Date(a.createdAt).getTime()
      fieldB = new Date(b.createdAt).getTime()
    }

    if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1
    if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  // ── PAGINATION ───────────────────────────────────────────────────────────
  const totalPages = Math.ceil(sorted.length / itemsPerPage)
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, priorityFilter, queueFilter, sortBy, sortOrder])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--ds-primary)] border-t-transparent rounded-full" />
          <p className="text-sm font-semibold text-[var(--ds-text-muted)]">Loading Tickets Queue…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      
      {/* Page Header */}
      <PageHeader
        title="Assigned Tickets Queue"
        description="Search, triage, and resolve support requests assigned to you or matching your department team."
        icon={Ticket}
        breadcrumbs={[{ name: 'Engineer', path: '/engineer/dashboard' }, { name: 'Assigned Queue' }]}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-medium">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table Card wrapper */}
      <Card className="p-0 overflow-hidden">
        
        {/* Filter & Search Bar */}
        <FilterBar
          searchPlaceholder="Search ticket ID, title, summary..."
          searchValue={search}
          onSearchChange={setSearch}
        >
          {/* Queue Scoper toggle */}
          <select
            value={queueFilter}
            onChange={e => setQueueFilter(e.target.value)}
            className="ds-select text-xs w-44"
          >
            <option value="My Assignments">My Assigned Tickets</option>
            <option value="Unassigned Team Issues">Unassigned Team Queue ({currentUser?.team || 'General'})</option>
          </select>

          {/* Status dropdown filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="ds-select text-xs w-36"
          >
            <option value="All Status">All Status</option>
            <option value="Open">Open</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending">Pending</option>
            <option value="Waiting for User">Waiting for User</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
            <option value="Escalated">Escalated</option>
          </select>

          {/* Priority dropdown filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="ds-select text-xs w-36"
          >
            <option value="All Priority">All Priority</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>

          {/* Sorting controls */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={e => {
              const [by, order] = e.target.value.split('-')
              setSortBy(by)
              setSortOrder(order)
            }}
            className="ds-select text-xs w-44"
          >
            <option value="createdAt-desc">Newest Created First</option>
            <option value="createdAt-asc">Oldest Created First</option>
            <option value="dueDate-asc">SLA: Due Soonest</option>
          </select>
        </FilterBar>

        {/* Reusable Table Grid */}
        <Table
          columns={[
            { 
              header: 'Ticket ID', 
              accessor: (row) => (
                <span className="font-mono text-xs font-bold text-tertiary">
                  {row.ticketNumber || `#${row._id.slice(-6).toUpperCase()}`}
                </span>
              )
            },
            { 
              header: 'Subject', 
              accessor: (row) => (
                <Link 
                  to={`/engineer/ticket/${row._id}`} 
                  className="font-bold text-secondary hover:text-[var(--brand-primary)] text-[13.5px] block leading-tight max-w-xs truncate"
                >
                  {row.title}
                </Link>
              ) 
            },
            { 
              header: 'Requester', 
              accessor: (row) => (
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="text-[13px] font-semibold text-primary">{row.createdBy?.name || 'User'}</span>
                  <span className="text-[10px] text-tertiary">{row.createdBy?.department || 'IT Operations'}</span>
                </div>
              ) 
            },
            { 
              header: 'Priority', 
              accessor: (row) => <Badge color={priorityColors[row.priority] || 'gray'}>{row.priority}</Badge> 
            },
            { 
              header: 'Status', 
              accessor: (row) => <Badge color={statusColors[row.status] || 'gray'}>{row.status}</Badge> 
            },
            { 
              header: 'SLA Remaining', 
              accessor: (row) => (
                <Badge color={getSlaBadgeColor(row.dueDate)}>{getRemainingTimeText(row.dueDate)}</Badge>
              ) 
            },
            { 
              header: 'Created Date', 
              accessor: (row) => (
                <span className="text-xs text-[var(--ds-text-muted)] font-medium">
                  {new Date(row.createdAt).toLocaleDateString()}
                </span>
              ) 
            },
            {
              header: 'Actions',
              accessor: (row) => {
                const isAssignedToMe = row.assignedTo?._id === currentUserId || row.assignedTo?.id === currentUserId
                return (
                  <div className="flex items-center gap-1.5">
                    <Link to={`/engineer/ticket/${row._id}`} title="View Details">
                      <Button variant="ghost" size="xs" className="p-1">
                        <Eye size={14} className="text-ds-text-muted" />
                      </Button>
                    </Link>
                    
                    {!isAssignedToMe && !row.assignedTo && (
                      <Button 
                        variant="secondary" 
                        size="xs" 
                        title="Claim Task" 
                        className="px-1.5"
                        onClick={() => handleClaim(row._id)}
                      >
                        <UserCheck size={13} />
                      </Button>
                    )}

                    {!isAssignedToMe && (row.status === 'Open' || row.status === 'Assigned') && (
                      <Button 
                        variant="primary" 
                        size="xs" 
                        title="Accept Ticket"
                        className="px-1.5"
                        onClick={() => handleAccept(row._id)}
                      >
                        <CheckCircle2 size={13} />
                      </Button>
                    )}
                  </div>
                )
              }
            }
          ]}
          data={paginated}
          emptyMessage="No tickets match the filtered criteria."
        />

        {/* Pagination Sliders */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-ds-divider bg-ds-surface-raised">
            <span className="text-xs text-tertiary">
              Showing {filtered.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} tickets
            </span>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                Previous
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

      </Card>

    </div>
  )
}
