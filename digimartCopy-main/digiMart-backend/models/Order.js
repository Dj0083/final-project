const { getDB } = require('../config/database');

class Order {
  // Generate unique order number
  static generateOrderNumber() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp.slice(-6)}-${random}`;
  }

  // Create a new order
  static async create(orderData) {
    const db = getDB();
    const { userId, items, totalAmount, shippingAddress, paymentMethod, notes } = orderData;
    
    try {
      // Start transaction
      await db.query('START TRANSACTION');
      
      // Generate order number
      const orderNumber = this.generateOrderNumber();
      
      // Insert order
      const [orderResult] = await db.execute(
        `INSERT INTO orders (user_id, order_number, total_amount, shipping_address, payment_method, notes) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, orderNumber, totalAmount, shippingAddress, paymentMethod, notes || null]
      );
      
      const orderId = orderResult.insertId;
      
      // Insert order items and update product stock
      for (const item of items) {
        // Insert order item
        await db.execute(
          `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, subtotal) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderId, item.productId, item.productName, item.price, item.quantity, item.subtotal]
        );
        
        // Update product stock
        await db.execute(
          'UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?',
          [item.quantity, item.productId]
        );
      }
      
      // Commit transaction
      await db.query('COMMIT');
      
      return { orderId, orderNumber };
    } catch (error) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      throw error;
    }
  }

  // Get order by ID with items
  static async findById(orderId, userId = null) {
    const db = getDB();
    
    let query = `
      SELECT o.*, u.name as customer_name, u.email as customer_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `;
    const params = [orderId];
    
    if (userId) {
      query += ' AND o.user_id = ?';
      params.push(userId);
    }
    
    const [orders] = await db.execute(query, params);
    
    if (orders.length === 0) {
      return null;
    }
    
    const order = orders[0];
    
    // Get order items
    const [items] = await db.execute(
      `SELECT oi.*, p.images
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );
    
    order.items = items.map(item => {
      console.log('Order.js - Raw images for product', item.product_id, ':', item.images);
      
      let imageUrl = null;
      if (item.images) {
        try {
          // Handle both string and object formats
          const images = typeof item.images === 'string' ? JSON.parse(item.images) : item.images;
          console.log('Order.js - Parsed images:', images);
          
          if (Array.isArray(images) && images.length > 0) {
            imageUrl = images[0].path || images[0];
            console.log('Order.js - Extracted imageUrl:', imageUrl);
          }
        } catch (e) {
          console.error('Order.js - Error parsing images:', e);
        }
      } else {
        console.log('Order.js - No images found for product:', item.product_id);
      }
      
      return {
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
        imageUrl
      };
    });
    
    return order;
  }

  // Get all orders for a user
  static async findByUserId(userId, page = 1, limit = 10) {
    const db = getDB();
    const offset = (page - 1) * limit;
    
    // Use query instead of execute for LIMIT/OFFSET
    const [orders] = await db.query(
      `SELECT o.*, 
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as items_count
       FROM orders o
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );
    
    // Get total count
    const [countResult] = await db.execute(
      'SELECT COUNT(*) as total FROM orders WHERE user_id = ?',
      [userId]
    );
    
    return {
      orders,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  }

  // Get all orders (admin)
  static async findAll(page = 1, limit = 10, status = null) {
    const db = getDB();
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as items_count
      FROM orders o
      JOIN users u ON o.user_id = u.id
    `;
    const params = [];
    
    if (status) {
      query += ' WHERE o.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    // Use query instead of execute for LIMIT/OFFSET
    const [orders] = await db.query(query, params);
    
    // Get order items with images for each order
    for (let order of orders) {
      const [items] = await db.execute(`
        SELECT oi.*, p.images
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);
      
      order.items = items.map(item => {
        let imageUrl = null;
        if (item.images) {
          try {
            const images = typeof item.images === 'string' ? JSON.parse(item.images) : item.images;
            if (Array.isArray(images) && images.length > 0) {
              imageUrl = images[0].path || images[0];
            }
          } catch (e) {
            console.error('Error parsing images:', e);
          }
        }
        
        return {
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
          image: imageUrl
        };
      });
    }
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM orders o';
    const countParams = [];
    
    if (status) {
      countQuery += ' WHERE o.status = ?';
      countParams.push(status);
    }
    
    const [countResult] = await db.execute(countQuery, countParams);
    
    return {
      orders,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  }

  // Get orders for a specific seller
  static async findBySellerId(sellerId, page = 1, limit = 10, status = null) {
    const db = getDB();
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT DISTINCT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as items_count
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE p.seller_id = ?
    `;
    const params = [sellerId];
    
    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    // Use query instead of execute for LIMIT/OFFSET
    const [orders] = await db.query(query, params);
    
    // Get order items with images for each order (only items from this seller)
    for (let order of orders) {
      const [items] = await db.execute(`
        SELECT oi.*, p.images
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ? AND p.seller_id = ?
      `, [order.id, sellerId]);
      
      order.items = items.map(item => {
        let imageUrl = null;
        if (item.images) {
          try {
            const images = typeof item.images === 'string' ? JSON.parse(item.images) : item.images;
            if (Array.isArray(images) && images.length > 0) {
              imageUrl = images[0].path || images[0];
            }
          } catch (e) {
            console.error('Error parsing images:', e);
          }
        }
        
        return {
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
          image: imageUrl
        };
      });
    }
    
    // Get total count for this seller
    const [countResult] = await db.execute(`
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE p.seller_id = ?
      ${status ? 'AND o.status = ?' : ''}
    `, status ? [sellerId, status] : [sellerId]);
    
    return {
      orders,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  }

  // Update order status
  static async updateStatus(orderId, status, userId = null) {
    const db = getDB();
    
    let query = 'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const params = [status, orderId];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    const [result] = await db.execute(query, params);
    return result.affectedRows > 0;
  }

  // Update payment status
  static async updatePaymentStatus(orderId, paymentStatus, userId = null) {
    const db = getDB();
    
    let query = 'UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const params = [paymentStatus, orderId];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    const [result] = await db.execute(query, params);
    return result.affectedRows > 0;
  }

  // Cancel order and restore stock
  static async cancel(orderId, userId = null) {
    const db = getDB();
    
    try {
      await db.query('START TRANSACTION');
      
      // Get order items
      let orderQuery = `
        SELECT oi.product_id, oi.quantity
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.id = ?
      `;
      const orderParams = [orderId];
      
      if (userId) {
        orderQuery += ' AND o.user_id = ?';
        orderParams.push(userId);
      }
      
      const [items] = await db.execute(orderQuery, orderParams);
      
      if (items.length === 0) {
        await db.query('ROLLBACK');
        return false;
      }
      
      // Restore stock for each item
      for (const item of items) {
        await db.execute(
          'UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }
      
      // Update order status
      let updateQuery = 'UPDATE orders SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      const updateParams = [orderId];
      
      if (userId) {
        updateQuery += ' AND user_id = ?';
        updateParams.push(userId);
      }
      
      const [result] = await db.execute(updateQuery, updateParams);
      
      await db.query('COMMIT');
      return result.affectedRows > 0;
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  // Accept order (seller only for their products)
  static async acceptOrder(orderId, sellerId) {
    const db = getDB();
    
    try {
      await db.query('START TRANSACTION');
      
      // Check if seller has products in this order
      const [sellerItems] = await db.execute(`
        SELECT COUNT(*) as count
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ? AND p.seller_id = ?
      `, [orderId, sellerId]);
      
      if (sellerItems[0].count === 0) {
        await db.query('ROLLBACK');
        return { success: false, message: 'Order not found or no products belong to this seller' };
      }
      
      // Check current order status
      const [orders] = await db.execute(
        'SELECT status FROM orders WHERE id = ?',
        [orderId]
      );
      
      if (orders.length === 0) {
        await db.query('ROLLBACK');
        return { success: false, message: 'Order not found' };
      }
      
      const currentStatus = orders[0].status;
      if (currentStatus !== 'pending') {
        await db.query('ROLLBACK');
        return { success: false, message: `Cannot accept order with status: ${currentStatus}` };
      }
      
      // Update order status to confirmed
      const [result] = await db.execute(
        'UPDATE orders SET status = "confirmed", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [orderId]
      );
      
      await db.query('COMMIT');
      
      return { 
        success: result.affectedRows > 0, 
        message: result.affectedRows > 0 ? 'Order accepted successfully' : 'Failed to accept order'
      };
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  // Reject order (seller only for their products) - Simplified version
  static async rejectOrder(orderId, sellerId, reason = null) {
    const db = getDB();
    
    try {
      console.log('Order.rejectOrder - Starting with:', { orderId, sellerId, reason });
      
      // Basic validation
      if (!orderId || !sellerId) {
        return { success: false, message: 'Missing order ID or seller ID' };
      }

      const orderIdNum = parseInt(orderId);
      const sellerIdNum = parseInt(sellerId);
      
      if (isNaN(orderIdNum) || isNaN(sellerIdNum)) {
        return { success: false, message: 'Invalid ID format' };
      }
      
      // Start transaction
      await db.query('START TRANSACTION');
      
      // Step 1: Check if order exists and belongs to seller
      const [orderCheck] = await db.execute(`
        SELECT DISTINCT o.id, o.status
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE o.id = ? AND p.seller_id = ?
      `, [orderIdNum, sellerIdNum]);
      
      if (orderCheck.length === 0) {
        await db.query('ROLLBACK');
        return { success: false, message: 'Order not found or access denied' };
      }
      
      const currentStatus = orderCheck[0].status;
      console.log('Current order status:', currentStatus);
      
      // Step 2: Check if order can be rejected
      if (currentStatus !== 'pending' && currentStatus !== 'confirmed') {
        await db.query('ROLLBACK');
        return { success: false, message: `Cannot reject order with status: ${currentStatus}` };
      }
      
      // Step 3: Get items to restore stock
      const [items] = await db.execute(`
        SELECT oi.product_id, oi.quantity
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ? AND p.seller_id = ?
      `, [orderIdNum, sellerIdNum]);
      
      console.log('Found items to restore stock:', items.length);
      
      // Step 4: Restore stock
      for (const item of items) {
        await db.execute(
          'UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
        console.log(`Restored ${item.quantity} units to product ${item.product_id}`);
      }
      
      // Step 5: Update order status to rejected
      const [updateResult] = await db.execute(
        'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
        ['rejected', orderIdNum]
      );
      
      console.log('Order status update affected rows:', updateResult.affectedRows);
      
      // Step 6: Add rejection note (simple approach)
      if (reason && reason.trim()) {
        try {
          const noteText = `Rejected by seller: ${reason.trim()}`;
          await db.execute(
            'UPDATE orders SET notes = CONCAT(COALESCE(notes, ""), ?) WHERE id = ?',
            [`\n${noteText}`, orderIdNum]
          );
          console.log('Added rejection note');
        } catch (noteError) {
          console.warn('Failed to add note:', noteError.message);
          // Continue anyway - note is not critical
        }
      }
      
      // Commit transaction
      await db.query('COMMIT');
      console.log('Transaction committed successfully');
      
      return { 
        success: true, 
        message: 'Order rejected successfully' 
      };
      
    } catch (error) {
      console.error('Order.rejectOrder error:', error);
      
      try {
        await db.query('ROLLBACK');
        console.log('Transaction rolled back');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
      
      return { 
        success: false, 
        message: `Rejection failed: ${error.message}` 
      };
    }
  }

  // Get sales analytics for seller
  static async getSalesAnalytics(sellerId) {
    const db = getDB();
    
    try {
      console.log('═══════════════════════════════════════════════════════');
      console.log('📊 GETTING SALES ANALYTICS FOR SELLER ID:', sellerId);
      console.log('═══════════════════════════════════════════════════════');
      
      // Get total revenue and orders (all time)
      const [totalStats] = await db.execute(`
        SELECT 
          COUNT(DISTINCT o.id) as total_orders,
          COALESCE(SUM(oi.subtotal), 0) as total_revenue
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE p.seller_id = ?
          AND o.status NOT IN ('cancelled', 'rejected')
      `, [sellerId]);
      
      console.log('💰 TOTAL STATS (All Time):');
      console.log('   Total Orders:', totalStats[0].total_orders);
      console.log('   Total Revenue: LKR', totalStats[0].total_revenue);
      
      // Get current month sales
      const [thisMonthStats] = await db.execute(`
        SELECT 
          COUNT(DISTINCT o.id) as month_orders,
          COALESCE(SUM(oi.subtotal), 0) as month_revenue
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE p.seller_id = ?
          AND o.status NOT IN ('cancelled', 'rejected')
          AND YEAR(o.created_at) = YEAR(CURRENT_DATE)
          AND MONTH(o.created_at) = MONTH(CURRENT_DATE)
      `, [sellerId]);
      
      console.log('📅 THIS MONTH STATS:');
      console.log('   This Month Orders:', thisMonthStats[0].month_orders);
      console.log('   This Month Revenue: LKR', thisMonthStats[0].month_revenue);
      
      // Get monthly sales for last 6 months
      const [monthlySales] = await db.execute(`
        SELECT 
          DATE_FORMAT(o.created_at, '%b') as month,
          DATE_FORMAT(o.created_at, '%Y-%m') as month_key,
          COALESCE(SUM(oi.subtotal), 0) as revenue
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE p.seller_id = ?
          AND o.status NOT IN ('cancelled', 'rejected')
          AND o.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
        GROUP BY month_key, month
        ORDER BY month_key ASC
      `, [sellerId]);
      
      console.log('📊 MONTHLY SALES (Last 6 Months):');
      monthlySales.forEach(row => {
        console.log(`   ${row.month} (${row.month_key}): LKR ${row.revenue}`);
      });
      
      const analytics = {
        totalRevenue: parseFloat(totalStats[0].total_revenue || 0),
        totalOrders: parseInt(totalStats[0].total_orders || 0),
        thisMonthSales: parseFloat(thisMonthStats[0].month_revenue || 0),
        thisMonthOrders: parseInt(thisMonthStats[0].month_orders || 0),
        monthlySales: monthlySales.map(row => ({
          month: row.month,
          revenue: parseFloat(row.revenue || 0)
        }))
      };
      
      console.log('✅ ANALYTICS SUMMARY:');
      console.log('   ├─ Total Revenue: LKR', analytics.totalRevenue.toFixed(2));
      console.log('   ├─ Total Orders:', analytics.totalOrders);
      console.log('   ├─ This Month Sales: LKR', analytics.thisMonthSales.toFixed(2));
      console.log('   ├─ This Month Orders:', analytics.thisMonthOrders);
      console.log('   └─ Monthly Data Points:', analytics.monthlySales.length);
      console.log('═══════════════════════════════════════════════════════');
      
      return analytics;
    } catch (error) {
      console.error('❌ Error getting sales analytics:', error);
      throw error;
    }
  }

  // Get detailed sales report for seller
  static async getSalesReport(sellerId, startDate = null, endDate = null) {
    const db = getDB();
    
    try {
      console.log('═══════════════════════════════════════════════════════');
      console.log('📄 GENERATING SALES REPORT FOR SELLER ID:', sellerId);
      if (startDate || endDate) {
        console.log('   Date Range:', { startDate, endDate });
      } else {
        console.log('   Date Range: ALL TIME');
      }
      
      let dateFilter = '';
      const params = [sellerId];
      
      if (startDate && endDate) {
        dateFilter = 'AND o.created_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
      } else if (startDate) {
        dateFilter = 'AND o.created_at >= ?';
        params.push(startDate);
      } else if (endDate) {
        dateFilter = 'AND o.created_at <= ?';
        params.push(endDate);
      }
      
      const [report] = await db.execute(`
        SELECT 
          o.id,
          o.order_number,
          o.created_at,
          o.status,
          o.payment_status,
          u.name as customer_name,
          u.email as customer_email,
          u.phone as customer_phone,
          oi.product_name,
          oi.quantity,
          oi.price,
          oi.subtotal
        FROM orders o
        JOIN users u ON o.user_id = u.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE p.seller_id = ?
          AND o.status NOT IN ('cancelled', 'rejected')
          ${dateFilter}
        ORDER BY o.created_at DESC
      `, params);
      
      console.log('✅ REPORT GENERATED:');
      console.log('   Total Records:', report.length);
      if (report.length > 0) {
        const totalRevenue = report.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
        console.log('   Total Revenue in Report: LKR', totalRevenue.toFixed(2));
        console.log('   Sample Orders:');
        report.slice(0, 3).forEach((order, idx) => {
          console.log(`   ${idx + 1}. ${order.order_number} - ${order.product_name} x${order.quantity} = LKR ${order.subtotal}`);
        });
      } else {
        console.log('   ⚠️  No sales data found for this seller');
      }
      console.log('═══════════════════════════════════════════════════════');
      
      return report;
    } catch (error) {
      console.error('❌ Error getting sales report:', error);
      throw error;
    }
  }
}

module.exports = Order;