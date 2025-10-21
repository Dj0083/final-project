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

  // Messages: list chat messages for a request
  listMessages: async (req, res) => {
    try {
      const { id } = req.params; // request id
      const db = getDB();
      const [rows] = await db.execute(
        `SELECT m.id, m.request_id, m.sender_id, u.name AS sender_name, m.message, m.created_at
         FROM investment_request_messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.request_id = ?
         ORDER BY m.created_at ASC`,
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

  // Admin pending agreements: requests approved by admin and having at least one document uploaded, but not funded/rejected yet
  listPendingAgreements: async (req, res) => {
    try {
      const db = getDB();
      const [rows] = await db.execute(`
        SELECT ir.*, u.name AS seller_name, u.email AS seller_email,
               COALESCE(doc_counts.doc_count, 0) AS doc_count
        FROM investment_requests ir
        JOIN users u ON ir.seller_id = u.id
        LEFT JOIN (
          SELECT request_id, COUNT(*) AS doc_count
          FROM investment_request_documents
          GROUP BY request_id
        ) doc_counts ON doc_counts.request_id = ir.id
        WHERE ir.status = 'approved' AND COALESCE(doc_counts.doc_count, 0) > 0
        ORDER BY ir.updated_at DESC
      `);
      res.json({ success: true, requests: rows });
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
      await db.execute(
        `UPDATE investment_requests 
         SET status = 'approved', admin_approved = TRUE 
         WHERE id = ? AND status = 'pending'`,
        [id]
      );
      // system message notifying approval and next steps
      await db.execute(
        `INSERT INTO investment_request_messages (request_id, sender_id, message)
         VALUES (?, ?, ?)`,
        [id, req.user.userId, 'Your funding request has been approved by admin. Please upload your payment slip/final agreement for verification.']
      );
      res.json({ success: true, message: 'Request approved' });
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

      const db = getDB();
      await db.execute(
        `INSERT INTO investment_request_documents (request_id, user_id, doc_type, file_path, mime_type)
         VALUES (?, ?, ?, ?, ?)`,
        [requestId, userId, doc_type || 'final_agreement', filePath, mimeType]
      );

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
      // system message notifying funding completed
      await db.execute(
        `INSERT INTO investment_request_messages (request_id, sender_id, message)
         VALUES (?, ?, ?)`,
        [id, req.user.userId, 'Funding has been marked as completed by admin. Thank you.']
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
};

module.exports = investmentRequestController;
