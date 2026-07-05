const mongoose = require("mongoose");

// ── Embedded comment sub-document ─────────────────────────────────────────────
const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  isInternal: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// ── Activity timeline entry ────────────────────────────────────────────────────
const historySchema = new mongoose.Schema({
  action:      { type: String, required: true },
  performedBy: { type: String, required: true },
  detail:      { type: String },              // extra context (e.g. old→new status)
  date:        { type: Date, default: Date.now },
});

// ── Main ticket schema ─────────────────────────────────────────────────────────
const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, unique: true, index: true },

    // Core fields
    title:       { type: String, required: true, index: true },
    description: { type: String, required: true },

    // Classification
    category: {
      type: String,
      enum: ["General", "Hardware", "Software", "Network", "Security", "Access", "Other"],
      required: true,
      default: "General",
    },
    subcategory: { type: String, default: "" },
    department: { type: String, default: "" },

    // Priority matrix
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    impact: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    urgency: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    // Workflow status
    status: {
      type: String,
      enum: ["Open", "Assigned", "In Progress", "Pending", "Resolved", "Closed", "Waiting for User", "Escalated"],
      default: "Open",
      index: true,
    },

    // People
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    // SLA
    dueDate:     { type: Date },   // SLA deadline (computed on creation)
    resolvedAt:  { type: Date },   // when status moved to Resolved/Closed
    slaBreached: { type: Boolean, default: false },

    // Tags for advanced filtering
    tags: [{ type: String }],

    // Soft delete
    isDeleted: { type: Boolean, default: false, index: true },

    // Sub-documents
    comments: [commentSchema],
    history:  [historySchema],
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Full-text search index on title + description ──────────────────────────────
ticketSchema.index({ title: "text", description: "text", tags: "text" });

// ── Compound index for common queries ─────────────────────────────────────────
ticketSchema.index({ createdBy: 1, status: 1, createdAt: -1 });
ticketSchema.index({ assignedTo: 1, status: 1 });

// ── SLA deadline helper map ────────────────────────────────────────────────────
const SLA_HOURS = { Critical: 4, High: 24, Medium: 72, Low: 120 };

// ── Pre-save hook: sequential ticket number + SLA deadline ───────────────────
ticketSchema.pre("save", async function () {
  // Generate TKT-XXXX on new tickets
  if (this.isNew && !this.ticketNumber) {
    const count = await mongoose.model("Ticket").countDocuments();
    this.ticketNumber = `TKT-${String(1000 + count + 1).padStart(4, "0")}`;
  }

  // Set SLA deadline if not already set
  if (this.isNew && !this.dueDate) {
    const hours = SLA_HOURS[this.priority] || 72;
    this.dueDate = new Date(Date.now() + hours * 3_600_000);
  }

  // Mark resolvedAt timestamp when ticket is closed, or clear it if reopened
  if (this.isModified("status")) {
    if (["Resolved", "Closed"].includes(this.status)) {
      if (!this.resolvedAt) {
        this.resolvedAt = new Date();
      }
    } else {
      this.resolvedAt = undefined;
    }
  }
});

// ── Virtual: SLA status ────────────────────────────────────────────────────────
ticketSchema.virtual("slaStatus").get(function () {
  if (["Resolved", "Closed"].includes(this.status)) return "met";
  if (!this.dueDate) return "unknown";
  const now = Date.now();
  const remaining = new Date(this.dueDate) - now;
  if (remaining < 0) return "breached";
  if (remaining < 4 * 3_600_000) return "critical";
  if (remaining < 24 * 3_600_000) return "warning";
  return "ok";
});

// ── Virtual: resolution time in hours ─────────────────────────────────────────
ticketSchema.virtual("resolutionHours").get(function () {
  if (!this.resolvedAt) return null;
  return Math.round((this.resolvedAt - this.createdAt) / 3_600_000 * 10) / 10;
});

module.exports = mongoose.model("Ticket", ticketSchema);