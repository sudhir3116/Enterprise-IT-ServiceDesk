import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  PlusCircle, Ticket, BookOpen, Clock, CheckCircle, 
  AlertCircle, ChevronRight, Megaphone, HelpCircle, 
  Eye, FileText, ArrowRight
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Badge from '../components/enterprise/Badge'
import Card from '../components/enterprise/Card'
import Button from '../components/enterprise/Button'
import PageHeader from '../components/enterprise/PageHeader'

export default function EmployeeDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tickets, setTickets] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function loadData() {
      try {
        const [ticketsRes, notifsRes] = await Promise.all([
          api.get('/tickets?limit=100'),
          api.get('/notifications?limit=50')
        ])
        if (!mounted) return
        const ticketList = Array.isArray(ticketsRes.data) ? ticketsRes.data : (ticketsRes.data?.data || ticketsRes.data?.tickets || [])
        const notifList = Array.isArray(notifsRes.data) ? notifsRes.data : (notifsRes.data?.data || notifsRes.data?.notifications || [])
        setTickets(ticketList)
        setNotifications(notifList)
      } catch (err) {
        if (mounted) setError('Failed to load dashboard workspace data.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadData()
    return () => { mounted = false }
  }, [])

  // KPI Calculations
  const openCount = tickets.filter(t => ['Open', 'Assigned', 'In Progress'].includes(t.status)).length
  const pendingCount = tickets.filter(t => ['Pending', 'Waiting for User', 'Escalated'].includes(t.status)).length
  const resolvedCount = tickets.filter(t => ['Resolved', 'Closed'].includes(t.status)).length
  const totalCount = tickets.length

  // Filter Announcements / Broadcast notifications
  const announcements = notifications
    .filter(n => {
      const content = (n.title + ' ' + n.message).toLowerCase()
      return content.includes('broadcast') || content.includes('announce') || content.includes('system update')
    })
    .slice(0, 3)

  // Top KB Suggestions
  const kbSuggestions = [
    { id: 1, title: 'How to Reset Your Active Directory Password', desc: 'Step-by-step instructions to change or reset domain credentials.', category: 'Access/Login' },
    { id: 2, title: 'Connecting to Corporate VPN (GlobalProtect)', desc: 'Troubleshoot MFA prompts, connection timeouts, and gateway lists.', category: 'Network' },
    { id: 3, title: 'Requesting Hardware Upgrades (Laptops & Monitors)', desc: 'Standard catalog policies for ordering replacement IT accessories.', category: 'Hardware' }
  ]

  const getStatusColor = (s) => {
    switch (s) {
      case 'Open':        return 'gray'
      case 'Assigned':    return 'blue'
      case 'In Progress': return 'indigo'
      case 'Pending':     return 'amber'
      case 'Resolved':    return 'emerald'
      case 'Closed':      return 'slate'
      default:            return 'gray'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--ds-primary)] border-t-transparent rounded-full" />
          <p className="text-sm font-semibold text-[var(--ds-text-muted)]">Loading Employee Dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      
      {/* Page Header */}
      <PageHeader 
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'Employee'}`} 
        description="Raise tickets, monitor resolution progress, and access help articles."
        breadcrumbs={[
          { name: 'Workspace', path: '/employee/dashboard' },
          { name: 'Dashboard' }
        ]}
        primaryAction={
          <Button variant="primary" icon={PlusCircle} onClick={() => navigate('/employee/create-ticket')}>
            New Incident Request
          </Button>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-medium">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Open Tickets', count: openCount, color: 'var(--ds-accent)' },
          { label: 'Pending Response', count: pendingCount, color: 'var(--ds-warning)' },
          { label: 'Resolved today', count: resolvedCount, color: 'var(--ds-success)' },
          { label: 'Total Submitted', count: totalCount, color: 'var(--ds-text-primary)' }
        ].map((card, idx) => (
          <Card key={idx} className="p-5 flex flex-col justify-between min-h-[100px]">
            <span className="text-[11px] font-bold text-tertiary uppercase tracking-wider block">{card.label}</span>
            <span className="text-2xl font-black mt-2 leading-none" style={{ color: card.color }}>{card.count}</span>
          </Card>
        ))}
      </div>

      {/* Quick Action Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          onClick={() => navigate('/employee/create-ticket')}
          className="group block cursor-pointer"
        >
          <Card className="flex items-start gap-4 p-5 hover:border-[var(--ds-accent)] transition-all duration-200 h-full bg-[var(--ds-surface-raised)] border border-ds-border">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-500">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-primary flex items-center gap-1 group-hover:text-[var(--ds-accent)]">
                Create a Ticket <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-[12px] mt-1.5 leading-relaxed text-tertiary">Need something fixed or installed? Raise a support request to IT operations.</p>
            </div>
          </Card>
        </div>

        <div 
          onClick={() => navigate('/employee/my-tickets')}
          className="group block cursor-pointer"
        >
          <Card className="flex items-start gap-4 p-5 hover:border-[var(--ds-accent)] transition-all duration-200 h-full bg-[var(--ds-surface-raised)] border border-ds-border">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-500">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-primary flex items-center gap-1 group-hover:text-[var(--ds-accent)]">
                View My Tickets <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-[12px] mt-1.5 leading-relaxed text-tertiary">Track progress, view engineer updates, and reply to existing tickets.</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Grid Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Columns: Recent Tickets List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-primary">Recent Service Requests</h2>
            <Link to="/employee/my-tickets" className="text-[12px] font-bold text-[var(--ds-accent)] hover:underline">View all requests</Link>
          </div>

          <Card className="p-0 overflow-hidden">
            {tickets.length === 0 ? (
              <div className="p-12 text-center text-xs italic text-tertiary">
                You have not submitted any service requests yet.
              </div>
            ) : (
              <div className="divide-y divide-ds-divider">
                {tickets.slice(0, 5).map(t => (
                  <Link
                    key={t._id}
                    to={`/employee/ticket/${t._id}`}
                    className="flex items-center justify-between p-4 hover:bg-ds-hover transition-colors group"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-bold font-mono text-tertiary bg-ds-surface-raised border border-ds-border px-1.5 py-0.5 rounded">
                          {t.ticketNumber || `#${t._id.slice(-6).toUpperCase()}`}
                        </span>
                        <Badge color={getStatusColor(t.status)}>{t.status}</Badge>
                        <Badge color={t.priority === 'Critical' ? 'red' : t.priority === 'High' ? 'amber' : 'blue'}>{t.priority}</Badge>
                      </div>
                      <h4 className="text-[13.5px] font-bold text-primary truncate leading-tight group-hover:text-[var(--ds-accent)]">
                        {t.title}
                      </h4>
                      <p className="text-[11px] text-tertiary mt-1.5">
                        Updated {new Date(t.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-tertiary shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Latest Announcements & KB suggestions */}
        <div className="space-y-6">
          
          {/* Announcements Card */}
          <Card className="flex flex-col">
            <h3 className="text-[13px] font-bold text-primary uppercase tracking-wider pb-3 border-b border-ds-divider mb-4 flex items-center gap-1.5">
              <Megaphone size={14} className="text-purple-500" /> Latest Announcements
            </h3>
            <div className="space-y-4">
              {announcements.length > 0 ? (
                announcements.map(ann => (
                  <div key={ann._id} className="pb-3 border-b border-ds-divider last:border-b-0 last:pb-0 space-y-1">
                    <h4 className="text-xs font-bold text-primary leading-snug">{ann.title}</h4>
                    <p className="text-[11px] text-secondary leading-normal">{ann.message}</p>
                    <span className="text-[9px] text-tertiary uppercase block tracking-wider pt-0.5">
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs italic text-tertiary">
                  No active system announcements.
                </div>
              )}
            </div>
          </Card>

          {/* KB suggestions */}
          <Card className="flex flex-col">
            <h3 className="text-[13px] font-bold text-primary uppercase tracking-wider pb-3 border-b border-ds-divider mb-4 flex items-center gap-1.5">
              <HelpCircle size={14} className="text-amber-500" /> Helpful Guides
            </h3>
            <div className="space-y-4">
              {kbSuggestions.map(article => (
                <Link 
                  key={article.id} 
                  to="/employee/knowledge-base"
                  className="block group space-y-1"
                >
                  <h4 className="text-xs font-bold text-secondary group-hover:text-[var(--ds-accent)] group-hover:underline leading-snug">
                    {article.title}
                  </h4>
                  <p className="text-[11px] text-tertiary line-clamp-2 leading-normal">{article.desc}</p>
                </Link>
              ))}
            </div>
          </Card>

        </div>

      </div>

    </div>
  )
}
