import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import clsx from 'clsx'
import {
  Send, Plus, Bot, User, FileText, AlertCircle,
  RefreshCw, Loader, ChevronDown, MoreVertical,
  Copy, Trash2, Share2, PencilLine, Image
} from 'lucide-react'
import {
  getFiles, getSessions, createSession,
  sendMessage, getChatHistory, deleteSession,
  renameSession, uploadFiles
} from '../api/client.js'

const SUGGESTIONS = [
  'Summarize the key concepts',
  'Quiz me on this material',
  'What are the main topics?',
  'Explain the hardest concept',
  'Make a study plan for this',
]

export default function Chat() {
  const { sessionId } = useParams()
  const navigate      = useNavigate()

  const [sessions,  setSessions]  = useState([])
  const [files,     setFiles]     = useState([])
  const [selFiles,  setSelFiles]  = useState([])
  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [curSession, setCurSession] = useState(null)
  const [showFiles, setShowFiles] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    getFiles().then(r => setFiles(r.data)).catch(() => {})
    getSessions().then(r => setSessions(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (sessionId) {
      getChatHistory(sessionId).then(r => {
        setMessages(r.data.messages || [])
        setCurSession(r.data.session)
      }).catch(() => {})
    }
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const startNewSession = async () => {
    try {
      const name = `Session ${new Date().toLocaleDateString('en', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}`
      const r = await createSession(name)
      navigate(`/chat/${r.data.id}`)
      setMessages([])
      setCurSession(r.data)
      setSessions(s => [r.data, ...s])
    } catch { toast.error('Could not create session') }
  }

  const refreshFiles = async (selectedIds) => {
    const r = await getFiles()
    setFiles(r.data)
    if (selectedIds?.length) {
      setSelFiles(prev => Array.from(new Set([...prev, ...selectedIds])))
    }
  }

  const handleCopyAnswer = async () => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
    if (!lastAssistant) return toast('No answer to copy')
    await navigator.clipboard.writeText(lastAssistant.content)
    toast.success('Answer copied')
  }

  const handleShareChat = async () => {
    if (!curSession) return toast('Start a chat first')
    await navigator.clipboard.writeText(window.location.href)
    toast.success('Chat link copied')
  }

  const handleRenameChat = async () => {
    if (!curSession) return toast('Start a chat first')
    const nextName = window.prompt('Rename chat', curSession.name || 'Untitled session')?.trim()
    if (!nextName) return
    try {
      const r = await renameSession(curSession.id, nextName)
      setCurSession(r.data)
      setSessions(list => list.map(s => s.id === r.data.id ? r.data : s))
      toast.success('Chat renamed')
    } catch {
      toast.error('Rename failed')
    }
  }

  const handleDeleteChat = async () => {
    if (!curSession) return toast('No chat to delete')
    if (!window.confirm('Delete this chat?')) return
    try {
      await deleteSession(curSession.id)
      setSessions(list => list.filter(s => s.id !== curSession.id))
      setMessages([])
      setCurSession(null)
      navigate('/chat')
      toast.success('Chat deleted')
    } catch {
      toast.error('Delete failed')
    }
  }

  const handlePasteScreenshot = async (e) => {
    const items = Array.from(e.clipboardData?.items || [])
    const images = items
      .filter(item => item.type && item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter(Boolean)

    if (!images.length) return
    e.preventDefault()
    try {
      const results = await uploadFiles(images)
      await refreshFiles(results.data.map(x => x.id))
      toast.success(`Pasted ${images.length} screenshot(s)`)
    } catch {
      toast.error('Screenshot paste failed')
    }
  }

  const handleCopyMessage = async (content) => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      toast.success('Copied')
    } catch {
      toast.error('Copy failed')
    }
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return
    if (!curSession) { await startNewSession(); return }

    const question = input.trim()
    setInput('')
    setMessages(m => [...m, { role:'user', content: question }])
    setLoading(true)

    try {
      const r = await sendMessage(curSession.id, question, selFiles)
      setMessages(m => [...m, {
        role: 'assistant',
        content: r.data.answer,
        retries: r.data.retries,
        verdict: r.data.verdict,
        sources: r.data.sources || [],
      }])
    } catch (e) {
      setMessages(m => [...m, {
        role: 'error',
        content: e.response?.data?.detail || 'Something went wrong. Check the backend.',
      }])
    } finally { setLoading(false) }
  }

  const toggleFile = id => setSelFiles(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  return (
    <div className="flex h-screen">
      {/* Sidebar: sessions */}
      <div className="w-52 border-r border-gray-800 flex flex-col bg-gray-900/50 flex-shrink-0">
        <div className="px-3 py-3 border-b border-gray-800">
          <button className="btn-primary w-full justify-center text-xs py-2" onClick={startNewSession}>
            <Plus size={13} />New session
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {sessions.length === 0 && <p className="text-xs text-gray-600 text-center py-4">No sessions yet</p>}
          {sessions.map(s => (
            <button key={s.id} onClick={() => navigate(`/chat/${s.id}`)}
              className={clsx('w-full text-left px-3 py-2 rounded-lg text-xs transition-all',
                curSession?.id === s.id ? 'bg-brand-600/20 text-brand-300' : 'text-gray-400 hover:bg-gray-800'
              )}>
              <div className="truncate font-medium">{s.name}</div>
              <div className="text-gray-600 text-[10px]">{new Date(s.created_at).toLocaleDateString()}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800 bg-gray-900/30">
          <Bot size={16} className="text-brand-400" />
          <span className="text-sm font-medium text-gray-300">
            {curSession?.name || 'New Chat'}
          </span>
          <div className="ml-auto flex items-center gap-2 relative">
            <button className="btn-ghost text-xs py-1.5 gap-1.5" onClick={handleCopyAnswer}>
              <Copy size={12} />Copy
            </button>
            <button className="btn-ghost text-xs py-1.5 gap-1.5" onClick={handleShareChat}>
              <Share2 size={12} />Share
            </button>
            <button className="btn-ghost text-xs py-1.5 gap-1.5" onClick={handleRenameChat}>
              <PencilLine size={12} />Rename
            </button>
            <button className="btn-ghost text-xs py-1.5 gap-1.5" onClick={handleDeleteChat}>
              <Trash2 size={12} />Delete
            </button>
            <button className="btn-ghost text-xs py-1.5 gap-1.5" onClick={() => setShowFiles(x => !x)}>
              <FileText size={12} />
              {selFiles.length ? `${selFiles.length} file(s)` : 'All files'}
              <ChevronDown size={11} />
            </button>
            {showFiles && (
              <div className="absolute right-0 top-full mt-1 w-64 card shadow-xl z-10 py-1 max-h-72 overflow-y-auto">
                <div className="px-3 py-2 text-[10px] text-gray-500 uppercase tracking-wide border-b border-gray-800">
                  Filter by file (empty = all)
                </div>
                {files.length === 0
                  ? <p className="px-3 py-3 text-xs text-gray-600">No files uploaded</p>
                  : files.map(f => (
                    <label key={f.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-800 cursor-pointer">
                      <input type="checkbox" checked={selFiles.includes(f.id)} onChange={() => toggleFile(f.id)} className="accent-brand-500 w-3 h-3" />
                      <span className="text-xs text-gray-300 truncate">{f.filename}</span>
                    </label>
                  ))
                }
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 bg-brand-600/20 rounded-2xl flex items-center justify-center mb-4">
                <Bot size={28} className="text-brand-400" />
              </div>
              <h2 className="text-base font-medium text-white mb-1">Ask anything about your files</h2>
              <p className="text-sm text-gray-600 mb-6">Upload study materials, then chat with AI </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-700 text-gray-400 hover:border-brand-500 hover:text-brand-300 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={clsx('flex gap-3 fade-in', m.role === 'user' && 'flex-row-reverse')}>
              <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs',
                m.role === 'user'      ? 'bg-gray-700 text-gray-300' :
                m.role === 'assistant' ? 'bg-brand-600/30 text-brand-400' :
                                         'bg-red-900/40 text-red-400'
              )}>
                {m.role === 'user' ? <User size={13} /> : m.role === 'assistant' ? <Bot size={13} /> : <AlertCircle size={13} />}
              </div>
              <div className={clsx('max-w-[78%] rounded-xl px-4 py-3 text-sm leading-relaxed',
                m.role === 'user'      ? 'bg-brand-600 text-white rounded-tr-sm' :
                m.role === 'assistant' ? 'bg-gray-800 border border-gray-700/60 text-gray-100 rounded-tl-sm' :
                                         'bg-red-900/20 border border-red-800/40 text-red-300 rounded-tl-sm'
              )}>
                {m.role === 'assistant'
                    ? (
                      <div className="relative">
                        <button className="absolute right-2 top-2 text-gray-400 hover:text-gray-200" onClick={() => handleCopyMessage(m.content)}>
                          <Copy size={14} />
                        </button>
                              <ReactMarkdown className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">{m.content}</ReactMarkdown>
                              {m.sources && m.sources.length > 0 && (
                                <div className="mt-2 text-[11px] text-gray-400 flex flex-wrap gap-2">
                                  {m.sources.map((s, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-gray-800/60 rounded text-[11px]">
                                      {s.filename || `file:${s.file_id}`}#{s.chunk_idx}
                                    </span>
                                  ))}
                                </div>
                              )}
                      </div>
                    ) : <p>{m.content}</p>
                  }
                {m.role === 'assistant' && m.retries > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-500">
                    <RefreshCw size={9} />{m.retries} self-healing retry used
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 fade-in">
              <div className="w-7 h-7 rounded-full bg-brand-600/30 text-brand-400 flex items-center justify-center flex-shrink-0"><Bot size={13} /></div>
              <div className="bg-gray-800 border border-gray-700/60 rounded-xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  {[0,1,2].map(i => <div key={i} className="typing-dot w-1.5 h-1.5 rounded-full bg-brand-400" />)}
                  <span className="text-xs text-gray-500 ml-2">Thinking …</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-gray-800">
          {!curSession && (
            <p className="text-xs text-gray-600 text-center mb-2">Press send to start a new session automatically</p>
          )}
          <div className="flex gap-3">
            <input
              className="input flex-1"
              placeholder="Ask about your study files…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              onPaste={handlePasteScreenshot}
            />
            <button className="btn-ghost px-3" onClick={() => document.querySelector('input[placeholder="Ask about your study files…"]')?.focus()} title="Paste screenshot here"><Image size={16} /></button>
            <button className="btn-primary px-4" onClick={handleSend} disabled={loading || !input.trim()}>
              {loading ? <Loader size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
