const { getDB } = require('../config/database');

const COMMISSION_RATE = 0.15;

exports.trackClick = async (req, res) => {
  try {
    const db = getDB();
    const { productId } = req.params;
    const { ref } = req.query; // affiliate_code
    if (!ref) return res.status(400).json({ success: false, error: 'ref (affiliate_code) required' });

    const [aff] = await db.execute('SELECT id FROM affiliates WHERE affiliate_code = ? AND status = "approved"', [ref]);
    if (!aff.length) return res.status(404).json({ success: false, error: 'Affiliate not found or not approved' });

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    await db.execute('INSERT INTO clicks (product_id, affiliate_id, ip) VALUES (?, ?, ?)', [productId, aff[0].id, ip]);

    // Cookie setting is for web; return instruction header
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ success: true });
  } catch (e) {
    console.error('trackClick error:', e);
    res.status(500).json({ success: false, error: 'Failed to track click' });
  }
};

exports.recordSale = async (req, res) => {
  try {
    const db = getDB();
    const { product_id, affiliate_code, amount } = req.body;
    if (!product_id || !affiliate_code || !amount) return res.status(400).json({ success: false, error: 'product_id, affiliate_code, amount required' });

    const [aff] = await db.execute('SELECT id FROM affiliates WHERE affiliate_code = ? AND status = "approved"', [affiliate_code]);
    if (!aff.length) return res.status(404).json({ success: false, error: 'Affiliate not found or not approved' });

    const commission = Number((Number(amount) * COMMISSION_RATE).toFixed(2));
    await db.execute('INSERT INTO sales (product_id, affiliate_id, amount, commission) VALUES (?, ?, ?, ?)', [product_id, aff[0].id, amount, commission]);

    // Upsert commissions rollup
    await db.execute('INSERT INTO commissions (affiliate_id, total_earned) VALUES (?, ?) ON DUPLICATE KEY UPDATE total_earned = total_earned + VALUES(total_earned)', [aff[0].id, commission]);

    return res.status(201).json({ success: true, commission });
  } catch (e) {
    console.error('recordSale error:', e);
    res.status(500).json({ success: false, error: 'Failed to record sale' });
  }
};
