import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 60000,
})

export const uploadFiles  = (files, onProgress) => {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  return api.post('/api/files/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress?.(Math.round((e.loaded / e.total) * 100)),
  })
}

export const getFiles     = ()   => api.get('/api/files/')
export const deleteFile   = id  => api.delete(`/api/files/${id}`)
export const createSession = name => api.post('/api/sessions/', { name })
export const getSessions  = ()   => api.get('/api/sessions/')
export const deleteSession = id  => api.delete(`/api/sessions/${id}`)
export const renameSession = (id, name) => api.put(`/api/sessions/${id}`, { name })
export const sendMessage  = (session_id, question, file_ids) =>
  api.post('/api/chat/ask', { session_id, question, file_ids })
export const getChatHistory = sid => api.get(`/api/chat/history/${sid}`)
export const getStats     = ()   => api.get('/api/stats/')
export const getModels    = ()   => api.get('/api/models/')

export default api
