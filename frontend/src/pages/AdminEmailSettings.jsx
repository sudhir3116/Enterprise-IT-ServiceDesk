import React, { useState, useEffect } from 'react'
import { Mail, Save, Send, CheckCircle2, AlertTriangle, RefreshCw, Shield, Server, FileText, Clock } from 'lucide-react'
import PageHeader from '../components/enterprise/PageHeader'
import Card from '../components/enterprise/Card'
import Button from '../components/enterprise/Button'
import Badge from '../components/enterprise/Badge'
import Table from '../components/enterprise/Table'
import { useToast } from '../hooks/useToast'
import api from '../services/api'

export default function AdminEmailSettings() {
  const { addToast } = useToast()

  const [config, setConfig] = useState({
    supportEmail: 'support@productportal.com',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    enabled: true,
    templates: {
      ticketCreatedSubject: 'Your ticket has been created - {{ticketNumber}}',
      engineerReplySubject: 'New response on your ticket {{ticketNumber}}',
      statusChangeSubject: 'Your ticket {{ticketNumber}} status changed to {{status}}',
      slaWarningSubject: 'SLA Warning: Ticket {{ticketNumber}} requires attention',
      ticketResolvedSubject: 'Your ticket {{ticketNumber}} has been resolved'
    }
  })

  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testRecipient, setTestRecipient] = useState('')
  const [activeTab, setActiveTab] = useState('settings') // 'settings' | 'templates' | 'logs'

  async function loadData() {
    setLoading(true)
    try {
      const [cfgRes, logRes] = await Promise.all([
        api.get('/email/config'),
        api.get('/email/logs')
      ])
      if (cfgRes.data) setConfig(cfgRes.data)
      if (logRes.data) setLogs(logRes.data)
    } catch (err) {
      console.error('Failed to load email settings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.put('/email/config', config)
      addToast('Email configuration saved successfully', 'success')
      if (res.data?.config) setConfig(res.data.config)
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save configuration', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSendTestEmail = async () => {
    setTesting(true)
    try {
      const res = await api.post('/email/test', { recipient: testRecipient.trim() || undefined })
      addToast(res.data?.message || 'Test email dispatched successfully!', 'success')
      loadData()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to send test email', 'error')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      <PageHeader 
        title="Enterprise Email Support & SMTP Settings"
        description="Manage inbound/outbound email integration, SMTP credentials, template headers, and dispatch logs."
        icon={Mail}
        breadcrumbs={[
          { name: 'Admin', path: '/admin/dashboard' },
          { name: 'Email Settings' }
        ]}
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-ds-border pb-2">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'text-tertiary hover:text-primary'}`}
        >
          SMTP &amp; Channel Config
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'templates' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'text-tertiary hover:text-primary'}`}
        >
          Email Templates
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'logs' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'text-tertiary hover:text-primary'}`}
        >
          Dispatch Logs ({logs.length})
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-tertiary">Loading email configuration…</div>
      ) : activeTab === 'settings' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Form Column */}
          <Card className="p-6 space-y-6 lg:col-span-2 border-ds-border bg-ds-surface shadow-sm">
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-ds-border">
                <h3 className="font-bold text-primary text-sm flex items-center gap-2">
                  <Server size={16} className="text-indigo-500" />
                  Channel Configuration
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-tertiary text-xs font-bold">Email Support Channel</span>
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={e => setConfig({ ...config, enabled: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="ds-label font-bold text-primary">Inbound Support Email Address</label>
                  <input
                    type="email"
                    value={config.supportEmail}
                    onChange={e => setConfig({ ...config, supportEmail: e.target.value })}
                    className="ds-input text-xs w-full"
                    placeholder="support@productportal.com"
                    required
                  />
                  <p className="text-[11px] text-tertiary">Emails sent to this address will auto-create support tickets.</p>
                </div>

                <div className="space-y-1">
                  <label className="ds-label font-bold text-primary">SMTP Host</label>
                  <input
                    type="text"
                    value={config.smtpHost}
                    onChange={e => setConfig({ ...config, smtpHost: e.target.value })}
                    className="ds-input text-xs w-full"
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="ds-label font-bold text-primary">SMTP Port</label>
                  <input
                    type="number"
                    value={config.smtpPort}
                    onChange={e => setConfig({ ...config, smtpPort: Number(e.target.value) })}
                    className="ds-input text-xs w-full"
                    placeholder="587"
                  />
                </div>

                <div className="space-y-1">
                  <label className="ds-label font-bold text-primary">SMTP Username / Sender Account</label>
                  <input
                    type="text"
                    value={config.smtpUsername}
                    onChange={e => setConfig({ ...config, smtpUsername: e.target.value })}
                    className="ds-input text-xs w-full"
                    placeholder="user@domain.com"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="ds-label font-bold text-primary">SMTP Password / App Secret</label>
                  <input
                    type="password"
                    value={config.smtpPassword}
                    onChange={e => setConfig({ ...config, smtpPassword: e.target.value })}
                    className="ds-input text-xs w-full"
                    placeholder="••••••••••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-ds-border">
                <Button type="submit" variant="primary" icon={Save} isLoading={saving}>
                  Save Configuration
                </Button>
              </div>
            </form>
          </Card>

          {/* Test & Verification Side Card */}
          <Card className="p-6 space-y-4 lg:col-span-1 border-ds-border bg-ds-surface shadow-sm">
            <h3 className="font-bold text-primary text-sm flex items-center gap-2">
              <Send size={16} className="text-emerald-500" />
              SMTP Connection Test
            </h3>
            <p className="text-xs text-tertiary">
              Send a test diagnostic email to verify outbound SMTP credentials and template rendering.
            </p>

            <div className="space-y-2">
              <input
                type="email"
                value={testRecipient}
                onChange={e => setTestRecipient(e.target.value)}
                placeholder="Optional test recipient email"
                className="ds-input text-xs w-full"
              />
              <Button
                variant="secondary"
                className="w-full justify-center"
                icon={Send}
                isLoading={testing}
                onClick={handleSendTestEmail}
              >
                Dispatch Test Email
              </Button>
            </div>

            <div className="p-3 rounded-lg bg-ds-surface-raised border border-ds-border text-[11px] text-tertiary space-y-1">
              <strong className="block font-bold text-primary">Channel Security Policy</strong>
              Inbound and outbound email messages are parsed and filtered against tenant domain parameters. Message-IDs ensure thread continuity.
            </div>
          </Card>

        </div>
      ) : activeTab === 'templates' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <Card className="p-5 space-y-3 border-ds-border bg-ds-surface shadow-sm">
            <Badge color="blue">Ticket Created</Badge>
            <p className="font-bold text-primary">Your ticket has been created - {"{{ticketNumber}}"}</p>
            <div className="p-3 rounded bg-ds-surface-raised border border-ds-border text-tertiary font-mono text-[11px]">
              Hello {"{{customerName}}"}, Your ticket {"{{ticketNumber}}"} has been received. Replies to this email will update your ticket thread.
            </div>
          </Card>

          <Card className="p-5 space-y-3 border-ds-border bg-ds-surface shadow-sm">
            <Badge color="purple">Engineer Response</Badge>
            <p className="font-bold text-primary">New response on your ticket {"{{ticketNumber}}"}</p>
            <div className="p-3 rounded bg-ds-surface-raised border border-ds-border text-tertiary font-mono text-[11px]">
              {"{{engineerName}}"} posted a new reply to incident {"{{ticketNumber}}"}.
            </div>
          </Card>

          <Card className="p-5 space-y-3 border-ds-border bg-ds-surface shadow-sm">
            <Badge color="amber">Status Change</Badge>
            <p className="font-bold text-primary">Your ticket {"{{ticketNumber}}"} status changed to {"{{status}}"}</p>
            <div className="p-3 rounded bg-ds-surface-raised border border-ds-border text-tertiary font-mono text-[11px]">
              Status transitioned from {"{{oldStatus}}"} to {"{{newStatus}}"}.
            </div>
          </Card>

          <Card className="p-5 space-y-3 border-ds-border bg-ds-surface shadow-sm">
            <Badge color="emerald">Ticket Resolved</Badge>
            <p className="font-bold text-primary">Your ticket {"{{ticketNumber}}"} has been resolved</p>
            <div className="p-3 rounded bg-ds-surface-raised border border-ds-border text-tertiary font-mono text-[11px]">
              Your request has been marked as resolved by our support team.
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-6 border-ds-border bg-ds-surface shadow-sm text-xs space-y-4">
          <h3 className="font-bold text-primary text-sm flex items-center gap-2">
            <Clock size={16} className="text-blue-500" />
            Outbound Email Event Logs
          </h3>

          {logs.length === 0 ? (
            <p className="text-tertiary">No email logs recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log._id} className="p-3 rounded-lg border border-ds-border bg-ds-surface-raised flex items-center justify-between">
                  <div>
                    <p className="font-bold text-primary">{log.subject}</p>
                    <p className="text-[11px] text-tertiary">To: {log.recipient} • {new Date(log.sentAt).toLocaleString()}</p>
                  </div>
                  <Badge color={log.status === 'sent' ? 'emerald' : 'red'}>
                    {log.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

    </div>
  )
}
