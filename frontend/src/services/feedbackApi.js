import api from './api'

export const getFeedbackList = (params = {}) =>
  api.get('/feedback', { params }).then((r) => r.data)

export const getFeedbackById = (id) =>
  api.get(`/feedback/${id}`).then((r) => r.data)

export const submitFeedback = (data) =>
  api.post('/feedback', data).then((r) => r.data)

export const updateFeedback = (id, data) =>
  api.put(`/feedback/${id}`, data).then((r) => r.data)

export const voteFeedback = (id) =>
  api.post(`/feedback/${id}/vote`).then((r) => r.data)

export const deleteFeedback = (id) =>
  api.delete(`/feedback/${id}`).then((r) => r.data)
