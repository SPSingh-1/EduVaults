const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Holiday = require('../models/Holiday');

const DATA_DIR = path.join(__dirname, '../data');
const FALLBACK_FILE = path.join(DATA_DIR, 'holidays-fallback.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 2026 & 2027 Standard Indian Academic & Statutory Holidays
const DEFAULT_HOLIDAYS = [
  // 2026
  { title: 'Republic Day', date: '2026-01-26', endDate: '2026-01-26', category: 'NATIONAL', description: 'National celebration of Republic Day of India. Flag hoisting ceremony.' },
  { title: 'Maha Shivratri', date: '2026-02-15', endDate: '2026-02-15', category: 'FESTIVAL', description: 'School holiday on account of Maha Shivratri.' },
  { title: 'Holi Festival', date: '2026-03-04', endDate: '2026-03-05', category: 'FESTIVAL', description: 'School closed for Holi and Dhulandi celebrations.' },
  { title: 'Eid-ul-Fitr', date: '2026-03-20', endDate: '2026-03-20', category: 'FESTIVAL', description: 'School holiday for Eid-ul-Fitr observance.' },
  { title: 'Good Friday', date: '2026-04-03', endDate: '2026-04-03', category: 'RESTRICTED', description: 'School closed for Good Friday.' },
  { title: 'Ambedkar Jayanti', date: '2026-04-14', endDate: '2026-04-14', category: 'NATIONAL', description: 'Commemoration of Dr. B.R. Ambedkar Jayanti.' },
  { title: 'Mahavir Jayanti', date: '2026-04-15', endDate: '2026-04-15', category: 'FESTIVAL', description: 'School holiday on account of Mahavir Jayanti.' },
  { title: 'Summer Vacation', date: '2026-05-18', endDate: '2026-06-30', category: 'ACADEMIC', description: 'Annual summer vacation for students and faculty.' },
  { title: 'Muharram', date: '2026-06-26', endDate: '2026-06-26', category: 'FESTIVAL', description: 'Gazetted school holiday for Muharram.' },
  { title: 'Independence Day', date: '2026-08-15', endDate: '2026-08-15', category: 'NATIONAL', description: 'Independence Day celebration. Flag hoisting at 8:00 AM.' },
  { title: 'Raksha Bandhan', date: '2026-08-28', endDate: '2026-08-28', category: 'FESTIVAL', description: 'School closed for Raksha Bandhan festival.' },
  { title: 'Janmashtami', date: '2026-09-04', endDate: '2026-09-04', category: 'FESTIVAL', description: 'School holiday on Sri Krishna Janmashtami.' },
  { title: 'Eid-e-Milad', date: '2026-09-25', endDate: '2026-09-25', category: 'FESTIVAL', description: 'School holiday for Milad-un-Nabi.' },
  { title: 'Mahatma Gandhi Jayanti', date: '2026-10-02', endDate: '2026-10-02', category: 'NATIONAL', description: 'National Holiday in honor of Mahatma Gandhi.' },
  { title: 'Dussehra Break', date: '2026-10-20', endDate: '2026-10-23', category: 'FESTIVAL', description: 'School closed for Vijayadashami Dussehra festivities.' },
  { title: 'Diwali & Chhath Vacation', date: '2026-11-08', endDate: '2026-11-15', category: 'FESTIVAL', description: 'Deepawali, Govardhan Puja, Bhai Dooj and Chhath Puja holidays.' },
  { title: 'Guru Nanak Jayanti', date: '2026-11-24', endDate: '2026-11-24', category: 'RESTRICTED', description: 'School holiday on Guru Nanak Gurpurab.' },
  { title: 'Winter Vacation & Christmas', date: '2026-12-25', endDate: '2027-01-05', category: 'ACADEMIC', description: 'Winter break and Christmas holidays.' },
  // 2027
  { title: 'Republic Day', date: '2027-01-26', endDate: '2027-01-26', category: 'NATIONAL', description: 'National celebration of Republic Day of India.' },
  { title: 'Holi Festival', date: '2027-03-23', endDate: '2027-03-24', category: 'FESTIVAL', description: 'Festival of colours holiday.' }
];

// Helper to read fallback file
function readFallbackFile() {
  try {
    if (fs.existsSync(FALLBACK_FILE)) {
      const content = fs.readFileSync(FALLBACK_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn('[HolidayStorage] Error reading fallback file:', err.message);
  }
  return [];
}

// Helper to write fallback file
function writeFallbackFile(data) {
  try {
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[HolidayStorage] Error writing fallback file:', err.message);
  }
}

// Initialize seed data for fallback file if needed
function ensureFallbackSeeded(schoolId) {
  let list = readFallbackFile();
  const schoolHolidays = list.filter(h => !schoolId || h.schoolId === schoolId);

  if (schoolHolidays.length === 0) {
    const targetSchoolId = schoolId || '00000000-0000-0000-0000-000000000000';
    const seeded = DEFAULT_HOLIDAYS.map((h, idx) => ({
      _id: `fallback-${targetSchoolId.slice(0, 8)}-${idx + 1}`,
      ...h,
      schoolId: targetSchoolId,
      createdBy: 'SYSTEM',
      createdAt: new Date().toISOString()
    }));
    list = [...list, ...seeded];
    writeFallbackFile(list);
    return seeded;
  }
  return schoolHolidays;
}

/**
 * Get all holidays for a given schoolId with full fallback guarantee
 */
async function getAllHolidays(schoolId) {
  // Check if MongoDB is connected and ready
  if (mongoose.connection.readyState === 1) {
    try {
      const query = schoolId ? { schoolId } : {};
      let holidays = await Holiday.find(query).sort({ date: 1 }).lean();

      if (holidays && holidays.length > 0) {
        return holidays;
      }

      // Auto-seed in MongoDB if none found
      const targetSchoolId = schoolId || '00000000-0000-0000-0000-000000000000';
      const toInsert = DEFAULT_HOLIDAYS.map(h => ({
        ...h,
        schoolId: targetSchoolId,
        createdBy: 'SYSTEM'
      }));

      await Holiday.insertMany(toInsert);
      holidays = await Holiday.find(query).sort({ date: 1 }).lean();

      // Sync fallback file as well
      writeFallbackFile(holidays);
      return holidays;
    } catch (mongoErr) {
      console.warn('[HolidayStorage] MongoDB query failed, switching to local fallback:', mongoErr.message);
    }
  }

  // Fallback mode: serve from local JSON persistence
  const fallbackList = ensureFallbackSeeded(schoolId);
  return fallbackList.sort((a, b) => (a.date > b.date ? 1 : -1));
}

/**
 * Save a new holiday (MongoDB + Fallback JSON file)
 */
async function saveHoliday(holidayData) {
  let created = null;

  // Try MongoDB if connected
  if (mongoose.connection.readyState === 1) {
    try {
      const holiday = new Holiday(holidayData);
      const saved = await holiday.save();
      created = saved.toObject();
    } catch (mongoErr) {
      console.warn('[HolidayStorage] MongoDB save error, falling back to JSON:', mongoErr.message);
    }
  }

  if (!created) {
    created = {
      _id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      ...holidayData,
      createdAt: new Date().toISOString()
    };
  }

  // Always persist to local fallback JSON
  try {
    const list = readFallbackFile();
    list.push(created);
    writeFallbackFile(list);
  } catch (fileErr) {
    console.error('[HolidayStorage] File save error:', fileErr.message);
  }

  return created;
}

/**
 * Delete a holiday (MongoDB + Fallback JSON file)
 */
async function removeHoliday(id, schoolId) {
  let deletedFromMongo = false;

  if (mongoose.connection.readyState === 1) {
    try {
      const filter = { _id: id };
      if (schoolId) filter.schoolId = schoolId;
      await Holiday.findOneAndDelete(filter);
      deletedFromMongo = true;
    } catch (mongoErr) {
      console.warn('[HolidayStorage] MongoDB delete error:', mongoErr.message);
    }
  }

  // Remove from local fallback file
  try {
    let list = readFallbackFile();
    list = list.filter(h => h._id.toString() !== id.toString());
    writeFallbackFile(list);
  } catch (fileErr) {
    console.error('[HolidayStorage] File delete error:', fileErr.message);
  }

  return { success: true, deletedFromMongo };
}

module.exports = {
  DEFAULT_HOLIDAYS,
  getAllHolidays,
  saveHoliday,
  removeHoliday
};
