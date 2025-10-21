const express = require('express');
const router = express.Router();
const investorConnectionController = require('../controllers/investorConnectionController');
const auth = require('../middleware/auth');

// Investment Preferences Routes
router.post('/preferences', auth, investorConnectionController.saveInvestmentPreferences);
router.get('/preferences', auth, investorConnectionController.getInvestmentPreferences);

// Connection Routes
router.get('/all-with-preferences', auth, investorConnectionController.getAllInvestorsWithPreferences);
router.post('/request', auth, investorConnectionController.sendConnectionRequest);
router.get('/seller/connections', auth, investorConnectionController.getSellerConnections);
router.get('/investor/requests', auth, investorConnectionController.getInvestorConnectionRequests);
router.post('/respond', auth, investorConnectionController.respondToConnectionRequest);

// Pre-accept chat and documents for a connection (seller/investor)
router.get('/connections/:id/messages', auth, investorConnectionController.listConnectionMessages);
router.post('/connections/:id/messages', auth, investorConnectionController.postConnectionMessage);
router.get('/connections/:id/documents', auth, investorConnectionController.listConnectionDocuments);
router.post('/connections/:id/documents', auth, investorConnectionController.uploadConnectionDocument);

module.exports = router;
