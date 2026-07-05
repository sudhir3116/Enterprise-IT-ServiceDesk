const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  permissions: {
    manageUsers: { type: Boolean, default: false },
    manageTickets: { type: Boolean, default: false },
    manageSettings: { type: Boolean, default: false },
    viewReports: { type: Boolean, default: false }
  },
  isSystem: { type: Boolean, default: false } // System roles cannot be deleted
}, { timestamps: true });

module.exports = mongoose.model('Role', roleSchema);
