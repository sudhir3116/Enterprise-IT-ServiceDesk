/**
 * auditService.js — Enterprise SaaS Audit & Security Event Logging Service
 *
 * Design goals:
 *  1. Single responsibility — all audit writes go through this layer
 *  2. Structured, typed events — no raw string-based log calls
 *  3. Fire-and-forget async — never crashes the calling request
 *  4. Security-safe — sanitizes metadata, never logs tokens or passwords
 *  5. Device-aware — parses raw userAgent into browser / OS / device
 *  6. Extensible — event map drives category + severity automatically
 */

const { randomUUID: uuidv4 } = require("crypto");
const UAParser = require("ua-parser-js");
const AuditLog = require("../models/AuditLog");

// ─── Event Classification Map ─────────────────────────────────────────────────
// Maps every action string → { category, severity }
// Drives automatic classification on every log() call.
const EVENT_MAP = {
  // ── Authentication ──────────────────────────────────────────────────────
  LOGIN_SUCCESS:               { category: "AUTHENTICATION", severity: "INFO"     },
  LOGIN_FAILED:                { category: "AUTHENTICATION", severity: "WARNING"  },
  LOGOUT:                      { category: "AUTHENTICATION", severity: "INFO"     },
  LOGOUT_ALL_DEVICES:          { category: "AUTHENTICATION", severity: "WARNING"  },
  GOOGLE_LOGIN_SUCCESS:        { category: "AUTHENTICATION", severity: "INFO"     },
  MICROSOFT_LOGIN_SUCCESS:     { category: "AUTHENTICATION", severity: "INFO"     },
  TOKEN_REFRESHED:             { category: "AUTHENTICATION", severity: "INFO"     },
  SESSION_CREATED:             { category: "AUTHENTICATION", severity: "INFO"     },
  SESSION_REVOKED:             { category: "AUTHENTICATION", severity: "WARNING"  },

  // ── Security events ─────────────────────────────────────────────────────
  ACCOUNT_LOCKED:              { category: "SECURITY",       severity: "CRITICAL" },
  ACCOUNT_UNLOCKED:            { category: "SECURITY",       severity: "WARNING"  },
  PASSWORD_CHANGED:            { category: "SECURITY",       severity: "WARNING"  },
  PASSWORD_RESET_REQUESTED:    { category: "SECURITY",       severity: "INFO"     },
  PASSWORD_RESET_COMPLETED:    { category: "SECURITY",       severity: "WARNING"  },
  UNAUTHORIZED_ACCESS_ATTEMPT: { category: "SECURITY",       severity: "CRITICAL" },
  PERMISSION_DENIED:           { category: "SECURITY",       severity: "WARNING"  },

  // ── User management ──────────────────────────────────────────────────────
  USER_REGISTERED:             { category: "USER_MANAGEMENT", severity: "INFO"    },
  PROFILE_UPDATED:             { category: "USER_MANAGEMENT", severity: "INFO"    },
  ROLE_CHANGED:                { category: "USER_MANAGEMENT", severity: "WARNING" },
  USER_DELETED:                { category: "USER_MANAGEMENT", severity: "CRITICAL"},
  USER_DEACTIVATED:            { category: "USER_MANAGEMENT", severity: "WARNING" },
  USER_REACTIVATED:            { category: "USER_MANAGEMENT", severity: "INFO"    },

  // ── Ticket activity ─────────────────────────────────────────────────────
  TICKET_CREATED:              { category: "TICKET_ACTIVITY", severity: "INFO"   },
  TICKET_UPDATED:              { category: "TICKET_ACTIVITY", severity: "INFO"   },
  TICKET_ASSIGNED:             { category: "TICKET_ACTIVITY", severity: "INFO"   },
  TICKET_STATUS_CHANGED:       { category: "TICKET_ACTIVITY", severity: "INFO"   },
  TICKET_DELETED:              { category: "TICKET_ACTIVITY", severity: "WARNING" },
  COMMENT_ADDED:               { category: "TICKET_ACTIVITY", severity: "INFO"   },
  FILE_UPLOADED:               { category: "TICKET_ACTIVITY", severity: "INFO"   },

  // ── System ───────────────────────────────────────────────────────────────
  KNOWLEDGE_BASE_UPDATED:      { category: "SYSTEM",          severity: "INFO"   },
  SYSTEM_SETTINGS_CHANGED:     { category: "SYSTEM",          severity: "WARNING" },
};

