import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, PlusCircle, Ticket, Bot, Users, Wrench, BarChart, 
  ShieldCheck, Settings, LayoutDashboard, BookOpen, 
  ChevronsLeft, ChevronsRight, Building2, Shield, FolderTree, Clock, BellRing, User
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user } = useAuth()
  const location = useLocation()
  
  const userInitials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'
  // Role comes exclusively from the RBAC system — never from client-side identity checks
  const role = user?.role || 'employee'

  const getSettingsPath = () => {
    if (role === 'admin') return '/admin/settings'
    if (role === 'support_engineer') return '/engineer/profile'
    return '/employee/profile'
  }

  const NavItem = ({ to, icon: Icon, label, exact = false }) => {
    const isActive = exact ? location.pathname === to : location.pathname.startsWith(to)
    return (
      <Link 
        to={to}
        onClick={() => setMobileOpen(false)}
        className={`ds-sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center !gap-0' : 'justify-start'}`}
        title={collapsed ? label : undefined}
      >
        <Icon 
          className="w-4 h-4 shrink-0 transition-colors" 
          style={{ color: isActive ? 'var(--ds-sidebar-icon-active)' : 'var(--ds-sidebar-icon)' }} 
        />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    )
  }

  const SectionLabel = ({ children }) => (
    collapsed ? null : (
      <p className="ds-sidebar-section-label">
        {children}
      </p>
    )
  )

  return (
    <aside 
      className={`
        fixed inset-y-0 left-0 z-50 border-r
        transform transition-all duration-200 ease-in-out lg:static lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        ${collapsed ? 'w-[72px]' : 'w-[280px]'}
        flex flex-col shrink-0
      `}
      style={{ 
        backgroundColor: 'var(--ds-sidebar-bg)', 
        borderColor: 'var(--ds-sidebar-border)',
        boxShadow: 'var(--ds-shadow-sm)'
      }}
    >
      {/* Brand Header */}
      <div 
        className="h-14 flex items-center justify-between px-4 border-b shrink-0"
        style={{ backgroundColor: 'var(--ds-sidebar-header)', borderColor: 'var(--ds-sidebar-border)' }}
      >
        <div className={`flex items-center gap-2.5 overflow-hidden transition-all duration-200 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          <div 
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--ds-accent) 0%, var(--ds-accent-hover) 100%)' }}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[14px] font-bold font-heading tracking-tight whitespace-nowrap" style={{ color: 'var(--ds-sidebar-text-hover)' }}>ITSM Desk</span>
        </div>
        
        {collapsed && (
          <div 
            className="w-7 h-7 rounded-md flex items-center justify-center mx-auto cursor-pointer"
            style={{ background: 'linear-gradient(135deg, var(--ds-accent) 0%, var(--ds-accent-hover) 100%)' }}
            onClick={() => setCollapsed(false)}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        
        {!collapsed && (
          <button 
            onClick={() => setCollapsed(true)}
            className="hidden lg:flex p-1.5 rounded-md transition-colors hover:bg-[var(--ds-sidebar-active-bg)]"
            style={{ color: 'var(--ds-sidebar-icon)' }}
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 scrollbar-hide">
        <SectionLabel>Workspace</SectionLabel>
        
        {role === 'employee' ? (
          <>
            <NavItem to="/employee/dashboard" exact icon={Home} label="Dashboard" />
            <NavItem to="/employee/create-ticket" icon={PlusCircle} label="Create Ticket" />
            <NavItem to="/employee/my-tickets" icon={Ticket} label="My Tickets" />
            <NavItem to="/employee/knowledge-base" icon={BookOpen} label="Knowledge Base" />
          </>
        ) : role === 'admin' ? (
          <>
            <NavItem to="/admin/dashboard" exact icon={Home} label="Overview" />
            <NavItem to="/admin/tickets" icon={Ticket} label="Service Requests" />
            <NavItem to="/admin/reports" icon={BarChart} label="Analytics" />
            <NavItem to="/admin/notifications" icon={BellRing} label="Broadcasts" />
            <NavItem to="/knowledge-base" icon={BookOpen} label="Knowledge Base" />
            <SectionLabel>Configuration</SectionLabel>
            <NavItem to="/admin/users" icon={Users} label="User Directory" />
            <NavItem to="/admin/engineers" icon={Wrench} label="Engineers" />
            <NavItem to="/admin/departments" icon={Building2} label="Departments" />
            <NavItem to="/admin/roles" icon={Shield} label="System Roles" />
            <NavItem to="/admin/categories" icon={FolderTree} label="Categories" />
            <NavItem to="/admin/slas" icon={Clock} label="SLA Policies" />
            <NavItem to="/admin/audit-logs" icon={ShieldCheck} label="Audit Logs" />
          </>
        ) : (
          <>
            <NavItem to="/engineer/dashboard" exact icon={Home} label="Dashboard" />
            <NavItem to="/engineer/assigned" icon={Ticket} label="Assigned Tickets" />
            <NavItem to="/knowledge-base" icon={BookOpen} label="Knowledge Base" />
            <NavItem to="/engineer/profile" icon={User} label="My Profile" />
          </>
        )}

        <SectionLabel>System</SectionLabel>
        {role === 'employee' && (
          <>
            <NavItem to="/employee/notifications" icon={BellRing} label="Notifications" />
            <NavItem to="/employee/profile" icon={User} label="My Profile" />
          </>
        )}
        <NavItem to={getSettingsPath()} icon={Settings} label="Settings" />
      </nav>

      {/* User Profile Footer */}
      <div 
        className="p-2 border-t shrink-0"
        style={{ borderColor: 'var(--ds-sidebar-border)', backgroundColor: 'var(--ds-sidebar-header)' }}
      >
        <div 
          className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} w-full p-2 rounded-md cursor-pointer transition-colors hover:bg-[var(--ds-sidebar-active-bg)]`}
        >
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 text-white"
            style={{ background: 'linear-gradient(135deg, var(--ds-accent) 0%, var(--ds-accent-hover) 100%)' }}
          >
            {userInitials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--ds-sidebar-active-text)' }}>{user?.name}</p>
              <p className="text-[11px] truncate capitalize" style={{ color: 'var(--ds-sidebar-text)' }}>{role.replace('_', ' ')}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
