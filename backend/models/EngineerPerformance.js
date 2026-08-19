const mongoose = require("mongoose");

const engineerPerformanceSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    engineerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    ticketsAssigned: { type: Number, default: 0 },
    ticketsResolved: { type: Number, default: 0 },
    averageResolutionTime: { type: Number, default: 0 }, // in hours
    slaComplianceRate: { type: Number, default: 100 }, // percentage 0-100
    customerRatingAverage: { type: Number, default: 5.0 }, // 1.0 - 5.0
  },
  {
    timestamps: true,
  }
);

engineerPerformanceSchema.index({ organizationId: 1, engineerId: 1, date: -1 });

module.exports = mongoose.model("EngineerPerformance", engineerPerformanceSchema);
