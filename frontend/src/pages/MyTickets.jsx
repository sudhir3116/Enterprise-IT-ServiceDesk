import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getTickets } from '../services/ticketApi'
import { Search, Filter, AlertCircle, PlusCircle } from 'lucide-react'
import Badge from '../components/enterprise/Badge'
import Button from '../components/enterprise/Button'
import Card from '../components/enterprise/Card'
import Table from '../components/enterprise/Table'
import PageHeader from '../components/enterprise/PageHeader'
import FilterBar from '../components/enterprise/FilterBar'

export default function MyTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      try {
        const data = await getTickets()
        const ticketList = Array.isArray(data) ? data : (data?.data || data?.tickets || [])
        setTickets(ticketList)
      } catch (err) {
        setError('Failed to fetch your tickets.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredTickets = tickets.filter(t => {
    const sMatch = statusFilter === 'All' || t.status === statusFilter
    const txtMatch = !searchText || t.title.toLowerCase().includes(searchText.toLowerCase()) || t.ticketNumber?.toLowerCase().includes(searchText.toLowerCase())
    return sMatch && txtMatch
  })

  const getStatusColor = (s) => {
    switch (s) {
      case 'Open': return 'gray'
      case 'Assigned': case 'In Progress': return 'blue'
      case 'Pending': return 'yellow'
      case 'Resolved': case 'Closed': return 'green'
      default: return 'gray'
    }
  }

  const renderPriority = (priority) => {
    const styles = {
      Critical: { bg: 'var(--ds-danger-subtle)',  color: 'var(--ds-danger)'   },
      High:     { bg: 'var(--ds-warning-subtle)', color: 'var(--ds-warning)'  },
      Medium:   { bg: 'var(--ds-accent-subtle)',  color: 'var(--ds-accent)'   },
      Low:      { bg: 'var(--ds-hover)',           color: 'var(--ds-text-secondary)' },
    }
    const s = styles[priority] || styles.Low
    return (
      <span
        style={{ backgroundColor: s.bg, color: s.color }}
        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold"
      >
        {priority}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      
      {/* Header */}
      <PageHeader 
        title="My Service Requests"
        description="Track and manage your submitted IT tickets."
        breadcrumbs={[
          { name: 'Workspace', path: '/employee/dashboard' },
          { name: 'My Requests' }
        ]}
        primaryAction={
          <Button variant="primary" icon={PlusCircle} onClick={() => navigate('/employee/create-ticket')}>
            New Request
          </Button>
        }
      />

      {error && (
        <div
          style={{ backgroundColor: 'var(--ds-danger-subtle)', color: 'var(--ds-danger)', borderColor: 'var(--ds-danger-subtle)' }}
          className="p-3 rounded-md text-[13px] font-medium border flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Ticket List Card wrapper */}
      <Card noPadding className="flex flex-col">
        {/* Filters Bar */}
        <FilterBar>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ds-text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search by title or ID..." 
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="ds-input pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" style={{ color: 'var(--ds-text-muted)' }} />
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="ds-select"
              style={{ width: 'auto', paddingRight: '32px' }}
            >
              <option>All</option>
              <option>Open</option>
              <option>In Progress</option>
              <option>Resolved</option>
              <option>Closed</option>
            </select>
          </div>
        </FilterBar>

        {/* Data Table */}
        <div className="flex-1">
          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--ds-accent)', borderTopColor: 'transparent' }} />
            </div>
          ) : (
            <Table
              columns={[
                {header: 'ID', accessor: (row) => <span className="text-[11px] font-mono text-tertiary">#{row._id.slice(-6).toUpperCase()}</span>},
                {header: 'Title', accessor: (row) => (
                    <Link to={`/employee/ticket/${row._id}`} className="font-bold text-[13px] text-primary hover:text-[var(--ds-accent)] transition-colors">
                      {row.title}
                    </Link>
                )},
                {header: 'Status', accessor: (row) => <Badge color={getStatusColor(row.status)}>{row.status}</Badge>},
                {header: 'Priority', accessor: (row) => renderPriority(row.priority)},
                {
                  header: 'Target Resolution SLA', 
                  accessor: (row) => {
                    const due = row.sla?.resolutionDue || row.dueDate
                    if (!due) return <span className="text-xs text-tertiary">Standard</span>
                    const isBreached = row.slaBreached || row.sla?.breached || new Date(due) < new Date()
                    if (['Resolved', 'Closed'].includes(row.status)) {
                      return <Badge color="green">Met</Badge>
                    }
                    return (
                      <Badge color={isBreached ? 'red' : 'blue'}>
                        {new Date(due).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Badge>
                    )
                  }
                },
                {header: 'Created', accessor: (row) => <span className="text-[12px] text-tertiary">{new Date(row.createdAt).toLocaleDateString()}</span>},
                {header: '', accessor: (row) => (
                    <div className="text-right">
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/employee/ticket/${row._id}`)}>
                        View
                      </Button>
                    </div>
                )}
              ]}
              data={filteredTickets}
              emptyMessage="No tickets found matching your filters."
            />
          )}
        </div>
      </Card>
    </div>
  )
}
