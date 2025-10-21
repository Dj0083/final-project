const { getDB } = require('../config/database');

// Vendor sends connection request to affiliate (alias)
exports.requestConnection = async (req, res) => {
  try {
    const db = getDB();
    const sellerId = req.user.userId;
    const { affiliate_user_id, message } = req.body;
    if (!affiliate_user_id) return res.status(400).json({ success: false, error: 'affiliate_user_id required' });

    const [existing] = await db.execute(
      `SELECT id, status FROM affiliate_partner_requests WHERE seller_id = ? AND affiliate_user_id = ?`,
      [sellerId, affiliate_user_id]
    );
    if (existing.length) return res.json({ success: true, request: existing[0], message: 'Request already exists' });

    const [ins] = await db.execute(
      `INSERT INTO affiliate_partner_requests (seller_id, affiliate_user_id, message) VALUES (?, ?, ?)`,
      [sellerId, affiliate_user_id, message || null]
    );

    res.status(201).json({ success: true, request: { id: ins.insertId, status: 'pending' } });
  } catch (e) {
    console.error('requestConnection error:', e);
    res.status(500).json({ success: false, error: 'Failed to request connection' });
  }
};

// Affiliate responds to request
exports.respondConnection = async (req, res) => {
  try {
    const db = getDB();
    const affiliateUserId = req.user.userId;
    const { request_id, action } = req.body; // action: 'accept' | 'reject'
    if (!request_id || !['accept','reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'request_id and valid action required' });
    }

    const status = action === 'accept' ? 'accepted' : 'rejected';
    const [result] = await db.execute(
      `UPDATE affiliate_partner_requests SET status = ?, responded_at = NOW() WHERE id = ? AND affiliate_user_id = ?`,
      [status, request_id, affiliateUserId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Request not found' });
    res.json({ success: true, status });
  } catch (e) {
    console.error('respondConnection error:', e);
    res.status(500).json({ success: false, error: 'Failed to respond to connection' });
  }
};
