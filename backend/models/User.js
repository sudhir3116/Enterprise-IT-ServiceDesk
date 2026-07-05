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
      required: true,
    },

    role: {
      type: String,
      enum: ["requester", "agent", "admin"],
      default: "requester",
    },

    team: {
      type: String,
      default: "General",
    },

    isEmailVerified: {
      type: Boolean,
      default: true,
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
      enum: ["active", "inactive"],
      default: "active",
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);