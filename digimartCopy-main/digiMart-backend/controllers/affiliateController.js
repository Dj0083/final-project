const { getDB } = require('../config/database');
const User = require('../models/User');

const genCode = async (db) => {
  // generate AFFxxx unique code
  let code; let tries = 0;
  while (tries++ < 10) {
    const n = Math.floor(100 + Math.random() * 900);
    code = `AFF${n}`;
    const [rows] = await db.execute('SELECT id FROM affiliates WHERE affiliate_code = ?', [code]);
    if (rows.length === 0) return code;
  }
  return `AFF${Date.now().toString().slice(-3)}`;
};

// Return current user's affiliate_code (generate if missing)
exports.getMyAffiliateCode = async (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.userId;
    // Ensure user exists and is affiliate
    const [urows] = await db.execute('SELECT role FROM users WHERE id = ?', [userId]);
    if (urows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const role = (urows[0].role || '').toLowerCase();
    if (role !== 'affiliate') {
      return res.status(403).json({ success: false, error: 'Not an affiliate user' });
    }

    const [rows] = await db.execute('SELECT id, affiliate_code FROM affiliates WHERE user_id = ?', [userId]);
    if (rows.length === 0) {
      // If no affiliate row, create one minimal approved or pending? Use pending minimal.
      const affiliate_code = await genCode(db);
      await db.execute(
        `INSERT INTO affiliates (user_id, website_url, affiliate_type, status, agreed_to_terms, created_at, updated_at, description, social_links, affiliate_code)
         VALUES (?, NULL, 'general', 'approved', 1, NOW(), NOW(), '', '{}', ?)`,
        [userId, affiliate_code]
      );
      return res.json({ success: true, affiliate_code });
    }
    let { id: affiliateId, affiliate_code } = rows[0];
    if (!affiliate_code) {
      affiliate_code = await genCode(db);
      await db.execute('UPDATE affiliates SET affiliate_code = ? WHERE id = ?', [affiliate_code, affiliateId]);
    }
    res.json({ success: true, affiliate_code });
  } catch (e) {
    console.error('getMyAffiliateCode error:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch affiliate code' });
  }
};

exports.registerAffiliate = async (req, res) => {
  try {
    const db = getDB();
    const { name, email, password, phone, social_links, promotion_strategy, description } = req.body;

    // Create user with role affiliate
    const existing = await User.findByEmail(email);
    if (existing) return res.status(400).json({ success: false, error: 'Email already registered' });

    const userId = await User.create({ name, email, password, phone, role: 'affiliate' });
    const affiliate_code = await genCode(db);

    await db.execute(
      `INSERT INTO affiliates (user_id, website_url, affiliate_type, status, agreed_to_terms, created_at, updated_at, description, social_links, affiliate_code)
       VALUES (?, NULL, ?, 'pending', 0, NOW(), NOW(), ?, ?, ?)`,
      [userId, promotion_strategy || 'general', description || '', JSON.stringify(social_links || {}), affiliate_code]
    );

    res.status(201).json({ success: true, user_id: userId, affiliate_code, status: 'pending' });
  } catch (e) {
    console.error('registerAffiliate error:', e);
    res.status(500).json({ success: false, error: 'Failed to register affiliate' });
  }
};

exports.listApproved = async (req, res) => {
  try {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT a.id as affiliate_id, u.id as user_id, u.name, u.email, a.description, a.social_links, a.affiliate_code
       FROM affiliates a JOIN users u ON a.user_id = u.id
       WHERE a.status = 'approved'
       ORDER BY a.created_at DESC`
    );
    const data = rows.map(r => ({
      affiliate_id: r.affiliate_id,
      user_id: r.user_id,
      name: r.name,
      email: r.email,
      description: r.description || '',
      social_links: (() => { try { return JSON.parse(r.social_links || '{}'); } catch { return {}; } })(),
      affiliate_code: r.affiliate_code
    }));
    res.json({ success: true, affiliates: data });
  } catch (e) {
    console.error('listApproved error:', e);
    res.status(500).json({ success: false, error: 'Failed to fetch affiliates' });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params; // affiliate id (affiliates table id)

    const [[clicksRow]] = await db.query('SELECT COUNT(*) as clicks FROM clicks WHERE affiliate_id = ?', [id]);
    const [[salesRow]] = await db.query('SELECT COUNT(*) as sales, COALESCE(SUM(commission),0) as commission FROM sales WHERE affiliate_id = ?', [id]);

    const [monthly] = await db.query(
      `SELECT DATE_FORMAT(date, '%Y-%m') as month, COALESCE(SUM(commission),0) as commission
       FROM sales WHERE affiliate_id = ?
       GROUP BY DATE_FORMAT(date, '%Y-%m')
       ORDER BY month DESC LIMIT 12`, [id]
    );

    res.json({ success: true, stats: {
      total_clicks: clicksRow.clicks || 0,
      total_sales: salesRow.sales || 0,
      total_commission: Number(salesRow.commission || 0),
      monthly
    }});
  } catch (e) {
    console.error('getDashboard error:', e);
    res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
};
