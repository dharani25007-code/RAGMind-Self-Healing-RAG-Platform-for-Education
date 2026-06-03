import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { path: '/', icon: '⬡', label: 'Dashboard' },
  { path: '/chat', icon: '◈', label: 'AI Chat' },
  { path: '/files', icon: '◫', label: 'My Files' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-0)' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 72 : 240,
        flexShrink: 0,
        background: 'var(--bg-1)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '1.25rem 0' : '1.5rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          minHeight: 70,
        }}>
          <div style={{
            width: 36, height: 36, flexShrink: 0,
            background: 'var(--grad-primary)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
            boxShadow: '0 0 16px rgba(99,102,241,0.4)',
          }}>🧠</div>
          {!collapsed && (
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.15rem', fontWeight: 700,
              background: 'var(--grad-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              whiteSpace: 'nowrap',
            }}>RAGMind</span>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '1rem 0.6rem' }}>
          {NAV.map(item => {
            const active = location.pathname === item.path ||
              (item.path === '/chat' && location.pathname.startsWith('/chat'))
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: collapsed ? '0.75rem' : '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 4,
                  textDecoration: 'none',
                  background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                  border: active ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                  color: active ? 'var(--accent-1)' : 'var(--text-2)',
                  transition: 'var(--transition)',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.style.color = 'var(--text-0)' }}
                onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(99,102,241,0.12)' : 'transparent'; e.currentTarget.style.color = active ? 'var(--accent-1)' : 'var(--text-2)' }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && (
                  <span style={{ fontSize: '0.9rem', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                )}
                {active && !collapsed && (
                  <div style={{
                    marginLeft: 'auto',
                    width: 6, height: 6,
                    background: 'var(--accent-1)',
                    borderRadius: '50%',
                  }} />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User + collapse */}
        <div style={{ padding: '0.75rem 0.6rem', borderTop: '1px solid var(--border)' }}>
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: '100%',
              padding: '0.6rem',
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-2)',
              cursor: 'pointer',
              marginBottom: 8,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'var(--transition)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {collapsed ? '▶' : '◀'}{!collapsed && <span style={{ fontSize: '0.78rem' }}>Collapse</span>}
          </button>

          {/* User card */}
          <div style={{
            padding: collapsed ? '0.6rem' : '0.75rem',
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <div style={{
              width: 32, height: 32, flexShrink: 0,
              background: user?.role === 'professor' ? 'var(--grad-gold)' : 'var(--grad-primary)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: 'white',
            }}>
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-0)', truncate: true, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: user?.role === 'professor' ? 'var(--accent-gold)' : 'var(--accent-1)' }}>
                  {user?.role === 'professor' ? '👨‍🏫 Professor' : '🎓 Student'}
                </div>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                title="Logout"
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--text-2)', cursor: 'pointer',
                  fontSize: 16, padding: 4, borderRadius: 6,
                  display: 'flex', alignItems: 'center',
                  transition: 'var(--transition)',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-2)'}
              >⏏</button>
            )}
          </div>
          {collapsed && (
            <button
              onClick={handleLogout}
              title="Logout"
              style={{
                width: '100%', marginTop: 6,
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text-2)', cursor: 'pointer',
                fontSize: 14, padding: '0.5rem', borderRadius: 8,
                transition: 'var(--transition)',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-red)'; e.currentTarget.style.borderColor = 'var(--accent-red)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >⏏</button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}
