import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, MessageSquare, Upload, Zap, ArrowRight, Brain, CheckCircle } from 'lucide-react'
import { getStats } from '../api/client.js'

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="card p-5">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
      <Icon size={18} />
    </div>
    <div className="text-2xl font-semibold text-white">{value ?? '—'}</div>
    <div className="text-xs text-gray-500 mt-0.5">{label}</div>
  </div>
)

export default function Dashboard() {
  const [stats, setStats] = useState({})
  useEffect(() => { getStats().then(r => setStats(r.data)).catch(() => {}) }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
          <Brain size={20} className="text-white" />
        </div>
        
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard icon={FileText}      label="Files indexed"      value={stats.files}    color="bg-brand-600/20 text-brand-400" />
        <StatCard icon={MessageSquare} label="Chat sessions"      value={stats.sessions} color="bg-blue-600/20 text-blue-400" />
        <StatCard icon={Zap}           label="Questions answered" value={stats.messages} color="bg-amber-600/20 text-amber-400" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { to:'/upload',   icon:Upload,        title:'Upload Files',    desc:'PDFs, notes, slides, code',      color:'bg-brand-600/20 text-brand-400' },
          { to:'/chat',     icon:MessageSquare, title:'Ask AI',          desc:'Chat about your study files',    color:'bg-blue-600/20 text-blue-400' },
          { to:'/sessions', icon:FileText,      title:'Past Sessions',   desc:'Resume a previous chat',         color:'bg-purple-600/20 text-purple-400' },
        ].map(({ to, icon: Icon, title, desc, color }) => (
          <Link key={to} to={to} className="card p-5 hover:border-gray-700 transition-all group block">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}><Icon size={17} /></div>
            <div className="text-sm font-medium text-white group-hover:text-brand-400 transition-colors flex items-center gap-1">
              {title}<ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-xs text-gray-600 mt-1">{desc}</div>
          </Link>
        ))}
      </div>

      <div className="card p-5 border-brand-600/20 bg-brand-600/5">
        <div className="text-sm font-medium text-brand-300 mb-3 flex items-center gap-2">
          <Zap size={14} />How it works
        </div>
        <div className="space-y-2">
          {[
            'Upload any files — PDFs, DOCX, TXT, CSV, code, images',
            'Files are chunked and stored in SQLite with full-text search',
            'Groq Llama 3.3 70B reads your chunks and answers instantly (free)',
            'Critic agent checks every answer — retries if hallucination detected',
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
              <CheckCircle size={12} className="text-brand-500 mt-0.5 flex-shrink-0" />{s}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
