const { getDB } = require('../config/database');
const path = require('path');
const fs = require('fs');
const { upload } = require('../utils/upload');

// Helper to wrap multer middleware as a promise
const runMulter = (req, res, middleware) =>
  new Promise((resolve, reject) => {
    middleware(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

const investmentRequestController = {
  // Admin list requests (optionally by status)
  listRequests: async (req, res) => {
    try {
      const { status } = req.query; // optional: pending, approved, funded, rejected
      const db = getDB();
      let query = `
        SELECT ir.*, u.name AS seller_name, u.email AS seller_email
        FROM investment_requests ir
        JOIN users u ON ir.seller_id = u.id
        WHERE 1=1`;
      const params = [];
      if (status && status !== 'all') {
        query += ' AND ir.status = ?';
        params.push(status);
      }
      query += ' ORDER BY ir.created_at DESC';
      const [rows] = await db.execute(query, params);
      res.json({ success: true, requests: rows });
    } catch (error) {
      console.error('listRequests error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch requests' });
    }
  },

  // Seller: list own funding requests (pending/approved/funded)
  listSellerRequests: async (req, res) => {
    try {
      const role = String(req.user.role);
      if (role !== 'seller' && role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Only seller or admin can view seller requests' });
      }
      const userId = role === 'seller' ? req.user.userId : (req.query.seller_id || req.user.userId);
      const { status } = req.query || {};
      const db = getDB();
      let query = `
        SELECT ir.*
        FROM investment_requests ir
        WHERE ir.seller_id = ?`;
      const params = [userId];
      if (status && status !== 'all') {
        query += ' AND ir.status = ?';
        params.push(status);
      }
      query += ' ORDER BY ir.updated_at DESC, ir.created_at DESC';
      const [rows] = await db.execute(query, params);
      res.json({ success: true, requests: rows });
    } catch (error) {
      console.error('listSellerRequests error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch seller requests' });
    }
  },

  // Investor: list own funding requests (pending/approved/funded)
  listInvestorRequests: async (req, res) => {
    try {
      const role = String(req.user.role);
      if (role !== 'investor' && role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Only investor or admin can view investor requests' });
      }
      const userId = role === 'investor' ? req.user.userId : (req.query.investor_id || req.user.userId);
      const { status } = req.query || {};
      const db = getDB();
      let query = `
        SELECT ir.*
        FROM investment_requests ir
        WHERE ir.investor_id = ?`;
      const params = [userId];
      if (status && status !== 'all') {
        query += ' AND ir.status = ?';
        params.push(status);
      }
      query += ' ORDER BY ir.updated_at DESC, ir.created_at DESC';
      const [rows] = await db.execute(query, params);
      res.json({ success: true, requests: rows });
    } catch (error) {
      console.error('listInvestorRequests error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch investor requests' });
    }
  },

  // Find existing request between current seller and a given investor (no create)
  findBetween: async (req, res) => {
    try {
      const role = String(req.user.role);
      if (role !== 'seller' && role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Only seller or admin can query this' });
      }
      const db = getDB();
      const sellerId = role === 'seller' ? req.user.userId : (req.query.seller_id || null);
      const investorId = req.query.investor_id;
      if (!sellerId || !investorId) {
        return res.status(400).json({ success: false, error: 'investor_id (and seller_id for admin) are required' });
      }
      const [existing] = await db.execute(
        `SELECT id, status, seller_id, investor_id, requested_amount, created_at, updated_at
         FROM investment_requests
         WHERE seller_id = ? AND investor_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [sellerId, investorId]
      );
      if (existing.length === 0) {
        return res.json({ success: true, exists: false });
      }
      return res.json({ success: true, exists: true, request: existing[0] });
    } catch (error) {
      console.error('findBetween error:', error);
      res.status(500).json({ success: false, error: 'Failed to find request' });
    }
  },

  // Messages: list chat messages for a request
  listMessages: async (req, res) => {
    try {
      const { id } = req.params; // request id
      const { order, limit } = req.query || {};
      const db = getDB();
      const ord = String(order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      let lim = parseInt(limit, 10);
      if (!Number.isFinite(lim) || lim <= 0) lim = 100;
      if (lim > 50) lim = 50;
      const [rows] = await db.execute(
        `SELECT m.id, m.request_id, m.sender_id, u.name AS sender_name, m.message, m.created_at
         FROM investment_request_messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.request_id = ?
         ORDER BY m.created_at ${ord}
         LIMIT ${lim}`,
        [id]
      );
      res.json({ success: true, messages: rows });
    } catch (error) {
      console.error('listMessages error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch messages' });
    }
  },

  // Messages: post a new message (investor or seller)
  postMessage: async (req, res) => {
    try {
      const { id } = req.params; // request id
      const { message } = req.body;
      if (!message) return res.status(400).json({ success: false, error: 'Message is required' });
      const db = getDB();
      await db.execute(
        `INSERT INTO investment_request_messages (request_id, sender_id, message)
         VALUES (?, ?, ?)`,
        [id, req.user.userId, message]
      );
      res.json({ success: true, message: 'Message sent' });
    } catch (error) {
      console.error('postMessage error:', error);
      res.status(500).json({ success: false, error: 'Failed to send message' });
    }
  },

  // Admin workflow view: two sections matching the scenario
  // 1) pending_approvals: requests in 'pending' with a 'final_agreement' uploaded
  // 2) awaiting_funding: requests in 'approved' with a 'payment_slip' uploaded
  listPendingAgreements: async (req, res) => {
    try {
      const db = getDB();
      const [pendingApprovals] = await db.execute(`
        SELECT ir.*, u.name AS seller_name, u.email AS seller_email
        FROM investment_requests ir
        JOIN users u ON ir.seller_id = u.id
        WHERE ir.status = 'pending' AND EXISTS (
          SELECT 1 FROM investment_request_documents d
          WHERE d.request_id = ir.id AND LOWER(d.doc_type) = 'final_agreement'
        )
        ORDER BY ir.updated_at DESC
      `);

      const [awaitingFunding] = await db.execute(`
        SELECT ir.*, u.name AS seller_name, u.email AS seller_email
        FROM investment_requests ir
        JOIN users u ON ir.seller_id = u.id
        WHERE ir.status = 'approved' AND EXISTS (
          SELECT 1 FROM investment_request_documents d
          WHERE d.request_id = ir.id AND LOWER(d.doc_type) = 'payment_slip'
        )
        ORDER BY ir.updated_at DESC
      `);

      res.json({ success: true, pending_approvals: pendingApprovals, awaiting_funding: awaitingFunding });
    } catch (error) {
      console.error('listPendingAgreements error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch pending agreements' });
    }
  },

  // Admin approves a pending investment request
  approveRequest: async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDB();
      // Require a final agreement to be uploaded before admin approval
      const [fa] = await db.execute(
        `SELECT id FROM investment_request_documents WHERE request_id = ? AND LOWER(doc_type) = 'final_agreement' LIMIT 1`,
        [id]
      );
      if (fa.length === 0) {
        return res.status(400).json({ success: false, error: 'Final agreement not uploaded yet' });
      }
      await db.execute(
        `UPDATE investment_requests 
         SET status = 'approved', admin_approved = TRUE, updated_at = NOW()
         WHERE id = ? AND status IN ('pending','accepted')`,
        [id]
      );
      // system message notifying approval and next steps
      await db.execute(
        `INSERT INTO investment_request_messages (request_id, sender_id, message)
         VALUES (?, ?, ?)`,
        [id, req.user.userId, 'Your funding request has been approved by admin. Please upload your payment slip/final agreement for verification.']
      );
      const [[row]] = await db.execute(`SELECT * FROM investment_requests WHERE id = ?`, [id]);
      res.json({ success: true, message: 'Request approved', request: row });
    } catch (error) {
      console.error('approveRequest error:', error);
      res.status(500).json({ success: false, error: 'Failed to approve request' });
    }
  },

  // Get request details (investor/seller/admin)
  getRequestById: async (req, res) => {
    try {
      const { id } = req.params;
      const db = getDB();
      const [rows] = await db.execute(
        `SELECT ir.*, u.name AS seller_name, u.email AS seller_email
         FROM investment_requests ir
         JOIN users u ON ir.seller_id = u.id
         WHERE ir.id = ?`,
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Request not found' });
      }
      res.json({ success: true, request: rows[0] });
    } catch (error) {
      console.error('getRequestById error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch request' });
    }
  },

  // Investor uploads a document (e.g., final agreement)
  uploadDocument: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { id } = req.params; // request id from path

      // Parse multipart BEFORE reading req.body
      await runMulter(req, res, upload.single('document'));

      // After multer, body fields are available
      const bodyRequestId = req.body?.request_id;
      const doc_type = req.body?.doc_type;
      const requestId = id || bodyRequestId;
      if (!requestId) {
        return res.status(400).json({ success: false, error: 'request_id is required' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const filePath = `/uploads/${req.file.filename}`;
      const mimeType = req.file.mimetype;

      // Enforce role permissions for specific document types
      const normalizedType = String(doc_type || 'other').toLowerCase();
      if (normalizedType === 'final_agreement' && String(req.user.role) !== 'investor') {
        return res.status(403).json({ success: false, error: 'Only investors can upload final agreements' });
      }
      if (normalizedType === 'payment_slip' && String(req.user.role) !== 'investor') {
        return res.status(403).json({ success: false, error: 'Only investors can upload payment slips' });
      }

      const db = getDB();
      // Enforce unique final agreement per request
      if (normalizedType === 'final_agreement') {
        const [existingFA] = await db.execute(
          `SELECT id, file_path, mime_type FROM investment_request_documents WHERE request_id = ? AND LOWER(doc_type) = 'final_agreement' LIMIT 1`,
          [requestId]
        );
        if (existingFA.length > 0) {
          return res.status(400).json({ success: false, error: 'Final agreement already uploaded', existing: existingFA[0] });
        }
      }
      // Enforce unique payment slip per request
      if (normalizedType === 'payment_slip') {
        // Verify request is approved
        const [[reqRow]] = await db.execute(`SELECT status FROM investment_requests WHERE id = ?`, [requestId]);
        if (!reqRow) {
          return res.status(404).json({ success: false, error: 'Request not found' });
        }
        if (String(reqRow.status) !== 'approved') {
          return res.status(400).json({ success: false, error: 'Payment slip can be uploaded only after admin approval' });
        }
        // Verify final agreement exists first
        const [faDocs] = await db.execute(
          `SELECT id FROM investment_request_documents WHERE request_id = ? AND LOWER(doc_type) = 'final_agreement' LIMIT 1`,
          [requestId]
        );
        if (faDocs.length === 0) {
          return res.status(400).json({ success: false, error: 'Upload final agreement before uploading payment slip' });
        }
        const [existingSlip] = await db.execute(
          `SELECT id, file_path, mime_type FROM investment_request_documents WHERE request_id = ? AND LOWER(doc_type) = 'payment_slip' LIMIT 1`,
          [requestId]
        );
        if (existingSlip.length > 0) {
          return res.status(400).json({ success: false, error: 'Payment slip already uploaded', existing: existingSlip[0] });
        }
      }
      await db.execute(
        `INSERT INTO investment_request_documents (request_id, user_id, doc_type, file_path, mime_type)
         VALUES (?, ?, ?, ?, ?)`,
        [requestId, userId, normalizedType || 'other', filePath, mimeType]
      );

      // Notify via system message when final agreement is uploaded
      if (normalizedType === 'final_agreement') {
        try {
          await db.execute(
            `INSERT INTO investment_request_messages (request_id, sender_id, message)
             VALUES (?, ?, ?)`,
            [requestId, userId, 'Final agreement uploaded; awaiting admin approval.']
          );
          await db.execute(`UPDATE investment_requests SET updated_at = NOW() WHERE id = ?`, [requestId]);
        } catch (_) { }
      }

      res.json({ success: true, message: 'Document uploaded', file: { file_path: filePath, mime_type: mimeType } });
    } catch (error) {
      console.error('uploadDocument error:', error);
      res.status(500).json({ success: false, error: 'Failed to upload document' });
    }
  },

  // Admin and investor can list documents for a request
  listDocuments: async (req, res) => {
    try {
      const { id } = req.params; // request id
      const db = getDB();
      const [docs] = await db.execute(
        `SELECT id, request_id, user_id, doc_type, file_path, mime_type, created_at
         FROM investment_request_documents
         WHERE request_id = ?
         ORDER BY created_at DESC`,
        [id]
      );
      res.json({ success: true, documents: docs });
    } catch (error) {
      console.error('listDocuments error:', error);
      res.status(500).json({ success: false, error: 'Failed to list documents' });
    }
  },

  // Admin marks request as funded
  markFunded: async (req, res) => {
    try {
      const { id } = req.params;
      const { funded_amount } = req.body;
      const db = getDB();
      await db.execute(
        `UPDATE investment_requests 
         SET status = 'funded', admin_approved = TRUE, funded_amount = COALESCE(?, funded_amount)
         WHERE id = ? AND status IN ('approved','pending')`,
        [funded_amount || null, id]
      );
      // system messages notifying funding completed to both parties
      const amountText = funded_amount ? ` Amount: ${funded_amount}.` : '';
      await db.execute(
        `INSERT INTO investment_request_messages (request_id, sender_id, message)
         VALUES (?, ?, ?)`,
        [id, req.user.userId, `Admin marked this request as funded.${amountText}`]
      );
      await db.execute(
        `INSERT INTO investment_request_messages (request_id, sender_id, message)
         VALUES (?, ?, ?)`,
        [id, req.user.userId, `Funding completed.${amountText} Seller has been notified.`]
      );
      res.json({ success: true, message: 'Request marked as funded' });
    } catch (error) {
      console.error('markFunded error:', error);
      res.status(500).json({ success: false, error: 'Failed to mark funded' });
    }
  },

  // Admin rejects a request (after reviewing docs)
  rejectRequest: async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      const db = getDB();
      await db.execute(
        `UPDATE investment_requests SET status = 'rejected' WHERE id = ? AND status IN ('pending','approved')`,
        [id]
      );
      await db.execute(
        `INSERT INTO investment_request_messages (request_id, sender_id, message)
         VALUES (?, ?, ?)`,
        [id, req.user.userId, `Your funding request was rejected by admin.${reason ? ' Reason: ' + reason : ''}`]
      );
      res.json({ success: true, message: 'Request rejected' });
    } catch (error) {
      console.error('rejectRequest error:', error);
      res.status(500).json({ success: false, error: 'Failed to reject request' });
    }
  },

  // Create a new investment request (link seller and investor)
  createRequest: async (req, res) => {
    try {
      const db = getDB();
      const userId = req.user.userId;
      const role = String(req.user.role);
      const { seller_id, investor_id, requested_amount } = req.body || {};

      // Require one side based on role
      let sellerId = seller_id;
      let investorId = investor_id;

      if (role === 'investor') {
        if (!sellerId) {
          return res.status(400).json({ success: false, error: 'seller_id is required' });
        }
        investorId = userId;
      } else if (role === 'seller') {
        if (!investorId) {
          return res.status(400).json({ success: false, error: 'investor_id is required' });
        }
        sellerId = userId;
      } else if (role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Only seller, investor, or admin can create requests' });
      }

      // Verify users exist
      const [sellerRows] = await db.execute('SELECT id FROM users WHERE id = ?', [sellerId]);
      const [investorRows] = await db.execute('SELECT id FROM users WHERE id = ?', [investorId]);
      if (sellerRows.length === 0 || investorRows.length === 0) {
        return res.status(404).json({ success: false, error: 'Seller or investor not found' });
      }

      // Prevent duplicates: check if a pending/approved request already exists between these two
      const [existing] = await db.execute(
        `SELECT id, status FROM investment_requests WHERE seller_id = ? AND investor_id = ? ORDER BY created_at DESC LIMIT 1`,
        [sellerId, investorId]
      );
      if (existing.length > 0) {
        return res.json({ success: true, message: 'Request already exists', request_id: existing[0].id, status: existing[0].status });
      }

      const [ins] = await db.execute(
        `INSERT INTO investment_requests (seller_id, investor_id, requested_amount, status, admin_approved)
         VALUES (?, ?, ?, 'pending', FALSE)`,
        [sellerId, investorId, requested_amount || 0]
      );

      return res.json({ success: true, message: 'Investment request created', request_id: ins.insertId, status: 'pending' });
    } catch (error) {
      console.error('createRequest error:', error);
      res.status(500).json({ success: false, error: 'Failed to create investment request' });
    }
  }
};

// Role-based stats: investor or seller
investmentRequestController.getStats = async (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.userId;
    const role = String(req.user.role);

    if (role === 'investor') {
      const [[funded]] = await db.execute(
        `SELECT COALESCE(SUM(funded_amount),0) AS total_invested, COUNT(*) AS active_deals
         FROM investment_requests
         WHERE investor_id = ? AND status = 'funded'`,
        [userId]
      );
      const [[awaiting]] = await db.execute(
        `SELECT COUNT(*) AS awaiting_funding
         FROM investment_requests ir
         WHERE ir.investor_id = ? AND ir.status = 'approved'`,
        [userId]
      );
      return res.json({
        success: true, role: 'investor',
        total_invested: Number(funded.total_invested || 0),
        active_deals: Number(funded.active_deals || 0),
        awaiting_funding: Number(awaiting.awaiting_funding || 0)
      });
    }

    if (role === 'seller') {
      const [[funded]] = await db.execute(
        `SELECT COALESCE(SUM(funded_amount),0) AS total_raised, COUNT(*) AS active_deals
         FROM investment_requests
         WHERE seller_id = ? AND status = 'funded'`,
        [userId]
      );
      const [[pending]] = await db.execute(
        `SELECT COUNT(*) AS pending_approvals
         FROM investment_requests ir
         WHERE ir.seller_id = ? AND ir.status = 'pending'`,
        [userId]
      );
      return res.json({
        success: true, role: 'seller',
        total_raised: Number(funded.total_raised || 0),
        active_deals: Number(funded.active_deals || 0),
        pending_approvals: Number(pending.pending_approvals || 0)
      });
    }

    // Admin: provide overall snapshots
    const [[fundedAll]] = await db.execute(
      `SELECT COALESCE(SUM(funded_amount),0) AS total_funded, COUNT(*) AS funded_deals
       FROM investment_requests WHERE status = 'funded'`
    );
    const [[awaitingAll]] = await db.execute(
      `SELECT COUNT(*) AS awaiting_funding
       FROM investment_requests WHERE status = 'approved'`
    );
    return res.json({
      success: true, role: 'admin',
      total_funded: Number(fundedAll.total_funded || 0),
      funded_deals: Number(fundedAll.funded_deals || 0),
      awaiting_funding: Number(awaitingAll.awaiting_funding || 0)
    });
  } catch (error) {
    console.error('getStats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
};

module.exports = investmentRequestController;
