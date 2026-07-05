const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  orgName: { type: String, default: 'Enterprise ITSM' },
  supportEmail: { type: String, default: 'support@enterprise.com' },
  allowPublicRegistration: { type: Boolean, default: false },
  sessionTimeoutMinutes: { type: Number, default: 60 },
  primaryColor: { type: String, default: '#2563eb' },
  requireTwoFactorAuth: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
