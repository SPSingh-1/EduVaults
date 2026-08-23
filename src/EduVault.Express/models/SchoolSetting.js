const mongoose = require('mongoose');

const SchoolSettingSchema = new mongoose.Schema({
  schoolId: { type: String, required: true, unique: true },
  latitude: { type: Number, default: 26.9124 },
  longitude: { type: Number, default: 75.7873 },
  address: { type: String, default: 'Central School Campus' },
  geofenceRadiusMeters: { type: Number, default: 300 },
  schoolStartTime: { type: String, default: '08:00' },
  gracePeriodMinutes: { type: Number, default: 15 },
  minHalfDayHours: { type: Number, default: 4 },
  schoolEndTime: { type: String, default: '14:00' },
  attendanceModes: { 
    type: [String], 
    default: ['app', 'biometric'] // 'app' (300m GPS Geofence), 'biometric' (Thumb / Fingerprint Machine)
  },
  biometricApiKey: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SchoolSetting', SchoolSettingSchema);
