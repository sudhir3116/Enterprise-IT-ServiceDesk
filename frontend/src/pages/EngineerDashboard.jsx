import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  Ticket, FileText, Clock, CheckCircle, AlertTriangle, LayoutDashboard, 
  UserCheck, Activity, Calendar, ShieldCheck
} from 'lucide-react'
import api from '../services/api'
import { getUser } from '../services/auth'
import PageHeader from '../components/enterprise/PageHeader'
import Card, { StatCard } from '../components/enterprise/Card'
import Table from '../components/enterprise/Table'
import Badge from '../components/enterprise/Badge'
import Button from '../components/enterprise/Button'

export default function EngineerDashboard() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const navigate = useNavigate()
  const currentUser = getUser()
  const currentUserId = currentUser?._id || currentUser?.id

  useEffect(() => {
    let mounted = true
    async function loadData() {
      setLoading(true)
      try {
        const res = await api.get('/tickets?limit=100')
        if (mounted) {
          setTickets(res.data)
        }
      } catch (err) {
        console.error('Failed to load tickets', err)
        if (mounted) {
          setError('Failed to fetch operational stats. Please try again.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    loadData()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--ds-primary)] border-t-transparent rounded-full" />
          <p className="text-sm font-semibold text-[var(--ds-text-muted)]">Loading Engineer Workspace…</p>
        </div>
      </div>
    )
  }

  // ── FILTER OPERATIONAL METRICS ───────────────────────────────────────────
  const myTickets = tickets.filter(t => t.assignedTo?._id === currentUserId || t.assignedTo?.id === currentUserId)
  const activeMyTickets = myTickets.filter(t => !['Resolved', 'Closed'].includes(t.status))
  
  const countOpen = activeMyTickets.filter(t => ['Open', 'Assigned'].includes(t.status)).length
  const countInProgress = activeMyTickets.filter(t => t.status === 'In Progress').length
  
  // Resolved Today
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const countResolvedToday = myTickets.filter(t => 
    ['Resolved', 'Closed'].includes(t.status) && 
    t.updatedAt && new Date(t.updatedAt) >= startOfToday
  ).length

  // SLA Breached (active, dueDate is past now)
  const now = new Date()
  const countSlaBreaches = activeMyTickets.filter(t => t.dueDate && new Date(t.dueDate) < now).length

  // ── WIDGETS DATA PREPARATION ─────────────────────────────────────────────
  // Recent Assigned Tickets (sorted by createdAt descending, active first)
  const recentAssigned = [...activeMyTickets]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  // Upcoming SLA Deadlines (sorted by dueDate ascending, closest first)
  const upcomingSla = activeMyTickets
    .filter(t => t.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5)

  // Recent Activities list (extracted from logs of engineer's tickets)
  const allHistory = []
  myTickets.forEach(t => {
    if (t.history) {
      t.history.forEach(h => {
        allHistory.push({
          ...h,
          ticketNumber: t.ticketNumber || `#${t._id.slice(-6).toUpperCase()}`,
          ticketTitle: t.title,
          ticketId: t._id
        })
      })
    }
  })
  const recentActivities = allHistory
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8)

  // ── HELPERS ──────────────────────────────────────────────────────────────
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

  const priorityColors = { Critical: 'red', High: 'amber', Medium: 'blue', Low: 'gray' }
  const statusColors = { Open: 'gray', Assigned: 'blue', 'In Progress': 'indigo', Pending: 'amber', Resolved: 'emerald', Closed: 'slate' }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      
      {/* Page Header banner */}
      <PageHeader
        title="Engineer Workspace"
        description="Daily operational queue metrics, SLA resolutions tracking, and assigned tickets."
        icon={LayoutDashboard}
        breadcrumbs={[{ name: 'Engineer', path: '/engineer/dashboard' }, { name: 'Dashboard' }]}
        primaryAction={<Button variant="primary" icon={Ticket} onClick={() => navigate('/engineer/assigned')}>Assigned Queue</Button>}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-medium">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Row 1: KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Assigned Tickets" value={myTickets.length} icon={Ticket} color="blue" />
        <StatCard title="Open Tickets" value={countOpen} icon={FileText} color="indigo" />
        <StatCard title="In Progress" value={countInProgress} icon={Clock} color="amber" />
        <StatCard title="Resolved Today" value={countResolvedToday} icon={CheckCircle} color="emerald" />
        <StatCard title="SLA Breaches" value={countSlaBreaches} icon={AlertTriangle} color="red" />
      </div>

      {/* Row 2: Grid Widgets layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Recent Assigned & Upcoming SLA */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Recent Assigned Tickets */}
          <Card className="p-0">
            <div className="p-6 border-b border-[var(--ds-divider)] flex justify-between items-center">
              <h3 className="font-semibold text-[var(--ds-text-primary)]">Recent Assigned Tickets</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/engineer/assigned')}>View Queue</Button>
            </div>
            <Table
              columns={[
                { header: 'Ticket #', accessor: 'ticketNumber' },
                { header: 'Title', accessor: (row) => <Link to={`/engineer/ticket/${row._id}`} className="font-semibold hover:underline text-[var(--ds-text-primary)]">{row.title}</Link> },
                { header: 'Priority', accessor: (row) => <Badge color={priorityColors[row.priority] || 'gray'}>{row.priority}</Badge> },
                { header: 'Status', accessor: (row) => <Badge color={statusColors[row.status] || 'gray'}>{row.status}</Badge> },
                { header: 'Created', accessor: (row) => <span className="text-xs text-[var(--ds-text-muted)]">{new Date(row.createdAt).toLocaleDateString()}</span> }
              ]}
              data={recentAssigned}
              emptyMessage="No active tickets assigned to you."
            />
          </Card>

          {/* Upcoming SLA Deadlines */}
          <Card className="p-0">
            <div className="p-6 border-b border-[var(--ds-divider)] flex justify-between items-center">
              <h3 className="font-semibold text-[var(--ds-text-primary)]">Upcoming SLA Deadlines</h3>
            </div>
            <Table
              columns={[
                { header: 'Ticket #', accessor: 'ticketNumber' },
                { header: 'Title', accessor: (row) => <Link to={`/engineer/ticket/${row._id}`} className="font-semibold hover:underline text-[var(--ds-text-primary)]">{row.title}</Link> },
                { header: 'Priority', accessor: (row) => <Badge color={priorityColors[row.priority] || 'gray'}>{row.priority}</Badge> },
                { header: 'Deadline Target', accessor: (row) => <span className="text-xs text-[var(--ds-text-muted)]">{new Date(row.dueDate).toLocaleString()}</span> },
                { header: 'Time Left', accessor: (row) => <Badge color={getSlaBadgeColor(row.dueDate)}>{getRemainingTimeText(row.dueDate)}</Badge> }
              ]}
              data={upcomingSla}
              emptyMessage="No active SLAs configured."
            />
          </Card>

        </div>

        {/* Right Column: Timeline Log Activities */}
        <Card className="flex flex-col">
          <div className="p-6 border-b border-[var(--ds-divider)] flex justify-between items-center">
            <h3 className="font-semibold text-[var(--ds-text-primary)] flex items-center gap-2">
              <Activity size={18} className="text-[var(--brand-primary)]" />
              Recent Activity
            </h3>
          </div>
          <div className="p-6 flex-1 overflow-y-auto max-h-[500px]">
            {recentActivities.length > 0 ? (
              <div className="relative border-l border-[var(--ds-divider)] ml-3 space-y-6">
                {recentActivities.map((act, idx) => (
                  <div key={idx} className="relative pl-6">
                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[var(--ds-divider)] border-2 border-[var(--ds-surface)]" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] text-[var(--ds-text-primary)]">
                        <span className="font-semibold">{act.performedBy}</span> {act.action.toLowerCase()} on <Link to={`/engineer/ticket/${act.ticketId}`} className="font-semibold underline hover:text-[var(--brand-primary)]">{act.ticketNumber}</Link>
                      </span>
                      {act.detail && (
                        <span className="text-xs text-[var(--ds-text-muted)] truncate">{act.detail}</span>
                      )}
                      <span className="text-[10px] font-medium text-[var(--ds-text-muted)] mt-1 uppercase tracking-wider">
                        {new Date(act.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-[var(--ds-text-muted)]">No recent ticket activities</div>
            )}
          </div>
        </Card>

      </div>

    </div>
  )
}
