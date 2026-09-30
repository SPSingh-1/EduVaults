const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema({
  schoolId: { type: String, required: true },
  title: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  endDate: { type: String }, // YYYY-MM-DD
  category: { 
    type: String, 
    enum: ['NATIONAL', 'FESTIVAL', 'ACADEMIC', 'RESTRICTED', 'EMERGENCY', 'EVENT', 'OTHER'], 
    default: 'FESTIVAL' 
  },
  description: { type: String },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now }
});

HolidaySchema.index({ schoolId: 1, date: 1 });

module.exports = mongoose.model('Holiday', HolidaySchema);
