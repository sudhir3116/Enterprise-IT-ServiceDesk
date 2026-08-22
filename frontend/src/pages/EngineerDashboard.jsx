import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  Ticket, FileText, Clock, CheckCircle, AlertTriangle, LayoutDashboard, 
  UserCheck, Activity, Calendar, ShieldCheck, Zap, Wrench, ShieldAlert
} from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
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
  const { user: currentUser } = useAuth()
  const currentUserId = currentUser?._id || currentUser?.id

  useEffect(() => {
    let mounted = true
    async function loadData() {
      setLoading(true)
      try {
        const res = await api.get('/tickets?limit=100')
        if (mounted) {
          const ticketList = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.tickets || [])
          setTickets(ticketList)
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
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
          <p className="text-xs font-semibold text-tertiary">Loading Engineer Workspace…</p>
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

  // SLA Breached (active, response/resolution breached or past deadline)
  const now = new Date()
  const countSlaBreaches = activeMyTickets.filter(t => 
    t.slaBreached || t.sla?.breached || (t.dueDate && new Date(t.dueDate) < now)
  ).length

  // Workload Capacity Math
  const workloadCount = currentUser?.currentWorkload !== undefined ? currentUser.currentWorkload : activeMyTickets.length
  const maxCap = currentUser?.maxCapacity || 10
  const workloadPercent = Math.min(Math.round((workloadCount / maxCap) * 100), 100)

  // ── WIDGETS DATA PREPARATION ─────────────────────────────────────────────
  const recentAssigned = [...activeMyTickets]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  const upcomingSla = activeMyTickets
    .filter(t => t.dueDate || t.sla?.resolutionDue)
    .sort((a, b) => new Date(a.sla?.resolutionDue || a.dueDate) - new Date(b.sla?.resolutionDue || b.dueDate))
    .slice(0, 5)

  // ── HELPERS ──────────────────────────────────────────────────────────────
  const getRemainingTimeText = (dueDate) => {
    if (!dueDate) return 'No SLA'
    const diff = new Date(dueDate) - new Date()
    if (diff < 0) return 'SLA Breached'
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

  const getSlaBadgeColor = (dueDate, breached) => {
    if (breached) return 'red'
    if (!dueDate) return 'gray'
    const diff = new Date(dueDate) - new Date()
    if (diff < 0) return 'red'
    const hours = diff / 3600000
    if (hours < 2) return 'amber'
    return 'emerald'
  }

  const priorityColors = { Critical: 'red', High: 'amber', Medium: 'blue', Low: 'gray' }
  const statusColors = { Open: 'gray', Assigned: 'blue', 'In Progress': 'indigo', Pending: 'amber', Resolved: 'emerald', Closed: 'slate' }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      
      {/* Page Header banner */}
      <PageHeader
        title="Engineer Workspace"
        description="Daily operational queue metrics, SLA resolution tracking, and automated workload balancing."
        icon={LayoutDashboard}
        breadcrumbs={[{ name: 'Engineer', path: '/engineer/dashboard' }, { name: 'Dashboard' }]}
        primaryAction={<Button variant="primary" icon={Ticket} onClick={() => navigate('/engineer/assigned')}>Assigned Queue ({activeMyTickets.length})</Button>}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-medium">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Workload Capacity Banner */}
      <Card className="p-4 border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-500/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <Zap size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-primary flex items-center gap-2">
                Automated Workload Router Capacity
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold uppercase">
                  {workloadCount} / {maxCap} Tickets Allocated
                </span>
              </h4>
              <p className="text-[11px] text-tertiary mt-0.5">
                Workload-aware assignment routes new customer incidents based on active capacity and engineer skills.
              </p>
            </div>
          </div>
          
          <div className="w-full md:w-48 space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-tertiary">
              <span>Capacity Load</span>
              <span>{workloadPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-ds-border overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${workloadPercent > 80 ? 'bg-red-500' : workloadPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${workloadPercent}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Row 1: KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="My Active Tickets" value={activeMyTickets.length} icon={Ticket} color="blue" />
        <StatCard title="Open / Unworked" value={countOpen} icon={FileText} color="indigo" />
        <StatCard title="In Progress" value={countInProgress} icon={Clock} color="amber" />
        <StatCard title="Resolved Today" value={countResolvedToday} icon={CheckCircle} color="emerald" />
        <StatCard title="SLA Breaches" value={countSlaBreaches} icon={ShieldAlert} color="red" />
      </div>

      {/* Row 2: Grid Widgets layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Recent Assigned & Upcoming SLA */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Recent Assigned Tickets */}
          <Card noPadding className="overflow-hidden">
            <div className="p-4 border-b border-ds-border flex justify-between items-center bg-ds-surface-raised">
              <h3 className="font-bold text-xs text-primary flex items-center gap-2">
                <Wrench size={16} className="text-indigo-500" />
                Assigned Incident Queue
              </h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/engineer/assigned')}>View All ({myTickets.length})</Button>
            </div>
            <Table
              columns={[
                { header: 'Ticket #', accessor: 'ticketNumber' },
                { 
                  header: 'Title', 
                  accessor: (row) => (
                    <div>
                      <Link to={`/engineer/ticket/${row._id}`} className="font-bold hover:underline text-primary">
                        {row.title}
                      </Link>
                      <div className="text-[10px] text-tertiary">{row.category}</div>
                    </div>
                  ) 
                },
                { header: 'Priority', accessor: (row) => <Badge color={priorityColors[row.priority] || 'gray'}>{row.priority}</Badge> },
                { header: 'Status', accessor: (row) => <Badge color={statusColors[row.status] || 'gray'}>{row.status}</Badge> },
                { 
                  header: 'First Response SLA', 
                  accessor: (row) => (
                    <Badge color={getSlaBadgeColor(row.sla?.firstResponseDue || row.dueDate, row.sla?.responseBreached)}>
                      {row.sla?.firstRespondedAt ? 'Responded' : getRemainingTimeText(row.sla?.firstResponseDue || row.dueDate)}
                    </Badge>
                  ) 
                }
              ]}
              data={recentAssigned}
              emptyMessage="No active tickets assigned to your queue."
            />
          </Card>

          {/* Upcoming SLA Deadlines */}
          <Card noPadding className="overflow-hidden">
            <div className="p-4 border-b border-ds-border flex justify-between items-center bg-ds-surface-raised">
              <h3 className="font-bold text-xs text-primary flex items-center gap-2">
                <Clock size={16} className="text-amber-500" />
                Upcoming SLA Resolution Deadlines
              </h3>
            </div>
            <Table
              columns={[
                { header: 'Ticket #', accessor: 'ticketNumber' },
                { header: 'Title', accessor: (row) => <Link to={`/engineer/ticket/${row._id}`} className="font-bold hover:underline text-primary">{row.title}</Link> },
                { header: 'Priority', accessor: (row) => <Badge color={priorityColors[row.priority] || 'gray'}>{row.priority}</Badge> },
                { header: 'Deadline Target', accessor: (row) => <span className="text-xs text-tertiary">{new Date(row.sla?.resolutionDue || row.dueDate).toLocaleString()}</span> },
                { 
                  header: 'Resolution SLA', 
                  accessor: (row) => (
                    <Badge color={getSlaBadgeColor(row.sla?.resolutionDue || row.dueDate, row.sla?.resolutionBreached)}>
                      {getRemainingTimeText(row.sla?.resolutionDue || row.dueDate)}
                    </Badge>
                  ) 
                }
              ]}
              data={upcomingSla}
              emptyMessage="No active SLA resolution targets configured."
            />
          </Card>

        </div>

        {/* Right Column: Workload & Skills info */}
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="font-bold text-xs text-primary flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500" />
              Routing &amp; Skill Taxonomy
            </h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-tertiary font-medium">Assigned Technical Skills:</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(currentUser?.skills && currentUser.skills.length > 0 ? currentUser.skills : ["General", "Network", "Database"]).map((s, idx) => (
                    <span key={idx} className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-ds-border space-y-1.5">
                <div className="flex justify-between text-tertiary">
                  <span>Current Active Tickets:</span>
                  <span className="font-bold text-primary">{activeMyTickets.length}</span>
                </div>
                <div className="flex justify-between text-tertiary">
                  <span>Max Capacity Limit:</span>
                  <span className="font-bold text-primary">{maxCap}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

      </div>

    </div>
  )
}
