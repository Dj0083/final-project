const { getDB } = require('../config/database');

// Helper to run a query safely and return first row or null
async function safeCount(db, sql, params = []) {
  try {
    const [rows] = await db.execute(sql, params);
    const row = rows && rows[0] ? rows[0] : null;
    if (!row) return 0;
    const val = row.c || row.count || row.total || 0;
    return Number(val) || 0;
  } catch (e) {
    return 0;
  }
}

async function safeSum(db, sql, params = []) {
  try {
    const [rows] = await db.execute(sql, params);
    const row = rows && rows[0] ? rows[0] : null;
    if (!row) return 0;
    const keys = Object.keys(row);
    const key = keys[0];
    const val = row[key];
    return Number(val) || 0;
  } catch (e) {
    return 0;
  }
}

exports.getStats = async (req, res) => {
  try {
    const db = getDB();

    // Total users
    const totalUsers = await safeCount(db, 'SELECT COUNT(*) AS c FROM users');

    // Active users: best-effort. Prefer status='active'. If column missing, returns 0
    const activeUsers = await safeCount(db, 'SELECT COUNT(*) AS c FROM users WHERE status = "active"');

    // Total products
    const totalProducts = await safeCount(db, 'SELECT COUNT(*) AS c FROM products');

    // Today's orders (by created_at date)
    const todayOrders = await safeCount(db, 'SELECT COUNT(*) AS c FROM orders WHERE DATE(created_at) = CURDATE()');

    // Total revenue: try common column names
    let totalRevenue = await safeSum(db, 'SELECT SUM(total_amount) AS total FROM orders WHERE payment_status = "paid"');
    if (!totalRevenue) {
      totalRevenue = await safeSum(db, 'SELECT SUM(totalAmount) AS total FROM orders WHERE payment_status = "paid"');
    }
    if (!totalRevenue) {
      // fallback: sum all orders amounts regardless of status if payment_status not present
      totalRevenue = await safeSum(db, 'SELECT SUM(total_amount) AS total FROM orders');
      if (!totalRevenue) {
        totalRevenue = await safeSum(db, 'SELECT SUM(totalAmount) AS total FROM orders');
      }
    }

    return res.json({
      total_users: totalUsers,
      active_users: activeUsers,
      total_products: totalProducts,
      today_orders: todayOrders,
      total_revenue: totalRevenue,
    });
  } catch (error) {
    console.error('getStats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin stats' });
  }
};
