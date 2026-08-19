/**
 * Response helper for standardized API success envelopes across all controllers.
 *
 * Example payload:
 * {
 *   success: true,
 *   message: "Tickets retrieved successfully",
 *   data: [...],
 *   pagination: { page: 1, limit: 20, total: 45, totalPages: 3 },
 *   timestamp: "2026-08-19T14:00:00.000Z"
 * }
 */
const sendSuccess = (res, statusCode = 200, message = "Success", data = null, meta = null) => {
  const payload = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
  };

  if (data !== null) payload.data = data;
  if (meta !== null) payload.meta = meta;

  return res.status(statusCode).json(payload);
};

module.exports = { sendSuccess };
