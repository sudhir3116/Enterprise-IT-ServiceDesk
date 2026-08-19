import api from './api'

export async function login(credentials) {
  const res = await api.post('/auth/login', credentials)
  return res.data
}

let refreshInFlightPromise = null;

export async function refreshToken() {
  if (refreshInFlightPromise) {
    console.log('[authApi] Concurrency lock: Refresh request in-flight, reusing active promise');
    return refreshInFlightPromise;
  }

  refreshInFlightPromise = (async () => {
    try {
      const res = await api.post('/auth/refresh');
      return res.data;
    } finally {
      refreshInFlightPromise = null;
    }
  })();

  return refreshInFlightPromise;
}

export async function getProfile() {
  const res = await api.get('/auth/profile')
  return res.data
}

export async function getMe() {
  const res = await api.get('/auth/me')
  return res.data
}

export async function logout() {
  const res = await api.post('/auth/logout')
  return res.data
}

export async function register(data) {
  const res = await api.post('/auth/register', data)
  return res.data
}

export async function resendVerification(email) {
  const res = await api.post('/auth/resend-verification', { email })
  return res.data
}

