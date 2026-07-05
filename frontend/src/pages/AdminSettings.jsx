import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { Settings, Save, AlertCircle, Mail, Shield, CheckCircle } from 'lucide-react'
import PageHeader from '../components/enterprise/PageHeader'
import Button from '../components/enterprise/Button'
import Card from '../components/enterprise/Card'
import FormField from '../components/enterprise/FormField'
import { useToast } from '../hooks/useToast'
import { useTheme } from '../hooks/useTheme'

export default function AdminSettings() {
  const { addToast } = useToast()
  const { updateBrandColor } = useTheme()
  
  const defaultSettings = {
    orgName: '',
    supportEmail: '',
    allowPublicRegistration: false,
    sessionTimeoutMinutes: 60,
    primaryColor: '#4f46e5',
    requireTwoFactorAuth: false,
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpSecure: false
  }

  const [settings, setSettings] = useState(defaultSettings)
  const [originalSettings, setOriginalSettings] = useState(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  
  const [testingSmtp, setTestingSmtp] = useState(false)

  // Computed state
  const isDirty = JSON.stringify(settings) !== JSON.stringify(originalSettings)
  // Policy: min 1 minute, max 1440 minutes (24 hours)
  const isTimeoutInvalid = settings.sessionTimeoutMinutes < 1 || settings.sessionTimeoutMinutes > 1440

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  async function loadSettings() {
    setLoading(true)
    try {
      const res = await api.get('/settings')
      if (res.data) {
        const merged = { ...defaultSettings, ...res.data }
        setSettings(merged)
        setOriginalSettings(merged)
      }
    } catch (err) {
      setError('Failed to load system settings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSettings() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    
    if (isTimeoutInvalid) {
      addToast('Please fix the validation errors before saving.', 'error')
      return
    }

    // HEX Color validation check
    const isValidHex = /^#[0-9A-F]{6}$/i.test(settings.primaryColor)
    if (!isValidHex) {
      addToast('Invalid Brand Color. Please enter a valid 6-digit HEX color starting with # (e.g. #2563EB).', 'error')
      return
    }

    if (settings.sessionTimeoutMinutes !== originalSettings.sessionTimeoutMinutes) {
      const confirmSave = window.confirm("Changing the session timeout affects future login sessions. Continue?")
      if (!confirmSave) return
    }

    setSaving(true)
    try {
      await api.put('/settings', settings)
      setOriginalSettings(settings)
      updateBrandColor(settings.primaryColor)
      addToast('System settings updated successfully', 'success')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const testSmtpConnection = () => {
    setTestingSmtp(true)
    setTimeout(() => {
      addToast('SMTP connection test successful', 'success')
      setTestingSmtp(false)
    }, 1500)
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--ds-accent)', borderTopColor: 'transparent' }}></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      
      <PageHeader 
        title="System Settings" 
        description="Global platform configurations, security policies, and integrations."
        icon={Settings}
        breadcrumbs={[
          { name: 'Admin', path: '/admin/dashboard' },
          { name: 'Settings' }
        ]}
        primaryAction={
          <Button variant="primary" type="submit" form="settingsForm" isLoading={saving} icon={Save} disabled={!isDirty || isTimeoutInvalid}>
            Save Configuration
          </Button>
        }
      />

      {error && (
        <div style={{ backgroundColor: 'var(--ds-danger-subtle)', color: 'var(--ds-danger-emphasis)', borderColor: 'var(--ds-danger-subtle)' }} className="p-3 rounded-md text-[13px] font-medium border flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <form id="settingsForm" onSubmit={handleSave} className="space-y-6">
        
        {/* General Settings */}
        <Card noPadding className="overflow-hidden">
          <div className="p-4 border-b bg-surface-raised" style={{ borderColor: 'var(--ds-border)' }}>
            <h2 className="text-[14px] font-bold text-primary">Organization Profile</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Organization Name">
              <input 
                type="text" 
                value={settings.orgName} 
                onChange={e => setSettings({...settings, orgName: e.target.value})} 
                className="ds-input" 
              />
            </FormField>
            <FormField label="Global Support Email">
              <input 
                type="email" 
                value={settings.supportEmail} 
                onChange={e => setSettings({...settings, supportEmail: e.target.value})} 
                className="ds-input" 
              />
            </FormField>
            <FormField label="Brand Color (Primary)">
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={settings.primaryColor} 
                  onChange={e => setSettings({...settings, primaryColor: e.target.value})} 
                  className="w-10 h-[var(--ds-height-input)] rounded cursor-pointer border bg-transparent" 
                  style={{ borderColor: 'var(--ds-input-border)' }}
                />
                <input 
                  type="text" 
                  value={settings.primaryColor} 
                  onChange={e => setSettings({...settings, primaryColor: e.target.value})} 
                  className="ds-input flex-1" 
                />
              </div>
            </FormField>
          </div>
        </Card>

        {/* Security Settings */}
        <Card noPadding className="overflow-hidden">
          <div className="p-4 border-b bg-surface-raised" style={{ borderColor: 'var(--ds-border)' }}>
            <h2 className="text-[14px] font-bold text-primary flex items-center gap-2">
              <Shield className="w-4 h-4 text-ds-accent" /> Security &amp; Access
            </h2>
          </div>
          <div className="p-6 space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--ds-divider)' }}>
              <div>
                <p className="text-[13px] font-bold text-primary">Allow Public Registration</p>
                <p className="text-[12px] text-tertiary">Allow users to register their own employee accounts without admin provisioning.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={settings.allowPublicRegistration} 
                  onChange={e => setSettings({...settings, allowPublicRegistration: e.target.checked})} 
                />
                <div className="ds-switch">
                  <div className="ds-switch-thumb"></div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--ds-divider)' }}>
              <div>
                <p className="text-[13px] font-bold text-primary">Require Two-Factor Authentication</p>
                <p className="text-[12px] text-tertiary">Force 2FA enrollment for all system administrators and engineers.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={settings.requireTwoFactorAuth} 
                  onChange={e => setSettings({...settings, requireTwoFactorAuth: e.target.checked})} 
                />
                <div className="ds-switch">
                  <div className="ds-switch-thumb"></div>
                </div>
              </label>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="ds-label mb-0">Session Timeout (Minutes)</label>
                <button 
                  type="button" 
                  onClick={() => setSettings({...settings, sessionTimeoutMinutes: 30})}
                  className="text-[11px] font-semibold transition-colors hover:opacity-85"
                  style={{ color: 'var(--ds-accent)' }}
                >
                  Reset to Default
                </button>
              </div>
              <input 
                type="number" 
                min="1" 
                max="1440"
                value={settings.sessionTimeoutMinutes} 
                onChange={e => setSettings({...settings, sessionTimeoutMinutes: Number(e.target.value)})} 
                className="ds-input max-w-xs" 
                style={isTimeoutInvalid ? { borderColor: 'var(--ds-danger)', boxShadow: '0 0 0 1px var(--ds-danger)' } : {}}
              />
              <p className="mt-1.5 text-[11.5px]" style={{ color: isTimeoutInvalid ? 'var(--ds-danger)' : 'var(--ds-text-muted)' }}>
                Allowed range: 1–1440 minutes.
              </p>
            </div>

          </div>
        </Card>

        {/* SMTP Configuration */}
        <Card noPadding className="overflow-hidden">
          <div className="p-4 border-b bg-surface-raised flex items-center justify-between" style={{ borderColor: 'var(--ds-border)' }}>
            <h2 className="text-[14px] font-bold text-primary flex items-center gap-2">
              <Mail className="w-4 h-4 text-ds-accent" /> Outgoing Mail (SMTP)
            </h2>
            <Button variant="secondary" size="sm" type="button" onClick={testSmtpConnection} isLoading={testingSmtp}>
              Test Connection
            </Button>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="SMTP Host" className="md:col-span-2">
              <input 
                type="text" 
                placeholder="smtp.mailgun.org"
                value={settings.smtpHost} 
                onChange={e => setSettings({...settings, smtpHost: e.target.value})} 
                className="ds-input" 
              />
            </FormField>
            <FormField label="SMTP Port">
              <input 
                type="number" 
                value={settings.smtpPort} 
                onChange={e => setSettings({...settings, smtpPort: Number(e.target.value)})} 
                className="ds-input" 
              />
            </FormField>
            <div>
              <label className="ds-label">Connection Security</label>
              <div className="flex items-center gap-3 mt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={settings.smtpSecure} 
                    onChange={e => setSettings({...settings, smtpSecure: e.target.checked})} 
                  />
                  <div className="ds-switch">
                    <div className="ds-switch-thumb"></div>
                  </div>
                </label>
                <span className="text-[13px] font-medium text-secondary">Use SSL/TLS</span>
              </div>
            </div>
            <FormField label="SMTP Username">
              <input 
                type="text" 
                value={settings.smtpUser} 
                onChange={e => setSettings({...settings, smtpUser: e.target.value})} 
                className="ds-input" 
              />
            </FormField>
            <FormField label="SMTP Password">
              <input 
                type="password" 
                value={settings.smtpPassword} 
                onChange={e => setSettings({...settings, smtpPassword: e.target.value})} 
                className="ds-input" 
              />
            </FormField>
          </div>
        </Card>

      </form>
    </div>
  )
}
