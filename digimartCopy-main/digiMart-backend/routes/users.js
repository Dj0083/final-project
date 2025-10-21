const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const { uploadMultiple } = require('../utils/upload');

// Public routes
router.post('/register', uploadMultiple([
  { name: 'businessImage', maxCount: 1 },
  { name: 'idImage', maxCount: 1 },
  { name: 'bankProofImage', maxCount: 1 }
]), userController.register);

router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// Protected routes
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, uploadMultiple([
  { name: 'businessImage', maxCount: 1 },
  { name: 'idImage', maxCount: 1 },
  { name: 'bankProofImage', maxCount: 1 }
]), userController.updateProfile);

// Admin routes
router.get('/all', auth, userController.getAllUsers);
router.post('/:id/approve', auth, userController.approveUser);
router.post('/:id/reject', auth, userController.rejectUser);
router.post('/:id/suspend', auth, userController.suspendUser);
router.post('/:id/activate', auth, userController.activateUser);

module.exports = router;