// ─── Sensitive key blocklist ─────────────────────────────────────────────────
// Any metadata key that matches these regexes is stripped before persistence.
const BLOCKED_METADATA_KEYS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /refresh/i,
  /hash/i,
  /salt/i,
  /creditcard/i,
  /ssn/i,
];

/**
 * Strips sensitive keys from a metadata object.
 * Returns a new sanitized object — never mutates the input.
 */
function sanitizeMetadata(raw = {}) {
  if (!raw || typeof raw !== "object") return {};
  const safe = {};
  for (const [k, v] of Object.entries(raw)) {
    const isSensitive = BLOCKED_METADATA_KEYS.some((rx) => rx.test(k));
    if (!isSensitive) {
      safe[k] = v;
    }
  }
  return safe;
}

/**
 * Parse a raw userAgent string into structured device info.
 * Returns { browser, os, device } — all strings.
 */
function parseUserAgent(rawUA) {
  if (!rawUA) return { browser: "Unknown", os: "Unknown", device: "Unknown" };
  try {
    const parser = new UAParser(rawUA);
    const uaResult = parser.getResult();

    const browser = [uaResult.browser?.name, uaResult.browser?.version]
      .filter(Boolean)
      .join(" ") || "Unknown";

    const os = [uaResult.os?.name, uaResult.os?.version]
      .filter(Boolean)
      .join(" ") || "Unknown";

    const device =
      uaResult.device?.type
        ? `${uaResult.device.type}${uaResult.device.vendor ? ` (${uaResult.device.vendor})` : ""}`
        : "Desktop";

    return { browser, os, device };
  } catch {
    return { browser: "Unknown", os: "Unknown", device: "Unknown" };
  }
}

/**
 * Determine the event status from the action string.
 * Convention: *_FAILED / *_LOCKED / *_BLOCKED actions are failures.
 */
function deriveStatus(action, overrideStatus) {
  if (overrideStatus) return overrideStatus;
  if (/_FAILED$/i.test(action) || /_LOCKED$/i.test(action)) return "FAILURE";
  if (/_BLOCKED$/i.test(action) || /UNAUTHORIZED/i.test(action))  return "BLOCKED";
  return "SUCCESS";
}

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * Record a structured audit event.
 *
 * @param {Object} event
 * @param {string|ObjectId} [event.userId]       - DB user _id (optional for pre-auth failures)
 * @param {string}          [event.email]         - User email (denormalized for search)
 * @param {string}           event.action         - Event name from EVENT_MAP
 * @param {string}          [event.category]      - Auto-derived from action if omitted
 * @param {string}          [event.severity]      - Auto-derived from action if omitted
 * @param {string}          [event.status]        - SUCCESS | FAILURE | BLOCKED (auto-derived)
 * @param {string}          [event.ipAddress]     - Request IP
 * @param {string}          [event.userAgent]     - Raw User-Agent header
 * @param {Object}          [event.metadata]      - Arbitrary contextual data (sanitized)
 *
 * @returns {Promise<void>} — always resolves; never rejects
 */
