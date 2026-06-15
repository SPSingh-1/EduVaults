const mongoose = require('mongoose');

const HomeworkSchema = new mongoose.Schema({
  schoolId: { type: String, required: true },
  title: { type: String, required: true },
  className: { type: String, required: true },
  dueDate: { type: Date, required: true },
  instructions: { type: String, required: true },
  submissions: { type: String, default: '0/0' },
  submittedCount: { type: Number, default: 0 },
  totalStudents: { type: Number, default: 0 },
  pct: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Pending Review', 'Completed', 'Drafts'], default: 'Active' },
  createdAt: { type: Date, default: Date.now }
});

HomeworkSchema.index({ schoolId: 1, createdAt: -1 });

module.exports = mongoose.model('Homework', HomeworkSchema);
