const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/productV2Controller');

router.get('/products', auth, ctrl.listProducts);
router.post('/products/add', auth, ctrl.addProduct);

module.exports = router;
