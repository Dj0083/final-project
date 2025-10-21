const { initializeDatabase, getDB } = require('./config/database');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  try {
    await initializeDatabase();
    const db = getDB();

    const testEmail = 'test@customer.com';
    const testPassword = 'password123';
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    // Check if test user already exists
    const [existing] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [testEmail]
    );

    if (existing.length > 0) {
      console.log('Test user already exists:', testEmail);
      return existing[0];
    }

    // Create test user
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Test Customer', testEmail, hashedPassword, 'customer']
    );

    console.log('Test user created successfully!');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    console.log('User ID:', result.insertId);

    return { id: result.insertId, email: testEmail };
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

// Create some test products too
async function createTestProducts() {
  try {
    const db = getDB();

    // First create a test seller
    const sellerEmail = 'seller@test.com';
    const sellerPassword = 'password123';
    const hashedPassword = await bcrypt.hash(sellerPassword, 10);

    let sellerId;
    const [existingSeller] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [sellerEmail]
    );

    if (existingSeller.length > 0) {
      sellerId = existingSeller[0].id;
    } else {
      const [sellerResult] = await db.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Test Seller', sellerEmail, hashedPassword, 'seller']
      );
      sellerId = sellerResult.insertId;
      console.log('Test seller created:', sellerEmail);
    }

    // Create test products
    const products = [
      {
        name: 'Ceylon Tea',
        description: 'Authentic Sri Lankan black tea',
        category: 'Tea',
        price: 150.00,
        stock: 50
      },
      {
        name: 'Handwoven Basket',
        description: 'Traditional Sri Lankan handwoven basket',
        category: 'Handicraft',
        price: 850.00,
        stock: 20
      },
      {
        name: 'Ceramic Vase',
        description: 'Beautiful ceramic vase made in Sri Lanka',
        category: 'Ceramics',
        price: 450.00,
        stock: 15
      }
    ];

    for (const product of products) {
      const [existing] = await db.execute(
        'SELECT * FROM products WHERE product_name = ? AND seller_id = ?',
        [product.name, sellerId]
      );

      if (existing.length === 0) {
        await db.execute(
          'INSERT INTO products (seller_id, product_name, description, category, price, stock_qty, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [sellerId, product.name, product.description, product.category, product.price, product.stock, 'active']
        );
        console.log(`Created test product: ${product.name}`);
      }
    }

    console.log('Test products created successfully!');
  } catch (error) {
    console.error('Error creating test products:', error);
  }
}

if (require.main === module) {
  createTestUser().then(() => {
    createTestProducts().then(() => {
      console.log('Test setup completed!');
      console.log('Test user credentials:');
      console.log('Email: test@customer.com');
      console.log('Password: password123');
      process.exit(0);
    });
  });
}

module.exports = { createTestUser, createTestProducts };