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
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config();

const connectDB = require('./config/db');
const ActivityLog = require('./models/ActivityLog');
const Notification = require('./models/Notification');
const Remark = require('./models/Remark');
const ChatMessage = require('./models/ChatMessage');
const DocumentMetadata = require('./models/DocumentMetadata');
const Homework = require('./models/Homework');
const TeacherAttendance = require('./models/TeacherAttendance');

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors());
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

connectDB();

// Mock local storage for document uploads (for demo/dev purposes)
const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// --- JWT Verification Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, process.env.JWT_SECRET || 'EduVaultSuperSecretJWTKey2025!WithSecureKey32BytesLength', (err, user) => {
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
app.get('/api/logs', authenticateToken, async (req, res) => {
  try {
    const { schoolId } = req.user;
    const filter = {};
    if (req.user.role !== 'superadmin') {
      filter.schoolId = schoolId;
    }
    const logs = await ActivityLog.find(filter).sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/logs:
 *   post:
 *     summary: Log a user activity
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - actionType
 *               - description
 *             properties:
 *               actionType:
 *                 type: string
 *               description:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Log recorded.
 */
app.post('/api/logs', authenticateToken, async (req, res) => {
  try {
    const { actionType, description, metadata } = req.body;
    const log = new ActivityLog({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      schoolId: req.user.schoolId,
      actionType,
      description,
      metadata,
      ipAddress: req.ip
    });
    await log.save();
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      const notification = new Notification({
        recipientId: rId,
        schoolId,
        title,
        body,
        type: type || 'GENERAL',
        senderName,
        senderRole,
        senderId: req.user.id
      });
      await notification.save();
      createdNotifs.push(notification);
    }

    // Broadcast through socket individually
    for (const notification of createdNotifs) {
      const rId = notification.recipientId;
      if (schoolId === 'ALL') {
        io.emit('notification', notification);
      } else {
        if (rId === 'ALL' || rId === 'TEACHERS' || rId === 'STUDENTS' || rId === 'SCHOOLADMINS' || rId === 'PARENTS') {
          io.to(schoolId).emit('notification', notification);
        } else {
          // Targeted notification to a specific user private room
          io.to(rId).emit('notification', notification);
        }
      }
    }

    res.status(201).json(Array.isArray(recipientId) ? createdNotifs : createdNotifs[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    let filter = { schoolId };
    if (isGroup === 'true') {
      filter.recipientId = recipientId;
      filter.isGroup = true;
    } else {
      filter.$or = [
        { senderId: id, recipientId },
        { senderId: recipientId, recipientId: id }
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
/**
 * @openapi
 * /api/teacher-attendance:
 *   get:
 *     summary: Get teacher attendance for a specific date
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of teacher attendance records.
 */
app.get('/api/teacher-attendance', authenticateToken, async (req, res) => {
  try {
    const { schoolId } = req.user;
    const { date } = req.query;
    if (!schoolId) {
      return res.status(400).json({ error: 'School ID missing in token' });
    }
    if (!date) {
      return res.status(400).json({ error: 'Date query parameter is required' });
    }
    const attendance = await TeacherAttendance.find({ schoolId, date });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/teacher-attendance/submit:
 *   post:
 *     summary: Submit teacher attendance
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - attendance
 *             properties:
 *               date:
 *                 type: string
 *               attendance:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Attendance saved successfully.
 */
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

/**
 * @openapi
 * /api/teacher-attendance/my-attendance:
 *   get:
 *     summary: Get self attendance history for logged-in teacher
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of attendance records for the teacher.
 */
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

// --- SOCKET.IO FOR REAL-TIME CHAT & NOTIFICATIONS ---
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Authenticate socket connections
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error: Token missing'));

  jwt.verify(token, process.env.JWT_SECRET || 'EduVaultSuperSecretJWTKey2025!WithSecureKey32BytesLength', (err, decoded) => {
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

    if (!decoded.schoolId) {
      return next(new Error('Authentication error: School ID missing in token'));
    }

    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`Socket Connected: User ${socket.user.id} in School ${socket.user.schoolId}`);
  
  // Join standard school-wide room
  socket.join(socket.user.schoolId);
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
    console.log(`Socket Disconnected: User ${socket.user.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Express auxiliary service running on port ${PORT}`);
});
