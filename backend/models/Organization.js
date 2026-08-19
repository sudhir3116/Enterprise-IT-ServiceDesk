const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    domain: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "trial"],
      default: "active",
    },
    maxUsers: {
      type: Number,
      default: 25,
    },
    maxAgents: {
      type: Number,
      default: 5,
    },
    settings: {
      brandColor: {
        type: String,
        default: "#2563eb",
      },
      logoUrl: {
        type: String,
        default: "",
      },
      allowSelfSignup: {
        type: Boolean,
        default: true,
      },
    },
    businessHours: {
      timezone: {
        type: String,
        default: "UTC",
      },
      workingDays: [
        {
          type: String,
          default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        },
      ],
      startTime: {
        type: String,
        default: "09:00",
      },
      endTime: {
        type: String,
        default: "17:00",
      },
      holidays: [
        {
          type: Date,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Organization", organizationSchema);
