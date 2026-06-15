const mongoose = require('mongoose');

const RemarkSchema = new mongoose.Schema({
  schoolId: { type: String, required: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  classInfo: { type: String, required: true }, // e.g. Grade 10 - Section A
  teacherId: { type: String, required: true },
  teacherName: { type: String, required: true },
  remarkText: { type: String, required: true },
  tag: { type: String, enum: ['URGENT', 'POSITIVE', 'NEGATIVE', 'NEUTRAL'], default: 'NEUTRAL' },
  createdAt: { type: Date, default: Date.now }
});

RemarkSchema.index({ studentId: 1, createdAt: -1 });
RemarkSchema.index({ schoolId: 1, tag: 1 });

module.exports = mongoose.model('Remark', RemarkSchema);
