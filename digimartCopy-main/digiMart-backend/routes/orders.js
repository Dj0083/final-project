const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Customer routes
router.post('/', orderController.createOrder);
router.get('/my-orders', orderController.getUserOrders);

// Seller routes
router.get('/seller', orderController.getSellerOrders);
router.get('/analytics', orderController.getSalesAnalytics); // Sales analytics
router.get('/sales-report', orderController.getSalesReport); // Detailed report

// Admin routes
router.get('/', orderController.getAllOrders); // This should come after specific routes

// Order details and actions
router.get('/:orderId', orderController.getOrderById);
router.get('/:orderId/items', orderController.getOrderItems);
router.patch('/:orderId/accept', orderController.acceptOrder);
router.patch('/:orderId/reject', orderController.rejectOrder);
router.patch('/:orderId/cancel', orderController.cancelOrder);
router.patch('/:orderId/payment-status', orderController.updatePaymentStatus);
router.patch('/:orderId/status', orderController.updateOrderStatus);

module.exports = router;