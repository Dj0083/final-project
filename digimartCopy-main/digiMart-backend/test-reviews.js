const { initializeDatabase, getDB } = require('./config/database');

async function addTestReviews() {
  try {
    await initializeDatabase();
    const db = getDB();

    console.log('Adding test reviews...');

    // Get first available product
    const [products] = await db.execute('SELECT id FROM products LIMIT 1');
    if (products.length === 0) {
      console.log('No products found. Please add products first.');
      return;
    }
    const productId = products[0].id;
    console.log(`Using product ID: ${productId}`);

    // Get or create test users
    let [users] = await db.execute('SELECT id FROM users WHERE role = "customer" LIMIT 5');
    
    if (users.length < 3) {
      console.log('Need more customer users. Creating test users...');
      
      // Create test users with proper password hash
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const testUsers = [
        { name: 'Test Customer 1', email: 'customer1@test.com', password: hashedPassword },
        { name: 'Test Customer 2', email: 'customer2@test.com', password: hashedPassword },
        { name: 'Test Customer 3', email: 'customer3@test.com', password: hashedPassword },
        { name: 'Test Customer 4', email: 'customer4@test.com', password: hashedPassword },
        { name: 'Test Customer 5', email: 'customer5@test.com', password: hashedPassword }
      ];

      for (const user of testUsers) {
        try {
          await db.execute(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, "customer")',
            [user.name, user.email, user.password]
          );
          console.log(`Created user: ${user.name}`);
        } catch (error) {
          console.log(`User ${user.email} already exists, skipping...`);
        }
      }

      // Re-fetch users
      [users] = await db.execute('SELECT id FROM users WHERE role = "customer" LIMIT 5');
    }

    console.log(`Found ${users.length} users`);

    if (users.length === 0) {
      console.log('No users found even after creation. Please check the database.');
      return;
    }

    // Sample reviews data - use only available users, cycle through them if needed
    const reviews = [
      { userId: users[0].id, rating: 5, comment: 'Excellent product! Very satisfied with the quality.' },
      { userId: users[Math.min(1, users.length - 1)].id, rating: 4, comment: 'Good product, fast delivery. Recommended!' },
      { userId: users[Math.min(2, users.length - 1)].id, rating: 5, comment: 'Amazing! Exceeded my expectations.' },
      { userId: users[Math.min(3, users.length - 1)].id, rating: 3, comment: 'Average product, could be better.' },
      { userId: users[users.length > 4 ? 4 : 0].id, rating: 4, comment: 'Pretty good, would buy again.' }
    ];

    // Clear existing reviews for this product
    await db.execute('DELETE FROM reviews WHERE product_id = ?', [productId]);

    // Add test reviews
    for (const review of reviews) {
      try {
        await db.execute(
          'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
          [productId, review.userId, review.rating, review.comment]
        );
        console.log(`Added review: ${review.rating} stars - ${review.comment}`);
      } catch (error) {
        console.log(`Skipped duplicate review for user ${review.userId}`);
      }
    }

    // Verify the reviews were added
    const [addedReviews] = await db.execute(`
      SELECT r.*, u.name as user_name 
      FROM reviews r 
      JOIN users u ON r.user_id = u.id 
      WHERE r.product_id = ?
    `, [productId]);

    console.log(`\nAdded ${addedReviews.length} reviews:`);
    addedReviews.forEach(review => {
      console.log(`- ${review.user_name}: ${review.rating}/5 stars - ${review.comment}`);
    });

    // Test rating statistics
    const [stats] = await db.execute(`
      SELECT 
        rating,
        COUNT(*) as count
      FROM reviews 
      WHERE product_id = ?
      GROUP BY rating
      ORDER BY rating DESC
    `, [productId]);

    console.log('\nRating statistics:');
    const ratingStats = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    stats.forEach(stat => {
      ratingStats[stat.rating] = stat.count;
      console.log(`${stat.rating} stars: ${stat.count} reviews`);
    });

    const [avgResult] = await db.execute(`
      SELECT AVG(rating) as avg, COUNT(*) as total 
      FROM reviews 
      WHERE product_id = ?
    `, [productId]);

    console.log(`\nAverage rating: ${parseFloat(avgResult[0].avg).toFixed(1)}/5`);
    console.log(`Total reviews: ${avgResult[0].total}`);
    console.log('\nTest reviews added successfully!');
    console.log(`You can now test the rating system with product ID: ${productId}`);

  } catch (error) {
    console.error('Error adding test reviews:', error);
  } finally {
    process.exit(0);
  }
}

addTestReviews();