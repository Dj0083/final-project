// Quick test script to check if the getAllUsers endpoint works
const axios = require('axios');

const BASE_URL = 'http://192.168.56.83:5000/api';

async function testEndpoints() {
  console.log('🧪 Testing Backend Endpoints...\n');

  // Test 1: Health check
  try {
    console.log('1️⃣ Testing health check...');
    const health = await axios.get('http://192.168.56.83:5000/health');
    console.log('   ✅ Health check:', health.data.message);
  } catch (error) {
    console.log('   ❌ Health check failed:', error.message);
    console.log('   🔴 Backend server is NOT running!');
    console.log('   💡 Start it with: node server.js\n');
    return;
  }

  // Test 2: Get all users (without auth - will fail with 401)
  try {
    console.log('\n2️⃣ Testing GET /api/users/all (without auth)...');
    const response = await axios.get(`${BASE_URL}/users/all`);
    console.log('   ✅ Response:', response.data);
  } catch (error) {
    if (error.response) {
      console.log(`   ⚠️  Got ${error.response.status} response (expected if auth required)`);
      console.log('   📄 Response:', error.response.data);
    } else {
      console.log('   ❌ Error:', error.message);
    }
  }

  // Test 3: Database test
  try {
    console.log('\n3️⃣ Testing database connection...');
    const dbTest = await axios.get('http://192.168.56.83:5000/api/test-db');
    console.log('   ✅ Database:', dbTest.data.message);
    console.log('   👥 Total users:', dbTest.data.userCount);
  } catch (error) {
    console.log('   ❌ Database test failed:', error.message);
  }

  console.log('\n✨ Testing complete!\n');
  console.log('📝 Note: If you got 401 errors, the auth middleware is working.');
  console.log('   You need to login first to get a JWT token.\n');
}

testEndpoints();
