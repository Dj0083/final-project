const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true
};

let dbConnection;

// Initialize database and tables
const initializeDatabase = async () => {
  try {
    // Temporary connection (no database) to ensure DB exists
    const tempConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    console.log('Database created or already exists');
    await tempConnection.end();

    // Connect to the main database
    dbConnection = await mysql.createConnection(dbConfig);

    // Create tables
    const createTablesSQL = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        role ENUM('admin', 'seller', 'customer', 'investor', 'affiliate') DEFAULT 'customer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );

      -- Sellers table
      CREATE TABLE IF NOT EXISTS sellers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        business_name VARCHAR(255) NOT NULL,
        business_address TEXT,
        id_number VARCHAR(100),
        bank_account VARCHAR(100),
        business_image VARCHAR(255),
        id_image VARCHAR(255),
        bank_proof_image VARCHAR(255),
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Affiliates table
      CREATE TABLE IF NOT EXISTS affiliates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        website_url VARCHAR(255),
        affiliate_type VARCHAR(100),
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        agreed_to_terms BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Investors table
      CREATE TABLE IF NOT EXISTS investors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        bank_proof_image VARCHAR(255),
        agreed_to_terms BOOLEAN DEFAULT FALSE,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Password reset tokens table
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Products table
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        seller_id INT NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        price DECIMAL(10,2) NOT NULL,
        stock_qty INT NOT NULL DEFAULT 0,
        images JSON,
        status ENUM('active', 'out_of_stock', 'violation', 'deleted') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Product reviews table
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        user_id INT NOT NULL,
        rating INT CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_product_review (user_id, product_id)
      );

      -- Favorites table
      CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_product (user_id, product_id)
      );

      -- Orders table
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'rejected') DEFAULT 'pending',
        shipping_address TEXT NOT NULL,
        payment_method ENUM('cash_on_delivery', 'card', 'bank_transfer') DEFAULT 'cash_on_delivery',
        payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Order items table
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        quantity INT NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );

      -- Investment Preferences Table
      CREATE TABLE IF NOT EXISTS investment_preferences (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        min_investment DECIMAL(15, 2),
        max_investment DECIMAL(15, 2),
        categories TEXT,
        regions TEXT,
        risk_level ENUM('conservative', 'moderate', 'aggressive') DEFAULT 'moderate',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_preference (user_id)
      );

      -- Investor Seller Connections Table
      CREATE TABLE IF NOT EXISTS investor_seller_connections (
        id INT PRIMARY KEY AUTO_INCREMENT,
        seller_id INT NOT NULL,
        investor_id INT NOT NULL,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (investor_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_seller_investor (seller_id, investor_id),
        INDEX idx_seller (seller_id),
        INDEX idx_investor (investor_id),
        INDEX idx_status (status)
      );

      -- Investment Requests Table
      CREATE TABLE IF NOT EXISTS investment_requests (
        id INT PRIMARY KEY AUTO_INCREMENT,
        seller_id INT NOT NULL,
        investor_id INT NULL,
        requested_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        status ENUM('pending','approved','funded','rejected') DEFAULT 'pending',
        admin_approved BOOLEAN DEFAULT FALSE,
        funded_amount DECIMAL(15,2) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (investor_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_req_status (status)
      );

      -- Investment Request Documents Table
      CREATE TABLE IF NOT EXISTS investment_request_documents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        request_id INT NOT NULL,
        user_id INT NOT NULL,
        doc_type ENUM('slip','other') DEFAULT 'slip',
        file_path VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES investment_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_docs_request (request_id)
      );

      -- Investment Request Messages Table (chat between investor and seller)
      CREATE TABLE IF NOT EXISTS investment_request_messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        request_id INT NOT NULL,
        sender_id INT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES investment_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_msg_request (request_id)
      );

      -- Connection Documents (pre-accept docs between seller and investor)
      CREATE TABLE IF NOT EXISTS connection_documents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        connection_id INT NOT NULL,
        user_id INT NOT NULL,
        doc_type ENUM('intro','pitch','other') DEFAULT 'other',
        file_path VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (connection_id) REFERENCES investor_seller_connections(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_conn_docs (connection_id)
      );

      -- Connection Messages (pre-accept chat between seller and investor)
      CREATE TABLE IF NOT EXISTS connection_messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        connection_id INT NOT NULL,
        sender_id INT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (connection_id) REFERENCES investor_seller_connections(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_conn_msg (connection_id)
      );

      -- Affiliate Partner Requests (seller ↔ affiliate handshake)
      CREATE TABLE IF NOT EXISTS affiliate_partner_requests (
        id INT PRIMARY KEY AUTO_INCREMENT,
        seller_id INT NOT NULL,
        affiliate_user_id INT NOT NULL,
        status ENUM('pending','accepted','rejected') DEFAULT 'pending',
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP NULL,
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (affiliate_user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uniq_seller_affiliate (seller_id, affiliate_user_id)
      );

      -- Affiliate Partner Messages (chat per request)
      CREATE TABLE IF NOT EXISTS affiliate_partner_messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        request_id INT NOT NULL,
        sender_id INT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES affiliate_partner_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_aff_partner_msg_req (request_id)
      );

      CREATE TABLE IF NOT EXISTS affiliate_partner_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        user_id INT NOT NULL,
        doc_type VARCHAR(50) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES affiliate_partner_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `;

    await dbConnection.query(createTablesSQL);
    console.log('Tables created successfully (including investor connection tables)');

    // Add 'rejected' status to existing orders table if not present
    try {
      await dbConnection.query(`
        ALTER TABLE orders 
        MODIFY COLUMN status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'rejected') DEFAULT 'pending'
      `);
      console.log('Orders table updated with rejected status');
    } catch (alterError) {
      console.log('Orders table already has rejected status or alter failed:', alterError.message);
    }

    // ===== Spec additions: schema alters and new tables =====
    try {
      await dbConnection.query(`ALTER TABLE affiliates ADD COLUMN social_links TEXT NULL`);
    } catch (e) { /* ignore if exists */ }
    try {
      await dbConnection.query(`ALTER TABLE affiliates ADD COLUMN description TEXT NULL`);
    } catch (e) { /* ignore if exists */ }
    try {
      await dbConnection.query(`ALTER TABLE affiliates ADD COLUMN affiliate_code VARCHAR(16) UNIQUE NULL`);
    } catch (e) { /* ignore if exists */ }

    try {
      await dbConnection.query(`ALTER TABLE affiliate_partner_messages ADD COLUMN sender_type ENUM('vendor','affiliate') DEFAULT 'vendor'`);
    } catch (e) { /* ignore if exists */ }

    // Add suspended flag on users to allow admin suspend/activate
    try {
      await dbConnection.query(`ALTER TABLE users ADD COLUMN suspended TINYINT(1) NOT NULL DEFAULT 0`);
      console.log('Added users.suspended column');
    } catch (e) { /* ignore if exists */ }

    // User blacklist table to track suspensions
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS user_blacklist (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        reason TEXT NULL,
        created_by INT NULL,
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_blacklist_user (user_id),
        INDEX idx_user_blacklist_active (active)
      )
    `);

    // Image URL convenience for products (keep existing images JSON)
    try {
      await dbConnection.query(`ALTER TABLE products ADD COLUMN image_url VARCHAR(255) NULL`);
    } catch (e) { /* ignore if exists */ }

    // Clicks table
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS clicks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        affiliate_id INT NOT NULL,
        ip VARCHAR(64),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
        INDEX idx_clicks_product (product_id),
        INDEX idx_clicks_affiliate (affiliate_id)
      )
    `);

    // Sales table
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        affiliate_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        commission DECIMAL(10,2) NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
        INDEX idx_sales_product (product_id),
        INDEX idx_sales_affiliate (affiliate_id)
      )
    `);

    // Commissions table (rollup)
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS commissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        affiliate_id INT NOT NULL,
        total_earned DECIMAL(12,2) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
        UNIQUE KEY uniq_aff_comm (affiliate_id)
      )
    `);

    // ✅ Safely create indexes only if they don't exist
    const indexes = [
      { name: 'idx_favorites_user_id', column: 'user_id', table: 'favorites' },
      { name: 'idx_favorites_product_id', column: 'product_id', table: 'favorites' },
      { name: 'idx_favorites_created_at', column: 'created_at', table: 'favorites' },
      { name: 'idx_orders_user_id', column: 'user_id', table: 'orders' },
      { name: 'idx_orders_status', column: 'status', table: 'orders' },
      { name: 'idx_orders_created_at', column: 'created_at', table: 'orders' },
      { name: 'idx_order_items_order_id', column: 'order_id', table: 'order_items' },
      { name: 'idx_order_items_product_id', column: 'product_id', table: 'order_items' },
      { name: 'idx_reviews_product_id', column: 'product_id', table: 'reviews' },
      { name: 'idx_reviews_user_id', column: 'user_id', table: 'reviews' },
      { name: 'idx_reviews_rating', column: 'rating', table: 'reviews' },
      { name: 'idx_reviews_created_at', column: 'created_at', table: 'reviews' }
    ];

    for (const idx of indexes) {
      const [rows] = await dbConnection.query(
        `SELECT COUNT(1) as count
         FROM information_schema.statistics
         WHERE table_schema = DATABASE()
         AND table_name = ?
         AND index_name = ?`,
        [idx.table, idx.name]
      );

      if (rows[0].count === 0) {
        await dbConnection.query(
          `CREATE INDEX ${idx.name} ON ${idx.table}(${idx.column})`
        );
        console.log(`Created index: ${idx.name} on ${idx.table}`);
      }
    }

    // ✅ Admin user creation / update
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@digimart.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'SuperAdmin123!';
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const [adminExists] = await dbConnection.execute(
      'SELECT COUNT(*) as count FROM users WHERE email = ? AND role = "admin"',
      [adminEmail]
    );

    if (adminExists[0].count === 0) {
      await dbConnection.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Admin User', adminEmail, hashedPassword, 'admin']
      );
      console.log('Admin user created successfully');
    } else {
      await dbConnection.execute(
        'UPDATE users SET password = ? WHERE email = ? AND role = "admin"',
        [hashedPassword, adminEmail]
      );
      console.log('Admin user password updated');
    }

    console.log(`Admin Email: ${adminEmail}`);
    console.log(`Admin Password: ${adminPassword}`);

    return dbConnection;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Return active DB connection
const getDB = () => {
  if (!dbConnection) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return dbConnection;
};

module.exports = { initializeDatabase, getDB, dbConfig };
