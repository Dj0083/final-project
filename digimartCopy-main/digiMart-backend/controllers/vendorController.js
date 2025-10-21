const { getDB } = require('../config/database');
const User = require('../models/User');

exports.registerVendor = async (req, res) => {
  try {
    const db = getDB();
    const { name, email, password, business_name } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) return res.status(400).json({ success: false, error: 'Email already registered' });

    const userId = await User.create({ name, email, password, role: 'seller' });
    await db.execute(
      `INSERT INTO sellers (user_id, business_name, status, created_at, updated_at) VALUES (?, ?, 'pending', NOW(), NOW())`,
      [userId, business_name || name]
    );

    res.status(201).json({ success: true, user_id: userId, status: 'pending' });
  } catch (e) {
    console.error('registerVendor error:', e);
    res.status(500).json({ success: false, error: 'Failed to register vendor' });
  }
};
