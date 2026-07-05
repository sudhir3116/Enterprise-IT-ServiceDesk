import React, { useState } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import GlobalSearch from '../GlobalSearch'

export default function AppShell({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <div 
      className="flex h-screen w-full overflow-hidden font-sans antialiased"
      style={{ backgroundColor: 'var(--ds-bg)' }}
    >
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
        mobileOpen={mobileMenuOpen} 
        setMobileOpen={setMobileMenuOpen} 
      />

      {/* Main Layout Area */}
      <div 
        className="flex-1 flex flex-col min-w-0"
        style={{ backgroundColor: 'var(--ds-bg)' }}
      >
        <Navbar 
          setMobileMenuOpen={setMobileMenuOpen} 
          setSearchOpen={setSearchOpen} 
        />

        <main 
          className="flex-1 overflow-y-auto w-full relative p-4 lg:p-6"
          style={{ backgroundColor: 'var(--ds-bg)' }}
        >
          <div className="max-w-[1400px] mx-auto w-full animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
