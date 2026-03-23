import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api-inmo-sena-thomas.azurewebsites.net',
})

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (data) => api.post('/auth/login', data)
export const loginWithGoogle = (data) => api.post('/auth/google', data)
export const getMe = () => api.get('/auth/me')

// ── Properties ────────────────────────────────────────────────────────────────
export const getProperties = () => api.get('/properties')
export const getProperty = (id) => api.get(`/properties/${id}`)
export const createProperty = (data) => api.post('/properties', data)
export const updateProperty = (id, data) => api.put(`/properties/${id}`, data)
export const deleteProperty = (id) => api.delete(`/properties/${id}`)

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers = () => api.get('/users')
export const createUser = (data) => api.post('/users', data)

export default api
