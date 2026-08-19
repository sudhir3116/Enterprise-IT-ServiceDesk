import React, { useEffect, useState, useMemo } from 'react'
import { BarChart3, Download, TrendingUp, Filter, AlertCircle, TrendingDown } from 'lucide-react'
import api from '../services/api'
import Button from '../components/enterprise/Button'
import Card, { StatCard } from '../components/enterprise/Card'
import PageHeader from '../components/enterprise/PageHeader'
import SectionHeader from '../components/enterprise/SectionHeader'
import { getTickets } from '../services/ticketApi'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { useChartTheme } from '../hooks/useChartTheme'

export default function AdminReports() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const chart = useChartTheme()

  useEffect(() => {
    async function load() {
      try {
        const data = await getTickets()
        setTickets(data)
      } catch (err) {
        setError('Failed to load report data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const stats = useMemo(() => {
    const total = tickets.length
    const resolved = tickets.filter(t => ['Resolved', 'Closed'].includes(t.status))
    
    const slaRate = total > 0 ? (resolved.length / total * 100).toFixed(1) : '100.0'
    
    let avgHrs = 0;
    if (resolved.length > 0) {
      const times = resolved.map(t => {
        const c = new Date(t.createdAt)
        const u = new Date(t.updatedAt || t.createdAt)
        return (u - c) / (1000 * 60 * 60)
      })
      avgHrs = (times.reduce((a,b)=>a+b,0) / times.length).toFixed(1)
    }

    const pCounts = { Critical:0, High:0, Medium:0, Low:0 }
    tickets.forEach(t => { pCounts[t.priority] = (pCounts[t.priority] || 0) + 1 })
    const priorityData = Object.keys(pCounts).map(k => ({ name: k, value: pCounts[k] }))

    const sCounts = {}
    tickets.forEach(t => { sCounts[t.status] = (sCounts[t.status] || 0) + 1 })
    const statusData = Object.keys(sCounts).map(k => ({ name: k, value: sCounts[k] }))

    return { slaRate, avgHrs, priorityData, statusData }
  }, [tickets])

  // Chart colors come from useChartTheme — no hardcoded values

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/reports/export/ticket', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `ticket_report_${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      
      <PageHeader 
        title="Advanced Analytics" 
        description="Comprehensive reporting on SLA compliance, agent performance, and intake volume."
        icon={BarChart3}
        breadcrumbs={[
          { name: 'Admin', path: '/admin/dashboard' },
          { name: 'Reports' }
        ]}
        primaryAction={<Button variant="primary" icon={Download} onClick={handleExportCSV}>Export CSV</Button>}
        secondaryActions={<Button variant="secondary" icon={Filter}>Filters</Button>}
      />

      {error && (
        <div 
          className="p-3.5 rounded-md text-[13px] font-medium border flex items-center gap-2 mb-4"
          style={{ backgroundColor: 'var(--ds-danger-subtle)', borderColor: 'var(--ds-danger)', color: 'var(--ds-danger)' }}
        >
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-10">
          <div className="animate-spin w-6 h-6 rounded-full border-2" style={{ borderColor: 'var(--ds-border)', borderTopColor: 'var(--ds-accent)' }} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard 
              title="SLA Compliance Rate" 
              value={`${stats.slaRate}%`} 
              icon={TrendingUp} 
              color="emerald"
              trend="+1.4%"
              trendLabel="vs last month"
            />
            <StatCard 
              title="Avg. Resolution Time" 
              value={`${stats.avgHrs}h`} 
              icon={TrendingDown} 
              color="blue"
              trend="-12%"
              trendLabel="vs last month"
            />
            <StatCard 
              title="First Response Time" 
              value="14m" 
              icon={TrendingUp} 
              color="purple"
              trend="Stable"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              <SectionHeader title="Ticket Volume" description="Distribution by Status" />
              <Card className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray={chart.gridDash} vertical={false} stroke={chart.grid} opacity={chart.gridOpacity} />
                    <XAxis dataKey="name" tick={chart.tick} axisLine={false} tickLine={false} />
                    <YAxis tick={chart.tick} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={chart.cursor} contentStyle={chart.tooltip} />
                    <Bar dataKey="value" fill={chart.color1} radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
            
            <div className="flex flex-col gap-4">
              <SectionHeader title="Priority Distribution" description="Active tickets by severity level" />
              <Card className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.priorityData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value">
                      {stats.priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chart.colors[index % chart.colors.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={chart.tooltip} />
                    <Legend iconType="circle" wrapperStyle={chart.legend} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
