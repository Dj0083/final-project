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
const adminRoutes = require('./routes/admin');
const connectionsRoutes = require('./routes/connections');
const productsV2Routes = require('./routes/productsV2');
const trackingController = require('./controllers/trackingController');

const app = express();
const server = http.createServer(app);
const { getDB } = require('./config/database');
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
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
app.use('/api/admin', adminRoutes);

// Tracking endpoints
app.get('/api/track/click/:productId', trackingController.trackClick);
app.post('/api/track/sale', trackingController.recordSale);

// Public affiliate link redirect: /p/:productId?aff=AFF123&...utm params
// - Records a click for the affiliate code if provided
// - Redirects to the app's product page defined by PUBLIC_APP_BASE
app.get('/p/:productId', async (req, res) => {
  const { productId } = req.params;
  const { aff } = req.query; // affiliate_code
  try {
    if (aff) {
      const db = getDB();
      const [affRows] = await db.execute(
        'SELECT id FROM affiliates WHERE affiliate_code = ? AND status = "approved"',
        [aff]
      );
      if (affRows.length) {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
        await db.execute(
          'INSERT INTO clicks (product_id, affiliate_id, ip) VALUES (?, ?, ?)',
          [productId, affRows[0].id, ip]
        );
      }
    }
  } catch (e) {
    console.error('Public /p redirect tracking error:', e);
    // proceed to redirect anyway
  }

  const appBase = process.env.PUBLIC_APP_BASE || '';
  // Forward all query params to the app, but enforce productId
  let target = '#';
  if (appBase) {
    const url = new URL(`${appBase}/customer/ProductDetail`);
    url.searchParams.set('productId', String(productId));
    Object.entries(req.query || {}).forEach(([k, v]) => {
      if (k === 'productId') return; // we already set it
      if (Array.isArray(v)) {
        v.forEach(val => url.searchParams.append(k, String(val)));
      } else if (v != null) {
        url.searchParams.set(k, String(v));
      }
    });
    target = url.toString();
  }

  // Try to fetch product details for landing page
  try {
    const db = getDB();
    const [rows] = await db.execute('SELECT id, product_name, description, price, images, image_url, status FROM products WHERE id = ?', [productId]);
    const p = rows[0] || {};
    const title = p.product_name || 'Product';
    const desc = (p.description || '').toString().slice(0, 200);
    let img = p.image_url || '';
    if (!img) {
      try {
        const arr = JSON.parse(p.images || '[]');
        if (Array.isArray(arr) && arr.length) img = arr[0];
      } catch { }
    }

    const price = p.price != null ? Number(p.price).toFixed(2) : '';
    const ctaHref = target !== '#' ? target : `#`;

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  ${img ? `<meta property=\"og:image\" content=\"${img}\" />` : ''}
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; background:#fafafa; color:#111; }
    .wrap { max-width: 720px; margin: 0 auto; padding: 24px; }
    .card { background:#fff; border:1px solid #eee; border-radius:12px; overflow:hidden; box-shadow:0 1px 2px rgba(0,0,0,0.03); }
    .media { width:100%; height: 320px; background:#f3f4f6; display:flex; align-items:center; justify-content:center; }
    .media img { max-width:100%; max-height:100%; object-fit:contain; }
    .body { padding: 16px; }
    .title { font-size: 22px; font-weight: 700; margin: 0 0 6px; }
    .price { font-size: 18px; font-weight: 700; color:#16a34a; margin: 6px 0 12px; }
    .desc { color:#4b5563; white-space: pre-wrap; }
    .actions { display:flex; gap:12px; margin-top:16px; }
    .btn { display:inline-block; padding:12px 16px; border-radius:10px; text-decoration:none; font-weight:700; }
    .primary { background:#16a34a; color:#fff; }
    .secondary { background:#111827; color:#fff; }
    .muted { color:#6b7280; font-size: 13px; margin-top: 8px; }
  </style>
  <script>
    function openTarget() {
      var href = ${JSON.stringify(target)};
      if (href && href !== '#') { window.location.href = href; }
    }
  </script>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="media">${img ? `<img src="${img}" alt="${title}" />` : `<span>No image</span>`}</div>
      <div class="body">
        <h1 class="title">${title}</h1>
        ${price ? `<div class="price">$${price}</div>` : ''}
        <div class="desc">${desc || 'No description available.'}</div>
        <div class="actions">
          <a class="btn primary" href="${ctaHref}">Open in App to Buy</a>
          <a class="btn secondary" href="${ctaHref}">View Details</a>
        </div>
        <div class="muted">You may be asked to log in when purchasing.</div>
      </div>
    </div>
  </div>
</body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (e) {
    // If landing generation fails, fallback to redirect if possible
    if (target && target !== '#') return res.redirect(302, target);
    return res.status(404).send('Product not found');
  }
});

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