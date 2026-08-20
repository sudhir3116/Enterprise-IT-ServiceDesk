const mongoose = require("mongoose");

const emailLogSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    recipient: {
      type: String,
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
    },
    emailType: {
      type: String,
      default: "general",
      index: true,
    },
    status: {
      type: String,
      enum: ["SENT", "FAILED", "SKIPPED", "sent", "failed", "skipped"],
      default: "SENT",
      index: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    errorMessage: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

emailLogSchema.index({ organizationId: 1, sentAt: -1 });

module.exports = mongoose.model("EmailLog", emailLogSchema);
