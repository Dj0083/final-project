const { getDB } = require('../config/database');
const auth = require('../middleware/auth');
const { upload } = require('../utils/upload');

// Helper to wrap multer middleware as a promise
const runMulter = (req, res, middleware) =>
  new Promise((resolve, reject) => {
    middleware(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

const ensureParticipant = async (db, requestId, userId) => {
  const [rows] = await db.execute(
    `SELECT id FROM affiliate_partner_requests 
     WHERE id = ? AND (seller_id = ? OR affiliate_user_id = ?)`,
    [requestId, userId, userId]
  );
  return rows.length > 0;
};

// Partner documents (flyers/agreements)
exports.listPartnerDocuments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params; // request id
    const db = getDB();
    const allowed = await ensureParticipant(db, id, userId);
    if (!allowed) return res.status(403).json({ success: false, error: 'Access denied' });

    // Role-based visibility
    const role = (req.user.role || '').toLowerCase();
    // Affiliates see flyers; Sellers/entrepreneurs see agreements
    const visibleType = role === 'affiliate' ? 'flyer' : 'agreement';
    const [docs] = await db.execute(
      `SELECT id, request_id, user_id, doc_type, file_path, mime_type, created_at
       FROM affiliate_partner_documents
       WHERE request_id = ? AND LOWER(doc_type) = ?
       ORDER BY created_at DESC`,
      [id, visibleType]
    );
    res.json({ success: true, documents: docs });
  } catch (error) {
    console.error('listPartnerDocuments error:', error);
    res.status(500).json({ success: false, error: 'Failed to list documents' });
  }
};

exports.uploadPartnerDocument = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params; // request id
    const db = getDB();
    const allowed = await ensureParticipant(db, id, userId);
    if (!allowed) return res.status(403).json({ success: false, error: 'Access denied' });

    // IMPORTANT: run multer BEFORE reading req.body for multipart/form-data
    await runMulter(req, res, upload.single('document'));
    let { doc_type } = req.body || {};
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const filePath = `/uploads/${req.file.filename}`;
    const mimeType = req.file.mimetype;

    // Enforce role-based upload types
    const role = (req.user.role || '').toLowerCase();
    doc_type = String(doc_type || '').toLowerCase();
    if (role === 'affiliate') {
      if (doc_type !== 'agreement') {
        return res.status(400).json({ success: false, error: 'Affiliates can only upload agreements' });
      }
    } else {
      // Seller/entrepreneur or other roles
      if (doc_type !== 'flyer') {
        return res.status(400).json({ success: false, error: 'Sellers can only upload flyers' });
      }
    }

    await db.execute(
      `INSERT INTO affiliate_partner_documents (request_id, user_id, doc_type, file_path, mime_type)
       VALUES (?, ?, ?, ?, ?)`,
      [id, userId, doc_type, filePath, mimeType]
    );
    res.json({ success: true, message: 'Document uploaded', file: { file_path: filePath, mime_type: mimeType } });
  } catch (error) {
    console.error('uploadPartnerDocument error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload document' });
  }
};

exports.sendRequest = async (req, res) => {
  try {
    const userId = req.user.userId; // seller
    const { affiliate_user_id, message } = req.body;
    if (!affiliate_user_id) {
      return res.status(400).json({ success: false, error: 'affiliate_user_id is required' });
    }

    const db = getDB();

    // Guard: seller must have at least one accepted investor connection
    const [acceptedConn] = await db.execute(
      `SELECT 1 FROM investor_seller_connections
       WHERE seller_id = ? AND status = 'accepted' LIMIT 1`,
      [userId]
    );
    if (acceptedConn.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'You must have an accepted investor connection before partnering with affiliates.'
      });
    }

    // Check existing
    const [existing] = await db.execute(
      `SELECT id, status FROM affiliate_partner_requests 
       WHERE seller_id = ? AND affiliate_user_id = ?`,
      [userId, affiliate_user_id]
    );

    if (existing.length > 0) {
      const row = existing[0];
      return res.json({ success: true, request: row, message: 'Request already exists' });
    }

    const [result] = await db.execute(
      `INSERT INTO affiliate_partner_requests (seller_id, affiliate_user_id, message) 
       VALUES (?, ?, ?)`,
      [userId, affiliate_user_id, message || null]
    );

    const requestId = result.insertId;

    if (message) {
      await db.execute(
        `INSERT INTO affiliate_partner_messages (request_id, sender_id, message) VALUES (?, ?, ?)`,
        [requestId, userId, message]
      );
    }

    res.status(201).json({ success: true, request: { id: requestId, status: 'pending' } });
  } catch (error) {
    console.error('sendRequest error:', error);
    res.status(500).json({ success: false, error: 'Failed to send request' });
  }
};

