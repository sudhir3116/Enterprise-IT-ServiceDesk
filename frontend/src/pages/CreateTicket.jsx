import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTicket } from '../services/ticketApi'
import { useAuth } from '../context/AuthContext'
import { AlertCircle, FileText, Send, Clock, ShieldAlert, Laptop, Paperclip, Tag, ListOrdered, CheckCircle, AlertTriangle } from 'lucide-react'
import Button from '../components/enterprise/Button'
import Badge from '../components/enterprise/Badge'
import Card from '../components/enterprise/Card'
import FormField from '../components/enterprise/FormField'
import PageHeader from '../components/enterprise/PageHeader'

const CATEGORIES = ['Software', 'Hardware', 'Network', 'Access/Login', 'Security', 'General', 'Other']
const IMPACTS = ['Low', 'Medium', 'High']
const URGENCIES = ['Low', 'Medium', 'High']
const DEPARTMENTS = ['Engineering', 'IT Operations', 'Human Resources', 'Finance', 'Marketing', 'Sales', 'Customer Support', 'Legal']

function detectEnvironment() {
  const ua = navigator.userAgent
  let browser = 'Chrome'
  let os = 'macOS'
  let device = 'Desktop'

  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
  else if (ua.includes('Edg')) browser = 'Edge'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
  else if (ua.includes('Firefox')) browser = 'Firefox'

  if (ua.includes('Mac OS X')) os = 'macOS'
  else if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) { os = 'Android'; device = 'Mobile' }
  else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; device = ua.includes('iPad') ? 'Tablet' : 'Mobile' }

  return { browser, OS: os, device }
}

function calculatePriority(impact, urgency) {
  if (impact === 'High' && urgency === 'High') return 'Critical'
  if ((impact === 'High' && urgency === 'Medium') || (impact === 'Medium' && urgency === 'High')) return 'High'
  if (impact === 'Medium' && urgency === 'Medium') return 'Medium'
  return 'Low'
}

function getSLAPreview(priority) {
  switch (priority) {
    case 'Critical': return { time: '4 Hours',  color: 'red',    desc: 'Critical business impact' }
    case 'High':     return { time: '24 Hours', color: 'yellow', desc: 'Significant disruption' }
    case 'Medium':   return { time: '72 Hours', color: 'blue',   desc: 'Moderate impact' }
    default:         return { time: '120 Hours', color: 'gray',   desc: 'Standard request' }
  }
}

