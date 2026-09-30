// Primary Express Auxiliary Service
const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const fs = require('fs');
const config = require('./config/env');

const connectDB = require('./config/db');
connectDB();
const ActivityLog = require('./models/ActivityLog');
const Notification = require('./models/Notification');
const Remark = require('./models/Remark');
const ChatMessage = require('./models/ChatMessage');
const DocumentMetadata = require('./models/DocumentMetadata');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const Homework = require('./models/Homework');
const TeacherAttendance = require('./models/TeacherAttendance');
const SchoolSetting = require('./models/SchoolSetting');
const Holiday = require('./models/Holiday');
const Syllabus = require('./models/Syllabus');
const holidayStorage = require('./services/holidayStorage');

const app = express();
const server = http.createServer(app);

// Enable security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configure CORS securely using centralized allowed origins
const allowedOrigins = config.ALLOWED_ORIGINS;
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || config.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error(`CORS Error: Origin ${origin} is not allowed`));
    }
  },
  credentials: true
}));

// Apply global rate limiting to protect API endpoints.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.RATE_LIMIT_MAX, // per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: { error: 'Too many requests, please try again later.' }
});

app.use(apiLimiter);
app.use(express.json());

// Swagger Configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EduVault Express Auxiliary API',
      version: '1.0.0',
      description: 'API documentation for the EduVault logs, chat, notices, remarks and document uploads.',
    },
    servers: [
      {
        url: 'http://localhost:5005',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [__filename], // Document endpoints in server.js
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Safe Health Check Endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'Healthy',
    service: 'EduVault Express Auxiliary API',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/health/ready', (req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState;
  const isHealthy = dbState === 1 || dbState === 2;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'Healthy' : 'Unhealthy',
    service: 'EduVault Express Auxiliary API',
    database: dbState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Storage for document uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// --- JWT Verification Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, config.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalid or expired' });

    // Normalize claims from .NET schema URIs
    const idClaim = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';
    const emailClaim = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress';
    const roleClaim = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role';
    const microsoftRoleClaim = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

    user.id = user.id || user.nameid || user.sub || user[idClaim];
    user.email = user.email || user[emailClaim];
    user.role = user.role || user[roleClaim] || user[microsoftRoleClaim];

    // Handle array values due to duplicate claims serialization in C#
    if (Array.isArray(user.id)) user.id = user.id[0];
    if (Array.isArray(user.email)) user.email = user.email[0];
    if (Array.isArray(user.role)) user.role = user.role[0];
    if (Array.isArray(user.schoolId)) user.schoolId = user.schoolId[0];

    req.user = user;
    next();
  });
};

// --- HTTP REST ENDPOINTS ---

/**
 * @openapi
 * /api/logs:
 *   get:
 *     summary: Retrieve school or platform-wide activity logs
 *     description: Gets the last 100 activity logs. Scoped by school for standard roles, global for superadmin.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of activity logs.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       500:
 *         description: Server error.
 */
const fallbackActivityLogs = [];

app.get('/api/logs', authenticateToken, async (req, res) => {
  try {
    const { schoolId } = req.user;
    const filter = {};
    if (req.user.role !== 'superadmin') {
      filter.schoolId = schoolId;
    }
    if (mongoose.connection.readyState === 1) {
      const logs = await ActivityLog.find(filter).sort({ timestamp: -1 }).limit(100);
      return res.json(logs);
    }
    // Fallback when MongoDB is offline
    const filtered = fallbackActivityLogs.filter(l => {
      if (req.user.role === 'superadmin') return true;
      return l.schoolId === schoolId;
    });
    res.json(filtered.slice(0, 100));
  } catch (error) {
    console.warn('[LOGS API] Falling back to memory logs:', error.message);
    res.json([]);
  }
});

app.post('/api/logs', authenticateToken, async (req, res) => {
  try {
    const { actionType, description, metadata } = req.body;
    const logData = {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      schoolId: req.user.schoolId,
      actionType,
      description,
      metadata,
      ipAddress: req.ip,
      timestamp: new Date()
    };
    if (mongoose.connection.readyState === 1) {
      const log = new ActivityLog(logData);
      await log.save();
      return res.status(201).json(log);
    }
    fallbackActivityLogs.unshift(logData);
    if (fallbackActivityLogs.length > 500) fallbackActivityLogs.pop();
    res.status(201).json(logData);
  } catch (error) {
    console.warn('[LOGS API] Failed to save log to MongoDB, saved to memory fallback:', error.message);
    res.status(201).json({ success: true });
  }
});

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: Get notifications for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications.
 */
const fallbackNotifications = [];

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { id, role, schoolId } = req.user;
    let filter = {};
    if (role === 'superadmin') {
      filter = { senderRole: 'superadmin' };
    } else {
      if (!schoolId) {
        return res.json([]);
      }
      filter = {
        schoolId: { $in: [schoolId, 'ALL'] },
        $or: [
          { recipientId: id },
          { recipientId: 'ALL' },
          { recipientId: role.toUpperCase() + 'S' } // e.g. "TEACHERS", "STUDENTS"
        ]
      };
    }

    if (mongoose.connection.readyState === 1) {
      try {
        const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
        return res.json(notifications);
      } catch (dbErr) {
        console.warn('[NOTIFICATIONS] MongoDB query failed, falling back to in-memory:', dbErr.message);
      }
    }

    // Graceful fallback if MongoDB is not connected
    const filteredFallback = fallbackNotifications.filter(n => {
      if (role === 'superadmin') return true;
      if (n.schoolId && n.schoolId !== schoolId && n.schoolId !== 'ALL') return false;
      return true;
    });
    res.json(filteredFallback);
  } catch (error) {
    res.json([]);
  }
});

