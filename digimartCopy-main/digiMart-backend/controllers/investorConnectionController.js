const { getDB } = require('../config/database');
const { upload } = require('../utils/upload');

// Helper to wrap multer middleware as a promise
const runMulter = (req, res, middleware) =>
  new Promise((resolve, reject) => {
    middleware(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

const investorConnectionController = {
  // Save investor's investment preferences
  saveInvestmentPreferences: async (req, res) => {
    try {
      const userId = req.user.userId;
      
      // Support both camelCase (frontend) and snake_case (direct API) formats
      const min_investment = req.body.min_investment || req.body.minAmount;
      const max_investment = req.body.max_investment || req.body.maxAmount;
      const categories = req.body.categories || req.body.industries;
      const regions = req.body.regions;
      const risk_level = req.body.risk_level || req.body.riskLevel;

      console.log('Saving preferences for user:', userId);
      console.log('Preferences data:', { min_investment, max_investment, categories, regions, risk_level });

      const db = getDB();

      // Check if preferences already exist
      const [existing] = await db.execute(
        'SELECT id FROM investment_preferences WHERE user_id = ?',
        [userId]
      );

      if (existing.length > 0) {
        // Update existing preferences
        await db.execute(
          `UPDATE investment_preferences 
           SET min_investment = ?, max_investment = ?, categories = ?, regions = ?, risk_level = ?
           WHERE user_id = ?`,
          [min_investment, max_investment, categories, regions, risk_level, userId]
        );
        console.log('✅ Preferences updated for user:', userId);
      } else {
        // Insert new preferences
        await db.execute(
          `INSERT INTO investment_preferences 
           (user_id, min_investment, max_investment, categories, regions, risk_level)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, min_investment, max_investment, categories, regions, risk_level]
        );
        console.log('✅ Preferences created for user:', userId);
      }

      // Fetch and return the saved preferences
      const [saved] = await db.execute(
        'SELECT * FROM investment_preferences WHERE user_id = ?',
        [userId]
      );

      res.json({
        success: true,
        message: 'Investment preferences saved successfully',
        preferences: {
          minAmount: saved[0].min_investment,
          maxAmount: saved[0].max_investment,
          industries: saved[0].categories,
          regions: saved[0].regions,
          riskLevel: saved[0].risk_level
        }
      });
    } catch (error) {
      console.error('❌ Error saving investment preferences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save investment preferences',
        details: error.message
      });
    }
  },

  // Get investor's investment preferences
  getInvestmentPreferences: async (req, res) => {
    try {
      const userId = req.user.userId;
      const db = getDB();

      console.log('Fetching preferences for user:', userId);

      const [preferences] = await db.execute(
        'SELECT * FROM investment_preferences WHERE user_id = ?',
        [userId]
      );

      if (preferences.length === 0) {
        console.log('No preferences found for user:', userId);
        return res.json({
          success: true,
          preferences: null
        });
      }

      const pref = preferences[0];
      console.log('✅ Preferences found:', pref);

      // Return in frontend-friendly format
      res.json({
        success: true,
        minAmount: pref.min_investment,
        maxAmount: pref.max_investment,
        industries: pref.categories,
        regions: pref.regions,
        riskLevel: pref.risk_level
      });
    } catch (error) {
      console.error('❌ Error fetching investment preferences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch investment preferences',
        details: error.message
      });
    }
  },

  // Get all investors with their preferences (for sellers)
  getAllInvestorsWithPreferences: async (req, res) => {
    try {
      const db = getDB();

      const query = `
        SELECT 
          u.id,
          u.name as full_name,
          u.email,
          u.phone,
          u.address,
          ip.min_investment,
          ip.max_investment,
          ip.categories,
          ip.regions,
          ip.risk_level,
          i.status as approval_status
        FROM users u
        INNER JOIN investors i ON u.id = i.user_id
        LEFT JOIN investment_preferences ip ON u.id = ip.user_id
        WHERE LOWER(i.status) = 'approved'
        ORDER BY u.created_at DESC
      `;

      const [investors] = await db.execute(query);

      res.json({
        success: true,
        investors: investors.map(inv => ({
          ...inv,
          categories: inv.categories ? inv.categories.split(',') : [],
          regions: inv.regions ? inv.regions.split(',') : []
        }))
      });
    } catch (error) {
      console.error('Error fetching investors:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch investors'
      });
    }
  },

  // Send connection request from seller to investor
  sendConnectionRequest: async (req, res) => {
    try {
      const sellerId = req.user.userId;
      const { investor_id, notes } = req.body;

      if (!investor_id) {
        return res.status(400).json({
          success: false,
          error: 'Investor ID is required'
        });
      }

      const db = getDB();

      // Check if seller
      const [seller] = await db.execute(
        'SELECT role FROM users WHERE id = ?',
        [sellerId]
      );

      if (seller.length === 0 || seller[0].role !== 'seller') {
        return res.status(403).json({
          success: false,
          error: 'Only sellers can send connection requests'
        });
      }

      // Check if connection already exists
      const [existing] = await db.execute(
        'SELECT id, status FROM investor_seller_connections WHERE seller_id = ? AND investor_id = ?',
        [sellerId, investor_id]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Connection request already ${existing[0].status}`
        });
      }

      // Create connection request
      const [result] = await db.execute(
        `INSERT INTO investor_seller_connections 
         (seller_id, investor_id, status, notes)
         VALUES (?, ?, 'pending', ?)`,
        [sellerId, investor_id, notes || null]
      );

      res.json({
        success: true,
        message: 'Connection request sent successfully',
        connection_id: result.insertId
      });
    } catch (error) {
      console.error('Error sending connection request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send connection request'
      });
    }
  },

  // Get seller's connection requests and their status
  getSellerConnections: async (req, res) => {
    try {
      const sellerId = req.user.userId;
      const { status } = req.query; // pending, accepted, rejected, or all
      const db = getDB();

      let query = `
        SELECT 
          isc.*,
          u.name as investor_name,
          u.email as investor_email,
          u.phone as investor_phone,
          ip.min_investment,
          ip.max_investment,
          ip.categories,
          ip.regions,
          ip.risk_level
        FROM investor_seller_connections isc
        JOIN users u ON isc.investor_id = u.id
        LEFT JOIN investment_preferences ip ON u.id = ip.user_id
        WHERE isc.seller_id = ?
      `;

      const params = [sellerId];

      if (status && status !== 'all') {
        query += ' AND isc.status = ?';
        params.push(status);
      }

      query += ' ORDER BY isc.created_at DESC';

      const [connections] = await db.execute(query, params);

      res.json({
        success: true,
        connections: connections.map(conn => ({
          ...conn,
          categories: conn.categories ? conn.categories.split(',') : [],
          regions: conn.regions ? conn.regions.split(',') : []
        }))
      });
    } catch (error) {
      console.error('Error fetching seller connections:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch connections'
      });
    }
  },

  // Get investor's connection requests (investors see who wants to connect)
  getInvestorConnectionRequests: async (req, res) => {
    try {
      const investorId = req.user.userId;
      const { status } = req.query;
      const db = getDB();

      let query = `
        SELECT 
          isc.*,
          u.name as seller_name,
          u.email as seller_email,
          u.phone as seller_phone,
          s.business_name,
          s.business_address
        FROM investor_seller_connections isc
        JOIN users u ON isc.seller_id = u.id
        LEFT JOIN sellers s ON u.id = s.user_id
        WHERE isc.investor_id = ?
      `;

      const params = [investorId];

      if (status && status !== 'all') {
        query += ' AND isc.status = ?';
        params.push(status);
      }

      query += ' ORDER BY isc.created_at DESC';

      const [requests] = await db.execute(query, params);

      res.json({
        success: true,
        requests
      });
    } catch (error) {
      console.error('Error fetching investor requests:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch requests'
      });
    }
  },

  // Investor accepts/rejects connection request
  respondToConnectionRequest: async (req, res) => {
    try {
      const investorId = req.user.userId;
      const { connection_id, status } = req.body; // status: 'accepted' or 'rejected'

      if (!connection_id || !['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Valid connection ID and status (accepted/rejected) required'
        });
      }

      const db = getDB();

      // Verify connection belongs to this investor
      const [connection] = await db.execute(
        'SELECT * FROM investor_seller_connections WHERE id = ? AND investor_id = ?',
        [connection_id, investorId]
      );

      if (connection.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Connection request not found'
        });
      }

      if (connection[0].status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: `Connection already ${connection[0].status}`
        });
      }

      // Update connection status
      await db.execute(
        'UPDATE investor_seller_connections SET status = ?, responded_at = NOW() WHERE id = ?',
        [status, connection_id]
      );

      res.json({
        success: true,
        message: `Connection request ${status} successfully`
      });
    } catch (error) {
      console.error('Error responding to connection request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to respond to connection request'
      });
    }
  }
};

