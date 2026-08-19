const mongoose = require("mongoose");

const ticketAnalyticsSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    totalTickets: { type: Number, default: 0 },
    createdTickets: { type: Number, default: 0 },
    resolvedTickets: { type: Number, default: 0 },
    closedTickets: { type: Number, default: 0 },
    slaBreachedTickets: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 }, // in minutes
    averageResolutionTime: { type: Number, default: 0 }, // in minutes
    customerSatisfactionScore: { type: Number, default: 0 }, // 1.0 to 5.0
  },
  {
    timestamps: true,
  }
);

ticketAnalyticsSchema.index({ organizationId: 1, date: -1 });

module.exports = mongoose.model("TicketAnalytics", ticketAnalyticsSchema);