async function log(event) {
  try {
    const {
      userId,
      email,
      action,
      ipAddress,
      userAgent,
      metadata = {},
      status,
      // Allow explicit overrides
      category: categoryOverride,
      severity: severityOverride,
    } = event;

    if (!action) {
      console.error("[auditService] log() called without an action — skipped.");
      return;
    }

    // Classify the event
    const classification = EVENT_MAP[action] || { category: "SYSTEM", severity: "INFO" };
    const category = categoryOverride || classification.category;
    const severity  = severityOverride || classification.severity;
    const resolvedStatus = deriveStatus(action, status);

    // Parse device info from userAgent
    const deviceInfo = parseUserAgent(userAgent);

    // Sanitize metadata — never write tokens/passwords/secrets
    const safeMetadata = sanitizeMetadata(metadata);

    await AuditLog.create({
      eventId:    uuidv4(),
      userId:     userId   || undefined,
      email:      email    || undefined,
      action,
      category,
      severity,
      status:     resolvedStatus,
      ipAddress:  ipAddress || null,
      userAgent:  userAgent  || null,
      deviceInfo,
      metadata:   safeMetadata,
      timestamp:  new Date(),

      // Preserve legacy field compatibility
      performedBy: userId || undefined,
      entity:      category,  // coarse entity bucket for legacy queries
    });
  } catch (err) {
    // Audit failure must NEVER crash the request
    console.error("[auditService] Failed to write audit log:", err.message, {
      action: event?.action,
      userId: event?.userId,
    });
  }
}

/**
 * Convenience helpers for common auth events.
 * These ensure consistent metadata shape across the codebase.
 */
const auth = {
  loginSuccess: (userId, email, ipAddress, userAgent, loginMethod = "EMAIL") =>
    log({ userId, email, action: "LOGIN_SUCCESS", ipAddress, userAgent, metadata: { loginMethod } }),

  loginFailed: (email, ipAddress, userAgent, reason = "Invalid credentials", attempts = null) =>
    log({
      email,
      action: "LOGIN_FAILED",
      ipAddress,
      userAgent,
      metadata: { reason, ...(attempts !== null && { failedAttempts: attempts }) },
    }),

  accountLocked: (userId, email, ipAddress, userAgent, unlockAt) =>
    log({ userId, email, action: "ACCOUNT_LOCKED", ipAddress, userAgent, metadata: { unlockAt } }),

  logout: (userId, email, ipAddress, userAgent) =>
    log({ userId, email, action: "LOGOUT", ipAddress, userAgent }),

  logoutAllDevices: (userId, email, ipAddress, userAgent) =>
    log({ userId, email, action: "LOGOUT_ALL_DEVICES", ipAddress, userAgent }),

  googleLogin: (userId, email, ipAddress, userAgent) =>
    log({ userId, email, action: "GOOGLE_LOGIN_SUCCESS", ipAddress, userAgent, metadata: { loginMethod: "GOOGLE" } }),

  microsoftLogin: (userId, email, ipAddress, userAgent) =>
    log({ userId, email, action: "MICROSOFT_LOGIN_SUCCESS", ipAddress, userAgent, metadata: { loginMethod: "MICROSOFT" } }),

  sessionCreated: (userId, email, ipAddress, userAgent, rememberMe = false) =>
    log({ userId, email, action: "SESSION_CREATED", ipAddress, userAgent, metadata: { rememberMe } }),

  tokenRefreshed: (userId, email, ipAddress, userAgent) =>
    log({ userId, email, action: "TOKEN_REFRESHED", ipAddress, userAgent }),

  passwordResetRequested: (userId, email, ipAddress, userAgent) =>
    log({ userId, email, action: "PASSWORD_RESET_REQUESTED", ipAddress, userAgent }),

  passwordResetCompleted: (userId, email, ipAddress, userAgent) =>
    log({ userId, email, action: "PASSWORD_RESET_COMPLETED", ipAddress, userAgent }),

  passwordChanged: (userId, email, ipAddress, userAgent) =>
    log({ userId, email, action: "PASSWORD_CHANGED", ipAddress, userAgent }),

  userRegistered: (userId, email, ipAddress, userAgent, role) =>
    log({ userId, email, action: "USER_REGISTERED", ipAddress, userAgent, metadata: { role } }),
};

module.exports = { log, auth };