// Connection-level chat and documents (pre-accept)
investorConnectionController.listConnectionMessages = async (req, res) => {
  try {
    const { id } = req.params; // connection id
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT m.id, m.connection_id, m.sender_id, u.name AS sender_name, m.message, m.created_at
       FROM connection_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.connection_id = ?
       ORDER BY m.created_at ASC`,
      [id]
    );
    res.json({ success: true, messages: rows });
  } catch (error) {
    console.error('listConnectionMessages error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
};

investorConnectionController.postConnectionMessage = async (req, res) => {
  try {
    const { id } = req.params; // connection id
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Message is required' });
    const db = getDB();
    await db.execute(
      `INSERT INTO connection_messages (connection_id, sender_id, message)
       VALUES (?, ?, ?)`,
      [id, req.user.userId, message]
    );
    res.json({ success: true, message: 'Message sent' });
  } catch (error) {
    console.error('postConnectionMessage error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
};

investorConnectionController.listConnectionDocuments = async (req, res) => {
  try {
    const { id } = req.params; // connection id
    const db = getDB();
    const [docs] = await db.execute(
      `SELECT id, connection_id, user_id, doc_type, file_path, mime_type, created_at
       FROM connection_documents
       WHERE connection_id = ?
       ORDER BY created_at DESC`,
      [id]
    );
    res.json({ success: true, documents: docs });
  } catch (error) {
    console.error('listConnectionDocuments error:', error);
    res.status(500).json({ success: false, error: 'Failed to list documents' });
  }
};

investorConnectionController.uploadConnectionDocument = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params; // connection id
    // IMPORTANT: run multer BEFORE reading req.body for multipart/form-data
    await runMulter(req, res, upload.single('document'));
    const { doc_type } = req.body || {};
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const filePath = `/uploads/${req.file.filename}`;
    const mimeType = req.file.mimetype;
    const db = getDB();
    await db.execute(
      `INSERT INTO connection_documents (connection_id, user_id, doc_type, file_path, mime_type)
       VALUES (?, ?, ?, ?, ?)`,
      [id, userId, doc_type || 'other', filePath, mimeType]
    );
    res.json({ success: true, message: 'Document uploaded', file: { file_path: filePath, mime_type: mimeType } });
  } catch (error) {
    console.error('uploadConnectionDocument error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload document' });
  }
};

module.exports = investorConnectionController;
