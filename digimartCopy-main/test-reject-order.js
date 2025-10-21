// Test script for reject order functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testRejectOrder() {
  try {
    console.log('Testing reject order functionality...');
    
    // You need to replace these with actual values:
    const sellerToken = 'YOUR_SELLER_TOKEN'; // Get this from login
    const orderId = 'ACTUAL_ORDER_ID'; // Use an actual order ID
    
    const response = await axios.patch(
      `${BASE_URL}/orders/${orderId}/reject`,
      { reason: 'Test rejection reason' },
      {
        headers: {
          'Authorization': `Bearer ${sellerToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
  } catch (error) {
    console.error('Error testing reject order:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

// Run the test
testRejectOrder();