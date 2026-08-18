/**
 * auditLogger.js — Backward-compatible audit logging bridge.
 *
 * All existing call sites (logAction / logAudit) continue to work.
 * New code should use auditService.log() or auditService.auth.* directly.
 */

const AuditLog = require("../models/AuditLog");
const auditService = require("../services/auditService");

/**
 * Legacy API — writes a structured change log for entity mutations.
 * Used by ticket, user-management, and settings controllers.
 *
 * @param {string}   entity      - Entity type (e.g. "Ticket", "User")
 * @param {ObjectId} entityId    - The affected document's _id
 * @param {string}   action      - Action label (e.g. "STATUS_CHANGED")
 * @param {ObjectId} userId      - Who performed the action
 * @param {Object}   [changes]   - { before, after } snapshot
 * @param {string}   [ipAddress]
 */
const logAction = async (entity, entityId, action, userId, changes = {}, ipAddress = null) => {
  try {
    await AuditLog.create({
      entity,
      entityId,
      action,
      performedBy: userId,
      userId,
      ipAddress,
      changes: {
        before: changes.before || {},
        after:  changes.after  || {},
      },
      // Auto-classify based on action string via auditService event map
      category: entity === "User" ? "USER_MANAGEMENT" : "TICKET_ACTIVITY",
    });
  } catch (err) {
    console.error("[auditLogger] Failed to write audit log via logAction:", err.message);
  }
};

/**
 * Named-argument wrapper — same logic, more readable call sites.
 */
const logAudit = async ({
  entity,
  entityId,
  action,
  performedBy,
  before = {},
  after  = {},
  ipAddress = null,
}) => {
  return logAction(entity, entityId, action, performedBy, { before, after }, ipAddress);
};

module.exports = { logAction, logAudit };
