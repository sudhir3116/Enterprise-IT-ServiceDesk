import React, { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import './App.css'
import './styles/global.css'

import AuthLayout from './layouts/AuthLayout'
import DashboardLayout from './layouts/DashboardLayout'
import EnterpriseLayout from './layouts/EnterpriseLayout'

import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import ErrorBoundary from './components/ErrorBoundary'

import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import NotFound from './pages/NotFound'
import Unauthorized from './pages/Unauthorized'
import OAuthCallback from './pages/OAuthCallback'

const EmployeeDashboard = lazy(() => import('./pages/EmployeeDashboard'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const EngineerDashboard = lazy(() => import('./pages/EngineerDashboard'))
import EngineerTickets from './pages/EngineerTickets'
import EngineerTicketDetails from './pages/EngineerTicketDetails'
import EngineerProfile from './pages/EngineerProfile'
import EngineerNotifications from './pages/EngineerNotifications'
import EmployeeNotifications from './pages/EmployeeNotifications'
import AdminTickets from './pages/AdminTickets'
import AdminEngineers from './pages/AdminEngineers'
const AdminReports = lazy(() => import('./pages/AdminReports'))
import AdminDepartments from './pages/AdminDepartments'
import AdminRoles from './pages/AdminRoles'
import AdminCategories from './pages/AdminCategories'
import AdminSLA from './pages/AdminSLA'
const AdminSettings = lazy(() => import('./pages/AdminSettings'))
import AdminNotifications from './pages/AdminNotifications'
import CreateTicket from './pages/CreateTicket'
import MyTickets from './pages/MyTickets'
import UpdateTicket from './pages/UpdateTicket'
import Profile from './pages/Profile'
import AdminUserManagement from './pages/AdminUserManagement'
import AuditLogs from './pages/AuditLogs'
import SelfService from './pages/SelfService'
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'))

import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { useToast } from './hooks/useToast'

import { getDashboardPath, getSettingsPath } from './utils/paths'
import api from './services/api'
import { useTheme } from './hooks/useTheme'

function AppRouter() {
  const { user, loading } = useAuth()
  const { addToast } = useToast()
  const { updateBrandColor } = useTheme()

  // ── Sync settings brand color on startup/login ───────────────
  useEffect(() => {
    if (user) {
      api.get('/settings')
        .then(res => {
          if (res.data && res.data.primaryColor) {
            updateBrandColor(res.data.primaryColor)
          }
        })
        .catch(err => {
          console.error("Failed to load settings brand color:", err)
        })
    }
  }, [user, updateBrandColor])

  // ── Global toast API (Fallback for legacy code) ────────────────
  useEffect(() => {
    window.toast = (message, type = 'success') => {
      addToast(message, type)
    }
  }, [addToast])

  // ── Global loading screen ────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen w-full" style={{ backgroundColor: 'var(--ds-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--ds-accent)', borderTopColor: 'transparent' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--ds-text-muted)' }}>Loading workspace…</p>
        </div>
      </div>
    )
  }

  const role = user?.role || 'employee'

  return (
    <>
      <Routes>
        {/* ── Auth Routes (no sidebar/header) ────────────────── */}
        <Route element={<AuthLayout />}>
          <Route path="/login"          element={user ? <Navigate to={getDashboardPath(role)} replace /> : <Login />} />
          <Route path="/register"       element={user ? <Navigate to={getDashboardPath(role)} replace /> : <Register />} />
          <Route path="/forgot-password"element={user ? <Navigate to={getDashboardPath(role)} replace /> : <ForgotPassword />} />
          <Route path="/reset-password" element={user ? <Navigate to={getDashboardPath(role)} replace /> : <ResetPassword />} />
          <Route path="/verify-email"   element={<VerifyEmail />} />
          <Route path="/oauth-callback" element={<OAuthCallback />} />
        </Route>

        {/* ── Error pages (no sidebar) ───────────────────────── */}
        <Route path="/404"          element={<NotFound />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* ── Authenticated Dashboard Routes ─────────────────── */}
        
        {/* Admin Routes (Enterprise Layout) */}
        <Route element={<ErrorBoundary><EnterpriseLayout /></ErrorBoundary>}>
          <Route path="/admin/dashboard"  element={<ProtectedRoute><RoleRoute role="admin"><AdminDashboard /></RoleRoute></ProtectedRoute>} />
          <Route path="/admin/users"      element={<ProtectedRoute><RoleRoute role="admin"><AdminUserManagement /></RoleRoute></ProtectedRoute>} />
          <Route path="/admin/audit-logs" element={<ProtectedRoute><RoleRoute role="admin"><AuditLogs /></RoleRoute></ProtectedRoute>} />
          <Route path="/admin/tickets"    element={<ProtectedRoute><RoleRoute role="admin"><AdminTickets /></RoleRoute></ProtectedRoute>} />
          <Route path="/admin/engineers"  element={<ProtectedRoute><RoleRoute role="admin"><AdminEngineers /></RoleRoute></ProtectedRoute>} />
          <Route path="/admin/reports"    element={<ProtectedRoute><RoleRoute role="admin"><AdminReports /></RoleRoute></ProtectedRoute>} />
          <Route path="/admin/departments" element={<ProtectedRoute><RoleRoute role="admin"><AdminDepartments /></RoleRoute></ProtectedRoute>} />
          <Route path="/admin/roles"      element={<ProtectedRoute><RoleRoute role="admin"><AdminRoles /></RoleRoute></ProtectedRoute>} />
          <Route path="/admin/categories" element={<ProtectedRoute><RoleRoute role="admin"><AdminCategories /></RoleRoute></ProtectedRoute>} />
          <Route path="/admin/slas"       element={<ProtectedRoute><RoleRoute role="admin"><AdminSLA /></RoleRoute></ProtectedRoute>} />
          <Route path="/admin/notifications" element={<ProtectedRoute><RoleRoute role="admin"><AdminNotifications /></RoleRoute></ProtectedRoute>} />
          <Route path="/admin/settings"   element={<ProtectedRoute><RoleRoute role="admin"><AdminSettings /></RoleRoute></ProtectedRoute>} />
          <Route path="/knowledge-base" element={<ProtectedRoute><KnowledgeBase /></ProtectedRoute>} />
        </Route>

        {/* Employee & Engineer Routes (Legacy Layout) */}
        <Route element={<ErrorBoundary><DashboardLayout /></ErrorBoundary>}>
          {/* Employee */}
          <Route path="/employee/dashboard"   element={<ProtectedRoute><RoleRoute role="employee"><EmployeeDashboard /></RoleRoute></ProtectedRoute>} />
          <Route path="/employee/create-ticket" element={<ProtectedRoute><RoleRoute role="employee"><CreateTicket /></RoleRoute></ProtectedRoute>} />
          <Route path="/employee/my-tickets"  element={<ProtectedRoute><RoleRoute role="employee"><MyTickets /></RoleRoute></ProtectedRoute>} />
          <Route path="/employee/ticket/:id"  element={<ProtectedRoute><RoleRoute role="employee"><UpdateTicket /></RoleRoute></ProtectedRoute>} />
          <Route path="/employee/knowledge-base" element={<ProtectedRoute><RoleRoute role="employee"><KnowledgeBase /></RoleRoute></ProtectedRoute>} />
          <Route path="/employee/notifications" element={<ProtectedRoute><RoleRoute role="employee"><EmployeeNotifications /></RoleRoute></ProtectedRoute>} />
          <Route path="/employee/self-service"element={<ProtectedRoute><RoleRoute role="employee"><SelfService /></RoleRoute></ProtectedRoute>} />
          <Route path="/employee/profile"     element={<ProtectedRoute><RoleRoute role="employee"><Profile /></RoleRoute></ProtectedRoute>} />

          {/* Support Engineer */}
          <Route path="/engineer/dashboard" element={<ProtectedRoute><RoleRoute role="support_engineer"><EngineerDashboard /></RoleRoute></ProtectedRoute>} />
          <Route path="/engineer/assigned"  element={<ProtectedRoute><RoleRoute role="support_engineer"><EngineerTickets /></RoleRoute></ProtectedRoute>} />
          <Route path="/engineer/ticket/:id"element={<ProtectedRoute><RoleRoute role="support_engineer"><EngineerTicketDetails /></RoleRoute></ProtectedRoute>} />
          <Route path="/engineer/profile"   element={<ProtectedRoute><RoleRoute role="support_engineer"><EngineerProfile /></RoleRoute></ProtectedRoute>} />
          <Route path="/engineer/notifications" element={<ProtectedRoute><RoleRoute role="support_engineer"><EngineerNotifications /></RoleRoute></ProtectedRoute>} />

          {/* Shared Routes (Employee context) */}
          <Route path="/ticket/:id" element={<ProtectedRoute><UpdateTicket /></ProtectedRoute>} />
        </Route>

        {/* ── Short redirects ────────────────────────────────── */}
        <Route path="/create-ticket" element={<Navigate to="/employee/create-ticket" replace />} />
        <Route path="/my-tickets"    element={<Navigate to="/employee/my-tickets" replace />} />
        <Route path="/profile"       element={<Navigate to={user ? getSettingsPath(role) : '/login'} replace />} />
        <Route path="/admin"         element={<Navigate to="/login" replace />} />
        <Route path="/employee"      element={<Navigate to="/login" replace />} />
        <Route path="/"              element={<Navigate to="/login" replace />} />
        <Route path="*"              element={<Navigate to="/404" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <Router>
      <ErrorBoundary>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <Suspense fallback={
                <div className="flex justify-center items-center h-screen" style={{ backgroundColor: 'var(--ds-bg)' }}>
                  <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--ds-primary)' }} />
                </div>
              }>
                <AppRouter />
              </Suspense>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </Router>
  )
}
