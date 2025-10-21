const { initializeDatabase, getDB } = require('./config/database');
const Order = require('./models/Order');

async function testOrderCreation() {
  try {
    console.log('Testing order creation...');
    
    // Initialize database
    await initializeDatabase();
    console.log('Database initialized successfully');
    
    // Test order data
    const orderData = {
      userId: 1, // Assuming admin user exists with ID 1
      items: [
        {
          productId: 1,
          productName: 'Test Product',
          price: 100.00,
          quantity: 2,
          subtotal: 200.00
        }
      ],
      totalAmount: 200.00,
      shippingAddress: 'Test Address, Test City',
      paymentMethod: 'cash_on_delivery',
      notes: 'Test order'
    };

    // Create test order
    const result = await Order.create(orderData);
    console.log('Order created successfully:', result);

    // Test fetching the order
    const order = await Order.findById(result.orderId);
    console.log('Fetched order:', order);

    console.log('All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run test if called directly
if (require.main === module) {
  testOrderCreation();
}

module.exports = { testOrderCreation };