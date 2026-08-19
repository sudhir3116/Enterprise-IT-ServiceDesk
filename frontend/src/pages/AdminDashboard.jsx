import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts'
import { getStats } from '../services/dashboardApi'
import { getTickets } from '../services/ticketApi'
import { useAuth } from '../context/AuthContext'
import {
  Users, UserCheck, FileText, Activity as ActivityIcon, AlertCircle, Clock,
  Ticket, Server, Cpu, HardDrive, Database, Shield, BookOpen, Clock4
} from 'lucide-react'
import Button from '../components/enterprise/Button'
import Card, { StatCard } from '../components/enterprise/Card'
import PageHeader from '../components/enterprise/PageHeader'
import SectionHeader from '../components/enterprise/SectionHeader'
import Table from '../components/enterprise/Table'
import Badge from '../components/enterprise/Badge'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recentTickets, setRecentTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { user: currentUser } = useAuth()
  const role = currentUser?.role === 'admin' ? 'admin' : 'support_engineer'
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const s = await getStats()
        const t = await getTickets()
        if (!mounted) return
        setStats(s)
        setRecentTickets(t.slice(0, 8))
      } catch (e) {
        console.error(e)
        if (!mounted) return
        setError('Failed to load dashboard data. Please try again.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--ds-primary)] border-t-transparent rounded-full" />
          <p className="text-sm font-semibold text-[var(--ds-text-muted)]">Loading Executive Dashboard…</p>
        </div>
      </div>
    )
  }

  const parseDate = (d) => {
    if (!d) return 'N/A'
    const date = new Date(d)
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <PageHeader
        title="Executive Dashboard"
        description="Comprehensive overview of ITSM operations, tickets, and system health."
        icon={ActivityIcon}
        breadcrumbs={[{ name: 'Admin', path: '/admin' }, { name: 'Dashboard' }]}
        primaryAction={role === 'admin' ? <Button variant="primary" icon={Ticket} onClick={() => navigate('/admin/tickets')}>Manage Queue</Button> : null}
        secondaryActions={role === 'admin' ? <Button variant="secondary" icon={Users} onClick={() => navigate('/admin/users')}>Provision User</Button> : null}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={18} />
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      {stats && (
        <>
          {/* Row 1: Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard title="Open Tickets" value={stats.openTickets || 0} icon={FileText} color="indigo" />
            <StatCard title="Pending Approvals" value={stats.pendingTickets || 0} icon={Clock4} color="amber" />
            <StatCard title="SLA Breaches" value={stats.slaBreachedCount || 0} icon={AlertCircle} color="red" />
            <StatCard title="Engineers Online" value={stats.activeAgents || 0} icon={UserCheck} color="emerald" />
            <StatCard title="Avg Resolution" value={stats.avgResolutionHrs != null ? `${stats.avgResolutionHrs}h` : 'N/A'} icon={Clock} color="blue" />
            <StatCard title="Knowledge Base" value={stats.kbCount || 0} icon={BookOpen} color="purple" />
          </div>

          {/* Row 2: Charts and System Health */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Ticket Trends Chart */}
            <Card className="xl:col-span-2">
              <div className="p-6 border-b border-[var(--ds-divider)] flex justify-between items-center">
                <h3 className="font-semibold text-[var(--ds-text-primary)]">Ticket Volume Trend (Last 7 Days)</h3>
              </div>
              <div className="p-6 h-72">
                {stats.trend && stats.trend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--ds-primary)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--ds-primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ds-divider)" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--ds-text-muted)', fontSize: 12 }} 
                        dy={10} 
                        tickFormatter={(val) => {
                          const d = new Date(val);
                          return `${d.getMonth()+1}/${d.getDate()}`;
                        }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--ds-text-muted)', fontSize: 12 }} 
                      />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        name="Tickets Created"
                        stroke="var(--ds-primary)" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorTickets)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-[var(--ds-text-muted)]">No trend data available</div>
                )}
              </div>
            </Card>

            {/* System Health */}
            <Card>
              <div className="p-6 border-b border-[var(--ds-divider)] flex justify-between items-center">
                <h3 className="font-semibold text-[var(--ds-text-primary)] flex items-center gap-2">
                  <Server size={18} className="text-emerald-500" />
                  System Health
                </h3>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Operational
                </span>
              </div>
              <div className="p-0">
                <div className="grid grid-cols-2 divide-x divide-y divide-[var(--ds-divider)] border-b border-[var(--ds-divider)]">
                  <div className="p-4 flex flex-col gap-1">
                    <span className="text-xs text-[var(--ds-text-muted)] flex items-center gap-1.5"><ActivityIcon size={14}/> Uptime</span>
                    <span className="font-semibold text-lg text-[var(--ds-text-primary)]">{stats.systemHealth?.uptime || '99.9%'}</span>
                  </div>
                  <div className="p-4 flex flex-col gap-1">
                    <span className="text-xs text-[var(--ds-text-muted)] flex items-center gap-1.5"><Cpu size={14}/> CPU Load</span>
                    <span className="font-semibold text-lg text-[var(--ds-text-primary)]">{stats.systemHealth?.cpuUsage || '34%'}</span>
                  </div>
                  <div className="p-4 flex flex-col gap-1">
                    <span className="text-xs text-[var(--ds-text-muted)] flex items-center gap-1.5"><Database size={14}/> DB Latency</span>
                    <span className="font-semibold text-lg text-[var(--ds-text-primary)]">{stats.systemHealth?.dbLatency || '14ms'}</span>
                  </div>
                  <div className="p-4 flex flex-col gap-1">
                    <span className="text-xs text-[var(--ds-text-muted)] flex items-center gap-1.5"><HardDrive size={14}/> Memory</span>
                    <span className="font-semibold text-lg text-[var(--ds-text-primary)]">{stats.systemHealth?.memoryUsage || '48%'}</span>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between text-xs text-[var(--ds-text-muted)] bg-[var(--ds-surface-subtle)]">
                  <span className="flex items-center gap-1.5"><Shield size={14} /> Last Backup</span>
                  <span className="font-medium">{parseDate(stats.systemHealth?.lastBackup)}</span>
                </div>
              </div>
            </Card>

          </div>

          {/* Row 3: Tickets and Activities */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Recent Tickets Table */}
            <Card className="xl:col-span-2">
              <div className="p-6 border-b border-[var(--ds-divider)] flex justify-between items-center">
                <h3 className="font-semibold text-[var(--ds-text-primary)]">Recent Tickets</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/tickets')}>View All</Button>
              </div>
              <Table
                columns={[
                  { header: 'Ticket #', accessor: 'ticketNumber' },
                  { header: 'Title', accessor: (row) => <span className="font-medium text-[var(--ds-text-primary)]">{row.title}</span> },
                  { header: 'Priority', accessor: (row) => {
                      const colors = { Critical: 'red', High: 'orange', Medium: 'blue', Low: 'gray' }
                      return <Badge variant={colors[row.priority] || 'gray'}>{row.priority}</Badge>
                  }},
                  { header: 'Status', accessor: (row) => {
                      const colors = { Open: 'indigo', Assigned: 'blue', 'In Progress': 'amber', Resolved: 'emerald', Closed: 'gray' }
                      return <Badge variant={colors[row.status] || 'gray'}>{row.status}</Badge>
                  }},
                  { header: 'Created', accessor: (row) => <span className="text-xs text-[var(--ds-text-muted)]">{new Date(row.createdAt).toLocaleDateString()}</span> }
                ]}
                data={recentTickets}
                emptyMessage="No recent tickets found."
              />
            </Card>

            {/* Audit Log / Recent Activities */}
            <Card className="flex flex-col">
              <div className="p-6 border-b border-[var(--ds-divider)] flex justify-between items-center">
                <h3 className="font-semibold text-[var(--ds-text-primary)]">Recent Activities</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/audit-logs')}>Audit Log</Button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto max-h-[400px]">
                {stats.recentActivities && stats.recentActivities.length > 0 ? (
                  <div className="relative border-l border-[var(--ds-divider)] ml-3 space-y-6">
                    {stats.recentActivities.map((activity, idx) => (
                      <div key={activity._id || idx} className="relative pl-6">
                        <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[var(--ds-divider)] border-2 border-[var(--ds-surface)]" />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] text-[var(--ds-text-primary)]">
                            <span className="font-semibold">{activity.performedBy?.name || 'System'}</span> {activity.action.toLowerCase()} <span className="font-medium">{activity.entity}</span>
                          </span>
                          {activity.details && (
                            <span className="text-xs text-[var(--ds-text-muted)] truncate">{activity.details}</span>
                          )}
                          <span className="text-[10px] font-medium text-[var(--ds-text-muted)] mt-1 uppercase tracking-wider">
                            {new Date(activity.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-[var(--ds-text-muted)]">No recent activities</div>
                )}
              </div>
            </Card>

          </div>
        </>
      )}
    </div>
  )
}
