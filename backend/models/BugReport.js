const mongoose = require("mongoose");

// ── Bug comment sub-document ──────────────────────────────────────────────────
const bugCommentSchema = new mongoose.Schema({
  text:       { type: String, required: true },
  author:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  authorName: { type: String, required: true },
  isInternal: { type: Boolean, default: true }, // bug comments are internal by default
  createdAt:  { type: Date, default: Date.now },
});

// ── Bug environment sub-document ──────────────────────────────────────────────
const bugEnvironmentSchema = new mongoose.Schema({
  browser:    { type: String, default: "" },
  OS:         { type: String, default: "" },
  device:     { type: String, default: "Desktop" },
  appVersion: { type: String, default: "" },
});

// ── Main BugReport schema ─────────────────────────────────────────────────────
const bugReportSchema = new mongoose.Schema(
  {
    bugNumber: {
      type: String,
      unique: true,
      index: true,
    },

    // Linkage
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },

    // Authorship
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Core content
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    // Severity & Classification
    severity: {
      type: String,
      enum: ["Critical", "High", "Medium", "Low"],
      default: "Medium",
      index: true,
    },

    // Reproduction details (copied from ticket investigation at creation time)
    reproductionSteps: { type: String, default: "" },
    expectedBehaviour: { type: String, default: "" },
    actualBehaviour:   { type: String, default: "" },

    // Technical context
    environment: { type: bugEnvironmentSchema, default: () => ({}) },

    // Developer assignment
    assignedDeveloper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    // Bug lifecycle status
    status: {
      type: String,
      enum: ["Open", "Assigned", "In Progress", "Fixed", "Testing", "Verified", "Closed"],
      default: "Open",
      index: true,
    },

    // Internal discussion thread
    comments: [bugCommentSchema],

    // Soft delete
    isDeleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Compound indexes ──────────────────────────────────────────────────────────
bugReportSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
bugReportSchema.index({ organizationId: 1, severity: 1 });
bugReportSchema.index({ assignedDeveloper: 1, status: 1 });

// ── Pre-save: auto-generate BUG-XXXX ─────────────────────────────────────────
bugReportSchema.pre("save", async function () {
  if (this.isNew && !this.bugNumber) {
    const count = await mongoose.model("BugReport").countDocuments();
    this.bugNumber = `BUG-${String(1000 + count + 1).padStart(4, "0")}`;
  }

  // Auto-set status to Assigned when a developer is assigned
  if (this.isModified("assignedDeveloper") && this.assignedDeveloper && this.status === "Open") {
    this.status = "Assigned";
  }
});

module.exports = mongoose.model("BugReport", bugReportSchema);
