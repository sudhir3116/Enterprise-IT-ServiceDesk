const mongoose = require("mongoose");

const emailConfigurationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    supportEmail: {
      type: String,
      default: "support@productportal.com",
      trim: true,
      lowercase: true,
    },
    smtpHost: {
      type: String,
      default: "smtp.gmail.com",
    },
    smtpPort: {
      type: Number,
      default: 587,
    },
    smtpUsername: {
      type: String,
      default: "",
    },
    smtpPassword: {
      type: String,
      default: "",
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    templates: {
      ticketCreatedSubject: { type: String, default: "Your ticket has been created - {{ticketNumber}}" },
      engineerReplySubject: { type: String, default: "New response on your ticket {{ticketNumber}}" },
      statusChangeSubject: { type: String, default: "Your ticket {{ticketNumber}} status changed to {{status}}" },
      slaWarningSubject: { type: String, default: "SLA Warning: Ticket {{ticketNumber}} requires attention" },
      ticketResolvedSubject: { type: String, default: "Your ticket {{ticketNumber}} has been resolved" }
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("EmailConfiguration", emailConfigurationSchema);
