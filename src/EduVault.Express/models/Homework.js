const mongoose = require('mongoose');

const HomeworkSchema = new mongoose.Schema({
  schoolId: { type: String, required: true },
  title: { type: String, required: true },
  className: { type: String, required: true },
  subject: { type: String },
  dueDate: { type: Date, required: true },
  instructions: { type: String, required: true },
  attachmentUrl: { type: String }, // PDF/Image uploaded by Teacher when assigning homework
  submissions: { type: String, default: '0/0' },
  submittedCount: { type: Number, default: 0 },
  totalStudents: { type: Number, default: 0 },
  pct: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Pending Review', 'Completed', 'Drafts'], default: 'Active' },
  submittedStudents: { type: [String], default: [] },
  studentSubmissions: [{
    studentId: String,
    studentName: String,
    submissionFileUrl: String,
    submissionNotes: String,
    submittedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

HomeworkSchema.index({ schoolId: 1, createdAt: -1 });

module.exports = mongoose.model('Homework', HomeworkSchema);