/**
 * @openapi
 * /api/notifications:
 *   post:
 *     summary: Create a notification and broadcast it via WebSocket
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientId
 *               - title
 *               - body
 *             properties:
 *               recipientId:
 *                 type: string
 *                 description: User UUID, "ALL", "TEACHERS", or "PARENTS"
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [URGENT, EVENT, GENERAL, BILLING]
 *               targetSchoolId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notification created.
 */
app.post('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { recipientId, title, body, type, targetSchoolId } = req.body;
    let schoolId = req.user.schoolId;

    if (req.user.role === 'superadmin') {
      schoolId = targetSchoolId || 'ALL';
    } else {
      if (!schoolId) {
        return res.status(400).json({ error: 'User has no school associated. Cannot post notices.' });
      }
    }

    const senderName = req.user.firstName && req.user.lastName
      ? `${req.user.firstName} ${req.user.lastName}`
      : (req.user.email || 'Platform Administrator');
    const senderRole = req.user.role || 'system';

    const recipientList = Array.isArray(recipientId) ? recipientId : [recipientId];
    const createdNotifs = [];

    for (const rId of recipientList) {
      const notifData = {
        _id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        recipientId: rId,
        schoolId,
        title,
        body,
        type: type || 'GENERAL',
        senderName,
        senderRole,
        senderId: req.user.id,
        createdAt: new Date().toISOString()
      };

      if (mongoose.connection.readyState === 1) {
        try {
          const notification = new Notification({
            ...notifData,
            _id: undefined
          });
          await notification.save();
          createdNotifs.push(notification);
        } catch (saveErr) {
          console.warn('[NOTIFICATIONS] MongoDB save failed, saving to fallback:', saveErr.message);
          fallbackNotifications.unshift(notifData);
          createdNotifs.push(notifData);
        }
      } else {
        fallbackNotifications.unshift(notifData);
        createdNotifs.push(notifData);
      }
    }

    // Broadcast through socket individually
    for (const notification of createdNotifs) {
      const rId = notification.recipientId;
      try {
        if (schoolId === 'ALL') {
          io.emit('notification', notification);
        } else {
          if (rId === 'ALL' || rId === 'TEACHERS' || rId === 'STUDENTS' || rId === 'SCHOOLADMINS' || rId === 'PARENTS') {
            io.to(schoolId).emit('notification', notification);
          } else {
            io.to(rId).emit('notification', notification);
          }
        }
      } catch (ioErr) {
        console.warn('Socket emit warning:', ioErr.message);
      }
    }

    res.status(201).json(Array.isArray(recipientId) ? createdNotifs : createdNotifs[0]);
  } catch (error) {
    res.status(201).json({ success: true, fallback: true });
  }
});

/**
 * @openapi
 * /api/notifications/read:
 *   post:
 *     summary: Mark notifications as read
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notificationIds
 *             properties:
 *               notificationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Notifications updated successfully.
 */
