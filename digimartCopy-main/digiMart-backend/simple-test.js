// Simple manual test to add a single review
const { initializeDatabase, getDB } = require('./config/database');

async function addSingleReview() {
  try {
    await initializeDatabase();
    const db = getDB();

    // Get first product
    const [products] = await db.execute('SELECT id, product_name FROM products LIMIT 1');
    if (products.length === 0) {
      console.log('No products found. Please add a product first.');
      return;
    }
    
    const productId = products[0].id;
    console.log(`Testing with product: ${products[0].product_name} (ID: ${productId})`);

    // Get or create a test user
    const [existingUsers] = await db.execute('SELECT id FROM users WHERE role = "customer" LIMIT 1');
    let userId;
    
    if (existingUsers.length === 0) {
      // Create a test user
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const [result] = await db.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Test Customer', 'test@customer.com', hashedPassword, 'customer']
      );
      userId = result.insertId;
      console.log('Created test customer user');
    } else {
      userId = existingUsers[0].id;
      console.log('Using existing customer user');
    }

    // Add a 5-star review
    try {
      await db.execute(
        'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
        [productId, userId, 5, 'Excellent product! Really happy with my purchase. Highly recommended to everyone!']
      );
      console.log('✅ Added 5-star review successfully');
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log('Review already exists, updating instead...');
        await db.execute(
          'UPDATE reviews SET rating = ?, comment = ? WHERE product_id = ? AND user_id = ?',
          [5, 'Excellent product! Really happy with my purchase. Highly recommended to everyone!', productId, userId]
        );
        console.log('✅ Updated review successfully');
      } else {
        throw error;
      }
    }

    // Test the rating statistics
    const [stats] = await db.execute(`
      SELECT 
        rating,
        COUNT(*) as count
      FROM reviews 
      WHERE product_id = ?
      GROUP BY rating
      ORDER BY rating DESC
    `, [productId]);

    console.log('\n📊 Current Rating Statistics:');
    const ratingStats = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    stats.forEach(stat => {
      ratingStats[stat.rating] = parseInt(stat.count);
      console.log(`${stat.rating} ⭐: ${stat.count} reviews`);
    });

    const [avgResult] = await db.execute(`
      SELECT AVG(rating) as avg, COUNT(*) as total 
      FROM reviews 
      WHERE product_id = ?
    `, [productId]);

    console.log(`\n📈 Average Rating: ${parseFloat(avgResult[0].avg).toFixed(1)}/5`);
    console.log(`📝 Total Reviews: ${avgResult[0].total}`);
    
    console.log('\n🎉 Rating system test completed!');
    console.log(`🔍 Test the frontend with Product ID: ${productId}`);
    console.log('💡 The rating statistics should now display properly in the ProductDetail page.');

  } catch (error) {
    console.error('❌ Error in rating test:', error);
  } finally {
    process.exit(0);
  }
}

console.log('🧪 Testing Rating System...\n');
addSingleReview();