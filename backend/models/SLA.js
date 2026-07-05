const mongoose = require('mongoose');

const slaSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  responseTimeHours: { type: Number, required: true },
  resolutionTimeHours: { type: Number, required: true },
  businessHoursOnly: { type: Boolean, default: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('SLA', slaSchema);
