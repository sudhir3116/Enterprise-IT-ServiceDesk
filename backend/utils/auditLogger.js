const AuditLog = require("../models/AuditLog");

/**
 * Creates a database AuditLog trace record matching specify signature
 */
const logAction = async (entity, entityId, action, userId, changes = {}, ipAddress = null) => {
  try {
    await AuditLog.create({
      entity,
      entityId,
      action,
      performedBy: userId,
      ipAddress,
      changes: {
        before: changes.before || {},
        after: changes.after || {},
      },
    });
  } catch (err) {
    console.error("Failed to write audit log via logAction:", err.message);
  }
};

/**
 * Backward compatible wrapper for previous implementation
 */
const logAudit = async ({ entity, entityId, action, performedBy, before = {}, after = {}, ipAddress = null }) => {
  return logAction(entity, entityId, action, performedBy, { before, after }, ipAddress);
};

module.exports = {
  logAction,
  logAudit,
};