exports.listSellerRequests = async (req, res) => {
  try {
    const userId = req.user.userId;
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT r.*, u.name as affiliate_name, u.email as affiliate_email
       FROM affiliate_partner_requests r
       JOIN users u ON u.id = r.affiliate_user_id
       WHERE r.seller_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );
    res.json({ success: true, requests: rows });
  } catch (error) {
    console.error('listSellerRequests error:', error);
    res.status(500).json({ success: false, error: 'Failed to load requests' });
  }
};

exports.listAffiliateRequests = async (req, res) => {
  try {
    const userId = req.user.userId; // affiliate
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT r.*, u.name as seller_name, u.email as seller_email
       FROM affiliate_partner_requests r
       JOIN users u ON u.id = r.seller_id
       WHERE r.affiliate_user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );
    res.json({ success: true, requests: rows });
  } catch (error) {
    console.error('listAffiliateRequests error:', error);
    res.status(500).json({ success: false, error: 'Failed to load requests' });
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const userId = req.user.userId; // affiliate
    const { id } = req.params;
    const db = getDB();

    const [affected] = await db.execute(
      `UPDATE affiliate_partner_requests 
       SET status='accepted', responded_at=NOW() 
       WHERE id = ? AND affiliate_user_id = ?`,
      [id, userId]
    );

    if (affected.affectedRows === 0) return res.status(404).json({ success: false, error: 'Request not found' });
    res.json({ success: true, message: 'Request accepted' });
  } catch (error) {
    console.error('acceptRequest error:', error);
    res.status(500).json({ success: false, error: 'Failed to accept request' });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const userId = req.user.userId; // affiliate
    const { id } = req.params;
    const db = getDB();

    const [affected] = await db.execute(
      `UPDATE affiliate_partner_requests 
       SET status='rejected', responded_at=NOW() 
       WHERE id = ? AND affiliate_user_id = ?`,
      [id, userId]
    );

    if (affected.affectedRows === 0) return res.status(404).json({ success: false, error: 'Request not found' });
    res.json({ success: true, message: 'Request rejected' });
  } catch (error) {
    console.error('rejectRequest error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject request' });
  }
};

exports.listMessages = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params; // request id
    const db = getDB();

    const allowed = await ensureParticipant(db, id, userId);
    if (!allowed) return res.status(403).json({ success: false, error: 'Access denied' });

    const [rows] = await db.execute(
      `SELECT m.*, u.name as sender_name
       FROM affiliate_partner_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.request_id = ?
       ORDER BY m.created_at ASC`,
      [id]
    );
    res.json({ success: true, messages: rows });
  } catch (error) {
    console.error('listMessages error:', error);
    res.status(500).json({ success: false, error: 'Failed to load messages' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params; // request id
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ success: false, error: 'Message is required' });

    const db = getDB();
    const allowed = await ensureParticipant(db, id, userId);
    if (!allowed) return res.status(403).json({ success: false, error: 'Access denied' });

    const sender_type = req.user.role === 'affiliate' ? 'affiliate' : 'vendor';
    const [result] = await db.execute(
      `INSERT INTO affiliate_partner_messages (request_id, sender_id, message, sender_type) VALUES (?, ?, ?, ?)` ,
      [id, userId, message.trim(), sender_type]
    );

    res.status(201).json({ success: true, messageId: result.insertId });
  } catch (error) {
    console.error('sendMessage error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
};

// List partnered affiliates for a seller (requires at least one accepted investor connection)
exports.listPartneredAffiliatesForSeller = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const db = getDB();

    // Ensure seller has accepted investor connection
    const [acceptedConn] = await db.execute(
      `SELECT 1 FROM investor_seller_connections
       WHERE seller_id = ? AND status = 'accepted' LIMIT 1`,
      [sellerId]
    );
    if (acceptedConn.length === 0) {
      return res.json({ success: true, affiliates: [] });
    }

    const [rows] = await db.execute(
      `SELECT r.id as request_id, r.affiliate_user_id, u.name, u.email, r.created_at
       FROM affiliate_partner_requests r
       JOIN users u ON u.id = r.affiliate_user_id
       WHERE r.seller_id = ? AND r.status = 'accepted'
       ORDER BY r.created_at DESC`,
      [sellerId]
    );

    res.json({ success: true, affiliates: rows });
  } catch (error) {
    console.error('listPartneredAffiliatesForSeller error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch partnered affiliates' });
  }
};

