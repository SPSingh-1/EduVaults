const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, required: true },
  schoolId: { type: String }, // Null for super admin logs
  actionType: { type: String, required: true }, // LOGIN, ADMISSION, INVOICE_PAYMENT, GRADES_SUBMITTED
  description: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now }
});

// Indexes for fast querying
ActivityLogSchema.index({ schoolId: 1, timestamp: -1 });
ActivityLogSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
