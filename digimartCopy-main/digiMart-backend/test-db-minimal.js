// Minimal test for reject order
require('dotenv').config();

async function testMinimalReject() {
  try {
    const mysql = require('mysql2/promise');
    
    // Create direct database connection
    const dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('Direct database connection successful');
    
    // Test a simple query first
    const [testResult] = await dbConnection.execute('SELECT 1 as test');
    console.log('Test query result:', testResult);
    
    // Check if orders table exists and has data
    const [orders] = await dbConnection.execute('SELECT id, status FROM orders LIMIT 1');
    console.log('Orders table query result:', orders);
    
    // Close connection
    await dbConnection.end();
    
    console.log('Database test completed successfully');
    
  } catch (error) {
    console.error('Database test error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sql: error.sql
    });
  }
}

testMinimalReject();