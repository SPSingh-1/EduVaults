const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipientId: { type: String, required: true }, // User UUID or broadcast roles ("ALL", "TEACHERS", "PARENTS")
  schoolId: { type: String }, // Null for platform-wide alerts
  title: { type: String, required: true },
  body: { type: String, required: true },
  type: { type: String, enum: ['URGENT', 'EVENT', 'GENERAL', 'BILLING'], default: 'GENERAL' },
  isRead: { type: Boolean, default: false },
  senderName: { type: String },
  senderRole: { type: String },
  senderId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
