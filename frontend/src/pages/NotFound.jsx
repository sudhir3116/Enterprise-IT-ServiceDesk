import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileQuestion, ArrowLeft, Home } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-6">
      <div className="w-full max-w-md text-center">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-slate-100 rounded-2xl">
            <FileQuestion className="w-12 h-12 text-slate-400" />
          </div>
        </div>

        {/* Error code */}
        <div className="text-6xl font-extrabold text-slate-200 tracking-tight mb-2 font-heading select-none">
          404
        </div>

        {/* Heading */}
        <h1 className="text-xl font-bold text-slate-900 mb-2 font-heading">
          Page Not Found
        </h1>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          The page you're looking for doesn't exist, was removed, or is temporarily unavailable.
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
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            Return to Dashboard
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-10 text-xs text-slate-400">
          Employee IT Helpdesk &bull; Support Reference: ERR-404
        </p>
      </div>
    </div>
  )
}
