import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { Upload as UploadIcon, X, Trash2, CheckCircle, Loader, File } from 'lucide-react'
import { uploadFiles, getFiles, deleteFile } from '../api/client.js'
import clsx from 'clsx'

const EXT_COLOR = {
  pdf:'bg-red-900/40 text-red-300', docx:'bg-blue-900/40 text-blue-300', doc:'bg-blue-900/40 text-blue-300',
  pptx:'bg-orange-900/40 text-orange-300', xlsx:'bg-green-900/40 text-green-300',
  csv:'bg-teal-900/40 text-teal-300', txt:'bg-gray-700/60 text-gray-300',
  md:'bg-gray-700/60 text-gray-300', py:'bg-yellow-900/40 text-yellow-300',
  js:'bg-yellow-900/40 text-yellow-200', jsx:'bg-cyan-900/40 text-cyan-300',
  png:'bg-purple-900/40 text-purple-300', jpg:'bg-purple-900/40 text-purple-300',
  mp4:'bg-pink-900/40 text-pink-300', zip:'bg-amber-900/40 text-amber-300',
}
const extColor = name => EXT_COLOR[(name?.split('.').pop()||'').toLowerCase()] || 'bg-gray-700/60 text-gray-400'
const fmtSize  = b => b < 1024 ? `${b}B` : b < 1048576 ? `${Math.round(b/1024)}KB` : `${(b/1048576).toFixed(1)}MB`

export default function Upload() {
  const [queue, setQueue]       = useState([])
  const [uploaded, setUploaded] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => { getFiles().then(r => setUploaded(r.data)).catch(() => {}) }, [])

  const onDrop = useCallback(files => {
    setQueue(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...files.filter(f => !names.has(f.name))]
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true })

  const handleUpload = async () => {
    if (!queue.length) return
    setUploading(true); setProgress(0)
    try {
      await uploadFiles(queue, setProgress)
      toast.success(`${queue.length} file(s) uploaded!`)
      setQueue([])
      getFiles().then(r => setUploaded(r.data))
    } catch { toast.error('Upload failed. Is the backend running?') }
    finally { setUploading(false) }
  }

  const handleDelete = async id => {
    try {
      await deleteFile(id)
      setUploaded(u => u.filter(f => f.id !== id))
      toast.success('File removed')
    } catch { toast.error('Delete failed') }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-1">Upload Study Files</h1>
      <p className="text-sm text-gray-500 mb-6">Any file type · Up to 60 files at once · Max 50 MB each</p>

      <div {...getRootProps()} className={clsx(
        'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all mb-6',
        isDragActive ? 'border-brand-500 bg-brand-600/10' : 'border-gray-700 hover:border-gray-600 bg-gray-900/30'
      )}>
        <input {...getInputProps()} />
        <UploadIcon size={34} className={clsx('mx-auto mb-3', isDragActive ? 'text-brand-400' : 'text-gray-600')} />
        <p className="text-sm font-medium text-gray-300">{isDragActive ? 'Drop files here…' : 'Drag & drop or click to browse'}</p>
        <p className="text-xs text-gray-600 mt-1">PDF · DOCX · TXT · CSV · MD · PY · JS · PNG · MP4 · ZIP — anything</p>
      </div>

      {queue.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-sm text-gray-300 font-medium">{queue.length} file(s) queued</span>
            <div className="flex gap-2">
              <button className="btn-ghost text-xs py-1.5" onClick={() => setQueue([])}>Clear</button>
              <button className="btn-primary text-xs py-1.5" onClick={handleUpload} disabled={uploading}>
                {uploading ? <><Loader size={12} className="animate-spin" />{progress}%</> : <><UploadIcon size={12} />Upload all</>}
              </button>
            </div>
          </div>
          {uploading && <div className="h-1 bg-gray-800"><div className="h-1 bg-brand-500 transition-all" style={{ width:`${progress}%` }} /></div>}
          <ul className="divide-y divide-gray-800/50 max-h-52 overflow-y-auto">
            {queue.map(f => (
              <li key={f.name} className="flex items-center gap-3 px-4 py-2.5">
                <span className={clsx('badge text-[10px]', extColor(f.name))}>{(f.name.split('.').pop()||'?').toUpperCase()}</span>
                <span className="flex-1 text-sm text-gray-300 truncate">{f.name}</span>
                <span className="text-xs text-gray-600">{fmtSize(f.size)}</span>
                <button onClick={() => setQueue(q => q.filter(x => x.name !== f.name))} className="btn-ghost p-1"><X size={12} /></button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Indexed files ({uploaded.length})</h2>
      {uploaded.length === 0
        ? <div className="card p-8 text-center text-gray-600 text-sm"><File size={28} className="mx-auto mb-2 opacity-30" />No files yet</div>
        : (
          <div className="card divide-y divide-gray-800/50">
            {uploaded.map(f => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/20 transition-colors">
                <span className={clsx('badge text-[10px]', extColor(f.filename))}>{(f.filename?.split('.').pop()||'?').toUpperCase()}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200 truncate">{f.filename}</div>
                  <div className="text-xs text-gray-600">{fmtSize(f.file_size)} · {new Date(f.created_at).toLocaleDateString()}</div>
                </div>
                <CheckCircle size={13} className="text-brand-500 flex-shrink-0" />
                <button onClick={() => handleDelete(f.id)} className="btn-ghost p-1.5 text-gray-600 hover:text-red-400"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}
