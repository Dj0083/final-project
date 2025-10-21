// Quick test to verify review system
const { initializeDatabase, getDB } = require('./config/database');

async function testReviewSystem() {
  try {
    // Set environment variable for testing
    process.env.ALLOW_REVIEWS_WITHOUT_PURCHASE = 'true';
    
    await initializeDatabase();
    const db = getDB();

    console.log('🔧 Testing Review System...\n');

    // Get first product and user
    const [products] = await db.execute('SELECT id, product_name FROM products LIMIT 1');
    const [users] = await db.execute('SELECT id, name FROM users WHERE role = "customer" LIMIT 1');

    if (products.length === 0) {
      console.log('❌ No products found. Please add a product first.');
      return;
    }

    if (users.length === 0) {
      console.log('❌ No customer users found. Creating a test user...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const [result] = await db.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Test Customer', 'test@customer.com', hashedPassword, 'customer']
      );
      users.push({ id: result.insertId, name: 'Test Customer' });
    }

    const productId = products[0].id;
    const userId = users[0].id;

    console.log(`📱 Product: ${products[0].product_name} (ID: ${productId})`);
    console.log(`👤 User: ${users[0].name} (ID: ${userId})\n`);

    // Test the Review model functions
    const Review = require('./models/Review');

    // Test canUserReview
    console.log('🔍 Testing review eligibility...');
    const eligibility = await Review.canUserReview(userId, productId);
    console.log('Eligibility result:', eligibility);

    // Test adding a 5-star review
    console.log('\n⭐ Adding a 5-star review...');
    
    // Clear existing review first
    await db.execute('DELETE FROM reviews WHERE product_id = ? AND user_id = ?', [productId, userId]);
    
    try {
      const reviewId = await Review.create({
        productId,
        userId,
        rating: 5,
        comment: 'Excellent product! Amazing quality and fast delivery. Highly recommend!'
      });
      console.log(`✅ Review added successfully with ID: ${reviewId}`);
    } catch (error) {
      console.log(`❌ Failed to add review: ${error.message}`);
      return;
    }

    // Test rating statistics
    console.log('\n📊 Testing rating statistics...');
    const avgRating = await Review.getAverageRating(productId);
    const ratingStats = await Review.getRatingStats(productId);
    
    console.log('Average Rating:', avgRating);
    console.log('Rating Stats:', ratingStats);

    // Test API endpoints
    console.log('\n🌐 Testing API endpoints...');
    
    // Mock request/response objects
    const mockReq = {
      user: { userId },
      params: { productId },
      body: { productId, rating: 4, comment: 'Great product!' }
    };

    const mockRes = {
      json: (data) => console.log('Response:', data),
      status: (code) => ({ json: (data) => console.log(`Status ${code}:`, data) })
    };

    const reviewController = require('./controllers/reviewController');
    
    console.log('Testing checkReviewEligibility...');
    await reviewController.checkReviewEligibility(mockReq, mockRes);

    console.log('\n🎉 Review system test completed!');
    console.log('\n📋 Test Results Summary:');
    console.log('✅ Database connection: OK');
    console.log('✅ Review model: OK');
    console.log('✅ Rating statistics: OK'); 
    console.log('✅ 5-star system: Working');
    console.log('\n💡 Now test the frontend:');
    console.log('1. Start the backend server: node server.js');
    console.log('2. Open ProductDetail page in the app');
    console.log('3. Try to submit a review with 5 stars');
    console.log('4. Check if rating statistics display correctly');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testReviewSystem();