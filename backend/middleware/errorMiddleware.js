const logger = require("../utils/logger");

/**
 * Centralized production error handler middleware.
 * Guarantees a consistent JSON error response shape across all routes.
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  const errorCode = err.errorCode || (statusCode === 404 ? "NOT_FOUND" : statusCode === 403 ? "FORBIDDEN" : statusCode === 401 ? "UNAUTHORIZED" : "INTERNAL_SERVER_ERROR");

  // Log error via Winston
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, {
    statusCode,
    errorCode,
    ip: req.ip,
    user: req.user?._id,
    stack: err.stack,
  });

  const responsePayload = {
    success: false,
    message: err.message || "Internal Server Error",
    errorCode,
    timestamp: new Date().toISOString(),
  };

  if (err.details) {
    responsePayload.details = err.details;
  }

  // Include stack trace only in development
  if (process.env.NODE_ENV !== "production") {
    responsePayload.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
};

module.exports = { errorHandler };
