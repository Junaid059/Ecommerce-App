import axios from 'axios'
import { useAuthStore } from '../store/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({ baseURL: API_URL })

// Stable per-browser session id for anonymous tracking (search history, views, recs)
const SESSION_HEADER = 'X-Session-Id'
const SESSION_STORAGE_KEY = 'shopwave_anon_session_id'
function getOrCreateAnonSession() {
  try {
    let sid = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!sid) {
      sid = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(36).slice(2)}`
      localStorage.setItem(SESSION_STORAGE_KEY, sid)
    }
    return sid
  } catch {
    return null
  }
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  const sid = getOrCreateAnonSession()
  if (sid) config.headers[SESSION_HEADER] = sid
  return config
})

let refreshing = null

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    const status = error?.response?.status
    const refreshToken = useAuthStore.getState().refreshToken

    if (status === 401 && !original._retry && refreshToken) {
      original._retry = true
      try {
        refreshing =
          refreshing ||
          axios.post(`${API_URL}/api/auth/refresh`, { token: refreshToken })
        const { data } = await refreshing
        refreshing = null
        useAuthStore.getState().setAccessToken(data.access_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch (e) {
        refreshing = null
        useAuthStore.getState().logout()
      }
    }
    return Promise.reject(error)
  }
)

export { API_URL }
