import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Bell, Check, CheckSquare, Filter, AlertTriangle, 
  MessageSquare, UserCheck, Megaphone, Clock, Eye 
} from 'lucide-react'
import api from '../services/api'
import PageHeader from '../components/enterprise/PageHeader'
import Card from '../components/enterprise/Card'
import Badge from '../components/enterprise/Badge'
import Button from '../components/enterprise/Button'
import { useToast } from '../hooks/useToast'

export default function EmployeeNotifications() {
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Filter state: 'all' | 'update' | 'reply' | 'resolve' | 'broadcast'
  const [filterType, setFilterType] = useState('all')

  async function loadNotifications() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/notifications')
      setNotifications(res.data)
    } catch (err) {
      console.error(err)
      setError('Failed to fetch notifications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read')
      addToast('All notifications marked as read', 'success')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (err) {
      addToast('Failed to mark all as read', 'error')
    }
  }

  const handleMarkSingleRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n))
    } catch (err) {
      console.error('Failed to mark single read', err)
    }
  }

  const formatTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return new Date(dateStr).toLocaleDateString()
  }

  const getNotificationIcon = (title = '', message = '') => {
    const t = (title + ' ' + message).toLowerCase()
    if (t.includes('assign') || t.includes('allocat')) {
      return <UserCheck size={16} className="text-blue-500" />
    }
    if (t.includes('resolv') || t.includes('close')) {
      return <CheckCircle size={16} className="text-emerald-500" />
    }
    if (t.includes('comment') || t.includes('reply') || t.includes('note') || t.includes('message')) {
      return <MessageSquare size={16} className="text-amber-500" />
    }
    if (t.includes('broadcast') || t.includes('announc')) {
      return <Megaphone size={16} className="text-purple-500" />
    }
    return <Bell size={16} className="text-ds-text-muted" />
  }

  const filteredNotifs = notifications.filter(n => {
    if (filterType === 'all') return true
    const t = (n.title + ' ' + n.message).toLowerCase()
    
    if (filterType === 'update') {
      return t.includes('update') || t.includes('status')
    }
    if (filterType === 'reply') {
      return t.includes('comment') || t.includes('reply') || t.includes('message')
    }
    if (filterType === 'resolve') {
      return t.includes('resolv') || t.includes('close')
    }
    if (filterType === 'broadcast') {
      return t.includes('broadcast') || t.includes('announc')
    }
    return true
  })

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--ds-primary)] border-t-transparent rounded-full" />
          <p className="text-sm font-semibold text-[var(--ds-text-muted)]">Loading notifications…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      
      {/* Page Header */}
      <PageHeader
        title="Notifications"
        description="Stay updated with replies, status changes, and general system broadcasts."
        icon={Bell}
        breadcrumbs={[{ name: 'Workspace', path: '/employee/dashboard' }, { name: 'Inbox' }]}
        primaryAction={
          unreadCount > 0 ? (
            <Button variant="primary" icon={CheckSquare} onClick={handleMarkAllRead}>
              Mark All Read
            </Button>
          ) : null
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-medium">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Categories */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4 space-y-2">
            <h4 className="text-[11px] font-bold text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Filter size={12} /> Filter
            </h4>
            
            {[
              { id: 'all', label: 'All Alerts', count: notifications.length },
              { id: 'update', label: 'Ticket Updates', count: notifications.filter(n => (n.title+n.message).toLowerCase().includes('update') || (n.title+n.message).toLowerCase().includes('status')).length },
              { id: 'reply', label: 'Replies & Messages', count: notifications.filter(n => (n.title+n.message).toLowerCase().includes('comment') || (n.title+n.message).toLowerCase().includes('reply') || (n.title+n.message).toLowerCase().includes('message')).length },
              { id: 'resolve', label: 'Resolutions', count: notifications.filter(n => (n.title+n.message).toLowerCase().includes('resolv') || (n.title+n.message).toLowerCase().includes('close')).length },
              { id: 'broadcast', label: 'Broadcasts', count: notifications.filter(n => (n.title+n.message).toLowerCase().includes('broadcast') || (n.title+n.message).toLowerCase().includes('announc')).length },
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setFilterType(type.id)}
                className={`w-full text-left px-3 py-2 text-xs font-bold rounded-md flex justify-between items-center transition-colors ${
                  filterType === type.id
                    ? 'bg-[var(--brand-primary-light)] text-[var(--brand-primary)]'
                    : 'text-secondary hover:bg-ds-hover'
                }`}
              >
                <span>{type.label}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-ds-surface border border-ds-border text-tertiary">
                  {type.count}
                </span>
              </button>
            ))}
          </Card>
        </div>

        {/* Right Messages List */}
        <div className="lg:col-span-3">
          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-ds-divider bg-ds-surface-raised flex items-center justify-between">
              <h3 className="text-xs font-bold text-primary flex items-center gap-1.5">
                Inbox
                {unreadCount > 0 && (
                  <Badge color="red">{unreadCount} Unread</Badge>
                )}
              </h3>
            </div>

            <div className="divide-y divide-ds-divider">
              {filteredNotifs.length === 0 ? (
                <div className="py-12 text-center text-xs italic text-tertiary">
                  No notifications match this filter.
                </div>
              ) : (
                filteredNotifs.map(n => {
                  const targetTicketId = n.ticketId?._id || n.ticketId
                  return (
                    <div
                      key={n._id}
                      className={`p-4 transition-colors flex items-start justify-between gap-4 ${
                        !n.read 
                          ? 'bg-[rgba(37,99,235,0.02)]' 
                          : 'hover:bg-ds-hover'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-1 shrink-0">
                          {getNotificationIcon(n.title, n.message)}
                        </div>
                        
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={`text-[13px] leading-tight ${!n.read ? 'font-bold text-primary' : 'font-semibold text-secondary'}`}>
                              {n.title}
                            </h4>
                            <span className="text-[10px] text-tertiary flex items-center gap-1">
                              <Clock size={10} /> {formatTimeAgo(n.createdAt)}
                            </span>
                          </div>
                          
                          <p className="text-xs text-secondary mt-1 leading-normal pr-4">
                            {n.message}
                          </p>

                          {targetTicketId && (
                            <Link 
                              to={`/employee/ticket/${targetTicketId}`}
                              onClick={() => handleMarkSingleRead(n._id)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--brand-primary)] hover:underline mt-2"
                            >
                              <Eye size={11} /> View Ticket
                            </Link>
                          )}
                        </div>
                      </div>

                      {!n.read && (
                        <button
                          onClick={() => handleMarkSingleRead(n._id)}
                          title="Mark as Read"
                          className="p-1 rounded hover:bg-ds-hover text-ds-text-muted hover:text-emerald-600 transition-colors shrink-0"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </div>

      </div>

    </div>
  )
}
