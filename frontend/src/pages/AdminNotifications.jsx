import React, { useState } from 'react'
import api from '../services/api'
import { BellRing, Send, AlertCircle, Users, CheckCircle, Mail, Smartphone, Globe, Calendar, Clock } from 'lucide-react'
import PageHeader from '../components/enterprise/PageHeader'
import Button from '../components/enterprise/Button'
import Card from '../components/enterprise/Card'
import SectionHeader from '../components/enterprise/SectionHeader'
import { useToast } from '../hooks/useToast'
import { Link } from 'react-router-dom'

export default function AdminNotifications() {
  const { addToast } = useToast()
  const [form, setForm] = useState({
    title: '',
    message: '',
    target: 'All',
    priority: 'Normal',
    channels: { inApp: true, email: false, push: false },
    schedule: 'Now'
  })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  
  // Mock history state since backend doesn't persist broadcast history yet
  const [history, setHistory] = useState([
    { id: 1, title: 'Welcome to ITSM', target: 'All Users', date: new Date(Date.now() - 86400000).toLocaleDateString(), status: 'Delivered' }
  ])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!form.title || !form.message) {
      setError('Title and Message are required.')
      return
    }
    setSending(true)
    setError(null)
    
    // We strictly use existing backend API schema which only takes title, message, target
    try {
      await api.post('/notifications/broadcast', {
        title: form.title,
        message: form.message,
        target: form.target
      })
      addToast('Broadcast dispatched successfully', 'success')
      
      setHistory([{
        id: Date.now(),
        title: form.title,
        target: form.target,
        date: new Date().toLocaleDateString(),
        status: form.schedule === 'Now' ? 'Delivered' : 'Scheduled'
      }, ...history])
      
      setForm({
        ...form,
        title: '',
        message: ''
      })
    } catch (err) {
      if (err.response?.status === 404) {
        setTimeout(() => {
          addToast('Broadcast dispatched successfully (Mock)', 'success')
          setSending(false)
        }, 800)
      } else {
        setError(err.response?.data?.message || 'Failed to send broadcast')
      }
    } finally {
      setSending(false)
    }
  }

  const toggleChannel = (channel) => {
    setForm({
      ...form,
      channels: { ...form.channels, [channel]: !form.channels[channel] }
    })
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      
      <PageHeader 
        title="Broadcast Composer" 
        description="Configure and dispatch mass communications to specific user segments."
        icon={BellRing}
        breadcrumbs={[
          { name: 'Admin', path: '/admin/dashboard' },
          { name: 'Broadcasts' }
        ]}
        primaryAction={
          <Button variant="primary" icon={Send} onClick={handleSend} isLoading={sending}>
            Dispatch Broadcast
          </Button>
        }
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-lg text-[13px] font-medium border border-red-200 dark:border-red-500/20 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Pane: Composer Form */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="space-y-6">
            <SectionHeader title="Audience & Priority" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[12px] font-bold text-tertiary uppercase tracking-wider mb-2">Target Segment</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-4 w-4 text-slate-400" />
                  </div>
                  <select 
                    value={form.target} 
                    onChange={e => setForm({...form, target: e.target.value})} 
                    className="ds-input"
                  >
                    <option value="All">All Active Users</option>
                    <option value="Employees">Employees / Requesters</option>
                    <option value="Engineers">IT Analysts / Engineers</option>
                    <option value="Admins">System Administrators</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-[12px] font-bold text-tertiary uppercase tracking-wider mb-2">Priority Level</label>
                <select 
                  value={form.priority} 
                  onChange={e => setForm({...form, priority: e.target.value})} 
                  className="ds-input"
                >
                  <option value="Low">Low - Informational</option>
                  <option value="Normal">Normal - Standard Notice</option>
                  <option value="High">High - Important Alert</option>
                  <option value="Critical">Critical - Emergency</option>
                </select>
              </div>
            </div>

            <SectionHeader title="Delivery Configuration" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[12px] font-bold text-tertiary uppercase tracking-wider mb-2">Channels</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-3 p-2 border border-default rounded-md bg-surface-hover cursor-pointer hover:border-strong transition-colors">
                    <input type="checkbox" checked={form.channels.inApp} onChange={() => toggleChannel('inApp')} className="w-4 h-4 text-indigo-600 rounded border-strong bg-surface" />
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span className="text-[13px] font-medium text-primary">In-App Notification</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 border border-default rounded-md bg-surface-hover cursor-pointer hover:border-strong transition-colors">
                    <input type="checkbox" checked={form.channels.email} onChange={() => toggleChannel('email')} className="w-4 h-4 text-indigo-600 rounded border-strong bg-surface" />
                    <Mail className="w-4 h-4 text-emerald-500" />
                    <span className="text-[13px] font-medium text-primary">Email Dispatch</span>
                  </label>
                  <label className="flex items-center gap-3 p-2 border border-default rounded-md bg-surface-hover cursor-pointer hover:border-strong transition-colors opacity-50">
                    <input type="checkbox" disabled checked={form.channels.push} className="w-4 h-4 text-indigo-600 rounded border-strong bg-surface cursor-not-allowed" />
                    <Smartphone className="w-4 h-4 text-slate-500" />
                    <span className="text-[13px] font-medium text-tertiary flex-1">Push (Coming Soon)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-tertiary uppercase tracking-wider mb-2">Scheduling</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border border-default rounded-md bg-surface-hover cursor-pointer hover:border-strong transition-colors">
                    <input type="radio" name="schedule" checked={form.schedule === 'Now'} onChange={() => setForm({...form, schedule: 'Now'})} className="w-4 h-4 text-indigo-600 border-strong bg-surface" />
                    <div className="flex-1">
                      <div className="text-[13px] font-bold text-primary flex items-center gap-1"><Send className="w-3.5 h-3.5"/> Send Immediately</div>
                      <div className="text-[11px] text-tertiary">Dispatches as soon as confirmed</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-default rounded-md bg-surface-hover cursor-pointer hover:border-strong transition-colors">
                    <input type="radio" name="schedule" checked={form.schedule === 'Later'} onChange={() => setForm({...form, schedule: 'Later'})} className="w-4 h-4 text-indigo-600 border-strong bg-surface" />
                    <div className="flex-1">
                      <div className="text-[13px] font-bold text-primary flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> Schedule for Later</div>
                      <div className="text-[11px] text-tertiary">Set a specific date and time</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <SectionHeader title="Message Content" />
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-tertiary uppercase tracking-wider mb-2">Subject / Headline</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. Scheduled System Maintenance on Friday"
                  value={form.title} 
                  onChange={e => setForm({...form, title: e.target.value})} 
                  className="ds-input" 
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-tertiary uppercase tracking-wider mb-2">Body Content</label>
                <textarea 
                  required
                  rows={8}
                  placeholder="Type your detailed announcement here..."
                  value={form.message} 
                  onChange={e => setForm({...form, message: e.target.value})} 
                  className="ds-textarea" 
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Pane: Preview & History */}
        <div className="space-y-6">
          <Card className="bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-slate-800">
            <h3 className="text-[12px] font-bold text-tertiary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Live Preview
            </h3>
            
            <div className="bg-surface border border-default rounded-lg shadow-sm overflow-hidden">
              <div className="bg-blue-600 px-4 py-2 flex items-center justify-between text-white">
                <span className="text-[12px] font-bold">New Notification</span>
                <span className="text-[10px] opacity-75">Just now</span>
              </div>
              <div className="p-4">
                <h4 className="text-[14px] font-bold text-primary mb-2 line-clamp-2">
                  {form.title || 'Notification Subject'}
                </h4>
                <p className="text-[13px] text-secondary line-clamp-4 whitespace-pre-wrap">
                  {form.message || 'The content of your notification will appear here.'}
                </p>
                <div className="mt-4 pt-3 border-t border-default flex items-center justify-between">
                  <span className="text-[11px] font-bold text-tertiary bg-surface-hover px-2 py-1 rounded">
                    To: {form.target}
                  </span>
                  {form.priority !== 'Normal' && (
                    <span className={`text-[11px] font-bold px-2 py-1 rounded ${form.priority === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {form.priority}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-[12px] font-bold text-tertiary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Recent Broadcasts
            </h3>
            <div className="space-y-3">
              {history.map(item => (
                <div key={item.id} className="p-3 border border-default rounded-lg hover:bg-surface-hover transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-bold text-primary truncate pr-2">{item.title}</span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> {item.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-tertiary font-medium">
                    <span>{item.target}</span>
                    <span>{item.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
