const rateLimit = require("express-rate-limit");

const isTest = process.env.NODE_ENV === "test";

/**
 * Strict Rate Limiter for Sensitive Authentication Endpoints
 * Applied to: POST /login, POST /register, POST /forgot-password, POST /reset-password
 * Limits: 5 attempts per 15 minutes per IP (1000 in test mode)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Try again in 15 minutes.",
  },
});

/**
 * General API Rate Limiter
 * Applied to: /api endpoints (excluding OAuth SSO redirect paths)
 * Limits: 100 requests per 15 minutes per IP (5000 in test mode)
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 5000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const path = req.originalUrl || req.path || "";
    return path.includes("/auth/google") || path.includes("/auth/microsoft");
  },
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

module.exports = {
  authLimiter,
  apiLimiter,
};
