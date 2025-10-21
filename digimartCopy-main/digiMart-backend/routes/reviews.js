const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createReview,
  getProductReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  getProductRatingSummary,
  checkReviewEligibility
} = require('../controllers/reviewController');

// Public routes (no authentication required)
router.get('/product/:productId', getProductReviews);
router.get('/product/:productId/summary', getProductRatingSummary);

// Protected routes (authentication required)
router.post('/', auth, createReview);
router.get('/my-reviews', auth, getUserReviews);
router.put('/:reviewId', auth, updateReview);
router.delete('/:reviewId', auth, deleteReview);
router.get('/can-review/:productId', auth, checkReviewEligibility);

module.exports = router;