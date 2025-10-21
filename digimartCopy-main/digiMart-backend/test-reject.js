// Simple test to debug reject order issue
require('dotenv').config();
const { initializeDatabase } = require('./config/database');

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    await initializeDatabase();
    console.log('Database connection successful!');
    
    const Order = require('./models/Order');
    console.log('Order model loaded successfully');
    
    // Test with invalid data first to see if function works
    const result = await Order.rejectOrder(999, 999, 'Test rejection');
    console.log('Test result:', result);
    
    process.exit(0);
  } catch (error) {
    console.error('Test error:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

testDatabaseConnection();