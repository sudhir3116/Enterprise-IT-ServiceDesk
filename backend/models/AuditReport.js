const mongoose = require("mongoose");

const auditReportSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportType: {
      type: String,
      enum: ["ticket", "sla", "engineer", "audit"],
      required: true,
    },
    format: {
      type: String,
      enum: ["csv", "pdf"],
      default: "csv",
    },
    fileUrl: {
      type: String,
      default: "",
    },
    recordCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

auditReportSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.model("AuditReport", auditReportSchema);
