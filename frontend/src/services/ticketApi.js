import api from './api'

export async function createTicket(payload) {
  const res = await api.post('/tickets', payload)
  return res.data
}

export async function getTickets() {
  const res = await api.get('/tickets')
  return res.data
}

export async function updateTicketStatus(id, payload) {
  const res = await api.put(`/tickets/${id}`, payload)
  return res.data
}

export async function deleteTicket(id) {
  const res = await api.delete(`/tickets/${id}`)
  return res.data
}
