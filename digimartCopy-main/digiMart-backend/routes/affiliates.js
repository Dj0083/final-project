const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/affiliateController');

router.post('/affiliate/register', ctrl.registerAffiliate);
router.get('/affiliate/approved', auth, ctrl.listApproved);
router.get('/affiliate/dashboard/:id', auth, ctrl.getDashboard);
router.get('/affiliate/my-code', auth, ctrl.getMyAffiliateCode);

module.exports = router;
