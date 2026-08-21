const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    mobileNumber: {
      type: String,
      required: true,
    },

    password: {
      type: String,
      // Optional: OAuth users (Google/Microsoft) do not have a local password
    },

    authProvider: {
      type: String,
      enum: ["local", "google", "microsoft"],
      default: "local",
    },

    googleId: {
      type: String,
      sparse: true,
    },

    microsoftId: {
      type: String,
      sparse: true,
    },

    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },

    role: {
      type: String,
      enum: ["pending", "customer", "support_engineer", "developer", "admin", "requester", "agent", "employee"],
      default: "pending",
    },

    roleRequestedByUser: {
      type: Boolean,
      default: false,
    },

    team: {
      type: String,
      default: "General",
    },

    skills: [
      {
        type: String,
        enum: ["General", "Hardware", "Software", "Network", "Security", "Access", "Database", "Other"],
      },
    ],

    currentWorkload: {
      type: Number,
      default: 0,
    },

    currentTicketCount: {
      type: Number,
      default: 0,
    },

    availability: {
      type: String,
      enum: ["available", "busy", "offline"],
      default: "available",
    },

    maxCapacity: {
      type: Number,
      default: 10,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
    },

    emailVerificationExpires: {
      type: Date,
    },

    department: {
      type: String,
      default: "General",
    },

    designation: {
      type: String,
      default: "Staff",
    },

    employeeId: {
      type: String,
      default: function() {
        return "EMP-" + Math.floor(100000 + Math.random() * 90000);
      }
    },

    accountStatus: {
      type: String,
      enum: ["pending_approval", "active", "rejected", "suspended", "inactive"],
      default: "pending_approval",
    },

    isApproved: {
      type: Boolean,
      default: false,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedAt: {
      type: Date,
    },

    requestedRole: {
      type: String,
      default: null,
    },

    registrationMethod: {
      type: String,
      enum: ["google", "password", "local"],
      default: "password",
    },

    lastLogin: {
      type: Date,
      default: Date.now,
    },
    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpires: {
      type: Date,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },

    refreshTokens: [
      {
        token: {
          type: String,
          required: true,
        },
        deviceInfo: {
          type: String,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.index({ organizationId: 1, role: 1 });
userSchema.index({ accountStatus: 1 });

module.exports = mongoose.model("User", userSchema);