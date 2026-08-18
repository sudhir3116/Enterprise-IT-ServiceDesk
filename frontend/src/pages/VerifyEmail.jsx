import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import api from '../services/api'
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Verification token is missing.')
      return
    }

    async function performVerification() {
      try {
        const res = await api.get(`/auth/verify-email/${token}`)
        setStatus('success')
        setMessage(res.data?.message || 'Email successfully verified!')
      } catch (err) {
        setStatus('error')
        setMessage(err.response?.data?.message || 'Email verification failed. The link may have expired or is invalid.')
      }
    }

    performVerification()
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] font-sans antialiased text-slate-800 p-6">
      <div className="w-full max-w-[480px] bg-white border border-slate-200/60 rounded-[14px] shadow-sm p-12 text-center">
        
        {/* Header Logo */}
        <div className="flex justify-center items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-primary-600 text-white shadow-md">
            <span className="font-heading font-extrabold text-lg">⚡</span>
          </div>
          <span className="font-heading font-bold text-sm text-slate-900 uppercase tracking-wider">Product Support Portal</span>
        </div>

        {/* Status Handling */}
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4 my-8">
            <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
            <h2 className="text-xl font-bold text-slate-900">Verifying Email Address</h2>
            <p className="text-sm text-slate-500 max-w-sm">Please wait while we confirm your email verification status with our servers...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4 my-8">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <h2 className="text-xl font-bold text-slate-900">Verification Complete</h2>
            <p className="text-sm text-slate-500 max-w-sm">{message}</p>
            <Link 
              to="/login"
              className="mt-6 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-sm transition-colors duration-150"
            >
              Sign In to Account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4 my-8">
            <XCircle className="h-12 w-12 text-red-500" />
            <h2 className="text-xl font-bold text-slate-900">Verification Failed</h2>
            <p className="text-sm text-slate-500 max-w-sm">{message}</p>
            <div className="mt-6 w-full flex flex-col gap-3">
              <Link 
                to="/login"
                className="w-full flex items-center justify-center px-5 py-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors duration-150"
              >
                Back to Login
              </Link>
            </div>
          </div>
        )}

        <footer className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400">
          &copy; 2026 Product Support Portal. All rights reserved.
        </footer>
      </div>
    </div>
  )
}
