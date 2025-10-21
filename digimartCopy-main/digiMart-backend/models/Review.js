const { getDB } = require('../config/database');

class Review {
  // Create a new review
  static async create(reviewData) {
    const db = getDB();
    const { productId, userId, rating, comment } = reviewData;
    
    // Check if user has already reviewed this product
    const [existingReview] = await db.execute(
      'SELECT id FROM reviews WHERE product_id = ? AND user_id = ?',
      [productId, userId]
    );
    
    if (existingReview.length > 0) {
      throw new Error('You have already reviewed this product');
    }
    
    const [result] = await db.execute(
      'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
      [productId, userId, rating, comment]
    );
    
    return result.insertId;
  }

  // Get all reviews for a product
  static async findByProductId(productId) {
    const db = getDB();
    const [rows] = await db.execute(`
      SELECT pr.*, u.name as user_name 
      FROM reviews pr 
      LEFT JOIN users u ON pr.user_id = u.id 
      WHERE pr.product_id = ?
      ORDER BY pr.created_at DESC
    `, [productId]);
    return rows;
  }

  // Get review by ID
  static async findById(reviewId) {
    const db = getDB();
    const [rows] = await db.execute(`
      SELECT pr.*, u.name as user_name 
      FROM reviews pr 
      LEFT JOIN users u ON pr.user_id = u.id 
      WHERE pr.id = ?
    `, [reviewId]);
    return rows[0];
  }

  // Get reviews by user
  static async findByUserId(userId) {
    const db = getDB();
    const [rows] = await db.execute(`
      SELECT pr.*, p.product_name, p.images 
      FROM reviews pr 
      LEFT JOIN products p ON pr.product_id = p.id 
      WHERE pr.user_id = ?
      ORDER BY pr.created_at DESC
    `, [userId]);
    return rows;
  }

  // Update a review
  static async update(reviewId, userId, reviewData) {
    const db = getDB();
    const { rating, comment } = reviewData;
    
    const [result] = await db.execute(
      'UPDATE reviews SET rating = ?, comment = ? WHERE id = ? AND user_id = ?',
      [rating, comment, reviewId, userId]
    );
    
    return result.affectedRows;
  }

  // Delete a review
  static async delete(reviewId, userId) {
    const db = getDB();
    const [result] = await db.execute(
      'DELETE FROM reviews WHERE id = ? AND user_id = ?',
      [reviewId, userId]
    );
    return result.affectedRows;
  }

  // Get average rating for a product
  static async getAverageRating(productId) {
    const db = getDB();
    const [rows] = await db.execute(`
      SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as review_count
      FROM reviews 
      WHERE product_id = ?
    `, [productId]);
    
    return {
      averageRating: rows[0].average_rating ? parseFloat(rows[0].average_rating).toFixed(1) : 0,
      reviewCount: rows[0].review_count
    };
  }

  // Get rating statistics for a product
  static async getRatingStats(productId) {
    const db = getDB();
    const [rows] = await db.execute(`
      SELECT 
        rating,
        COUNT(*) as count
      FROM reviews 
      WHERE product_id = ?
      GROUP BY rating
      ORDER BY rating DESC
    `, [productId]);
    
    // Initialize all ratings to 0
    const stats = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    
    // Fill in actual counts
    rows.forEach(row => {
      stats[row.rating] = row.count;
    });
    
    return stats;
  }

  // Check if user can review product (has purchased it)
  static async canUserReview(userId, productId) {
    const db = getDB();
    
    // Check if user has purchased this product
    const [orders] = await db.execute(`
      SELECT COUNT(*) as count
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = ? AND oi.product_id = ? AND o.status IN ('delivered', 'confirmed')
    `, [userId, productId]);
    
    // Check if user has already reviewed
    const [existing] = await db.execute(
      'SELECT COUNT(*) as count FROM reviews WHERE product_id = ? AND user_id = ?',
      [productId, userId]
    );
    
    // For testing: Allow reviews even without purchases (set ALLOW_REVIEWS_WITHOUT_PURCHASE=true in .env)
    const allowWithoutPurchase = process.env.ALLOW_REVIEWS_WITHOUT_PURCHASE === 'true';
    
    return {
      canReview: allowWithoutPurchase ? existing[0].count === 0 : (orders[0].count > 0 && existing[0].count === 0),
      hasPurchased: orders[0].count > 0,
      hasReviewed: existing[0].count > 0
    };
  }

  // Get reviews with pagination
  static async findByProductIdWithPagination(productId, page = 1, limit = 10) {
    const db = getDB();
    const offset = (page - 1) * limit;
    
    const [reviews] = await db.query(`
      SELECT pr.*, u.name as user_name 
      FROM reviews pr 
      LEFT JOIN users u ON pr.user_id = u.id 
      WHERE pr.product_id = ?
      ORDER BY pr.created_at DESC
      LIMIT ? OFFSET ?
    `, [productId, parseInt(limit), parseInt(offset)]);
    
    const [countResult] = await db.execute(
      'SELECT COUNT(*) as total FROM reviews WHERE product_id = ?',
      [productId]
    );
    
    return {
      reviews,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  }
}

module.exports = Review;