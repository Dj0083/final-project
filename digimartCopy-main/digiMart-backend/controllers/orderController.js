const Order = require('../models/Order');
const { getDB } = require('../config/database');

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { items, shippingAddress, paymentMethod, notes } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    if (!shippingAddress) {
      return res.status(400).json({ error: 'Shipping address is required' });
    }

    // Validate and calculate total
    let totalAmount = 0;
    const db = getDB();

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({ error: 'Invalid item data' });
      }

      // Check product exists and has enough stock
      const [products] = await db.execute(
        'SELECT id, product_name, price, stock_qty FROM products WHERE id = ? AND status = "active"',
        [item.productId]
      );

      if (products.length === 0) {
        return res.status(400).json({ error: `Product with ID ${item.productId} not found` });
      }

      const product = products[0];

      if (product.stock_qty < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${product.product_name}. Available: ${product.stock_qty}` 
        });
      }

      // Add product details to item
      item.productName = product.product_name;
      item.price = parseFloat(product.price);
      item.subtotal = item.price * item.quantity;
      totalAmount += item.subtotal;
    }

    // Create order
    const orderData = {
      userId,
      items,
      totalAmount,
      shippingAddress,
      paymentMethod: paymentMethod || 'cash_on_delivery',
      notes
    };

    console.log('Creating order with data:', JSON.stringify(orderData, null, 2));
    const { orderId, orderNumber } = await Order.create(orderData);
    console.log('Order created successfully:', { orderId, orderNumber });

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: orderId,
        orderNumber,
        totalAmount
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's orders
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await Order.findByUserId(userId, page, limit);

    res.json({
      orders: result.orders,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single order details
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Admin can see any order, users can only see their own
    const order = await Order.findById(
      orderId, 
      userRole === 'admin' ? null : userId
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update order status (admin/seller)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userRole = req.user.role;

    // Only admin can update order status
    if (userRole !== 'admin' && userRole !== 'seller') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await Order.updateStatus(orderId, status);

    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Users can only cancel their own orders, admin can cancel any
    const cancelled = await Order.cancel(
      orderId, 
      userRole === 'admin' ? null : userId
    );

    if (!cancelled) {
      return res.status(404).json({ error: 'Order not found or cannot be cancelled' });
    }

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all orders (admin only)
exports.getAllOrders = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || null;

    const result = await Order.findAll(page, limit, status);

    res.json({
      orders: result.orders,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get seller orders (seller only)
exports.getSellerOrders = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.userId;

    if (userRole !== 'seller') {
      return res.status(403).json({ error: 'Access denied. Seller role required.' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || null;

    console.log('Fetching orders for seller:', userId);

    const result = await Order.findBySellerId(userId, page, limit, status);

    console.log('Seller orders found:', result.orders.length);

    res.json({
      success: true,
      orders: result.orders,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    console.error('Get seller orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    // Users can update their own orders, admin can update any
    const updated = await Order.updatePaymentStatus(
      orderId, 
      paymentStatus,
      userRole === 'admin' ? null : userId
    );

    if (!updated) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Payment status updated successfully' });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get order items with product details
exports.getOrderItems = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const db = getDB();

    // First verify the order exists and belongs to user (unless admin)
    const [orders] = await db.execute(
      userRole === 'admin' 
        ? 'SELECT id FROM orders WHERE id = ?'
        : 'SELECT id FROM orders WHERE id = ? AND user_id = ?',
      userRole === 'admin' ? [orderId] : [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order items with product details and images
    const [items] = await db.execute(`
      SELECT 
        oi.id,
        oi.product_id,
        oi.quantity,
        oi.price,
        oi.subtotal,
        p.product_name,
        p.description,
        p.images
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
      ORDER BY oi.id
    `, [orderId]);

    res.json({
      success: true,
      items: items.map(item => {
        // Debug: Log the raw images data
        console.log('Raw images data for product', item.product_id, ':', item.images);
        console.log('Images type:', typeof item.images);
        
        // Parse images JSON and get first image path
        let imagePath = null;
        try {
          if (item.images) {
            const images = typeof item.images === 'string' ? JSON.parse(item.images) : item.images;
            console.log('Parsed images:', images);
            
            if (Array.isArray(images) && images.length > 0) {
              imagePath = images[0].path || images[0];
              console.log('Extracted image path:', imagePath);
            } else {
              console.log('Images is not an array or is empty');
            }
          } else {
            console.log('No images field found for product:', item.product_id);
          }
        } catch (error) {
          console.log('Error parsing images for product:', item.product_id, error.message);
        }

        return {
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          description: item.description,
          quantity: item.quantity,
          price: parseFloat(item.price),
          subtotal: parseFloat(item.subtotal),
          image: imagePath
        };
      })
    });
  } catch (error) {
    console.error('Get order items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Accept order (seller only)
exports.acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Only sellers can accept orders
    if (userRole !== 'seller') {
      return res.status(403).json({ error: 'Access denied. Only sellers can accept orders.' });
    }

    console.log('Seller', userId, 'attempting to accept order', orderId);

    const result = await Order.acceptOrder(orderId, userId);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    console.log('Order accepted successfully:', result.message);

    res.json({ 
      success: true, 
      message: result.message 
    });
  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reject order (seller only)
exports.rejectOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    console.log('orderController.rejectOrder - Request params:', { 
      orderId, 
      reason, 
      userId, 
      userRole,
      body: req.body,
      params: req.params
    });

    // Only sellers can reject orders
    if (userRole !== 'seller') {
      console.log('orderController.rejectOrder - Access denied, not a seller');
      return res.status(403).json({ error: 'Access denied. Only sellers can reject orders.' });
    }

    // Validate orderId
    if (!orderId || isNaN(parseInt(orderId))) {
      console.log('orderController.rejectOrder - Invalid orderId:', orderId);
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    console.log('Seller', userId, 'attempting to reject order', orderId, 'with reason:', reason);

    const result = await Order.rejectOrder(orderId, userId, reason);

    console.log('orderController.rejectOrder - Result from Order.rejectOrder:', result);

    // Check if result exists and has success property
    if (!result || typeof result.success === 'undefined') {
      console.error('orderController.rejectOrder - Invalid result from Order.rejectOrder:', result);
      return res.status(500).json({ error: 'Invalid response from order processing' });
    }

    if (!result.success) {
      console.log('orderController.rejectOrder - Rejection failed:', result.message);
      return res.status(400).json({ error: result.message });
    }

    console.log('Order rejected successfully:', result.message);

    res.json({ 
      success: true, 
      message: result.message 
    });
  } catch (error) {
    console.error('orderController.rejectOrder - Error occurred:', error);
    console.error('orderController.rejectOrder - Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Get sales analytics (seller only)
exports.getSalesAnalytics = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.userId;

    if (userRole !== 'seller') {
      return res.status(403).json({ error: 'Access denied. Seller role required.' });
    }

    console.log('📊 Fetching sales analytics for seller:', userId);

    const analytics = await Order.getSalesAnalytics(userId);

    console.log('✅ Sales analytics retrieved:', {
      totalRevenue: analytics.totalRevenue,
      totalOrders: analytics.totalOrders,
      thisMonthSales: analytics.thisMonthSales,
      monthlyDataPoints: analytics.monthlySales.length
    });

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Get sales analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get detailed sales report (seller only)
exports.getSalesReport = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.userId;

    if (userRole !== 'seller') {
      return res.status(403).json({ error: 'Access denied. Seller role required.' });
    }

    const { startDate, endDate } = req.query;

    console.log('📄 Generating sales report for seller:', userId);
    if (startDate || endDate) {
      console.log('Date range:', { startDate, endDate });
    }

    const report = await Order.getSalesReport(userId, startDate, endDate);

    console.log('✅ Sales report generated with', report.length, 'records');

    res.json({
      success: true,
      report,
      count: report.length
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};