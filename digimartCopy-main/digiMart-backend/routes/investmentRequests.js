const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const investmentRequestController = require('../controllers/investmentRequestController');

// Static and collection routes first (to avoid :id capturing them)
// Pending agreements for notification badge
router.get('/pending-agreements/list', auth, investmentRequestController.listPendingAgreements);

// Messages (chat)
router.get('/:id/messages', auth, investmentRequestController.listMessages);
router.post('/:id/messages', auth, investmentRequestController.postMessage);

// Admin actions
router.post('/:id/approve', auth, investmentRequestController.approveRequest);
router.post('/:id/funded', auth, investmentRequestController.markFunded);
router.post('/:id/reject', auth, investmentRequestController.rejectRequest);

// Documents
router.get('/:id/documents', auth, investmentRequestController.listDocuments);
router.post('/:id/documents', auth, investmentRequestController.uploadDocument);

// Request details (place after more specific routes)
router.get('/:id', auth, investmentRequestController.getRequestById);

module.exports = router;
