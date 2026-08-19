import { setAccessToken, getAccessToken } from './api'

export function saveToken(token) {
  setAccessToken(token)
}

export function getToken() {
  return getAccessToken()
}

export function clearToken() {
  setAccessToken(null)
}

export function saveUser(user) {
  // User state is managed in-memory by AuthContext
}

export function getUser() {
  return null
}

export function clearUser() {
  // User state is managed in-memory by AuthContext
}