app.post('/api/notifications/read', authenticateToken, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    await Notification.updateMany(
      { _id: { $in: notificationIds }, schoolId: req.user.schoolId },
      { $set: { isRead: true } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/remarks:
 *   get:
 *     summary: Get academic remarks feed
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of remarks.
 */
app.get('/api/remarks', authenticateToken, async (req, res) => {
  try {
    const { schoolId, role, id } = req.user;
    const filter = { schoolId };
    if (role === 'student') {
      filter.studentId = id;
    }
    const remarks = await Remark.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(remarks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/remarks:
 *   post:
 *     summary: Publish a teacher remark for a student
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - studentName
 *               - classInfo
 *               - remarkText
 *             properties:
 *               studentId:
 *                 type: string
 *               studentName:
 *                 type: string
 *               classInfo:
 *                 type: string
 *               remarkText:
 *                 type: string
 *               tag:
 *                 type: string
 *                 enum: [URGENT, POSITIVE, NEUTRAL]
 *     responses:
 *       201:
 *         description: Remark created.
 */
app.post('/api/remarks', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'schooladmin') {
      return res.status(403).json({ error: 'Unauthorized to write remarks' });
    }
    const { studentId, studentName, classInfo, remarkText, tag } = req.body;
    const remark = new Remark({
      schoolId: req.user.schoolId,
      studentId,
      studentName,
      classInfo,
      teacherId: req.user.id,
      teacherName: `${req.user.firstName} ${req.user.lastName}`,
      remarkText,
      tag
    });
    await remark.save();

    // Broadcast update to the school room (for real-time dashboard updates)
    io.to(req.user.schoolId).emit('remark_added', remark);

    res.status(201).json(remark);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Homework Endpoints ---
app.get('/api/homework', authenticateToken, async (req, res) => {
  try {
    const { schoolId } = req.user;
    const homeworks = await Homework.find({ schoolId }).sort({ createdAt: -1 });

    // Normalize old records: if totalStudents is 0 but submissions string has data, fix it
    const normalized = await Promise.all(homeworks.map(async (hw) => {
      const parts = (hw.submissions || '0/0').split('/');
      const strSubmitted = parseInt(parts[0]) || 0;
      const strTotal = parseInt(parts[1]) || 0;

      const needsFix = (hw.totalStudents === 0 || hw.totalStudents == null) && strTotal > 0;
      if (needsFix) {
        hw.totalStudents = strTotal;
        hw.submittedCount = strSubmitted;
        hw.pct = strTotal > 0 ? Math.round((strSubmitted / strTotal) * 100) : 0;
        await hw.save();
      }
      return hw;
    }));

    res.json(normalized);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/homework', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'schooladmin') {
      return res.status(403).json({ error: 'Unauthorized to assign homework' });
    }
    const { title, className, dueDate, instructions, totalStudents } = req.body;
    const total = totalStudents ? parseInt(totalStudents) : 0;
    const homework = new Homework({
      schoolId: req.user.schoolId,
      title,
      className,
      dueDate,
      instructions,
      totalStudents: total,
      submittedCount: 0,
      submissions: `0/${total}`,
      pct: 0,
      status: 'Active'
    });
    await homework.save();
    res.status(201).json(homework);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/homework/:id/submit', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'schooladmin') {
      return res.status(403).json({ error: 'Unauthorized to log submissions' });
    }
    const homework = await Homework.findById(req.params.id);
    if (!homework) return res.status(404).json({ error: 'Homework not found' });

    // Support both old string format and new numeric fields
    let submitted = (homework.submittedCount !== undefined && homework.submittedCount !== null)
      ? homework.submittedCount
      : (parseInt((homework.submissions || '0/0').split('/')[0]) || 0);
    const total = (homework.totalStudents !== undefined && homework.totalStudents > 0)
      ? homework.totalStudents
      : (parseInt((homework.submissions || '0/0').split('/')[1]) || 0);

    if (total > 0 && submitted < total) {
      submitted += 1;
    }

    homework.submittedCount = submitted;
    homework.totalStudents = total;
    homework.submissions = `${submitted}/${total}`;
    homework.pct = total > 0 ? Math.round((submitted / total) * 100) : 0;

    await homework.save();
    res.json(homework);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/homework/:id/student-submit', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can submit homework' });
    }
    const homework = await Homework.findById(req.params.id);
    if (!homework) return res.status(404).json({ error: 'Homework not found' });

    if (!homework.submittedStudents) {
      homework.submittedStudents = [];
    }

    const studentId = req.user.id;
    if (homework.submittedStudents.includes(studentId)) {
      return res.status(400).json({ error: 'Homework already submitted' });
    }

    homework.submittedStudents.push(studentId);
    homework.submittedCount = homework.submittedStudents.length;
    const total = homework.totalStudents || 0;
    homework.submissions = `${homework.submittedCount}/${total}`;
    homework.pct = total > 0 ? Math.min(100, Math.round((homework.submittedCount / total) * 100)) : 0;

    await homework.save();
    res.json(homework);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/homework/:id/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'schooladmin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { status } = req.body;
    const homework = await Homework.findById(req.params.id);
    if (!homework) return res.status(404).json({ error: 'Homework not found' });

    homework.status = status;
    await homework.save();
    res.json(homework);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/homework/:id/sync-count', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'schooladmin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const { totalStudents } = req.body;
    const total = parseInt(totalStudents) || 0;
    const homework = await Homework.findById(req.params.id);
    if (!homework) return res.status(404).json({ error: 'Homework not found' });

    // Parse current submitted count from the submissions string if submittedCount is missing
    const parts = (homework.submissions || '0/0').split('/');
    const submitted = (typeof homework.submittedCount === 'number') ? homework.submittedCount : (parseInt(parts[0]) || 0);

    homework.totalStudents = total;
    homework.submittedCount = submitted;
    homework.submissions = `${submitted}/${total}`;
    homework.pct = total > 0 ? Math.round((submitted / total) * 100) : 0;

    await homework.save();
    res.json(homework);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/homework/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'schooladmin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const homework = await Homework.findByIdAndDelete(req.params.id);
    if (!homework) return res.status(404).json({ error: 'Homework not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/chat/history:
 *   get:
 *     summary: Get chat message history
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: recipientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: isGroup
 *         required: true
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Array of chat messages.
 */
app.get('/api/chat/history', authenticateToken, async (req, res) => {
  try {
    const { schoolId, id } = req.user;
    const { recipientId, isGroup } = req.query;

    const cleanRecipientId = String(recipientId || '').trim();
    let filter = { schoolId };
    if (isGroup === 'true') {
      filter.recipientId = cleanRecipientId;
      filter.isGroup = true;
    } else {
      filter.$or = [
        { senderId: id, recipientId: cleanRecipientId },
        { senderId: cleanRecipientId, recipientId: id }
      ];
      filter.isGroup = false;
    }

    const messages = await ChatMessage.find(filter).sort({ timestamp: 1 }).limit(100);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/document/upload:
 *   post:
 *     summary: Upload and register file metadata
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - fileSize
 *               - contentType
 *             properties:
 *               fileName:
 *                 type: string
 *               fileSize:
 *                 type: number
 *               contentType:
 *                 type: string
 *               documentType:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document metadata registered.
 */
app.post('/api/document/upload', authenticateToken, async (req, res) => {
  try {
    // Note: In real production, this would use multer to save files. We will mock the file record.
    const { fileName, fileSize, contentType, documentType } = req.body;

    const doc = new DocumentMetadata({
      schoolId: req.user.schoolId,
      ownerId: req.user.id,
      fileName,
      fileSize,
      contentType,
      filePath: `/uploads/${Date.now()}_${fileName}`, // Simulated relative path
      documentType
    });
    await doc.save();
    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/documents:
 *   get:
 *     summary: Get document lists
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of documents.
 */
app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    const { id, schoolId, role } = req.user;
    const filter = { schoolId };
    if (role === 'student') {
      filter.ownerId = id;
    }
    const docs = await DocumentMetadata.find(filter).sort({ uploadDate: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Teacher Attendance Endpoints ---
// --- Helper: Haversine Formula for Distance Calculation (meters) ---
function getHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// --- School Settings & Attendance Modes Endpoints ---
const fallbackSchoolSettings = new Map();

app.get('/api/school-settings', authenticateToken, async (req, res) => {
  try {
    const schoolId = req.query.schoolId || req.user.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'School ID missing in request' });

    if (mongoose.connection.readyState === 1) {
      let setting = await SchoolSetting.findOne({ schoolId });
      if (!setting) {
        setting = new SchoolSetting({ schoolId });
        await setting.save();
      }
      return res.json(setting);
    }

    // Memory fallback when MongoDB is offline
    let setting = fallbackSchoolSettings.get(String(schoolId)) || {
      schoolId,
      attendanceModes: ['app', 'biometric'],
      biometricApiKey: '',
      geofenceRadiusMeters: 300,
      gracePeriodMinutes: 15,
      minHalfDayHours: 4
    };
    res.json(setting);
  } catch (error) {
    console.warn('[SCHOOL-SETTINGS] MongoDB query failed, returning fallback defaults:', error.message);
    res.json({
      schoolId: req.query.schoolId || req.user?.schoolId,
      attendanceModes: ['app', 'biometric'],
      biometricApiKey: ''
    });
  }
});

app.post('/api/school-settings', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'schooladmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Unauthorized. Only admins can update school settings.' });
    }
    const schoolId = req.body.schoolId || req.user.schoolId;
    const { latitude, longitude, address, geofenceRadiusMeters, schoolStartTime, gracePeriodMinutes, minHalfDayHours, schoolEndTime, attendanceModes, biometricApiKey } = req.body;
    
    if (mongoose.connection.readyState === 1) {
      let setting = await SchoolSetting.findOne({ schoolId });
      if (!setting) {
        setting = new SchoolSetting({ schoolId });
      }
      if (latitude != null) setting.latitude = parseFloat(latitude);
      if (longitude != null) setting.longitude = parseFloat(longitude);
      if (address != null) setting.address = String(address).trim();
      if (geofenceRadiusMeters != null) setting.geofenceRadiusMeters = parseInt(geofenceRadiusMeters) || 300;
      if (schoolStartTime != null) setting.schoolStartTime = String(schoolStartTime).trim();
      if (gracePeriodMinutes != null) setting.gracePeriodMinutes = parseInt(gracePeriodMinutes) || 15;
      if (minHalfDayHours != null) setting.minHalfDayHours = parseFloat(minHalfDayHours) || 4;
      if (schoolEndTime != null) setting.schoolEndTime = String(schoolEndTime).trim();
      if (Array.isArray(attendanceModes)) setting.attendanceModes = attendanceModes;
      if (biometricApiKey != null) setting.biometricApiKey = String(biometricApiKey).trim();
      setting.updatedAt = new Date();

      await setting.save();
      return res.json(setting);
    }

    // Memory fallback
    const current = fallbackSchoolSettings.get(String(schoolId)) || { schoolId };
    const updated = {
      ...current,
      latitude: latitude != null ? parseFloat(latitude) : current.latitude,
      longitude: longitude != null ? parseFloat(longitude) : current.longitude,
      address: address != null ? String(address).trim() : current.address,
      geofenceRadiusMeters: geofenceRadiusMeters != null ? (parseInt(geofenceRadiusMeters) || 300) : (current.geofenceRadiusMeters || 300),
      schoolStartTime: schoolStartTime != null ? String(schoolStartTime).trim() : current.schoolStartTime,
      gracePeriodMinutes: gracePeriodMinutes != null ? (parseInt(gracePeriodMinutes) || 15) : (current.gracePeriodMinutes || 15),
      minHalfDayHours: minHalfDayHours != null ? (parseFloat(minHalfDayHours) || 4) : (current.minHalfDayHours || 4),
      schoolEndTime: schoolEndTime != null ? String(schoolEndTime).trim() : current.schoolEndTime,
      attendanceModes: Array.isArray(attendanceModes) ? attendanceModes : (current.attendanceModes || ['app', 'biometric']),
      biometricApiKey: biometricApiKey != null ? String(biometricApiKey).trim() : (current.biometricApiKey || ''),
      updatedAt: new Date()
    };
    fallbackSchoolSettings.set(String(schoolId), updated);
    res.json(updated);
  } catch (error) {
    console.warn('[SCHOOL-SETTINGS POST] Failed to save to MongoDB, saved to memory fallback:', error.message);
    res.json({ success: true, fallback: true });
  }
});

// Biometric Hardware Push Webhook Endpoint (Thumb/Fingerprint Device Push SDK)
app.post('/api/biometric/log', async (req, res) => {
  try {
    const { schoolId, biometricApiKey, employeeId, timestamp, punchType } = req.body;
    if (!schoolId || !employeeId) {
      return res.status(400).json({ error: 'schoolId and employeeId are required' });
    }

    const setting = await SchoolSetting.findOne({ schoolId });
    if (!setting) {
      return res.status(404).json({ error: 'School settings not configured' });
    }

    if (setting.biometricApiKey && setting.biometricApiKey !== biometricApiKey) {
      return res.status(401).json({ error: 'Invalid biometric API key' });
    }

    if (!setting.attendanceModes.includes('biometric')) {
      return res.status(403).json({ error: 'Biometric machine punching is disabled for this school' });
    }

    const punchTime = timestamp ? new Date(timestamp) : new Date();
    const dateStr = punchTime.toISOString().split('T')[0];

    let attendance = await TeacherAttendance.findOne({ schoolId, teacherId: employeeId, date: dateStr });
    if (!attendance) {
      attendance = new TeacherAttendance({
        schoolId,
        teacherId: employeeId,
        teacherName: `Employee ${employeeId}`,
        teacherEmail: '',
        date: dateStr,
        status: 'Single Punch',
        punchInTime: punchTime,
        punchInLocation: { latitude: setting.latitude, longitude: setting.longitude, address: 'Biometric Machine' }
      });
    } else if (punchType === 'OUT' || attendance.punchInTime) {
      attendance.punchOutTime = punchTime;
      attendance.punchOutLocation = { latitude: setting.latitude, longitude: setting.longitude, address: 'Biometric Machine' };
      const diffMs = punchTime - new Date(attendance.punchInTime);
      const diffHrs = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
      attendance.workingHours = Math.max(0, diffHrs);
      attendance.status = diffHrs < setting.minHalfDayHours ? 'Half Day' : 'Present';
    }

    await attendance.save();
    res.json({ success: true, message: 'Biometric punch logged successfully', attendance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Teacher Attendance Endpoints ---

// Get today's punch status for logged-in teacher + school settings
app.get('/api/teacher-attendance/today', authenticateToken, async (req, res) => {
  try {
    const { schoolId, id: teacherId } = req.user;
    const todayStr = new Date().toISOString().split('T')[0];

    let setting = await SchoolSetting.findOne({ schoolId });
    if (!setting) {
      setting = new SchoolSetting({ schoolId });
      await setting.save();
    }

    const attendance = await TeacherAttendance.findOne({ schoolId, teacherId, date: todayStr });
    res.json({
      todayDate: todayStr,
      attendance: attendance || null,
      schoolSetting: setting
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Teacher Self Punch-In
app.post('/api/teacher-attendance/punch-in', authenticateToken, async (req, res) => {
  try {
    const { schoolId, id: teacherId, firstName, lastName, email } = req.user;
    const { latitude, longitude, address } = req.body;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can punch in self attendance.' });
    }

    let setting = await SchoolSetting.findOne({ schoolId });
    if (!setting) {
      setting = new SchoolSetting({ schoolId });
      await setting.save();
    }

    // Geofence Distance Validation (300 meters radius check)
    const teacherLat = parseFloat(latitude);
    const teacherLng = parseFloat(longitude);
    if (isNaN(teacherLat) || isNaN(teacherLng)) {
      return res.status(400).json({ error: 'Valid GPS latitude and longitude are required to punch in.' });
    }

    const distance = getHaversineDistanceMeters(setting.latitude, setting.longitude, teacherLat, teacherLng);
    if (distance > setting.geofenceRadiusMeters) {
      return res.status(400).json({ 
        error: `You are outside school premises. Current distance is ${distance} meters. Minimum required is within ${setting.geofenceRadiusMeters} meters.`,
        distance,
        geofenceRadiusMeters: setting.geofenceRadiusMeters
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    let attendance = await TeacherAttendance.findOne({ schoolId, teacherId, date: todayStr });
    if (attendance && attendance.punchInTime) {
      return res.status(400).json({ error: 'You have already punched in for today.' });
    }

    // Determine Late Status based on School Start Time & Grace Period
    const [startH, startM] = (setting.schoolStartTime || '08:00').split(':').map(Number);
    const startTimeMin = startH * 60 + startM;
    const cutoffTimeMin = startTimeMin + (setting.gracePeriodMinutes || 15);

    const nowMin = now.getHours() * 60 + now.getMinutes();

    let status = 'Single Punch';
    let lateMinutes = 0;
    if (nowMin > cutoffTimeMin) {
      status = 'Late';
      lateMinutes = nowMin - startTimeMin;
    }

    const teacherName = `${firstName || ''} ${lastName || ''}`.trim() || email || 'Teacher';

    if (!attendance) {
      attendance = new TeacherAttendance({
        schoolId,
        teacherId,
        name: teacherName,
        date: todayStr,
        status,
        punchInTime: now,
        punchInLocation: {
          latitude: teacherLat,
          longitude: teacherLng,
          address: address || 'School Premises'
        },
        lateMinutes
      });
    } else {
      attendance.status = status;
      attendance.punchInTime = now;
      attendance.punchInLocation = {
        latitude: teacherLat,
        longitude: teacherLng,
        address: address || 'School Premises'
      };
      attendance.lateMinutes = lateMinutes;
      attendance.updatedAt = now;
    }

    await attendance.save();
    res.json({ success: true, attendance, distance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Teacher Self Punch-Out
app.post('/api/teacher-attendance/punch-out', authenticateToken, async (req, res) => {
  try {
    const { schoolId, id: teacherId } = req.user;
    const { latitude, longitude, address } = req.body;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can punch out self attendance.' });
    }

    let setting = await SchoolSetting.findOne({ schoolId });
    if (!setting) {
      setting = new SchoolSetting({ schoolId });
      await setting.save();
    }

    // Geofence Distance Validation
    const teacherLat = parseFloat(latitude);
    const teacherLng = parseFloat(longitude);
    if (isNaN(teacherLat) || isNaN(teacherLng)) {
      return res.status(400).json({ error: 'Valid GPS latitude and longitude are required to punch out.' });
    }

    const distance = getHaversineDistanceMeters(setting.latitude, setting.longitude, teacherLat, teacherLng);
    if (distance > setting.geofenceRadiusMeters) {
      return res.status(400).json({ 
        error: `You are outside school premises. Current distance is ${distance} meters. Minimum required is within ${setting.geofenceRadiusMeters} meters.`,
        distance,
        geofenceRadiusMeters: setting.geofenceRadiusMeters
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    const attendance = await TeacherAttendance.findOne({ schoolId, teacherId, date: todayStr });
    if (!attendance || !attendance.punchInTime) {
      return res.status(400).json({ error: 'No punch-in record found for today. You must punch in first.' });
    }
    if (attendance.punchOutTime) {
      return res.status(400).json({ error: 'You have already punched out for today.' });
    }

    // Calculate Working Hours
    const diffMs = now - new Date(attendance.punchInTime);
    const workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    // Determine Status (Half Day vs Late vs Present)
    let status = attendance.status;
    const minHours = setting.minHalfDayHours || 4;
    if (workingHours < minHours) {
      status = 'Half Day';
    } else if (attendance.status === 'Single Punch') {
      status = 'Present';
    }

    attendance.punchOutTime = now;
    attendance.punchOutLocation = {
      latitude: teacherLat,
      longitude: teacherLng,
      address: address || 'School Premises'
    };
    attendance.workingHours = workingHours;
    attendance.status = status;
    attendance.updatedAt = now;

    await attendance.save();
    res.json({ success: true, attendance, distance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin / Teacher: Get Attendance History by Teacher ID
app.get('/api/teacher-attendance/teacher/:teacherId', authenticateToken, async (req, res) => {
  try {
    const { schoolId, role, id: loggedUserId } = req.user;
    const { teacherId } = req.params;

    if (role === 'teacher' && loggedUserId !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized to view another teacher\'s attendance.' });
    }

    const records = await TeacherAttendance.find({ schoolId, teacherId }).sort({ date: -1 });

    const totalPresent = records.filter(r => r.status === 'Present').length;
    const totalAbsent = records.filter(r => r.status === 'Absent').length;
    const totalLate = records.filter(r => r.status === 'Late').length;
    const totalSinglePunch = records.filter(r => r.status === 'Single Punch').length;
    const totalHalfDay = records.filter(r => r.status === 'Half Day').length;
    const totalOnLeave = records.filter(r => r.status === 'On Leave').length;

    res.json({
      teacherId,
      records,
      stats: {
        totalPresent,
        totalAbsent,
        totalLate,
        totalSinglePunch,
        totalHalfDay,
        totalOnLeave,
        totalRecords: records.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Today's summary for School Admin Dashboard (Strictly Today's Date)
app.get('/api/teacher-attendance/today-summary', authenticateToken, async (req, res) => {
  try {
    const { schoolId } = req.user;
    const now = new Date();
    const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    if (mongoose.connection.readyState !== 1) {
      return res.json({ date: localDateStr, totalPunched: 0, presentCount: 0 });
    }

    // Strictly query today's local calendar date
    const records = await TeacherAttendance.find({
      schoolId,
      date: localDateStr
    });

    const presentCount = records.filter(r => r.status !== 'Absent').length;
    res.json({ date: localDateStr, totalPunched: records.length, presentCount });
  } catch (error) {
    const now = new Date();
    const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    res.json({ date: localDateStr, totalPunched: 0, presentCount: 0 });
  }
});

// Generic date filter endpoint (retained for backward compatibility)
app.get('/api/teacher-attendance', authenticateToken, async (req, res) => {
  try {
    const { schoolId } = req.user;
    const { date } = req.query;
    if (!schoolId) {
      return res.status(400).json({ error: 'School ID missing in token' });
    }
    const filter = { schoolId };
    if (date) {
      filter.date = String(date).trim();
    }
    const attendance = await TeacherAttendance.find(filter).sort({ date: -1 }).limit(500);
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/teacher-attendance/submit', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'schooladmin') {
      return res.status(403).json({ error: 'Unauthorized. Only School Admins can submit teacher attendance.' });
    }
    const { schoolId } = req.user;
    const { date, attendance } = req.body;

    if (!schoolId) {
      return res.status(400).json({ error: 'School ID missing in token' });
    }
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    if (!Array.isArray(attendance)) {
      return res.status(400).json({ error: 'Attendance must be an array' });
    }

    const bulkOps = attendance.map(item => {
      return {
        updateOne: {
          filter: { schoolId, date, teacherId: item.teacherId },
          update: {
            $set: {
              name: item.name,
              employeeId: item.employeeId,
              status: item.status,
              lateMinutes: item.status === 'Late' ? (parseInt(item.lateMinutes) || 0) : 0,
              remarks: item.remarks || '',
              updatedAt: new Date()
            }
          },
          upsert: true
        }
      };
    });

    if (bulkOps.length > 0) {
      await TeacherAttendance.bulkWrite(bulkOps);
    }

    res.json({ success: true, count: bulkOps.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/teacher-attendance/my-attendance', authenticateToken, async (req, res) => {
  try {
    const teacherId = req.user.id;
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Unauthorized. Only teachers can view their self attendance.' });
    }
    const attendance = await TeacherAttendance.find({ teacherId }).sort({ date: -1 }).limit(100);
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- HOLIDAYS & ACADEMIC CALENDAR API ---
app.get('/api/holidays', authenticateToken, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const holidays = await holidayStorage.getAllHolidays(schoolId);
    res.json(holidays);
  } catch (error) {
    console.error('[API /holidays] Unexpected error:', error);
    // Never fail with 500: serve static default Indian holidays on any edge error
    res.json(holidayStorage.DEFAULT_HOLIDAYS.map((h, i) => ({
      _id: `emergency-seed-${i + 1}`,
      ...h,
      schoolId: req.user?.schoolId || 'default',
      createdBy: 'SYSTEM'
    })));
  }
});

app.post('/api/holidays', authenticateToken, async (req, res) => {
  try {
    const { title, date, endDate, category, description, notifyUsers } = req.body;
    const schoolId = req.user.schoolId;

    if (!title || !date) {
      return res.status(400).json({ error: 'Title and Date are required.' });
    }

    const holidayData = {
      schoolId: schoolId || '00000000-0000-0000-0000-000000000000',
      title,
      date,
      endDate: endDate || date,
      category: category || 'FESTIVAL',
      description: description || '',
      createdBy: req.user.id || req.user.sub || 'ADMIN'
    };

    const saved = await holidayStorage.saveHoliday(holidayData);

    // Broadcast instant real-time notification to all students/teachers if requested
    if (notifyUsers !== false) {
      const dateRangeStr = endDate && endDate !== date ? `${date} to ${endDate}` : date;
      const notifTitle = `📢 Holiday Announcement: ${title}`;
      const notifBody = `School will remain closed on ${dateRangeStr} for ${title}. ${description || ''}`;

      try {
        if (mongoose.connection.readyState === 1) {
          const notification = new Notification({
            recipientId: 'ALL',
            schoolId: holidayData.schoolId,
            title: notifTitle,
            body: notifBody,
            type: 'EVENT',
            senderName: req.user.firstName || 'School Management',
            senderRole: req.user.role || 'schooladmin'
          });
          await notification.save();
        }
        io.to(holidayData.schoolId).emit('notification', {
          recipientId: 'ALL',
          schoolId: holidayData.schoolId,
          title: notifTitle,
          body: notifBody,
          type: 'EVENT',
          createdAt: new Date().toISOString()
        });
      } catch (notifErr) {
        console.warn('[API /holidays] Notification emit warning:', notifErr.message);
      }
    }

    res.json({ success: true, holiday: saved });
  } catch (error) {
    console.error('[API /holidays POST] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/holidays/:id', authenticateToken, async (req, res) => {
  try {
    const result = await holidayStorage.removeHoliday(req.params.id, req.user.schoolId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[API /holidays DELETE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});


// --- SYLLABUS API ---
app.get('/api/syllabus', authenticateToken, async (req, res) => {
  try {
    const { schoolId } = req.user;
    const { className, subject } = req.query;

    // Purge any previously seeded dummy syllabus documents from database
    await Syllabus.deleteMany({
      teacherName: { $in: ['Dr. R. K. Sharma', 'Prof. Ananya Sen', 'Mrs. S. Verma'] }
    });

    const filter = { schoolId };
    if (className) {
      const cleanClass = className.replace(/^Class\s+/i, '').trim();
      const escClean = cleanClass.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const escFull = className.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      filter.$or = [
        { className: new RegExp(escFull, 'i') },
        { className: new RegExp(escClean, 'i') }
      ];
    }
    if (subject) filter.subject = subject;

    const syllabusList = await Syllabus.find(filter).sort({ createdAt: -1 });
    res.json(syllabusList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/syllabus', authenticateToken, async (req, res) => {
  try {
    const { schoolId, id: teacherId, firstName, lastName, role } = req.user;
    if (role !== 'teacher' && role !== 'schooladmin') {
      return res.status(403).json({ error: 'Only teachers and school admins can upload syllabus.' });
    }
    const { className, subject, title, fileUrl, fileType, description } = req.body;
    if (!className || !subject || !title || !fileUrl) {
      return res.status(400).json({ error: 'Class Name, Subject, Title, and File Attachment/URL are required.' });
    }

    const teacherName = `${firstName || ''} ${lastName || ''}`.trim() || 'Faculty Teacher';

    const syllabus = new Syllabus({
      schoolId,
      teacherId,
      teacherName,
      className,
      subject,
      title,
      fileUrl,
      fileType: fileType || (fileUrl.startsWith('data:image/') || fileUrl.match(/\.(jpeg|jpg|png|webp|gif)$/i) ? 'image' : 'pdf'),
      description: description || ''
    });

    await syllabus.save();
    res.json({ success: true, syllabus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/syllabus/:id', authenticateToken, async (req, res) => {
  try {
    await Syllabus.findOneAndDelete({ _id: req.params.id, schoolId: req.user.schoolId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- HOMEWORK & STUDENT ASSIGNMENT SUBMISSION API ---
app.get('/api/homework', authenticateToken, async (req, res) => {
  try {
    const { schoolId } = req.user;
    const { className } = req.query;
    const filter = { schoolId };
    if (className) filter.className = className;
    const homeworks = await Homework.find(filter).sort({ createdAt: -1 });
    res.json(homeworks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/homework', authenticateToken, async (req, res) => {
  try {
    const { schoolId, role } = req.user;
    if (role !== 'teacher' && role !== 'schooladmin') {
      return res.status(403).json({ error: 'Only teachers can assign homework.' });
    }
    const { title, className, subject, dueDate, instructions, attachmentUrl } = req.body;
    if (!title || !className || !dueDate || !instructions) {
      return res.status(400).json({ error: 'Title, Class, Due Date, and Instructions are required.' });
    }

    const homework = new Homework({
      schoolId,
      title,
      className,
      subject: subject || '',
      dueDate,
      instructions,
      attachmentUrl: attachmentUrl || ''
    });

    await homework.save();
    res.json({ success: true, homework });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/homework/:id/submit-file', authenticateToken, async (req, res) => {
  try {
    const { schoolId, id: studentId, firstName, lastName } = req.user;
    const { submissionFileUrl, submissionNotes } = req.body;

    const studentName = `${firstName || ''} ${lastName || ''}`.trim() || 'Student';

    const homework = await Homework.findOne({ _id: req.params.id, schoolId });
    if (!homework) {
      return res.status(404).json({ error: 'Homework assignment not found.' });
    }

    if (!homework.submittedStudents.includes(studentId)) {
      homework.submittedStudents.push(studentId);
      homework.submittedCount = (homework.submittedCount || 0) + 1;
    }

    const existingIndex = homework.studentSubmissions.findIndex(s => s.studentId === studentId);
    const submissionData = {
      studentId,
      studentName,
      submissionFileUrl: submissionFileUrl || '',
      submissionNotes: submissionNotes || '',
      submittedAt: new Date()
    };

    if (existingIndex >= 0) {
      homework.studentSubmissions[existingIndex] = submissionData;
    } else {
      homework.studentSubmissions.push(submissionData);
    }

    await homework.save();
    res.json({ success: true, homework });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SOCKET.IO FOR REAL-TIME CHAT & NOTIFICATIONS ---
const io = new Server(server, {
  cors: {
    origin: config.ALLOWED_ORIGINS,
    methods: ['GET', 'POST']
  }
});

// Authenticate socket connections
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error: Token missing'));

  jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error: Token invalid'));

    const idClaim = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';
    const emailClaim = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress';
    const roleClaim = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role';
    const microsoftRoleClaim = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

    decoded.id = decoded.id || decoded.nameid || decoded.sub || decoded[idClaim];
    decoded.email = decoded.email || decoded[emailClaim];
    decoded.role = decoded.role || decoded[roleClaim] || decoded[microsoftRoleClaim];

    // Handle array values due to duplicate claims serialization in C#
    if (Array.isArray(decoded.id)) decoded.id = decoded.id[0];
    if (Array.isArray(decoded.email)) decoded.email = decoded.email[0];
    if (Array.isArray(decoded.role)) decoded.role = decoded.role[0];
    if (Array.isArray(decoded.schoolId)) decoded.schoolId = decoded.schoolId[0];

    const isSuperAdmin = decoded.role === 'superadmin';
    if (!decoded.schoolId && !isSuperAdmin) {
      return next(new Error('Authentication error: School ID missing in token'));
    }

    if (isSuperAdmin && !decoded.schoolId) {
      decoded.schoolId = 'ALL';
    }

    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`Socket Connected: User ${socket.user.id} (${socket.user.role}) in School ${socket.user.schoolId}`);

  // Join standard school-wide room if present
  if (socket.user.schoolId && socket.user.schoolId !== 'ALL') {
    socket.join(socket.user.schoolId);
  }
  if (socket.user.role === 'superadmin') {
    socket.join('SUPERADMIN');
  }
  // Join private personal room for direct messages
  socket.join(socket.user.id);

  // Group join request (for classrooms / notice boards)
  socket.on('join_group', (groupId) => {
    socket.join(groupId);
    console.log(`User ${socket.user.id} joined group: ${groupId}`);
  });

  // Direct Message event
  socket.on('send_message', async (data) => {
    try {
      const { recipientId, message, isGroup } = data;
      const chatMsg = new ChatMessage({
        schoolId: socket.user.schoolId,
        senderId: socket.user.id,
        senderName: `${socket.user.firstName} ${socket.user.lastName}`,
        recipientId,
        isGroup: !!isGroup,
        message,
        timestamp: new Date()
      });
      await chatMsg.save();

      if (isGroup) {
        // Broadcast message to everyone in the classroom group
        io.to(recipientId).emit('receive_message', chatMsg);
      } else {
        // Send message to recipient and echo back to sender
        io.to(recipientId).to(socket.user.id).emit('receive_message', chatMsg);
      }
    } catch (error) {
      console.error('Socket message error:', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket Disconnected: User ${socket.user?.id || 'anonymous'}`);
  });
});

process.on('uncaughtException', (err) => {
  console.error('[EXPRESS] Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[EXPRESS] Unhandled Rejection:', reason);
});

// Serve React SPA build static files and handle route rewrites
const webDistPath = path.join(__dirname, '../EduVault.Web/dist');
if (fs.existsSync(webDistPath)) {
  app.use(express.static(webDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/api-docs') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(webDistPath, 'index.html'));
  });
}

const PORT = config.PORT;
server.listen(PORT, () => {
  console.log(`Express auxiliary service running on port ${PORT} (loaded config from: ${config.loadedFrom || 'environment'})`);
});