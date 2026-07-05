import api from './api'

/** List articles with optional filters */
export async function getArticles({ category, tag, search, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (tag)      params.set('tag', tag)
  if (search)   params.set('search', search)
  params.set('page', page)
  params.set('limit', limit)
  const res = await api.get(`/kb?${params}`)
  return res.data // { articles, total, page, limit }
}

/** Get single article by ID */
export async function getArticle(id) {
  const res = await api.get(`/kb/${id}`)
  return res.data
}

/** Create article (admin) */
export async function createArticle(data) {
  const res = await api.post('/kb', data)
  return res.data
}

/** Update article (admin) */
export async function updateArticle(id, data) {
  const res = await api.put(`/kb/${id}`, data)
  return res.data
}

/** Delete article (admin) */
export async function deleteArticle(id) {
  const res = await api.delete(`/kb/${id}`)
  return res.data
}

/** Global search */
export async function globalSearch(q, { type = 'all', limit = 10 } = {}) {
  const res = await api.get('/search', { params: { q, type, limit } })
  return res.data // { query, totalCount, results }
}
