import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { ShieldCheck, Filter, History, Download, AlertCircle } from 'lucide-react'
import PageHeader from '../components/enterprise/PageHeader'
import FilterBar from '../components/enterprise/FilterBar'
import Table from '../components/enterprise/Table'
import Badge from '../components/enterprise/Badge'
import Card, { StatCard } from '../components/enterprise/Card'
import Button from '../components/enterprise/Button'

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [searchText, setSearchText] = useState('')
  const [actionFilter, setActionFilter] = useState('All')

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/audit-logs')
        let data = res.data?.logs || res.data
        if (!Array.isArray(data)) {
          if (data?.data && Array.isArray(data.data)) {
            data = data.data
          } else {
            data = []
          }
        }
        setLogs(data)
      } catch (err) {
        setError('Failed to load system audit logs.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const safeLogs = Array.isArray(logs) ? logs : []
  const filteredLogs = safeLogs.filter(log => {
    const actMatch = actionFilter === 'All' || (log.action && log.action.includes(actionFilter))
    const txtMatch = !searchText || 
      (log.action && log.action.toLowerCase().includes(searchText.toLowerCase())) || 
      (log.performedBy?.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(searchText.toLowerCase())
    return actMatch && txtMatch
  })

  const exportCSV = () => {
    if (filteredLogs.length === 0) return
    const headers = ['Timestamp,Action,Performed By,IP Address,Details']
    const rows = filteredLogs.map(l => {
      const ts = new Date(l.createdAt).toLocaleString()
      const by = l.performedBy?.name || 'SYSTEM'
      const details = (l.details || '').replace(/"/g, '""')
      return `"${ts}","${l.action}","${by}","${l.ipAddress || '127.0.0.1'}","${details}"`
    })
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      
      <PageHeader 
        title="Security Audit Logs" 
        description="Immutable system record of administrative and security events."
        icon={ShieldCheck}
        breadcrumbs={[
          { name: 'Admin', path: '/admin/dashboard' },
          { name: 'Audit Logs' }
        ]}
        secondaryActions={<Button variant="secondary" onClick={exportCSV} icon={Download}>Export CSV</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Events (30d)" value={filteredLogs.length} icon={History} color="indigo" />
        <StatCard title="Security Alerts" value={filteredLogs.filter(l => l.action.includes('FAIL') || l.action.includes('DELETE')).length} icon={AlertCircle} color="red" />
        <StatCard title="System Logins" value={filteredLogs.filter(l => l.action.includes('LOGIN')).length} icon={ShieldCheck} color="emerald" />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-md text-[13px] font-medium border border-red-200 dark:border-red-500/20 flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <Card noPadding className="flex flex-col overflow-hidden">
        <FilterBar 
          searchPlaceholder="Search events, users, or IPs..." 
          searchValue={searchText} 
          onSearchChange={setSearchText}
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-tertiary" />
            <select 
              value={actionFilter} 
              onChange={e => setActionFilter(e.target.value)}
              className="text-[13px] border border-strong rounded-md bg-surface text-secondary py-1.5 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option>All</option>
              <option value="LOGIN">Logins</option>
              <option value="CREATE">Creations</option>
              <option value="UPDATE">Updates</option>
              <option value="DELETE">Deletions</option>
            </select>
          </div>
        </FilterBar>

        <Table 
          isLoading={loading}
          data={filteredLogs}
          emptyMessage={
            <div className="py-12 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center mb-4">
                <History className="w-6 h-6 text-tertiary" />
              </div>
              <h3 className="text-[14px] font-bold text-primary">No Audit Logs Found</h3>
              <p className="text-[13px] text-tertiary mt-1 max-w-sm">
                No system events match your current search and filter criteria.
              </p>
            </div>
          }
          columns={[
            {
              header: 'Timestamp',
              accessor: 'createdAt',
              render: log => (
                <span className="text-[12px] text-secondary font-mono">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              )
            },
            {
              header: 'Event Action',
              accessor: 'action',
              render: log => (
                <Badge color={log.action.includes('DELETE') || log.action.includes('FAIL') ? 'red' : log.action.includes('CREATE') ? 'emerald' : 'blue'}>
                  {log.action}
                </Badge>
              )
            },
            {
              header: 'Performed By',
              sortable: false,
              render: log => (
                <span className="text-[12px] font-bold text-primary">
                  {log.performedBy?.name || 'SYSTEM'}
                </span>
              )
            },
            {
              header: 'IP Address',
              accessor: 'ipAddress',
              render: log => (
                <span className="text-[12px] font-mono text-tertiary">
                  {log.ipAddress || '127.0.0.1'}
                </span>
              )
            },
            {
              header: 'Details',
              accessor: 'details',
              render: log => (
                <span className="text-[12px] text-secondary truncate max-w-xs block" title={log.details}>
                  {log.details || '-'}
                </span>
              )
            }
          ]}
        />
      </Card>
    </div>
  )
}
