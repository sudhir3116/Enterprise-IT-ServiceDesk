const mongoose = require("mongoose");

// ── Embedded comment sub-document ─────────────────────────────────────────────
const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  isInternal: { type: Boolean, default: false },
  type: { type: String, enum: ["public_reply", "internal_note", "system_update"], default: "public_reply" },
  createdAt: { type: Date, default: Date.now },
});

// ── Attachment sub-document ───────────────────────────────────────────────────
const attachmentSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  url:        { type: String, required: true },
  fileType:   { type: String, default: "" },
  size:       { type: Number, default: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  uploadedAt: { type: Date, default: Date.now }
});

// ── Environment sub-document ──────────────────────────────────────────────────
const environmentSchema = new mongoose.Schema({
  browser: { type: String, default: "" },
  OS:      { type: String, default: "" },
  device:  { type: String, default: "Desktop" }
});

// ── Technical Issue Details sub-document ──────────────────────────────────────
const issueDetailsSchema = new mongoose.Schema({
  stepsToReproduce: { type: String, default: "" },
  expectedBehavior: { type: String, default: "" },
  actualBehavior:   { type: String, default: "" }
});

// ── Investigation sub-document (engineer-only, Module 8) ──────────────────────
const investigationSchema = new mongoose.Schema({
  issueType: {
    type: String,
    enum: ["Bug", "Question", "Feature Request", "Configuration Issue"],
    default: "Bug",
  },
  severity: {
    type: String,
    enum: ["Critical", "High", "Medium", "Low"],
    default: "Medium",
  },
  reproducible: {
    type: String,
    enum: ["Yes", "No", "Intermittent"],
    default: "Yes",
  },
  appVersion:      { type: String, default: "" },
  technicalNotes:  { type: String, default: "" },
  investigatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  investigatedAt:  { type: Date },
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

    // Multi-tenant Organization Boundary
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", index: true },

    // People
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    // Enterprise SaaS Technical Context
    environment: { type: environmentSchema, default: () => ({}) },
    issueDetails: { type: issueDetailsSchema, default: () => ({}) },
    investigation: { type: investigationSchema, default: () => ({}) },
    attachments: [attachmentSchema],
    resolutionSummary: { type: String, default: "" },

    // Linked Bug Reports (Module 8)
    bugReportIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "BugReport" }],

    // SLA
    dueDate:     { type: Date },   // SLA deadline (computed on creation)
    resolvedAt:  { type: Date },   // when status moved to Resolved/Closed
    slaBreached: { type: Boolean, default: false },
    sla: {
      policyId: { type: mongoose.Schema.Types.ObjectId, ref: "SlaPolicy" },
      firstResponseDue: { type: Date },
      firstRespondedAt: { type: Date },
      resolutionDue: { type: Date },
      breached: { type: Boolean, default: false },
      responseBreached: { type: Boolean, default: false },
      resolutionBreached: { type: Boolean, default: false },
      responseBreachNotified: { type: Boolean, default: false },
      resolutionBreachNotified: { type: Boolean, default: false },
    },

    // Tags for advanced filtering
    tags: [{ type: String }],

    // Ticket Source & Email Threading Context
    source: {
      type: String,
      enum: ["web", "email", "api"],
      default: "web",
      index: true,
    },
    emailThreadId: { type: String, index: true },
    externalMessageId: { type: String, index: true },
    emailConversationHistory: [
      {
        messageId: { type: String },
        from: { type: String },
        to: { type: String },
        subject: { type: String },
        body: { type: String },
        sentAt: { type: Date, default: Date.now },
        isOutbound: { type: Boolean, default: false }
      }
    ],

    // CSAT Customer Rating (1 to 5 stars)
    csatRating: { type: Number, min: 1, max: 5 },
    csatFeedback: { type: String, default: "" },

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

// ── Compound index for common multi-tenant queries ───────────────────────────
ticketSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
ticketSchema.index({ organizationId: 1, createdBy: 1, createdAt: -1 });
ticketSchema.index({ organizationId: 1, assignedTo: 1, status: 1 });

// ── SLA deadline helper map (hours) — matches platform SLA definitions
const SLA_HOURS = { Critical: 4, High: 8, Medium: 24, Low: 72 };

// ── Pre-save hook: sequential ticket number + SLA deadline ───────────────────
ticketSchema.pre("save", async function () {
  // Generate TKT-XXXX atomically on new tickets using Counter
  if (this.isNew && !this.ticketNumber) {
    try {
      const Counter = mongoose.model("Counter");
      const seq = await Counter.next("ticketNumber");
      this.ticketNumber = `TKT-${String(1000 + seq).padStart(4, "0")}`;
    } catch (err) {
      const count = await mongoose.model("Ticket").countDocuments();
      this.ticketNumber = `TKT-${String(1000 + count + 1).padStart(4, "0")}`;
    }
  }

  // Calculate priority dynamically from impact and urgency
  if (this.isNew || this.isModified("impact") || this.isModified("urgency")) {
    const imp = this.impact || "Medium";
    const urg = this.urgency || "Medium";
    
    if (imp === "High" && urg === "High") {
      this.priority = "Critical";
    } else if ((imp === "High" && urg === "Medium") || (imp === "Medium" && urg === "High")) {
      this.priority = "High";
    } else if (imp === "Medium" && urg === "Medium") {
      this.priority = "Medium";
    } else {
      this.priority = "Low";
    }
  }

  // Set SLA deadline if not already set
  if (this.isNew) {
    const hours = SLA_HOURS[this.priority] || 24;
    const now = Date.now();
    const resolutionDueDate = new Date(now + hours * 3_600_000);
    if (!this.dueDate) {
      this.dueDate = resolutionDueDate;
    }
    const firstRespMinutes = this.priority === "Critical" ? 15 : (this.priority === "High" ? 60 : 120);
    const firstResponseDueDate = new Date(now + firstRespMinutes * 60_000);

    this.sla = this.sla || {};
    if (!this.sla.resolutionDue) this.sla.resolutionDue = resolutionDueDate;
    if (!this.sla.firstResponseDue) this.sla.firstResponseDue = firstResponseDueDate;
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

// ── Virtual: slaDeadline ────────────────────────────────────────────────────────
ticketSchema.virtual("slaDeadline")
  .get(function () {
    return this.dueDate || (this.sla ? this.sla.resolutionDue : null);
  })
  .set(function (val) {
    this.dueDate = val;
    if (this.sla) this.sla.resolutionDue = val;
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