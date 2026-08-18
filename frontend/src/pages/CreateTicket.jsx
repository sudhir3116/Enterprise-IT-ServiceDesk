import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTicket } from '../services/ticketApi'
import { AlertCircle, FileText, Send, Clock, ShieldAlert } from 'lucide-react'
import Button from '../components/enterprise/Button'
import Badge from '../components/enterprise/Badge'
import Card from '../components/enterprise/Card'
import FormField from '../components/enterprise/FormField'
import PageHeader from '../components/enterprise/PageHeader'

import { getUser } from '../services/auth'

const CATEGORIES = ['Hardware', 'Software', 'Network', 'Access/Login', 'Other']
const IMPACTS = ['Low', 'Medium', 'High']
const URGENCIES = ['Low', 'Medium', 'High']
const DEPARTMENTS = ['IT Operations', 'Engineering', 'Human Resources', 'Finance', 'Marketing', 'Sales', 'Legal']

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
  const user = getUser()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [department, setDepartment] = useState(user?.department || DEPARTMENTS[0])
  const [impact, setImpact] = useState(IMPACTS[1])
  const [urgency, setUrgency] = useState(URGENCIES[1])
  
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const derivedPriority = calculatePriority(impact, urgency)
  const slaPreview = getSLAPreview(derivedPriority)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await createTicket({ title, description, category, impact, urgency, department })
      window.toast('Service request submitted successfully', 'success')
      navigate('/employee/my-tickets')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit the request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto pb-10 flex flex-col gap-6">
      
      {/* Header */}
      <PageHeader 
        title="Report an Issue"
        description="Submit a new incident or service request to the IT Helpdesk."
        breadcrumbs={[
          { name: 'Workspace', path: '/employee/dashboard' },
          { name: 'New Request' }
        ]}
      />

      {error && (
        <div
          className="p-3 rounded-md text-[13px] font-medium border flex items-center gap-2"
          style={{ backgroundColor: 'var(--ds-danger-subtle)', borderColor: 'var(--ds-danger-subtle)', color: 'var(--ds-danger)' }}
        >
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Area */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <Card className="space-y-5">
              
              <FormField label="Subject / Title" required>
                <input 
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Cannot connect to Office VPN"
                  className="ds-input"
                />
              </FormField>

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
                <FormField label="Impact">
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
                  <p className="text-[10px]" style={{ color: 'var(--ds-text-muted)' }}>Scope of the disruption (e.g. User vs Entire Dept)</p>
                </FormField>
                
                <FormField label="Urgency">
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
                  <p className="text-[10px]" style={{ color: 'var(--ds-text-muted)' }}>How quickly the business needs this resolved</p>
                </FormField>
              </div>

              <FormField label="Detailed Description" required>
                <div className="flex items-start gap-2 mb-1">
                  <FileText className="w-4 h-4 mt-2 shrink-0" style={{ color: 'var(--ds-text-muted)' }} />
                  <textarea 
                    required
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={6}
                    placeholder="Please describe the issue in detail. Include any error messages, steps to reproduce, or troubleshooting already attempted."
                    className="ds-textarea flex-1"
                  />
                </div>
              </FormField>

              <div
                className="pt-4 flex justify-end gap-3"
                style={{ borderTop: '1px solid var(--ds-border)' }}
              >
                <button 
                  type="button" 
                  onClick={() => navigate(-1)}
                  className="px-4 py-2 text-[13px] font-bold transition-colors"
                  style={{ color: 'var(--ds-text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--ds-text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--ds-text-secondary)'}
                >
                  Cancel
                </button>
                <Button type="submit" isLoading={loading} icon={Send}>
                  Submit Request
                </Button>
              </div>
            </Card>
          </form>
        </div>

        {/* Sidebar: Auto-Calculated Priority Preview */}
        <div className="w-full">
          <Card className="sticky top-6 p-5">
            <h3
              className="text-[14px] font-bold pb-3 mb-4"
              style={{ color: 'var(--ds-text-primary)', borderBottom: '1px solid var(--ds-border)' }}
            >
              Request Assessment
            </h3>
            
            <div className="space-y-5">
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ds-text-muted)' }}>Calculated Priority</span>
                <Badge color={slaPreview.color}>{derivedPriority}</Badge>
                <p className="text-[12px] mt-2 leading-tight" style={{ color: 'var(--ds-text-secondary)' }}>
                  {slaPreview.desc}. Priority is automatically determined based on your selected impact and urgency.
                </p>
              </div>
              
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ds-text-muted)' }}>Estimated SLA Target</span>
                <div
                  className="flex items-center gap-2 text-[13px] font-bold p-3 rounded-lg"
                  style={{ color: 'var(--ds-text-primary)', backgroundColor: 'var(--ds-surface-raised)', border: '1px solid var(--ds-border)' }}
                >
                  <Clock className="w-4 h-4" style={{ color: 'var(--ds-text-muted)' }} />
                  {slaPreview.time} Resolution
                </div>
              </div>

              <div className="pt-4" style={{ borderTop: '1px solid var(--ds-border)' }}>
                <div
                  className="p-3 rounded-lg text-[12px] leading-relaxed"
                  style={{ backgroundColor: 'var(--ds-accent-subtle)', color: 'var(--ds-accent)' }}
                >
                  <span className="font-bold">Did you know?</span> Providing detailed error messages and screenshots significantly reduces resolution time.
                </div>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  )
}
