const { getDB } = require('./config/database');

async function testSimpleOrder() {
  try {
    console.log('🔍 Testing simple order creation...');
    
    const db = getDB();
    
    // First, let's test basic database connectivity
    console.log('📊 Testing database connection...');
    const [userCount] = await db.execute('SELECT COUNT(*) as count FROM users');
    console.log('✅ Users in database:', userCount[0].count);
    
    const [productCount] = await db.execute('SELECT COUNT(*) as count FROM products');
    console.log('✅ Products in database:', productCount[0].count);
    
    // Get a test user and product
    const [users] = await db.execute('SELECT id FROM users LIMIT 1');
    const [products] = await db.execute('SELECT id, price, stock FROM products WHERE stock > 0 LIMIT 1');
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }
    
    if (products.length === 0) {
      console.log('❌ No products with stock found in database');
      return;
    }
    
    const userId = users[0].id;
    const product = products[0];
    
    console.log('📦 Test data:', { userId, productId: product.id, stock: product.stock, price: product.price });
    
    // Test transaction commands individually
    console.log('🔄 Testing transaction commands...');
    
    try {
      await db.query('START TRANSACTION');
      console.log('✅ START TRANSACTION successful');
      
      await db.query('ROLLBACK');
      console.log('✅ ROLLBACK successful');
      
      console.log('✅ Transaction commands work correctly');
    } catch (error) {
      console.error('❌ Transaction command failed:', error.message);
    }
    
    // Now test the Order model
    console.log('🛒 Testing Order model...');
    const Order = require('./models/Order');
    
    const orderData = {
      userId: userId,
      totalAmount: product.price,
      shippingAddress: JSON.stringify({
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Test Country'
      }),
      items: [{
        productId: product.id,
        quantity: 1,
        price: product.price
      }]
    };
    
    const order = await Order.create(orderData);
    console.log('✅ Order created successfully:', order.id);
    
    // Clean up - cancel the test order
    await Order.cancel(order.id);
    console.log('✅ Test order cancelled successfully');
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit();
  }
}

testSimpleOrder();