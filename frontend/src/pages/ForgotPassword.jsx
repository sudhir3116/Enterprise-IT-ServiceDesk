import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import FormField from '../components/enterprise/FormField'
import Button from '../components/enterprise/Button'
import { Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { email })
      setMessage(res.data.message)
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[58%_42%] bg-[#F8FAFC] font-sans antialiased text-slate-800">
      
      {/* Inject custom CSS keyframes for smooth fade-in animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      {/* LEFT PANEL */}
      <div className="hidden lg:flex bg-zinc-950 text-white flex-col justify-center px-16 xl:px-24 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:8rem_8rem] [mask-image:radial-gradient(60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 max-w-2xl">
          {/* Header Branding */}
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-primary-600 text-white shadow-md">
              <span className="font-heading font-extrabold text-lg">⚡</span>
            </div>
            <div>
              <span className="block font-heading font-bold text-sm text-zinc-100 uppercase tracking-wider">Product Support Portal</span>
              <span className="block text-[10px] text-zinc-450 uppercase">Enterprise Support Desk</span>
            </div>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-white font-heading leading-tight mb-4">
            Secure workspace account recovery.
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-10 max-w-xl">
            Enter your email to obtain a security token and regain access to the Product Support Portal workspace console.
          </p>

          <div className="relative z-10 flex items-center justify-between text-xs font-semibold text-zinc-500 border-t border-zinc-800 pt-6 uppercase tracking-wider">
            <span>Enterprise Support Portal</span>
            <span>Version 2.4.0</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex flex-col min-h-screen lg:min-h-0 bg-[#F8FAFC]">
        
        {/* Main Centered Content */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12">
          {/* Form Card */}
          <div className="w-full max-w-[480px] bg-white border border-slate-200/60 rounded-[14px] shadow-sm p-12 animate-fade-in opacity-0">
            
            {/* Mobile Header */}
            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-primary-600 text-white shadow-md">
                <span className="font-heading font-extrabold text-lg">⚡</span>
              </div>
              <div>
                <span className="block font-heading font-bold text-sm text-slate-900 uppercase tracking-wider">Product Support Portal</span>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-heading mb-2">
                Recover Password
              </h2>
              <p className="text-sm text-slate-500">
                Provide your work email address to request a reset link.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-[14px] bg-red-50 border border-red-100 p-3 flex items-start gap-2.5">
                <span className="text-red-500 text-xs mt-0.5">⚠️</span>
                <span className="text-xs text-red-800 font-medium">{error}</span>
              </div>
            )}

            {message && (
              <div className="mb-6 rounded-[14px] bg-emerald-50 border border-emerald-100 p-3 flex items-start gap-2.5">
                <span className="text-emerald-500 text-xs mt-0.5">✅</span>
                <span className="text-xs text-emerald-800 font-medium">{message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              
              <FormField label="Work Email Address">
                <div className="lp-input-wrap">
                  <Mail className="lp-input-icon" size={18} />
                  <input 
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="lp-input"
                  />
                </div>
              </FormField>

              <Button 
                type="submit"
                size="lg"
                isLoading={loading}
                className="mt-2 w-full"
              >
                Send Reset Link
              </Button>
            </form>

            {/* Divider */}
            <div className="mt-8 mb-6 flex items-center justify-between">
              <span className="w-full border-b border-slate-200"></span>
            </div>

            {/* Login Action */}
            <Link 
              to="/login" 
              className="flex w-full h-[52px] justify-center items-center gap-2 rounded-[14px] border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full py-8 text-center shrink-0">
          <p className="text-xs text-slate-400 leading-relaxed">
            &copy; 2026 Product Support Portal. All rights reserved. <br />
            <span className="font-mono text-[11px] text-slate-400 mt-1 block">Version 2.4.0 &bull; System Active</span>
          </p>
        </div>
      </div>
    </div>
  )
}
