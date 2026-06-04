const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  schoolId: { type: String, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  recipientId: { type: String, required: true }, // User UUID or Group ID
  isGroup: { type: Boolean, default: false },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

ChatMessageSchema.index({ senderId: 1, recipientId: 1, timestamp: -1 });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
