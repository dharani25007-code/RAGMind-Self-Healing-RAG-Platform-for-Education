import React, { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { api } from '../context/AuthContext'

const FILE_ICONS = {
  '.pdf': '📄', '.txt': '📝', '.md': '📋',
  '.py': '🐍', '.js': '⚡', '.ts': '💙',
  '.json': '{}', '.csv': '📊', '.html': '🌐',
  '.css': '🎨', '.jpg': '🖼️', '.png': '🖼️',
  '.mp4': '🎬', '.mp3': '🎵', '.zip': '🗜️',
  '.docx': '📃', '.xlsx': '📈', '.pptx': '📊',
  default: '📁'
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function FilesPage() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [folderName, setFolderName] = useState('Root')
  const [newFolder, setNewFolder] = useState('')
  const [activeFolder, setActiveFolder] = useState('All')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [view, setView] = useState('grid') // grid | list

  const fetchFiles = async () => {
    try {
      const res = await api.get('/files')
      setFiles(res.data.files)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFiles() }, [])

  const folders = ['All', ...new Set(files.map(f => f.folder_name))]
  const filteredFiles = activeFolder === 'All' ? files : files.filter(f => f.folder_name === activeFolder)

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles.length) return
    setUploading(true)
    setError('')
    setSuccess('')
    setUploadProgress(0)

    const formData = new FormData()
    acceptedFiles.forEach(f => formData.append('files', f))
    formData.append('folder_name', folderName)

    try {
      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => {
          setUploadProgress(Math.round((e.loaded * 100) / e.total))
        }
      })
      setSuccess(`✓ Uploaded ${res.data.count} file${res.data.count !== 1 ? 's' : ''} to "${folderName}"`)
      fetchFiles()
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [folderName])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxFiles: 100,
  })

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      await api.delete(`/files/${id}`)
      setFiles(prev => prev.filter(f => f.id !== id))
    } catch (e) {
      setError('Failed to delete file')
    } finally {
      setDeleting(null)
    }
  }

  const addFolder = () => {
    if (newFolder.trim() && !folders.includes(newFolder.trim())) {
      setFolderName(newFolder.trim())
      setNewFolder('')
    }
  }

  const totalSize = files.reduce((acc, f) => acc + (f.file_size || 0), 0)

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
            My Files
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>
            {files.length} files · {formatBytes(totalSize)} used · up to 50 GB supported
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['grid', 'list'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '0.45rem 0.85rem',
              background: view === v ? 'var(--bg-3)' : 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: view === v ? 'var(--text-0)' : 'var(--text-2)',
              cursor: 'pointer', fontSize: '0.8rem',
              fontFamily: 'var(--font-sans)',
              transition: 'var(--transition)',
            }}>{v === 'grid' ? '⊞ Grid' : '≡ List'}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left: Folder Panel */}
        <div>
          {/* Upload destination */}
          <div style={{
            background: 'var(--bg-1)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            marginBottom: '1rem',
          }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-2)', marginBottom: 10 }}>
              Upload to folder
            </div>
            <select
              value={folderName}
              onChange={e => setFolderName(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 0.75rem',
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-0)',
                fontSize: '0.85rem', fontFamily: 'var(--font-sans)',
                cursor: 'pointer', marginBottom: 8,
              }}
            >
              {folders.filter(f => f !== 'All').map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={newFolder}
                onChange={e => setNewFolder(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addFolder()}
                placeholder="New folder name…"
                style={{
                  flex: 1, padding: '0.45rem 0.6rem',
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text-0)',
                  fontSize: '0.78rem', fontFamily: 'var(--font-sans)',
                }}
              />
              <button onClick={addFolder} style={{
                padding: '0.45rem 0.6rem',
                background: 'var(--grad-primary)', border: 'none',
                borderRadius: 'var(--radius-sm)', color: 'white',
                cursor: 'pointer', fontSize: '0.8rem',
                fontFamily: 'var(--font-sans)',
              }}>+</button>
            </div>
          </div>

          {/* Folder list */}
          <div style={{
            background: 'var(--bg-1)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-2)' }}>
              Folders ({folders.length - 1})
            </div>
            {folders.map(folder => {
              const count = folder === 'All' ? files.length : files.filter(f => f.folder_name === folder).length
              return (
                <div
                  key={folder}
                  onClick={() => setActiveFolder(folder)}
                  style={{
                    padding: '0.7rem 1rem',
                    cursor: 'pointer',
                    background: activeFolder === folder ? 'rgba(99,102,241,0.1)' : 'transparent',
                    borderLeft: activeFolder === folder ? '2px solid var(--accent-1)' : '2px solid transparent',
                    color: activeFolder === folder ? 'var(--accent-1)' : 'var(--text-1)',
                    fontSize: '0.85rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'var(--transition)',
                  }}
                >
                  <span>{folder === 'All' ? '📂 All Files' : `📁 ${folder}`}</span>
                  <span style={{
                    fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
                    background: 'var(--bg-3)', padding: '0.1rem 0.4rem',
                    borderRadius: 99, color: 'var(--text-2)',
                  }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Upload + Files */}
        <div>
          {/* Dropzone */}
          <div
            {...getRootProps()}
            style={{
              border: `2px dashed ${isDragActive ? 'var(--accent-1)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '2.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragActive ? 'rgba(99,102,241,0.06)' : 'var(--bg-1)',
              transition: 'var(--transition)',
              marginBottom: '1.5rem',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div>
                <div style={{ fontSize: '2rem', marginBottom: 12, animation: 'float 1.5s ease-in-out infinite' }}>⬆️</div>
                <div style={{ color: 'var(--text-0)', fontWeight: 600, marginBottom: 8 }}>Uploading files...</div>
                <div style={{
                  height: 6, background: 'var(--bg-3)', borderRadius: 99, overflow: 'hidden',
                  maxWidth: 300, margin: '0 auto',
                }}>
                  <div style={{
                    height: '100%', background: 'var(--grad-primary)',
                    borderRadius: 99, width: `${uploadProgress}%`,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-2)' }}>{uploadProgress}%</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>
                  {isDragActive ? '📂' : '☁️'}
                </div>
                <div style={{ color: isDragActive ? 'var(--accent-1)' : 'var(--text-0)', fontWeight: 600, marginBottom: 6 }}>
                  {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                </div>
                <div style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginBottom: 12 }}>
                  or click to browse · 50+ files supported · up to 50 GB total
                </div>
                <div style={{
                  display: 'inline-flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
                  maxWidth: 400, margin: '0 auto',
                }}>
                  {['PDF', 'TXT', 'MD', 'PY', 'JS', 'CSV', 'JSON', 'DOCX', 'and more...'].map(ext => (
                    <span key={ext} style={{
                      padding: '0.2rem 0.5rem',
                      background: 'var(--bg-3)', border: '1px solid var(--border)',
                      borderRadius: 4, fontSize: '0.7rem',
                      color: 'var(--text-2)', fontFamily: 'var(--font-mono)',
                    }}>{ext}</span>
                  ))}
                </div>
                <div style={{
                  marginTop: 12, fontSize: '0.8rem', color: 'var(--accent-1)',
                }}>
                  Uploading to: <strong>{folderName}</strong>
                </div>
              </>
            )}
          </div>

          {/* Alerts */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
              marginBottom: '1rem', fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              {error}
              <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>×</button>
            </div>
          )}
          {success && (
            <div style={{
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
              color: '#6ee7b7', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
              marginBottom: '1rem', fontSize: '0.85rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              {success}
              <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer' }}>×</button>
            </div>
          )}

          {/* Files */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(160px, 1fr))' : '1fr', gap: 10 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: view === 'grid' ? 120 : 52, borderRadius: 'var(--radius-md)' }} />
              ))}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div style={{
              padding: '3rem', textAlign: 'center',
              background: 'var(--bg-1)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
              <div style={{ color: 'var(--text-0)', fontWeight: 600, marginBottom: 6 }}>No files yet</div>
              <div style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>
                {activeFolder === 'All' ? 'Upload your first file above' : `No files in "${activeFolder}" folder`}
              </div>
            </div>
          ) : view === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '0.75rem' }}>
              {filteredFiles.map((file, i) => {
                const icon = FILE_ICONS[file.file_type] || FILE_ICONS.default
                return (
                  <div key={file.id} style={{
                    background: 'var(--bg-1)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    position: 'relative',
                    transition: 'var(--transition)',
                    animation: `fadeIn 0.3s ${i * 0.03}s both`,
                    cursor: 'default',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <button
                      onClick={() => handleDelete(file.id)}
                      disabled={deleting === file.id}
                      style={{
                        position: 'absolute', top: 6, right: 6,
                        background: 'none', border: 'none',
                        color: 'var(--text-3)', cursor: 'pointer',
                        fontSize: 14, padding: 4, borderRadius: 4,
                        opacity: 0, transition: 'var(--transition)',
                      }}
                      className="delete-btn"
                    >✕</button>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>{icon}</div>
                    <div style={{
                      fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-0)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      marginBottom: 4,
                    }} title={file.original_name}>{file.original_name}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-2)' }}>{formatBytes(file.file_size)}</div>
                    <div style={{
                      marginTop: 6, fontSize: '0.65rem',
                      color: 'var(--accent-1)',
                      background: 'rgba(99,102,241,0.1)',
                      padding: '0.15rem 0.4rem',
                      borderRadius: 99,
                      display: 'inline-block',
                    }}>{file.folder_name}</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{
              background: 'var(--bg-1)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px',
                padding: '0.6rem 1rem',
                borderBottom: '1px solid var(--border)',
                fontSize: '0.72rem', color: 'var(--text-2)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                <span>Name</span><span>Folder</span><span>Size</span><span>Date</span>
              </div>
              {filteredFiles.map((file, i) => {
                const icon = FILE_ICONS[file.file_type] || FILE_ICONS.default
                return (
                  <div key={file.id} style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px',
                    padding: '0.75rem 1rem',
                    borderBottom: i < filteredFiles.length - 1 ? '1px solid var(--border)' : 'none',
                    alignItems: 'center',
                    transition: 'var(--transition)',
                    animation: `fadeIn 0.3s ${i * 0.02}s both`,
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                      <span style={{ fontSize: 18 }}>{icon}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.original_name}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-1)' }}>{file.folder_name}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{formatBytes(file.file_size)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>{formatDate(file.created_at)}</span>
                      <button
                        onClick={() => handleDelete(file.id)}
                        disabled={deleting === file.id}
                        style={{
                          background: 'none', border: 'none',
                          color: 'var(--text-3)', cursor: 'pointer',
                          fontSize: 13, padding: '2px 4px', borderRadius: 4,
                          transition: 'var(--transition)',
                          fontFamily: 'var(--font-sans)',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-red)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                      >✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        div:hover .delete-btn { opacity: 1 !important; }
        select option { background: var(--bg-2); color: var(--text-0); }
        input:focus, select:focus { outline: none; border-color: var(--accent-1) !important; }
      `}</style>
    </div>
  )
}
