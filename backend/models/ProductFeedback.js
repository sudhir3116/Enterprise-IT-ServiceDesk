const mongoose = require("mongoose");

const productFeedbackSchema = new mongoose.Schema(
  {
    // Multi-tenant isolation
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
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
      maxlength: 5000,
    },

    // Categorization
    category: {
      type: String,
      enum: [
        "Feature Request",
        "UI/UX",
        "Performance",
        "Integration",
        "Documentation",
        "Other",
      ],
      default: "Feature Request",
      index: true,
    },

    // Voting — stores userId of each voter to prevent duplicates
    votes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Lifecycle status
    status: {
      type: String,
      enum: [
        "Submitted",
        "Under Review",
        "Planned",
        "In Development",
        "Released",
        "Rejected",
      ],
      default: "Submitted",
      index: true,
    },

    // Admin response
    adminResponse: { type: String, default: "" },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    respondedAt: { type: Date },

    // Soft delete
    isDeleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: vote count ───────────────────────────────────────────────────────
productFeedbackSchema.virtual("voteCount").get(function () {
  return this.votes ? this.votes.length : 0;
});

// ── Compound indexes ──────────────────────────────────────────────────────────
productFeedbackSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
productFeedbackSchema.index({ organizationId: 1, category: 1 });

module.exports = mongoose.model("ProductFeedback", productFeedbackSchema);
