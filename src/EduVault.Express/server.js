const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const connectDB = require('./config/db');
const ActivityLog = require('./models/ActivityLog');
const Notification = require('./models/Notification');
const Remark = require('./models/Remark');
const ChatMessage = require('./models/ChatMessage');
const DocumentMetadata = require('./models/DocumentMetadata');

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Mock local storage for document uploads (for demo/dev purposes)
const fs = require('fs');
const path = require('path');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// --- JWT Verification Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, process.env.JWT_SECRET || 'EduVaultSuperSecretJWTKey2025!', (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalid or expired' });
    req.user = user;
    next();
  });
};

// --- HTTP REST ENDPOINTS ---

// 1. Activity Logs
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

// 2. Notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { id, role, schoolId } = req.user;
    // Get notifications directly targeting the user or broadcasting to their role
    const notifications = await Notification.find({
      schoolId,
      $or: [
        { recipientId: id },
        { recipientId: 'ALL' },
        { recipientId: role.toUpperCase() + 'S' } // e.g. "TEACHERS", "STUDENTS"
      ]
    }).sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { recipientId, title, body, type } = req.body;
    const notification = new Notification({
      recipientId,
      schoolId: req.user.schoolId,
      title,
      body,
      type: type || 'GENERAL'
    });
    await notification.save();

    // Broadcast through socket
    io.to(req.user.schoolId).emit('notification', notification);

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

// 3. Remarks Feed
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

// 4. Chat Messages History
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

// 5. Document Uploads (Simulated endpoint)
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

  jwt.verify(token, process.env.JWT_SECRET || 'EduVaultSuperSecretJWTKey2025!', (err, decoded) => {
    if (err) return next(new Error('Authentication error: Token invalid'));
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
