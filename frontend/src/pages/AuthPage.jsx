import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  { value: 'student', label: 'Student', icon: '🎓', desc: 'Learn and explore knowledge' },
  { value: 'professor', label: 'Professor', icon: '👨‍🏫', desc: 'Teach and share expertise' },
]

export default function AuthPage({ mode = 'login' }) {
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const isRegister = mode === 'register'

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        await register(form.name, form.email, form.password, form.role)
      } else {
        await login(form.email, form.password)
      }
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-0)',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background effects */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 80% 50% at 20% 30%, rgba(99,102,241,0.12) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 80% 70%, rgba(139,92,246,0.08) 0%, transparent 60%)
        `
      }} />

      {/* Left panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '4rem', position: 'relative',
      }} className="left-panel">
        <div style={{ maxWidth: 520 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '3rem' }}>
            <div style={{
              width: 44, height: 44,
              background: 'var(--grad-primary)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
              boxShadow: '0 0 20px rgba(99,102,241,0.4)'
            }}>🧠</div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem', fontWeight: 700,
              background: 'var(--grad-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>RAGMind</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: '1rem',
            fontFamily: 'var(--font-display)',
          }}>
            {isRegister ? 'Join the future of' : 'Welcome back to'}
            <br />
            <span style={{
              background: 'var(--grad-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>AI-Powered Learning</span>
          </h1>

          <p style={{ color: 'var(--text-2)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '2.5rem' }}>
            The Self-Healing RAG platform that doesn't just retrieve and generate — it critiques its own output, detects hallucinations, and retries for accuracy.
          </p>

          {/* Features */}
          {[
            { icon: '🔍', text: 'Intelligent document retrieval from your uploads' },
            { icon: '🛡️', text: 'Critic agent detects hallucinations automatically' },
            { icon: '♻️', text: 'Self-heals by reformulating queries when needed' },
            { icon: '📁', text: 'Upload 50+ files across 5+ organized folders' },
          ].map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: '0.8rem', animation: `fadeIn 0.4s ${i * 0.1}s both`
            }}>
              <span style={{
                width: 32, height: 32, background: 'var(--bg-2)',
                border: '1px solid var(--border)', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0
              }}>{f.icon}</span>
              <span style={{ color: 'var(--text-1)', fontSize: '0.9rem' }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        width: '100%', maxWidth: 480,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{
          width: '100%',
          background: 'var(--bg-1)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeIn 0.5s ease',
        }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            {isRegister ? 'Create account' : 'Sign in'}
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            {isRegister
              ? 'Start your intelligent learning journey'
              : 'Access your AI knowledge base'}
          </p>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Dr. Sarah Johnson"
                  required
                  style={inputStyle}
                />
              </div>
            )}

            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                placeholder="you@university.edu"
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                placeholder="••••••••"
                required
                minLength={6}
                style={inputStyle}
              />
            </div>

            {isRegister && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>I am a</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {ROLES.map(r => (
                    <div
                      key={r.value}
                      onClick={() => setForm({...form, role: r.value})}
                      style={{
                        padding: '0.8rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${form.role === r.value ? 'var(--accent-1)' : 'var(--border)'}`,
                        background: form.role === r.value ? 'rgba(99,102,241,0.1)' : 'var(--bg-2)',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{r.icon}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: form.role === r.value ? 'var(--accent-1)' : 'var(--text-0)' }}>{r.label}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', marginTop: 2 }}>{r.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: loading ? 'var(--bg-3)' : 'var(--grad-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'var(--transition)',
                fontFamily: 'var(--font-sans)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading && <div style={{
                width: 16, height: 16,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />}
              {loading ? (isRegister ? 'Creating account...' : 'Signing in...') : (isRegister ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <p style={{
            textAlign: 'center', marginTop: '1.5rem',
            fontSize: '0.875rem', color: 'var(--text-2)'
          }}>
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <Link
              to={isRegister ? '/login' : '/register'}
              style={{ color: 'var(--accent-1)', textDecoration: 'none', fontWeight: 600 }}
            >
              {isRegister ? 'Sign in' : 'Create one'}
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .left-panel { display: none !important; }
        }
        input:focus { outline: none !important; border-color: var(--accent-1) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15) !important; }
      `}</style>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '0.75rem 1rem',
  background: 'var(--bg-2)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-0)',
  fontSize: '0.9rem',
  fontFamily: 'var(--font-sans)',
  transition: 'var(--transition)',
}
