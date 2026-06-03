import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { api } from '../context/AuthContext'

function ConfidenceBadge({ score }) {
  const pct = Math.round((score ?? 0.85) * 100)
  const color = pct >= 80 ? 'var(--accent-green)' : pct >= 60 ? 'var(--accent-gold)' : 'var(--accent-red)'
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '0.15rem 0.5rem',
      background: `${color}15`,
      border: `1px solid ${color}30`,
      borderRadius: 99, fontSize: '0.68rem',
      color, fontFamily: 'var(--font-mono)',
    }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      {pct}% confidence
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  const sources = msg.sources ? (typeof msg.sources === 'string' ? JSON.parse(msg.sources) : msg.sources) : []

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '1.25rem',
      gap: 10,
      animation: 'fadeIn 0.3s ease',
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, flexShrink: 0,
          background: 'var(--grad-primary)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, marginTop: 2,
          boxShadow: '0 0 12px rgba(99,102,241,0.3)',
        }}>🧠</div>
      )}

      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{
          padding: isUser ? '0.75rem 1rem' : '1rem 1.25rem',
          background: isUser ? 'var(--grad-primary)' : 'var(--bg-2)',
          border: isUser ? 'none' : '1px solid var(--border)',
          borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
          color: isUser ? 'white' : 'var(--text-1)',
          fontSize: '0.9rem',
          lineHeight: 1.7,
          boxShadow: isUser ? '0 4px 16px rgba(99,102,241,0.25)' : 'none',
        }}>
          {isUser ? (
            <span>{msg.content}</span>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* AI metadata */}
        {!isUser && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 4 }}>
            {msg.confidence != null && <ConfidenceBadge score={msg.confidence} />}

            {sources.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {sources.map((s, i) => (
                  <span key={i} style={{
                    padding: '0.15rem 0.5rem',
                    background: 'rgba(34,211,238,0.08)',
                    border: '1px solid rgba(34,211,238,0.2)',
                    borderRadius: 99, fontSize: '0.68rem',
                    color: 'var(--accent-cyan)',
                  }}>📎 {s}</span>
                ))}
              </div>
            )}

            {msg.critique && (
              <div style={{
                padding: '0.4rem 0.7rem',
                background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.15)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.72rem', color: 'var(--accent-gold)',
                display: 'flex', alignItems: 'center', gap: 5,
                width: '100%',
              }}>
                <span>🛡️</span>
                <span><strong>Critic:</strong> {msg.critique}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div style={{
          width: 32, height: 32, flexShrink: 0,
          background: 'var(--bg-3)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: 'var(--text-2)',
          marginTop: 2,
        }}>👤</div>
      )}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: '1.25rem' }}>
      <div style={{
        width: 32, height: 32, flexShrink: 0,
        background: 'var(--grad-primary)', borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        boxShadow: '0 0 12px rgba(99,102,241,0.3)', animation: 'pulse-glow 2s infinite',
      }}>🧠</div>
      <div style={{
        padding: '1rem 1.25rem',
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: '4px 18px 18px 18px',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {[0, 0.2, 0.4].map((d, i) => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--accent-1)',
            animation: `blink 1.2s ${d}s ease-in-out infinite`,
            opacity: 0.6,
          }} />
        ))}
        <span style={{ marginLeft: 6, fontSize: '0.8rem', color: 'var(--text-2)' }}>
          Retrieving · Generating · Critiquing…
        </span>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { convId } = useParams()
  const navigate = useNavigate()

  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [currentConvId, setCurrentConvId] = useState(convId || null)
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    api.get('/conversations').then(r => setConversations(r.data.conversations))
    api.get('/files').then(r => setFiles(r.data.files))
  }, [])

  useEffect(() => {
    if (convId) {
      setCurrentConvId(convId)
      api.get(`/conversations/${convId}/messages`).then(r => {
        setMessages(r.data.messages.map(m => ({
          ...m,
          sources: m.sources ? (typeof m.sources === 'string' ? JSON.parse(m.sources) : m.sources) : []
        })))
      })
    } else {
      setMessages([])
      setCurrentConvId(null)
    }
  }, [convId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setLoading(true)

    const userMsg = { id: Date.now(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])

    try {
      const res = await api.post('/chat', {
        conversation_id: currentConvId,
        message: text,
        file_ids: selectedFiles,
      })

      const aiMsg = {
        id: res.data.message_id,
        role: 'assistant',
        content: res.data.answer,
        sources: res.data.sources,
        critique: res.data.critique,
        confidence: res.data.confidence,
        was_healed: res.data.was_healed,
      }

      setMessages(prev => [...prev, aiMsg])

      if (!currentConvId) {
        setCurrentConvId(res.data.conversation_id)
        navigate(`/chat/${res.data.conversation_id}`, { replace: true })
        // Refresh conversations
        api.get('/conversations').then(r => setConversations(r.data.conversations))
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: '⚠️ Error: ' + (err.response?.data?.detail || 'Something went wrong. Please try again.'),
        confidence: 0,
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startNewChat = () => {
    setMessages([])
    setCurrentConvId(null)
    setSelectedFiles([])
    navigate('/chat', { replace: true })
  }

  const deleteConversation = async (id, e) => {
    e.stopPropagation()
    await api.delete(`/conversations/${id}`)
    setConversations(prev => prev.filter(c => c.id !== id))
    if (currentConvId === id) startNewChat()
  }

  const toggleFile = (id) => {
    setSelectedFiles(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const SUGGESTIONS = [
    'Summarize the key points from my documents',
    'What are the main topics covered?',
    'Explain the most complex concept in simple terms',
    'Create a study guide from my notes',
  ]

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Conversation sidebar */}
      {sidebarOpen && (
        <div style={{
          width: 240, flexShrink: 0,
          background: 'var(--bg-1)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
            <button
              onClick={startNewChat}
              style={{
                width: '100%', padding: '0.65rem',
                background: 'var(--grad-primary)',
                border: 'none', borderRadius: 'var(--radius-md)',
                color: 'white', fontSize: '0.85rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
              }}
            >✏ New Chat</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {conversations.length === 0 ? (
              <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--text-2)', fontSize: '0.8rem' }}>
                No conversations yet
              </div>
            ) : conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => navigate(`/chat/${conv.id}`)}
                style={{
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  background: currentConvId === conv.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                  border: `1px solid ${currentConvId === conv.id ? 'rgba(99,102,241,0.25)' : 'transparent'}`,
                  marginBottom: 2,
                  transition: 'var(--transition)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 6,
                }}
                onMouseEnter={e => { if (currentConvId !== conv.id) e.currentTarget.style.background = 'var(--bg-2)' }}
                onMouseLeave={e => { if (currentConvId !== conv.id) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{
                    fontSize: '0.8rem', color: 'var(--text-0)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontWeight: currentConvId === conv.id ? 600 : 400,
                  }}>{conv.title}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-2)', marginTop: 2 }}>
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={e => deleteConversation(conv.id, e)}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--text-3)', cursor: 'pointer',
                    fontSize: 13, padding: 2, borderRadius: 4,
                    flexShrink: 0, transition: 'var(--transition)',
                    fontFamily: 'var(--font-sans)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-red)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Chat header */}
        <div style={{
          padding: '0.75rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg-1)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--text-2)', cursor: 'pointer',
              padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)',
              fontSize: 14, transition: 'var(--transition)',
              fontFamily: 'var(--font-sans)',
            }}
          >{sidebarOpen ? '◀' : '▶'}</button>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-0)' }}>
              {currentConvId
                ? conversations.find(c => c.id === currentConvId)?.title || 'Chat'
                : 'New Chat'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-2)' }}>
              Self-Healing RAG · LLaMA 3.3 70B via Groq
            </div>
          </div>

          {/* File context picker */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowFilePicker(!showFilePicker)}
              style={{
                padding: '0.45rem 0.85rem',
                background: selectedFiles.length > 0 ? 'rgba(99,102,241,0.15)' : 'var(--bg-2)',
                border: `1px solid ${selectedFiles.length > 0 ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                color: selectedFiles.length > 0 ? 'var(--accent-1)' : 'var(--text-2)',
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'var(--transition)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              📎 {selectedFiles.length > 0 ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected` : 'Select files'}
            </button>

            {showFilePicker && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, zIndex: 100,
                width: 300, maxHeight: 320, overflow: 'hidden',
                background: 'var(--bg-1)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                marginTop: 6,
                display: 'flex', flexDirection: 'column',
                animation: 'fadeIn 0.2s ease',
              }}>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-0)' }}>
                    Select context files
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setSelectedFiles(files.map(f => f.id))} style={tinyBtn}>All</button>
                    <button onClick={() => setSelectedFiles([])} style={tinyBtn}>None</button>
                    <button onClick={() => setShowFilePicker(false)} style={{ ...tinyBtn, color: 'var(--text-2)' }}>✕</button>
                  </div>
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {files.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-2)', fontSize: '0.8rem' }}>
                      <Link to="/files" onClick={() => setShowFilePicker(false)} style={{ color: 'var(--accent-1)' }}>Upload files</Link> to use as context
                    </div>
                  ) : files.map(file => (
                    <div
                      key={file.id}
                      onClick={() => toggleFile(file.id)}
                      style={{
                        padding: '0.6rem 1rem',
                        display: 'flex', alignItems: 'center', gap: 8,
                        cursor: 'pointer',
                        background: selectedFiles.includes(file.id) ? 'rgba(99,102,241,0.08)' : 'transparent',
                        transition: 'var(--transition)',
                        borderBottom: '1px solid var(--border)',
                      }}
                      onMouseEnter={e => { if (!selectedFiles.includes(file.id)) e.currentTarget.style.background = 'var(--bg-2)' }}
                      onMouseLeave={e => { if (!selectedFiles.includes(file.id)) e.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{
                        width: 16, height: 16, flexShrink: 0,
                        border: `2px solid ${selectedFiles.includes(file.id) ? 'var(--accent-1)' : 'var(--border)'}`,
                        borderRadius: 4,
                        background: selectedFiles.includes(file.id) ? 'var(--accent-1)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: 'white',
                        transition: 'var(--transition)',
                      }}>
                        {selectedFiles.includes(file.id) ? '✓' : ''}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.original_name}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-2)' }}>{file.folder_name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '1.5rem 2rem',
          display: 'flex', flexDirection: 'column',
        }}>
          {messages.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              textAlign: 'center', padding: '2rem',
            }}>
              <div style={{
                width: 72, height: 72,
                background: 'var(--grad-primary)',
                borderRadius: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, marginBottom: 20,
                boxShadow: '0 0 40px rgba(99,102,241,0.3)',
                animation: 'float 3s ease-in-out infinite',
              }}>🧠</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8, fontFamily: 'var(--font-display)' }}>
                Self-Healing RAG is ready
              </h2>
              <p style={{ color: 'var(--text-2)', maxWidth: 420, marginBottom: '2rem', lineHeight: 1.7 }}>
                Ask anything about your uploaded documents. The AI retrieves relevant context, generates an answer, then a critic agent verifies it for accuracy.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', maxWidth: 560, width: '100%' }}>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(s); inputRef.current?.focus() }}
                    style={{
                      padding: '0.85rem 1rem',
                      background: 'var(--bg-1)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-1)',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'var(--transition)',
                      lineHeight: 1.5,
                      fontFamily: 'var(--font-sans)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-1)'; e.currentTarget.style.color = 'var(--text-0)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-1)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => <Message key={msg.id} msg={msg} />)}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-1)',
          flexShrink: 0,
        }}>
          {selectedFiles.length > 0 && (
            <div style={{
              display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8,
            }}>
              {selectedFiles.map(id => {
                const file = files.find(f => f.id === id)
                return file ? (
                  <span key={id} style={{
                    padding: '0.15rem 0.5rem 0.15rem 0.4rem',
                    background: 'rgba(99,102,241,0.12)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: 99,
                    fontSize: '0.72rem', color: 'var(--accent-1)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    📎 {file.original_name}
                    <button onClick={() => toggleFile(id)} style={{
                      background: 'none', border: 'none', color: 'var(--accent-1)',
                      cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1,
                      fontFamily: 'var(--font-sans)',
                    }}>×</button>
                  </span>
                ) : null
              })}
            </div>
          )}

          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-end',
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.5rem 0.5rem 0.5rem 1rem',
            transition: 'var(--transition)',
          }}
            onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent-1)'}
            onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your documents… (Enter to send, Shift+Enter for newline)"
              disabled={loading}
              rows={1}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text-0)', fontSize: '0.9rem',
                fontFamily: 'var(--font-sans)', resize: 'none',
                maxHeight: 120, lineHeight: 1.6,
                padding: '0.4rem 0',
              }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                padding: '0.6rem 1rem',
                background: input.trim() && !loading ? 'var(--grad-primary)' : 'var(--bg-3)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: input.trim() && !loading ? 'white' : 'var(--text-3)',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                fontSize: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'var(--transition)',
                flexShrink: 0,
                boxShadow: input.trim() && !loading ? '0 4px 16px rgba(99,102,241,0.3)' : 'none',
              }}
            >
              {loading
                ? <div style={{ width: 18, height: 18, border: '2px solid var(--text-3)', borderTop: '2px solid var(--text-0)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                : '↑'}
            </button>
          </div>
          <div style={{ marginTop: 6, fontSize: '0.7rem', color: 'var(--text-3)', textAlign: 'center' }}>
            Powered by LLaMA 3.3 70B via Groq · Self-healing with critic agent
          </div>
        </div>
      </div>
    </div>
  )
}

const tinyBtn = {
  padding: '0.2rem 0.5rem',
  background: 'var(--bg-3)', border: '1px solid var(--border)',
  borderRadius: 4, color: 'var(--accent-1)',
  cursor: 'pointer', fontSize: '0.72rem',
  fontFamily: 'var(--font-sans)',
}
