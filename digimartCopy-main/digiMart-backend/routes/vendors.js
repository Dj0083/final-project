const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/vendorController');

router.post('/vendor/register', ctrl.registerVendor);

module.exports = router;
