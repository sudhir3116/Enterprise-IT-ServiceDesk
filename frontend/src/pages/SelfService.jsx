import React, { useState } from 'react'
import { Bot, Send, User, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import Badge from '../components/enterprise/Badge'

export default function SelfService() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I am your AI IT Assistant. Describe your issue (e.g. 'I can't connect to the VPN') and I'll suggest a solution or help you create a ticket." }
  ])
  const [loading, setLoading] = useState(false)

  const handleSend = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    
    const newMessages = [...messages, { role: 'user', text: query }]
    setMessages(newMessages)
    setQuery('')
    setLoading(true)

    setTimeout(() => {
      setMessages([...newMessages, { 
        role: 'assistant', 
        text: "I've searched our Knowledge Base. It looks like you might need to reset your multi-factor authentication token. If the guides below don't help, I can open a ticket for you.",
        articles: [
          { title: "Resetting your MFA Token", id: "1" },
          { title: "VPN Troubleshooting Guide", id: "2" }
        ]
      }])
      setLoading(false)
    }, 1500)
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-10 h-[calc(100vh-140px)]">
      
      <div className="shrink-0">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--ds-text-primary)' }}>
          <Bot className="w-6 h-6" style={{ color: '#a855f7' }} /> AI Self-Service
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--ds-text-muted)' }}>Get instant automated resolutions before opening a service request.</p>
      </div>

      <div
        className="flex-1 flex flex-col overflow-hidden rounded-xl"
        style={{ backgroundColor: 'var(--ds-surface)', border: '1px solid var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
      >
        
        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ backgroundColor: 'var(--ds-bg)' }}>
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: m.role === 'user' ? 'var(--ds-accent)' : 'rgba(168,85,247,0.15)',
                  color: m.role === 'user' ? '#fff' : '#a855f7',
                }}
              >
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className="px-4 py-3 rounded-2xl text-[13px]"
                  style={m.role === 'user'
                    ? { backgroundColor: 'var(--ds-accent)', color: '#fff', borderRadius: '18px 18px 4px 18px' }
                    : { backgroundColor: 'var(--ds-surface)', border: '1px solid var(--ds-border)', color: 'var(--ds-text-secondary)', borderRadius: '4px 18px 18px 18px' }
                  }
                >
                  {m.text}
                </div>
                
                {m.articles && (
                  <div className="mt-3 space-y-2 w-full">
                    {m.articles.map(a => (
                      <Link
                        key={a.id}
                        to="/knowledge-base"
                        className="flex items-center justify-between p-3 rounded-xl transition-colors w-full max-w-sm group"
                        style={{ backgroundColor: 'var(--ds-surface)', border: '1px solid var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#a855f7'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ds-border)'}
                      >
                        <span className="text-[12px] font-bold" style={{ color: 'var(--ds-text-primary)' }}>{a.title}</span>
                        <ChevronRight className="w-4 h-4" style={{ color: 'var(--ds-border-strong)' }} />
                      </Link>
                    ))}
                    <button className="mt-2 text-[12px] font-bold" style={{ color: 'var(--ds-accent)' }}>
                      None of these helped. Open a ticket.
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 max-w-[85%]">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(168,85,247,0.15)', color: '#a855f7' }}
              >
                <Bot className="w-4 h-4" />
              </div>
              <div
                className="px-4 py-3 rounded-2xl text-[13px] flex gap-1 items-center"
                style={{ backgroundColor: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '4px 18px 18px 18px' }}
              >
                {[0, 150, 300].map(delay => (
                  <div
                    key={delay}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ backgroundColor: 'var(--ds-text-muted)', animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div
          className="p-4 border-t"
          style={{ borderColor: 'var(--ds-border)', backgroundColor: 'var(--ds-surface)' }}
        >
          <form onSubmit={handleSend} className="relative">
            <input 
              type="text" 
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Describe your issue..." 
              className="ds-input pr-12"
              style={{ borderRadius: '12px', height: '48px', paddingLeft: '16px' }}
            />
            <button 
              type="submit" 
              disabled={!query.trim() || loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white rounded-lg disabled:opacity-50 transition-colors"
              style={{ backgroundColor: '#a855f7' }}
              onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#9333ea')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#a855f7')}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
