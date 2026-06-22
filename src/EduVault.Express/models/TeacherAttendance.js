const mongoose = require('mongoose');

const TeacherAttendanceSchema = new mongoose.Schema({
  schoolId: { type: String, required: true },
  teacherId: { type: String, required: true },
  name: { type: String, required: true },
  employeeId: { type: String },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  status: { type: String, enum: ['Present', 'Absent', 'On Leave', 'Late'], default: 'Present' },
  lateMinutes: { type: Number, default: 0 },
  remarks: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Ensure teacher attendance is unique per school, date, and teacher
TeacherAttendanceSchema.index({ schoolId: 1, date: 1, teacherId: 1 }, { unique: true });
TeacherAttendanceSchema.index({ schoolId: 1, date: 1 });

module.exports = mongoose.model('TeacherAttendance', TeacherAttendanceSchema);
