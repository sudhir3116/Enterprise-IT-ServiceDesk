const mongoose = require("mongoose");

const slaPolicySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["Critical", "High", "Medium", "Low"],
      required: true,
    },
    firstResponseTime: {
      type: Number, // in minutes
      required: true,
    },
    resolutionTime: {
      type: Number, // in minutes
      required: true,
    },
    businessHours: {
      type: Boolean, // true = evaluate during business hours; false = 24/7
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

slaPolicySchema.index({ organizationId: 1, priority: 1 });

module.exports = mongoose.model("SlaPolicy", slaPolicySchema);
