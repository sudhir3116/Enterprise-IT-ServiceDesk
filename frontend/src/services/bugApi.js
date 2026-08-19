import api from './api'

// ── Bug Reports ───────────────────────────────────────────────────────────────

export const getBugs = (params = {}) =>
  api.get('/bugs', { params }).then((r) => r.data)

export const getBugById = (id) =>
  api.get(`/bugs/${id}`).then((r) => r.data)

export const createBug = (data) =>
  api.post('/bugs', data).then((r) => r.data)

export const updateBug = (id, data) =>
  api.put(`/bugs/${id}`, data).then((r) => r.data)

export const addBugComment = (id, text) =>
  api.post(`/bugs/${id}/comments`, { text }).then((r) => r.data)

export const deleteBug = (id) =>
  api.delete(`/bugs/${id}`).then((r) => r.data)

// ── Ticket Investigation ──────────────────────────────────────────────────────

export const saveInvestigation = (ticketId, data) =>
  api.put(`/tickets/${ticketId}/investigation`, data).then((r) => r.data)

export const createArticleFromTicket = (ticketId, data) =>
  api.post(`/tickets/${ticketId}/create-article`, data).then((r) => r.data)
