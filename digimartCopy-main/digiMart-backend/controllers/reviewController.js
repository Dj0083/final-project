const Review = require('../models/Review');

// Create a new review
const createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!productId || !rating) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product ID and rating are required' 
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rating must be between 1 and 5' 
      });
    }

    // Check if user can review this product
    const canReview = await Review.canUserReview(userId, productId);
    
    // For testing: allow reviews if environment variable is set
    const allowWithoutPurchase = process.env.ALLOW_REVIEWS_WITHOUT_PURCHASE === 'true';
    
    if (!canReview.canReview && !allowWithoutPurchase) {
      if (!canReview.hasPurchased) {
        return res.status(400).json({ 
          success: false, 
          message: 'You can only review products you have purchased' 
        });
      }
      if (canReview.hasReviewed) {
        return res.status(400).json({ 
          success: false, 
          message: 'You have already reviewed this product' 
        });
      }
    }

    // If allowing without purchase, just check for existing review
    if (allowWithoutPurchase && canReview.hasReviewed) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already reviewed this product' 
      });
    }

    const reviewId = await Review.create({
      productId,
      userId,
      rating,
      comment: comment || ''
    });

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      reviewId
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create review'
    });
  }
};

// Get reviews for a product
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!productId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product ID is required' 
      });
    }

    const reviewsData = await Review.findByProductIdWithPagination(
      productId, 
      parseInt(page), 
      parseInt(limit)
    );

    // Get rating statistics and average
    const [avgRating, ratingStats] = await Promise.all([
      Review.getAverageRating(productId),
      Review.getRatingStats(productId)
    ]);

    console.log('Backend review stats:', { avgRating, ratingStats });

    res.json({
      success: true,
      data: {
        ...reviewsData,
        averageRating: avgRating.averageRating,
        totalReviews: avgRating.reviewCount,
        ratingStats
      }
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
};

// Get user's reviews
const getUserReviews = async (req, res) => {
  try {
    const userId = req.user.userId;

    const reviews = await Review.findByUserId(userId);

    res.json({
      success: true,
      reviews
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user reviews'
    });
  }
};

// Update a review
const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.userId;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid rating (1-5) is required' 
      });
    }

    const affectedRows = await Review.update(reviewId, userId, {
      rating,
      comment: comment || ''
    });

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or you do not have permission to update it'
      });
    }

    res.json({
      success: true,
      message: 'Review updated successfully'
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review'
    });
  }
};

// Delete a review
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.userId;

    const affectedRows = await Review.delete(reviewId, userId);

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or you do not have permission to delete it'
      });
    }

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review'
    });
  }
};

// Get product rating summary
const getProductRatingSummary = async (req, res) => {
  try {
    const { productId } = req.params;

    const [avgRating, ratingStats] = await Promise.all([
      Review.getAverageRating(productId),
      Review.getRatingStats(productId)
    ]);

    res.json({
      success: true,
      data: {
        averageRating: avgRating.averageRating,
        reviewCount: avgRating.reviewCount,
        ratingStats
      }
    });
  } catch (error) {
    console.error('Get rating summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rating summary'
    });
  }
};

// Check if user can review a product
const checkReviewEligibility = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.userId;

    const eligibility = await Review.canUserReview(userId, productId);

    res.json({
      success: true,
      data: eligibility
    });
  } catch (error) {
    console.error('Check review eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check review eligibility'
    });
  }
};

module.exports = {
  createReview,
  getProductReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  getProductRatingSummary,
  checkReviewEligibility
};