const { getDB } = require('../config/database');

class Product {
  // Create a new product
  static async create(productData) {
    const db = getDB();
    const { sellerId, productName, description, category, price, stockQty, images } = productData;
    
    const [result] = await db.execute(
      'INSERT INTO products (seller_id, product_name, description, category, price, stock_qty, images) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [sellerId, productName, description, category, price, stockQty, images]
    );
    
    return result.insertId;
  }

  // Find all products with seller info (for marketplace)
  static async findAll() {
    const db = getDB();
    const [rows] = await db.execute(`
      SELECT p.*, u.name as seller_name,
        COALESCE(AVG(pr.rating), 0) as average_rating,
        COUNT(pr.id) as review_count
      FROM products p 
      LEFT JOIN users u ON p.seller_id = u.id 
      LEFT JOIN product_reviews pr ON p.id = pr.product_id
      WHERE p.status = 'active'
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    return rows;
  }

  // Find products by seller ID (for inventory)
  static async findBySellerId(sellerId) {
    const db = getDB();
    const [rows] = await db.execute(
      `SELECT p.* 
       FROM products p 
       WHERE p.seller_id = ? 
       AND p.status != 'deleted'
       ORDER BY p.created_at DESC`,
      [sellerId]
    );
    return rows;
  }

  // Find product by ID
  static async findById(productId) {
    const db = getDB();
    const [rows] = await db.execute(`
      SELECT p.*, u.name as seller_name, u.email as seller_email,
        COALESCE(AVG(pr.rating), 0) as average_rating,
        COUNT(pr.id) as review_count
      FROM products p 
      LEFT JOIN users u ON p.seller_id = u.id 
      LEFT JOIN product_reviews pr ON p.id = pr.product_id
      WHERE p.id = ?
      GROUP BY p.id
    `, [productId]);
    return rows[0];
  }

  // Update product
  static async update(productId, productData) {
    const db = getDB();
    
    // Build dynamic UPDATE query for partial updates
    const updateFields = [];
    const updateValues = [];
    
    if (productData.productName !== undefined) {
      updateFields.push('product_name = ?');
      updateValues.push(productData.productName);
    }
    if (productData.description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(productData.description);
    }
    if (productData.category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(productData.category);
    }
    if (productData.price !== undefined) {
      updateFields.push('price = ?');
      updateValues.push(productData.price);
    }
    if (productData.stockQty !== undefined) {
      updateFields.push('stock_qty = ?');
      updateValues.push(productData.stockQty);
    }
    if (productData.images !== undefined) {
      updateFields.push('images = ?');
      updateValues.push(JSON.stringify(productData.images));
    }
    
    // Always update timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    
    // If no fields to update, return
    if (updateFields.length === 1) {
      return 0;
    }
    
    // Add productId to values array
    updateValues.push(productId);
    
    const query = `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`;
    console.log('🔧 SQL Query:', query);
    console.log('🔧 Values:', updateValues);
    
    const [result] = await db.execute(query, updateValues);
    
    console.log('✅ Rows affected:', result.affectedRows);
    return result.affectedRows;
  }

  // Update product stock only
  static async updateStock(productId, stockQty) {
    const db = getDB();
    const [result] = await db.execute(
      'UPDATE products SET stock_qty = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [stockQty, productId]
    );
    return result.affectedRows;
  }

  // Update product status
  static async updateStatus(productId, status) {
    const db = getDB();
    const [result] = await db.execute(
      'UPDATE products SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, productId]
    );
    return result.affectedRows;
  }

  // Delete product (soft delete)
  static async delete(productId) {
    const db = getDB();
    const [result] = await db.execute(
      'UPDATE products SET status = "deleted", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [productId]
    );
    return result.affectedRows;
  }

  // Search products
  static async search(query) {
    const db = getDB();
    const searchTerm = `%${query}%`;
    const [rows] = await db.execute(`
      SELECT p.*, u.name as seller_name 
      FROM products p 
      LEFT JOIN users u ON p.seller_id = u.id 
      WHERE (p.product_name LIKE ? OR p.description LIKE ? OR p.category LIKE ?) 
      AND p.status = 'active'
      ORDER BY p.created_at DESC
    `, [searchTerm, searchTerm, searchTerm]);
    return rows;
  }

  // Get products by category
  static async findByCategory(category) {
    const db = getDB();
    const [rows] = await db.execute(`
      SELECT p.*, u.name as seller_name 
      FROM products p 
      LEFT JOIN users u ON p.seller_id = u.id 
      WHERE p.category = ? AND p.status = 'active'
      ORDER BY p.created_at DESC
    `, [category]);
    return rows;
  }

  // Get products with pagination (optional)
  static async findWithPagination(limit = 10, offset = 0) {
    const db = getDB();
    const [rows] = await db.execute(`
      SELECT p.*, u.name as seller_name 
      FROM products p 
      LEFT JOIN users u ON p.seller_id = u.id 
      WHERE p.status = 'active'
      ORDER BY p.created_at DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    return rows;
  }

  // Count total products (for pagination)
  static async count() {
    const db = getDB();
    const [rows] = await db.execute(
      'SELECT COUNT(*) as total FROM products WHERE status = "active"'
    );
    return rows[0].total;
  }

  // Get products by multiple categories
  static async findByCategories(categories) {
    const db = getDB();
    const placeholders = categories.map(() => '?').join(',');
    const [rows] = await db.execute(`
      SELECT p.*, u.name as seller_name 
      FROM products p 
      LEFT JOIN users u ON p.seller_id = u.id 
      WHERE p.category IN (${placeholders}) AND p.status = 'active'
      ORDER BY p.created_at DESC
    `, categories);
    return rows;
  }

  // Get featured products (you can define your own logic)
  static async findFeatured() {
    const db = getDB();
    const [rows] = await db.execute(`
      SELECT p.*, u.name as seller_name 
      FROM products p 
      LEFT JOIN users u ON p.seller_id = u.id 
      WHERE p.status = 'active'
      ORDER BY p.created_at DESC 
      LIMIT 10
    `);
    return rows;
  }

  // Check if product belongs to seller
  static async belongsToSeller(productId, sellerId) {
    const db = getDB();
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM products WHERE id = ? AND seller_id = ?',
      [productId, sellerId]
    );
    return rows[0].count > 0;
  }

  // Get low stock products for a seller
  static async findLowStock(sellerId, threshold = 5) {
    const db = getDB();
    const [rows] = await db.execute(`
      SELECT * FROM products 
      WHERE seller_id = ? AND stock_qty <= ? AND status = 'active'
      ORDER BY stock_qty ASC
    `, [sellerId, threshold]);
    return rows;
  }
}

module.exports = Product;