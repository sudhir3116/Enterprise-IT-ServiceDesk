import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001'

const api = axios.create({
  baseURL: API_BASE + '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

let inMemoryAccessToken = null

export const setAccessToken = (token) => {
  inMemoryAccessToken = token
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

export const getAccessToken = () => inMemoryAccessToken

api.interceptors.request.use((config) => {
  if (inMemoryAccessToken) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`
  }
  return config
})

export default api

