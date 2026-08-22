import React, { useState, useEffect } from 'react'
import { Zap, Plus, Trash2, Edit2, Play, CheckCircle2, AlertTriangle, Sparkles, ArrowRight, Shield } from 'lucide-react'
import PageHeader from '../components/enterprise/PageHeader'
import Card from '../components/enterprise/Card'
import Button from '../components/enterprise/Button'
import Badge from '../components/enterprise/Badge'
import Drawer from '../components/enterprise/Drawer'
import { useToast } from '../hooks/useToast'
import api from '../services/api'

export default function AdminAutomations() {
  const { addToast } = useToast()
  const [rules, setRules] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('rules') // 'rules' | 'history'

  const [showDrawer, setShowDrawer] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    trigger: 'ticket_created',
    conditions: [{ field: 'priority', operator: 'equals', value: 'Critical' }],
    actions: [{ type: 'add_tag', configuration: { tag: 'urgent' } }],
    status: 'active'
  })
  const [saving, setSaving] = useState(false)

  async function loadData() {
    setLoading(true)
    try {
      const [rRes, hRes] = await Promise.all([
        api.get('/automations'),
        api.get('/automations/history')
      ])
      setRules(Array.isArray(rRes.data) ? rRes.data : (rRes.data?.data || rRes.data?.rules || []))
      setHistory(Array.isArray(hRes.data) ? hRes.data : (hRes.data?.data || hRes.data?.history || []))
    } catch (err) {
      console.error('Failed to load automation rules:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleOpenNew = () => {
    setEditingRule(null)
    setForm({
      name: '',
      description: '',
      trigger: 'ticket_created',
      conditions: [{ field: 'priority', operator: 'equals', value: 'Critical' }],
      actions: [{ type: 'add_tag', configuration: { tag: 'urgent' } }],
      status: 'active'
    })
    setShowDrawer(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editingRule) {
        await api.put(`/automations/${editingRule._id}`, form)
        addToast('Automation rule updated successfully', 'success')
      } else {
        await api.post('/automations', form)
        addToast('Automation rule created successfully', 'success')
      }
      setShowDrawer(false)
      loadData()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save rule', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/automations/${id}`)
      addToast('Automation rule removed', 'success')
      loadData()
    } catch (err) {
      addToast('Failed to delete rule', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      <PageHeader 
        title="Enterprise Automation & Workflow Engine"
        description="Configure event-driven automation rules, SLA escalations, and auto-routing actions."
        icon={Zap}
        breadcrumbs={[
          { name: 'Admin', path: '/admin/dashboard' },
          { name: 'Workflow Automations' }
        ]}
        primaryAction={
          <Button variant="primary" icon={Plus} onClick={handleOpenNew}>
            Create Automation Rule
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-ds-border pb-2">
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'rules' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'text-tertiary hover:text-primary'}`}
        >
          Active Rules ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'history' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'text-tertiary hover:text-primary'}`}
        >
          Execution History ({history.length})
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-tertiary">Loading automation engine...</div>
      ) : activeTab === 'rules' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.length === 0 ? (
            <Card className="p-8 text-center col-span-2 text-tertiary text-xs">
              No automation rules configured. Click "Create Automation Rule" to set up your first workflow trigger.
            </Card>
          ) : (
            rules.map(rule => (
              <Card key={rule._id} className="p-5 space-y-4 border-ds-border bg-ds-surface shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-primary text-sm flex items-center gap-2">
                      <Zap size={16} className="text-amber-500" />
                      {rule.name}
                    </h3>
                    <p className="text-xs text-tertiary mt-0.5">{rule.description || 'No description provided.'}</p>
                  </div>
                  <Badge color={rule.status === 'active' ? 'emerald' : 'gray'}>
                    {rule.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded bg-ds-surface-raised border border-ds-border flex items-center gap-2">
                    <span className="font-bold text-tertiary uppercase text-[10px]">WHEN:</span>
                    <span className="font-bold text-indigo-500">{rule.trigger}</span>
                  </div>

                  <div className="p-2.5 rounded bg-ds-surface-raised border border-ds-border space-y-1">
                    <span className="font-bold text-tertiary uppercase text-[10px] block">IF CONDITIONS:</span>
                    {rule.conditions?.map((c, i) => (
                      <p key={i} className="text-secondary font-mono text-[11px]">
                        {c.field} {c.operator} "{c.value}"
                      </p>
                    ))}
                  </div>

                  <div className="p-2.5 rounded bg-ds-surface-raised border border-ds-border space-y-1">
                    <span className="font-bold text-tertiary uppercase text-[10px] block">THEN ACTIONS:</span>
                    {rule.actions?.map((a, i) => (
                      <p key={i} className="text-emerald-500 font-mono text-[11px] flex items-center gap-1">
                        <ArrowRight size={12} /> {a.type}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-ds-border">
                  <Button variant="secondary" size="xs" icon={Trash2} onClick={() => handleDelete(rule._id)} className="text-red-500">
                    Delete
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Card className="p-6 border-ds-border bg-ds-surface shadow-sm">
          <div className="space-y-3">
            <h3 className="font-bold text-primary text-sm">Recent Execution Log</h3>
            {history.length === 0 ? (
              <p className="text-xs text-tertiary">No executions recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h._id} className="p-3 rounded-lg border border-ds-border bg-ds-surface-raised flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <span className="font-bold text-primary">{h.ruleId?.name || 'Automation Rule'}</span>
                      <p className="text-[11px] text-tertiary">Ticket #{h.ticketId?.ticketNumber || 'N/A'} • {new Date(h.executedAt).toLocaleString()}</p>
                    </div>
                    <Badge color={h.success ? 'emerald' : 'red'}>
                      {h.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Drawer Builder */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title="Create Workflow Automation Rule"
      >
        <form onSubmit={handleSave} className="space-y-5 p-4 text-xs">
          <div className="space-y-1">
            <label className="ds-label font-bold text-primary">Rule Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g. Auto-Escalate Critical Security Tickets"
              className="ds-input text-xs w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="ds-label font-bold text-primary">Event Trigger *</label>
            <select
              value={form.trigger}
              onChange={e => setForm({ ...form, trigger: e.target.value })}
              className="ds-input text-xs w-full"
            >
              <option value="ticket_created">When Ticket is Created</option>
              <option value="ticket_updated">When Ticket is Updated</option>
              <option value="ticket_status_changed">When Status Changes</option>
              <option value="sla_warning">When SLA Nearing Expiry</option>
              <option value="sla_breached">When SLA Breached</option>
            </select>
          </div>

          <div className="space-y-2 border-t border-ds-border pt-3">
            <label className="ds-label font-bold text-primary block">Conditions</label>
            {form.conditions.map((c, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2">
                <select
                  value={c.field}
                  onChange={e => {
                    const next = [...form.conditions]
                    next[idx].field = e.target.value
                    setForm({ ...form, conditions: next })
                  }}
                  className="ds-input text-xs"
                >
                  <option value="priority">Priority</option>
                  <option value="category">Category</option>
                  <option value="status">Status</option>
                </select>

                <select
                  value={c.operator}
                  onChange={e => {
                    const next = [...form.conditions]
                    next[idx].operator = e.target.value
                    setForm({ ...form, conditions: next })
                  }}
                  className="ds-input text-xs"
                >
                  <option value="equals">equals</option>
                  <option value="not_equals">not equals</option>
                  <option value="contains">contains</option>
                </select>

                <input
                  type="text"
                  value={c.value}
                  onChange={e => {
                    const next = [...form.conditions]
                    next[idx].value = e.target.value
                    setForm({ ...form, conditions: next })
                  }}
                  className="ds-input text-xs"
                  placeholder="value"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-ds-border">
            <Button variant="secondary" onClick={() => setShowDrawer(false)} type="button">Cancel</Button>
            <Button variant="primary" type="submit" isLoading={saving}>Save &amp; Activate Rule</Button>
          </div>
        </form>
      </Drawer>

    </div>
  )
}
