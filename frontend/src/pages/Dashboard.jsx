import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../context/AuthContext'

function StatCard({ icon, label, value, sub, color = 'var(--accent-1)', delay = 0 }) {
  return (
    <div style={{
      background: 'var(--bg-1)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
      animation: `fadeIn 0.4s ${delay}s both`,
      transition: 'var(--transition)',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 80, height: 80,
        background: `radial-gradient(circle, ${color}20, transparent 70%)`,
        borderRadius: '0 var(--radius-lg) 0 80px',
      }} />
      <div style={{ fontSize: 24, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-0)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.75rem', color, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function QuickAction({ to, icon, title, desc, gradient }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--bg-1)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        cursor: 'pointer',
        transition: 'var(--transition)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-glow)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
      >
        <div style={{
          width: 44, height: 44, flexShrink: 0,
          background: gradient,
          borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>{icon}</div>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-0)', marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{desc}</div>
        </div>
        <div style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 18 }}>›</div>
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/stats').then(r => setStats(r.data)).finally(() => setLoading(false))
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem', animation: 'fadeIn 0.4s ease' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '0.35rem 0.85rem',
          background: user?.role === 'professor' ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
          border: `1px solid ${user?.role === 'professor' ? 'rgba(245,158,11,0.25)' : 'rgba(99,102,241,0.25)'}`,
          borderRadius: 99,
          fontSize: '0.78rem',
          color: user?.role === 'professor' ? 'var(--accent-gold)' : 'var(--accent-1)',
          marginBottom: 12,
          fontWeight: 500,
        }}>
          {user?.role === 'professor' ? '👨‍🏫 Professor Dashboard' : '🎓 Student Dashboard'}
        </div>

        <h1 style={{
          fontSize: '2rem', fontWeight: 700,
          fontFamily: 'var(--font-display)',
          marginBottom: 6,
        }}>
          {greeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.95rem' }}>
          Your self-healing AI knowledge base is ready. Upload documents and ask anything.
        </p>
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2.5rem',
      }}>
        <StatCard icon="📁" label="Files Uploaded" value={loading ? '—' : stats?.file_count ?? 0} sub="across all folders" delay={0} />
        <StatCard icon="📂" label="Folders" value={loading ? '—' : stats?.folder_count ?? 0} color="var(--accent-cyan)" delay={0.05} />
        <StatCard icon="💬" label="Conversations" value={loading ? '—' : stats?.conversation_count ?? 0} color="var(--accent-green)" delay={0.1} />
        <StatCard icon="💾" label="Storage Used" value={loading ? '—' : `${stats?.total_size_mb ?? 0} MB`} sub="of 50 GB limit" color="var(--accent-gold)" delay={0.15} />
      </div>

      {/* Feature showcase */}
      <div style={{
        background: 'var(--bg-1)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden',
        animation: 'fadeIn 0.5s 0.2s both',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 80% at 80% 50%, rgba(99,102,241,0.06) 0%, transparent 70%)',
        }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{
              display: 'inline-flex', gap: 6, alignItems: 'center',
              padding: '0.25rem 0.6rem',
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 99, marginBottom: 12,
              fontSize: '0.72rem', color: 'var(--accent-1)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>⚡ Self-Healing RAG Pipeline</div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: 10, fontFamily: 'var(--font-display)' }}>
              How it works
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { step: '01', title: 'Retrieve', desc: 'Finds relevant chunks from your uploaded documents', color: 'var(--accent-cyan)' },
                { step: '02', title: 'Generate', desc: 'LLaMA 3.3 70B produces an initial answer', color: 'var(--accent-1)' },
                { step: '03', title: 'Critique', desc: 'Critic agent checks for hallucinations and accuracy', color: 'var(--accent-gold)' },
                { step: '04', title: 'Self-Heal', desc: 'Reformulates and retries if the answer needs improvement', color: 'var(--accent-green)' },
              ].map(s => (
                <div key={s.step} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, flexShrink: 0,
                    background: `${s.color}20`,
                    border: `1px solid ${s.color}40`,
                    borderRadius: 7,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
                    color: s.color, fontWeight: 600,
                  }}>{s.step}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: s.color }}>{s.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual pipeline */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '1rem',
          }}>
            {[
              { label: 'Your Documents', bg: 'var(--bg-3)', color: 'var(--text-1)', icon: '📚' },
              { label: 'Vector Retrieval', bg: 'rgba(34,211,238,0.1)', color: 'var(--accent-cyan)', icon: '🔍' },
              { label: 'LLaMA 3.3 70B', bg: 'rgba(99,102,241,0.1)', color: 'var(--accent-1)', icon: '🤖' },
              { label: 'Critic Agent', bg: 'rgba(245,158,11,0.1)', color: 'var(--accent-gold)', icon: '🛡️' },
              { label: 'Verified Answer', bg: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)', icon: '✅' },
            ].map((n, i) => (
              <React.Fragment key={i}>
                <div style={{
                  padding: '0.5rem 1.2rem',
                  background: n.bg,
                  border: `1px solid ${n.color}40`,
                  borderRadius: 99,
                  fontSize: '0.78rem',
                  color: n.color,
                  fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 6,
                  whiteSpace: 'nowrap',
                }}>
                  <span>{n.icon}</span>{n.label}
                </div>
                {i < 4 && <div style={{ color: 'var(--text-3)', fontSize: 18, lineHeight: 1 }}>↓</div>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <h3 style={{ fontSize: '0.85rem', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
        Quick Actions
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        <QuickAction
          to="/chat"
          icon="◈"
          title="Start AI Chat"
          desc="Ask questions about your uploaded documents with self-healing accuracy"
          gradient="var(--grad-primary)"
        />
        <QuickAction
          to="/files"
          icon="📁"
          title="Upload Files"
          desc="Upload 50+ files in 5+ folders — PDFs, notes, code, CSVs and more"
          gradient="var(--grad-gold)"
        />
      </div>

      {/* Model badge */}
      <div style={{
        marginTop: '2rem',
        padding: '0.75rem 1.25rem',
        background: 'var(--bg-1)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        display: 'flex', alignItems: 'center', gap: 10,
        animation: 'fadeIn 0.5s 0.3s both',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--accent-green)',
          boxShadow: '0 0 8px var(--accent-green)',
          animation: 'pulse-glow 2s infinite',
        }} />
        <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
          Powered by <span style={{ color: 'var(--text-0)', fontWeight: 600 }}>LLaMA 3.3 70B Versatile</span> via Groq — fastest open-source LLM available
        </span>
        <div style={{
          marginLeft: 'auto',
          padding: '0.2rem 0.6rem',
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 99,
          fontSize: '0.7rem', color: 'var(--accent-green)',
          fontWeight: 600, fontFamily: 'var(--font-mono)',
        }}>FREE MODEL</div>
      </div>
    </div>
  )
}
