import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MessageSquare, Trash2, ArrowRight, FolderOpen } from 'lucide-react'
import { getSessions, deleteSession } from '../api/client.js'

export default function Sessions() {
  const [sessions, setSessions] = useState([])

  useEffect(() => { getSessions().then(r => setSessions(r.data)).catch(() => {}) }, [])

  const handleDelete = async id => {
    try {
      await deleteSession(id)
      setSessions(s => s.filter(x => x.id !== id))
      toast.success('Session deleted')
    } catch { toast.error('Could not delete session') }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-1">Chat Sessions</h1>
      <p className="text-sm text-gray-500 mb-6">Resume any previous conversation</p>

      {sessions.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderOpen size={32} className="mx-auto mb-3 text-gray-700" />
          <p className="text-sm text-gray-500">No sessions yet</p>
          <Link to="/chat" className="btn-primary mt-4 mx-auto w-fit"><MessageSquare size={14} />Start chatting</Link>
        </div>
      ) : (
        <div className="card divide-y divide-gray-800/50">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-800/20 transition-colors group">
              <div className="w-9 h-9 bg-brand-600/20 text-brand-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageSquare size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-200 truncate">{s.name}</div>
                <div className="text-xs text-gray-600">{new Date(s.created_at).toLocaleString()}</div>
              </div>
              <Link to={`/chat/${s.id}`} className="btn-ghost text-xs py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                Resume <ArrowRight size={12} />
              </Link>
              <button onClick={() => handleDelete(s.id)} className="btn-ghost p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