export default function CreateTicket() {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [department, setDepartment] = useState(user?.department || DEPARTMENTS[0])
  const [impact, setImpact] = useState(IMPACTS[1])
  const [urgency, setUrgency] = useState(URGENCIES[1])

  // Technical SaaS Details
  const [stepsToReproduce, setStepsToReproduce] = useState('')
  const [expectedBehavior, setExpectedBehavior] = useState('')
  const [actualBehavior, setActualBehavior] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')

  const [envInfo, setEnvInfo] = useState({ browser: '', OS: '', device: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setEnvInfo(detectEnvironment())
  }, [])

  const derivedPriority = calculatePriority(impact, urgency)
  const slaPreview = getSLAPreview(derivedPriority)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const tags = tagInput
      ? tagInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
      : []

    const attachments = attachmentUrl
      ? [{ name: 'Attachment File', url: attachmentUrl, fileType: 'link' }]
      : []

    const payload = {
      title,
      description,
      category,
      impact,
      urgency,
      department,
      tags,
      environment: envInfo,
      issueDetails: {
        stepsToReproduce,
        expectedBehavior,
        actualBehavior,
      },
      attachments,
    }

    try {
      await createTicket(payload)
      window.toast?.('Support request submitted successfully', 'success')
      navigate('/employee/my-tickets')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit the support request.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto pb-10 flex flex-col gap-6">
      
      {/* Header */}
      <PageHeader 
        title="Create Support Ticket"
        description="Submit a detailed incident or technical request to your support engineering team."
        breadcrumbs={[
          { name: 'Workspace', path: '/employee/dashboard' },
          { name: 'New Ticket' }
        ]}
      />

      {error && (
        <div
          className="p-3 rounded-md text-[13px] font-medium border flex items-center gap-2"
          style={{ backgroundColor: 'var(--ds-danger-subtle)', borderColor: 'var(--ds-danger-subtle)', color: 'var(--ds-danger)' }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <Card className="space-y-5">
              
              {/* Subject */}
              <FormField label="Ticket Subject / Title" required>
                <input 
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. 504 Gateway Timeout connecting to West Coast VPN"
                  className="ds-input"
                />
              </FormField>

              {/* Classification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FormField label="Category" required>
                  <select 
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="ds-select"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FormField>

                <FormField label="Department" required>
                  <select 
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="ds-select"
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </FormField>
              </div>

              {/* Impact / Urgency */}
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 rounded-lg"
                style={{ backgroundColor: 'var(--ds-surface-raised)', border: '1px solid var(--ds-border)' }}
              >
                <FormField label="Impact Scope">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldAlert className="w-3.5 h-3.5" style={{ color: 'var(--ds-text-muted)' }} />
                    <select 
                      value={impact}
                      onChange={e => setImpact(e.target.value)}
                      className="ds-select flex-1"
                    >
                      {IMPACTS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <p className="text-[10px]" style={{ color: 'var(--ds-text-muted)' }}>Disruption scope (Single User vs Whole Dept)</p>
                </FormField>
                
                <FormField label="Business Urgency">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5" style={{ color: 'var(--ds-text-muted)' }} />
                    <select 
                      value={urgency}
                      onChange={e => setUrgency(e.target.value)}
                      className="ds-select flex-1"
                    >
                      {URGENCIES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <p className="text-[10px]" style={{ color: 'var(--ds-text-muted)' }}>Required turn-around speed</p>
                </FormField>
              </div>

              {/* Technical Issue Details */}
              <div className="p-4 rounded-lg space-y-4" style={{ backgroundColor: 'var(--ds-surface-raised)', border: '1px solid var(--ds-border)' }}>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-[var(--ds-text-muted)] flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-blue-500" /> Technical Details &amp; Reproduction Steps
                </h4>

                <FormField label="Steps to Reproduce">
                  <textarea
                    rows={2}
                    value={stepsToReproduce}
                    onChange={e => setStepsToReproduce(e.target.value)}
                    placeholder="1. Open App → 2. Click Login → 3. Observe error code 504"
                    className="ds-textarea"
                  />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Expected Behavior">
                    <input
                      type="text"
                      value={expectedBehavior}
                      onChange={e => setExpectedBehavior(e.target.value)}
                      placeholder="e.g. Dashboard loads within 2 seconds"
                      className="ds-input"
                    />
                  </FormField>

                  <FormField label="Actual Behavior">
                    <input
                      type="text"
                      value={actualBehavior}
                      onChange={e => setActualBehavior(e.target.value)}
                      placeholder="e.g. Infinite spinner then network timeout"
                      className="ds-input"
                    />
                  </FormField>
                </div>
              </div>

              {/* Description */}
              <FormField label="Detailed Problem Description" required>
                <div className="flex items-start gap-2 mb-1">
                  <FileText className="w-4 h-4 mt-2 shrink-0" style={{ color: 'var(--ds-text-muted)' }} />
                  <textarea 
                    required
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={5}
                    placeholder="Provide full issue details, error messages, system logs, or background context..."
                    className="ds-textarea flex-1"
                  />
                </div>
              </FormField>

              {/* Tags & Attachments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Tags (Comma separated)">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 shrink-0 text-gray-400" />
                    <input
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      placeholder="vpn, macos, timeout"
                      className="ds-input"
                    />
                  </div>
                </FormField>

                <FormField label="Attachment URL / Log Link">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 shrink-0 text-gray-400" />
                    <input
                      type="url"
                      value={attachmentUrl}
                      onChange={e => setAttachmentUrl(e.target.value)}
                      placeholder="https://storage.company.com/logs/error.log"
                      className="ds-input"
                    />
                  </div>
                </FormField>
              </div>

              {/* Actions */}
              <div
                className="pt-4 flex justify-end gap-3"
                style={{ borderTop: '1px solid var(--ds-border)' }}
              >
                <button 
                  type="button" 
                  onClick={() => navigate(-1)}
                  className="px-4 py-2 text-[13px] font-bold transition-colors"
                  style={{ color: 'var(--ds-text-secondary)' }}
                >
                  Cancel
                </button>
                <Button type="submit" isLoading={loading} icon={Send}>
                  Submit Ticket
                </Button>
              </div>
            </Card>
          </form>
        </div>

        {/* Sidebar Preview */}
        <div className="w-full space-y-6">
          
          {/* Priority Assessment */}
          <Card className="p-5">
            <h3
              className="text-[14px] font-bold pb-3 mb-4"
              style={{ color: 'var(--ds-text-primary)', borderBottom: '1px solid var(--ds-border)' }}
            >
              Incident Assessment
            </h3>
            
            <div className="space-y-4">
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ds-text-muted)' }}>Calculated Priority</span>
                <Badge color={slaPreview.color}>{derivedPriority}</Badge>
                <p className="text-[12px] mt-2 leading-tight" style={{ color: 'var(--ds-text-secondary)' }}>
                  {slaPreview.desc}. Derived dynamically from Impact &amp; Urgency.
                </p>
              </div>
              
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ds-text-muted)' }}>Target SLA Deadline</span>
                <div
                  className="flex items-center gap-2 text-[13px] font-bold p-3 rounded-lg"
                  style={{ color: 'var(--ds-text-primary)', backgroundColor: 'var(--ds-surface-raised)', border: '1px solid var(--ds-border)' }}
                >
                  <Clock className="w-4 h-4 text-blue-500" />
                  {slaPreview.time} Target
                </div>
              </div>
            </div>
          </Card>

          {/* Auto-Captured Environment Box */}
          <Card className="p-5">
            <h3
              className="text-[14px] font-bold pb-3 mb-3 flex items-center gap-2"
              style={{ color: 'var(--ds-text-primary)', borderBottom: '1px solid var(--ds-border)' }}
            >
              <Laptop className="w-4 h-4 text-indigo-500" /> Environment Telemetry
            </h3>
            <p className="text-[11px] mb-3" style={{ color: 'var(--ds-text-muted)' }}>
              Automatically captured system information for faster debugging:
            </p>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Browser:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{envInfo.browser}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Operating System:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{envInfo.OS}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Device Type:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{envInfo.device}</span>
              </div>
            </div>
          </Card>

        </div>

      </div>
    </div>
  )
}

