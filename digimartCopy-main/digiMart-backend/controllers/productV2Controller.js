const { getDB } = require('../config/database');

exports.listProducts = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT id, product_name as name, description, price, image_url, created_at FROM products WHERE seller_id = ? ORDER BY created_at DESC`,
      [sellerId]
    );
    res.json({ success: true, products: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const { name, description, price, image_url } = req.body;
    if (!name || !price) return res.status(400).json({ success: false, error: 'name and price required' });
    const db = getDB();
    const [ins] = await db.execute(
      `INSERT INTO products (seller_id, product_name, description, price, image_url) VALUES (?, ?, ?, ?, ?)`,
      [sellerId, name, description || null, price, image_url || null]
    );
    res.status(201).json({ success: true, id: ins.insertId });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to add product' });
  }
};
