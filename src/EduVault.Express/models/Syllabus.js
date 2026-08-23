const mongoose = require('mongoose');

const SyllabusSchema = new mongoose.Schema({
  schoolId: { type: String, required: true },
  teacherId: { type: String },
  teacherName: { type: String },
  className: { type: String, required: true },
  subject: { type: String, required: true },
  title: { type: String, required: true },
  fileUrl: { type: String, required: true }, // PDF / Image Data URI or URL
  fileType: { type: String, enum: ['pdf', 'image', 'link'], default: 'pdf' },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

SyllabusSchema.index({ schoolId: 1, className: 1 });

module.exports = mongoose.model('Syllabus', SyllabusSchema);
