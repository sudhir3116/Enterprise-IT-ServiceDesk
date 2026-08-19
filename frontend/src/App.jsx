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
import PendingApproval from './pages/PendingApproval'
import AdminPendingApprovals from './pages/AdminPendingApprovals'

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
import AdminEmailSettings from './pages/AdminEmailSettings'
import AdminNotifications from './pages/AdminNotifications'
import CreateTicket from './pages/CreateTicket'
import MyTickets from './pages/MyTickets'
import UpdateTicket from './pages/UpdateTicket'
import Profile from './pages/Profile'
import AdminUserManagement from './pages/AdminUserManagement'
import AuditLogs from './pages/AuditLogs'
import SelfService from './pages/SelfService'
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'))

// Module 8 — Bug Investigation & Product Feedback
import EngineerBugInvestigation from './pages/EngineerBugInvestigation'
import DeveloperBugDashboard from './pages/DeveloperBugDashboard'
import FeatureRequest from './pages/FeatureRequest'
import ProductFeedbackManagement from './pages/ProductFeedbackManagement'

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

  const role = user?.role || 'customer'

  return (
    <>
      <Routes>
        {/* ── Auth Routes (no sidebar/header) ────────────────── */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={user ? <Navigate to={getDashboardPath(role)} replace /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to={getDashboardPath(role)} replace /> : <Register />} />
          <Route path="/forgot-password" element={user ? <Navigate to={getDashboardPath(role)} replace /> : <ForgotPassword />} />
          <Route path="/reset-password" element={user ? <Navigate to={getDashboardPath(role)} replace /> : <ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/oauth-callback" element={<OAuthCallback />} />
        </Route>

        {/* ── Error & Standalone pages (no sidebar) ─────────────── */}
        <Route path="/404" element={<NotFound />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/pending-approval" element={<PendingApproval />} />

        {/* ── Authenticated Dashboard Routes ─────────────────── */}

        {/* Admin Routes (Enterprise Layout) */}
        <Route element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <ErrorBoundary>
              <EnterpriseLayout />
            </ErrorBoundary>
          </ProtectedRoute>
        }>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/approvals" element={<AdminPendingApprovals />} />
          <Route path="/admin/users" element={<AdminUserManagement />} />
          <Route path="/admin/audit-logs" element={<AuditLogs />} />
          <Route path="/admin/tickets" element={<AdminTickets />} />
          <Route path="/admin/engineers" element={<AdminEngineers />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/departments" element={<AdminDepartments />} />
          <Route path="/admin/roles" element={<AdminRoles />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/slas" element={<AdminSLA />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/email-settings" element={<AdminEmailSettings />} />
          <Route path="/knowledge-base" element={<KnowledgeBase />} />
          {/* Module 8 */}
          <Route path="/admin/bugs" element={<EngineerBugInvestigation />} />
          <Route path="/admin/feedback" element={<ProductFeedbackManagement />} />
        </Route>

        {/* Employee / Customer Routes (Legacy Layout) */}
        <Route element={
          <ProtectedRoute allowedRoles={["customer", "employee", "requester"]}>
            <ErrorBoundary>
              <DashboardLayout />
            </ErrorBoundary>
          </ProtectedRoute>
        }>
          <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          <Route path="/employee/create-ticket" element={<CreateTicket />} />
          <Route path="/employee/my-tickets" element={<MyTickets />} />
          <Route path="/employee/ticket/:id" element={<UpdateTicket />} />
          <Route path="/employee/knowledge-base" element={<KnowledgeBase />} />
          <Route path="/employee/notifications" element={<EmployeeNotifications />} />
          <Route path="/employee/self-service" element={<SelfService />} />
          <Route path="/employee/profile" element={<Profile />} />
          {/* Module 8 */}
          <Route path="/employee/feedback" element={<FeatureRequest />} />
        </Route>

        {/* Support Engineer Routes (Legacy Layout) */}
        <Route element={
          <ProtectedRoute allowedRoles={["support_engineer", "agent"]}>
            <ErrorBoundary>
              <DashboardLayout />
            </ErrorBoundary>
          </ProtectedRoute>
        }>
          <Route path="/engineer/dashboard" element={<EngineerDashboard />} />
          <Route path="/engineer/assigned" element={<EngineerTickets />} />
          <Route path="/engineer/ticket/:id" element={<EngineerTicketDetails />} />
          <Route path="/engineer/profile" element={<EngineerProfile />} />
          <Route path="/engineer/notifications" element={<EngineerNotifications />} />
          {/* Module 8 */}
          <Route path="/engineer/bugs" element={<EngineerBugInvestigation />} />
        </Route>

        {/* Module 8: Developer Routes */}
        <Route element={
          <ProtectedRoute allowedRoles={["developer"]}>
            <ErrorBoundary>
              <DashboardLayout />
            </ErrorBoundary>
          </ProtectedRoute>
        }>
          <Route path="/developer/bugs" element={<DeveloperBugDashboard />} />
        </Route>

        {/* Shared Routes */}
        <Route element={
          <ProtectedRoute>
            <ErrorBoundary>
              <DashboardLayout />
            </ErrorBoundary>
          </ProtectedRoute>
        }>
          <Route path="/ticket/:id" element={<UpdateTicket />} />
        </Route>

        {/* ── Short redirects ────────────────────────────────── */}
        <Route path="/create-ticket" element={<Navigate to="/employee/create-ticket" replace />} />
        <Route path="/my-tickets" element={<Navigate to="/employee/my-tickets" replace />} />
        <Route path="/profile" element={<Navigate to={user ? getSettingsPath(role) : '/login'} replace />} />
        <Route path="/admin" element={<Navigate to="/login" replace />} />
        <Route path="/employee" element={<Navigate to="/login" replace />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
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
