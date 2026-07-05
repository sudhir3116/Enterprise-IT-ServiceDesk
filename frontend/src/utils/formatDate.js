export function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleString()
}
