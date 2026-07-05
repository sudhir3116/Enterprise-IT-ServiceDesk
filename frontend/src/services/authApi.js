import api from './api'

export async function login(credentials) {
  const res = await api.post('/auth/login', credentials)
  return res.data
}

export async function register(data) {
  const res = await api.post('/auth/register', data)
  return res.data
}
