const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

/**
 * Enterprise-grade AuditLog schema.
 *
 * Design principles:
 *  - eventId: UUID generated at creation time — globally unique, safe to expose in UIs
 *  - category: coarse-grained bucketing for dashboard filters
 *  - severity: INFO / WARNING / CRITICAL — drives alert thresholds
 *  - status:   SUCCESS / FAILURE / BLOCKED
 *  - email:    denormalized for fast search without population joins
 *  - deviceInfo: structured browser/OS/device parsed from userAgent
 *  - metadata: arbitrary JSON for per-event contextual data
 *
 * Backward compatibility:
 *  All original fields (entity, entityId, action, performedBy, changes, ipAddress, timestamp)
 *  are preserved. entity/entityId are now optional to support AUTHENTICATION events
 *  where no DB entity exists (e.g. LOGIN_FAILED with unknown email).
 */
const auditLogSchema = new mongoose.Schema(
  {
    // ── Unique event identifier ───────────────────────────────────────────
    eventId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
    },

    // ── Identity ──────────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    /** Denormalized email — enables search without join on failed-login events */
    email: {
      type: String,
      index: true,
    },

    // ── Legacy fields (preserved for backward compat) ─────────────────────
    entity: {
      type: String,
      index: true,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      // Made optional: AUTH events (e.g. LOGIN_FAILED) have no entityId
    },

    /** @deprecated Use userId. Kept for existing logAudit() call sites. */
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    changes: {
      before: { type: mongoose.Schema.Types.Mixed },
      after:  { type: mongoose.Schema.Types.Mixed },
    },

    // ── Event classification ──────────────────────────────────────────────
    action: {
      type: String,
      required: true,
      index: true,
    },

    category: {
      type: String,
      enum: [
        "AUTHENTICATION",
        "SECURITY",
        "USER_MANAGEMENT",
        "TICKET_ACTIVITY",
        "SYSTEM",
      ],
      default: "SYSTEM",
      index: true,
    },

    severity: {
      type: String,
      enum: ["INFO", "WARNING", "CRITICAL"],
      default: "INFO",
      index: true,
    },

    status: {
      type: String,
      enum: ["SUCCESS", "FAILURE", "BLOCKED"],
    },

    // ── Network & device context ──────────────────────────────────────────
    ipAddress: {
      type: String,
    },

    userAgent: {
      type: String,
    },

    /** Structured device info: { browser, os, device } */
    deviceInfo: {
      browser:  { type: String },
      os:       { type: String },
      device:   { type: String },
    },

    // ── Arbitrary event payload ───────────────────────────────────────────
    /** Never store passwords, tokens, or secrets in metadata */
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ── Legacy details field ──────────────────────────────────────────────
    details: {
      type: String,
    },

    // ── Timestamps ────────────────────────────────────────────────────────
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,  // adds createdAt / updatedAt
  }
);

// ── Compound indexes for common dashboard queries ─────────────────────────
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ category: 1, severity: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

// Auto-expire old INFO logs after 90 days; keep WARNING/CRITICAL forever.
// Comment out or adjust the `expireAfterSeconds` value to change retention.
// auditLogSchema.index(
//   { timestamp: 1 },
//   { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { severity: "INFO" } }
// );

module.exports = mongoose.model("AuditLog", auditLogSchema);
