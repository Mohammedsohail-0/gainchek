import axios from 'axios'
import { toast } from 'react-toastify'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gc_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status

    if (status === 401) {
      localStorage.removeItem('gc_token')
      localStorage.removeItem('gc_role')
      localStorage.removeItem('gc_name')
      toast.error('Your session expired. Please sign in again.')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    } else if (!error.response) {
      toast.error('Network error — check your connection.')
    }

    return Promise.reject(error)
  }
)

export default api
