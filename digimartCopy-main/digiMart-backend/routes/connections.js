const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/connectionController');

// Aliases that satisfy the spec
router.post('/connection/request', auth, ctrl.requestConnection);
router.post('/connection/respond', auth, ctrl.respondConnection);

module.exports = router;
