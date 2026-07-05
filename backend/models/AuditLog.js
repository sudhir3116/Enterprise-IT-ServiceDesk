const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    entity: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
    },
    details: {
      type: String,
    },
    changes: {
      before: {
        type: mongoose.Schema.Types.Map,
        of: mongoose.Schema.Types.Mixed,
      },
      after: {
        type: mongoose.Schema.Types.Map,
        of: mongoose.Schema.Types.Mixed,
      },
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
