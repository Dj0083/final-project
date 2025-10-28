const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminCtrl = require('../controllers/adminController');

// Admin stats (requires authenticated admin)
router.get('/stats', auth, async (req, res, next) => {
  try {
    // If role exists and isn't admin, block
    if (req.user && req.user.role && String(req.user.role).toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    await adminCtrl.getStats(req, res);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
