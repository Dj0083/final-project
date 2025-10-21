// Script to update all old IP addresses in the database
// Run this with: node update-database-ips.js

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Add your MySQL password if you have one
  database: 'digimart'
};

async function updateDatabaseIPs() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL database\n');

    const oldIP = '192.168.8.124';
    const newIP = '192.168.56.83';

    // Update products table
    console.log('📦 Updating products table...');
    const [productsResult] = await connection.execute(
      `UPDATE products 
       SET images = REPLACE(images, ?, ?)
       WHERE images LIKE ?`,
      [oldIP, newIP, `%${oldIP}%`]
    );
    console.log(`   ✅ Updated ${productsResult.affectedRows} products\n`);

    // Update users table (business images)
    console.log('👤 Updating users table...');
    const [usersResult] = await connection.execute(
      `UPDATE users 
       SET business_image = REPLACE(business_image, ?, ?)
       WHERE business_image LIKE ?`,
      [oldIP, newIP, `%${oldIP}%`]
    );
    console.log(`   ✅ Updated ${usersResult.affectedRows} users\n`);

    // Update order_items table
    console.log('📋 Updating order_items table...');
    const [orderItemsResult] = await connection.execute(
      `UPDATE order_items 
       SET image = REPLACE(image, ?, ?)
       WHERE image LIKE ?`,
      [oldIP, newIP, `%${oldIP}%`]
    );
    console.log(`   ✅ Updated ${orderItemsResult.affectedRows} order items\n`);

    // Verify - check if any old IPs remain
    console.log('🔍 Verifying update...');
    const [remainingProducts] = await connection.execute(
      'SELECT COUNT(*) as count FROM products WHERE images LIKE ?',
      [`%${oldIP}%`]
    );
    const [remainingUsers] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE business_image LIKE ?',
      [`%${oldIP}%`]
    );
    const [remainingOrderItems] = await connection.execute(
      'SELECT COUNT(*) as count FROM order_items WHERE image LIKE ?',
      [`%${oldIP}%`]
    );

    console.log('📊 Verification Results:');
    console.log(`   Products with old IP: ${remainingProducts[0].count}`);
    console.log(`   Users with old IP: ${remainingUsers[0].count}`);
    console.log(`   Order items with old IP: ${remainingOrderItems[0].count}\n`);

    if (remainingProducts[0].count === 0 && remainingUsers[0].count === 0 && remainingOrderItems[0].count === 0) {
      console.log('✅ All IP addresses updated successfully!');
      console.log(`🌐 All URLs now point to: http://${newIP}:5000\n`);
    } else {
      console.log('⚠️  Some old IP addresses may remain. Check manually.\n');
    }

    // Show sample updated products
    console.log('📸 Sample updated products:');
    const [samples] = await connection.execute(
      'SELECT id, product_name, images FROM products WHERE images LIKE ? LIMIT 5',
      [`%${newIP}%`]
    );
    samples.forEach(product => {
      console.log(`   - ${product.product_name}: ${product.images?.substring(0, 80)}...`);
    });

  } catch (error) {
    console.error('❌ Error updating database:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   Check your MySQL username/password in this script');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('   Database "digimart" does not exist');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the update
console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║  Database IP Address Update Script                   ║');
console.log('║  192.168.8.124 → 192.168.56.83                       ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

updateDatabaseIPs();
