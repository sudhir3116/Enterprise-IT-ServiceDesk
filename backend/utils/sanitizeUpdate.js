/**
 * Strip Mongo operator keys ($gt, $set, …) and dotted paths from user-supplied objects
 * before they are passed into findByIdAndUpdate / findOneAndUpdate.
 */
function sanitizeUpdate(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$") || key.includes(".")) continue;
    clean[key] = value;
  }
  return clean;
}

module.exports = { sanitizeUpdate };
