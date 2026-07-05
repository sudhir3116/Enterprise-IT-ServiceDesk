import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldOff, ArrowLeft } from 'lucide-react'
import { getUser } from '../services/auth'
import { getDashboardPath } from '../utils/paths'

export default function Unauthorized() {
  const navigate = useNavigate()
  const user = getUser()

  function getDashboard() {
    const role = user?.role || ''
    return getDashboardPath(role)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-6">
      <div className="w-full max-w-md text-center">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-50 rounded-2xl">
            <ShieldOff className="w-12 h-12 text-red-400" />
          </div>
        </div>

        {/* Error code */}
        <div className="text-6xl font-extrabold text-slate-200 tracking-tight mb-2 font-heading select-none">
          403
        </div>

        {/* Heading */}
        <h1 className="text-xl font-bold text-slate-900 mb-2 font-heading">
          Access Forbidden
        </h1>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          You don't have permission to view this page. Contact your system administrator
          if you believe this is a mistake.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          {user && (
            <Link
              to={getDashboard()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white rounded-lg transition-colors"
            >
              My Dashboard
            </Link>
          )}
        </div>

        {/* Logged-in user context */}
        {user && (
          <div className="mt-8 p-3 bg-white border border-slate-200 rounded-lg text-left">
            <p className="text-xs text-slate-500 mb-1">Currently signed in as:</p>
            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500 capitalize">
              Role: <span className="font-medium text-slate-700">{(user.role || '').replace('_', ' ')}</span>
            </p>
          </div>
        )}

        {/* Footer */}
        <p className="mt-6 text-xs text-slate-400">
          Employee IT Helpdesk &bull; Support Reference: ERR-403
        </p>
      </div>
    </div>
  )
}