// Generate a product link for a partnered affiliate request
exports.getProductLink = async (req, res) => {
try {
  const userId = req.user.userId; // seller or affiliate
  const { id } = req.params; // request id
  const { product_id } = req.query;
  if (!product_id) {
    return res.status(400).json({ success: false, error: 'product_id is required' });
  }

  const db = getDB();
  const allowed = await ensureParticipant(db, id, userId);
  if (!allowed) return res.status(403).json({ success: false, error: 'Access denied' });

  // Fetch affiliate code for the affiliate user on this request
  const [[row]] = await db.execute(
    `SELECT a.affiliate_code
     FROM affiliate_partner_requests r
     JOIN affiliates a ON a.user_id = r.affiliate_user_id
     WHERE r.id = ?`,
    [id]
  );
  const code = row?.affiliate_code;
  if (!code) return res.status(404).json({ success: false, error: 'Affiliate code not found' });

  const base = process.env.PUBLIC_APP_BASE || 'https://app.example.com';
  const link = `${base}/product/${encodeURIComponent(product_id)}?aff=${encodeURIComponent(code)}`;
  res.json({ success: true, link, affiliate_code: code });
} catch (error) {
  console.error('getProductLink error:', error);
  res.status(500).json({ success: false, error: 'Failed to generate product link' });
}
};

// Get a simple agreement text for a partnered affiliate request
exports.getAgreement = async (req, res) => {
try {
  const userId = req.user.userId; // participant
  const { id } = req.params; // request id
  const db = getDB();
  const allowed = await ensureParticipant(db, id, userId);
  if (!allowed) return res.status(403).json({ success: false, error: 'Access denied' });

  const [[reqRow]] = await db.execute(
    `SELECT r.id, r.seller_id, r.affiliate_user_id, r.status, r.created_at, r.responded_at,
            u1.name AS seller_name, u2.name AS affiliate_name
     FROM affiliate_partner_requests r
     JOIN users u1 ON u1.id = r.seller_id
     JOIN users u2 ON u2.id = r.affiliate_user_id
     WHERE r.id = ?`,
    [id]
  );
  if (!reqRow) return res.status(404).json({ success: false, error: 'Partner request not found' });

  const agreement = {
    title: 'Affiliate Partnership Agreement',
    seller: { id: reqRow.seller_id, name: reqRow.seller_name },
    affiliate: { id: reqRow.affiliate_user_id, name: reqRow.affiliate_name },
    status: reqRow.status,
    effective_date: reqRow.responded_at || reqRow.created_at,
    terms: [
      'Parties agree to collaborate on promoting seller products.',
      'Affiliate will use the provided tracking link for attribution.',
      'Commission structure and payout schedule are governed by platform policies.',
    ],
  };

  res.json({ success: true, agreement });
} catch (error) {
  console.error('getAgreement error:', error);
  res.status(500).json({ success: false, error: 'Failed to fetch agreement' });
}
};
