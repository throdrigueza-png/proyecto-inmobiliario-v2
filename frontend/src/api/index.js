import axios from 'axios'

// In production the frontend is served by FastAPI on the same origin,
// so all API calls use relative paths.  During local dev, Vite's proxy
// forwards API requests to the FastAPI dev server.
const api = axios.create({
  baseURL: '',
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

// ── Image upload ──────────────────────────────────────────────────────────────
export const uploadImage = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** Upload up to 10 image files at once. Returns { urls: string[] }. */
export const uploadImages = (files) => {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))
  return api.post('/upload/multiple', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// ── Favorites ─────────────────────────────────────────────────────────────────
/** Toggle a property favorite for the current user. Returns { favorited: boolean }. */
export const toggleFavorite = (propertyId) => api.post(`/favorites/${propertyId}`)

/** Get the list of property IDs favorited by the current user. Returns { favorite_ids: number[] }. */
export const getFavorites = () => api.get('/favorites')

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers = () => api.get('/users')
export const createUser = (data) => api.post('/users', data)

export default api
