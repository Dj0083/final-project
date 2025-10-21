const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/affiliatePartnerController');

// Seller: send a request to an affiliate
router.post('/seller/affiliate/requests', auth, ctrl.sendRequest);
// Seller: list my outgoing requests
router.get('/seller/affiliate/requests', auth, ctrl.listSellerRequests);
// Seller: list partnered affiliates (accepted)
router.get('/seller/affiliate/partnered', auth, ctrl.listPartneredAffiliatesForSeller);
// Seller: utilities for a partnered request
router.get('/seller/affiliate/requests/:id/product-link', auth, ctrl.getProductLink);
router.get('/seller/affiliate/requests/:id/agreement', auth, ctrl.getAgreement);

// Affiliate: list incoming requests
router.get('/affiliate/requests', auth, ctrl.listAffiliateRequests);
// Affiliate: accept/reject
router.post('/affiliate/requests/:id/accept', auth, ctrl.acceptRequest);
router.post('/affiliate/requests/:id/reject', auth, ctrl.rejectRequest);

// Messages for both sides (must be participant)
router.get('/affiliate/requests/:id/messages', auth, ctrl.listMessages);
router.post('/affiliate/requests/:id/messages', auth, ctrl.sendMessage);
// Partner documents (both sides): list and upload
router.get('/affiliate/requests/:id/documents', auth, ctrl.listPartnerDocuments);
router.post('/affiliate/requests/:id/documents', auth, ctrl.uploadPartnerDocument);

module.exports = router;
