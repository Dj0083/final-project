const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { initializeDatabase } = require('./config/database');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const investorConnectionRoutes = require('./routes/investorConnections');
const investmentRequestRoutes = require('./routes/investmentRequests');
const affiliatePartnerRoutes = require('./routes/affiliatePartners');
const affiliatesRoutes = require('./routes/affiliates');
const vendorsRoutes = require('./routes/vendors');
const connectionsRoutes = require('./routes/connections');
const productsV2Routes = require('./routes/productsV2');
const trackingController = require('./controllers/trackingController');

const app = express();
const server = http.createServer(app);
const { getDB } = require('./config/database');
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET','POST']
  }
});
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  if (req.headers.authorization) {
    console.log('   🔑 Has Authorization header');
  }
  next();
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/investor-connections', investorConnectionRoutes);
app.use('/api/investment-requests', investmentRequestRoutes);
app.use('/api', affiliatePartnerRoutes);
app.use('/api', affiliatesRoutes);
app.use('/api', vendorsRoutes);
app.use('/api', connectionsRoutes);
app.use('/api', productsV2Routes);

// Tracking endpoints
app.get('/api/track/click/:productId', trackingController.trackClick);
app.post('/api/track/sale', trackingController.recordSale);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Database test endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const { getDB } = require('./config/database');
    const db = getDB();
    const [rows] = await db.execute('SELECT COUNT(*) as count FROM users');
    res.json({ 
      message: 'Database connected successfully', 
      userCount: rows[0].count 
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ error: 'Database connection failed', details: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  res.status(500).json({ error: 'Internal server error' });
});

// Socket.IO helpers
const ensureParticipant = async (db, requestId, userId) => {
  const [rows] = await db.execute(
    `SELECT id FROM affiliate_partner_requests WHERE id = ? AND (seller_id = ? OR affiliate_user_id = ?)`,
    [requestId, userId, userId]
  );
  return rows.length > 0;
};

io.on('connection', (socket) => {
  console.log('🔌 Socket connected', socket.id);

  socket.on('join_request', async (payload = {}, ack) => {
    try {
      const { token, request_id } = payload;
      if (!token || !request_id) return ack && ack({ success: false, error: 'token and request_id required' });
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const db = getDB();
      const allowed = await ensureParticipant(db, request_id, decoded.userId);
      if (!allowed) return ack && ack({ success: false, error: 'not a participant' });
      const room = `req:${request_id}`;
      socket.join(room);
      ack && ack({ success: true, room });
    } catch (e) {
      ack && ack({ success: false, error: 'join failed' });
    }
  });

  socket.on('send_message', async (payload = {}, ack) => {
    try {
      const { token, request_id, message } = payload;
      if (!token || !request_id || !message || !message.trim()) return ack && ack({ success: false, error: 'invalid payload' });
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const db = getDB();
      const allowed = await ensureParticipant(db, request_id, decoded.userId);
      if (!allowed) return ack && ack({ success: false, error: 'not a participant' });

      // Determine sender_type from role
      const [uRows] = await db.execute('SELECT role,name FROM users WHERE id = ?', [decoded.userId]);
      const role = uRows[0]?.role || 'seller';
      const sender_type = role === 'affiliate' ? 'affiliate' : 'vendor';

      const [ins] = await db.execute(
        `INSERT INTO affiliate_partner_messages (request_id, sender_id, message, sender_type) VALUES (?, ?, ?, ?)`,
        [request_id, decoded.userId, message.trim(), sender_type]
      );

      const msg = { id: ins.insertId, request_id, sender_id: decoded.userId, sender_type, message: message.trim(), created_at: new Date().toISOString(), sender_name: uRows[0]?.name };
      io.to(`req:${request_id}`).emit('new_message', msg);
      ack && ack({ success: true, message: msg });
    } catch (e) {
      ack && ack({ success: false, error: 'send failed' });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected', socket.id);
  });
});

// Initialize database and start server
initializeDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(error => { 
    console.error('Failed to start server:', error);
    process.exit(1);
  });