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
    status: {
      type: String,
      enum: ["sent", "failed"],
      default: "sent",
      index: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
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
