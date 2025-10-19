import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  HomeIcon, 
  PlusIcon, 
  ChatBubbleLeftRightIcon,
  FlagIcon,
  ChartBarIcon, 
  UserIcon,
  CogIcon 
} from '@heroicons/react/24/outline'

const Layout = ({ children }) => {
  const location = useLocation()
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Goals', href: '/goals', icon: FlagIcon },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
    { name: 'Profile', href: '/profile', icon: UserIcon },
    { name: 'Settings', href: '/settings', icon: CogIcon },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Mobile navigation */}
      <div className="mobile-nav">
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: isActive ? '#2563eb' : '#6b7280',
                  textDecoration: 'none'
                }}
              >
                <item.icon style={{ height: '1.5rem', width: '1.5rem', marginBottom: '0.25rem' }} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="desktop-sidebar">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flexGrow: 1, 
          backgroundColor: 'white', 
          borderRight: '1px solid #e5e7eb', 
          paddingTop: '1.25rem', 
          paddingBottom: '1rem', 
          overflowY: 'auto' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, padding: '0 1rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>Nutrition Tracker</h1>
          </div>
          <div style={{ marginTop: '1.25rem', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <nav style={{ flex: 1, padding: '0 0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        borderRadius: '0.375rem',
                        backgroundColor: isActive ? '#dbeafe' : 'transparent',
                        color: isActive ? '#1e3a8a' : '#6b7280',
                        textDecoration: 'none',
                        transition: 'all 0.15s ease-in-out'
                      }}
                    >
                      <item.icon
                        style={{
                          marginRight: '0.75rem',
                          height: '1.5rem',
                          width: '1.5rem',
                          color: isActive ? '#3b82f6' : '#9ca3af'
                        }}
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        <main style={{ flex: 1, paddingBottom: '4rem' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
