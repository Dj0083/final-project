import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, SafeAreaView } from 'react-native';
import API from '../../api';

export default function TestReviews() {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addTestResult = (test, success, message, data = null) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      success,
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Test 1: Check if reviews table exists by trying to fetch reviews
  const testFetchReviews = async () => {
    try {
      addTestResult('Fetch Reviews', null, 'Testing...', null);
      const response = await API.get('/reviews/product/1'); // Test with product ID 1
      addTestResult('Fetch Reviews', true, 'Successfully fetched reviews', response.data);
    } catch (error) {
      addTestResult('Fetch Reviews', false, `Error: ${error.response?.data?.message || error.message}`, error.response?.data);
    }
  };

  // Test 2: Try to submit a review
  const testSubmitReview = async () => {
    try {
      addTestResult('Submit Review', null, 'Testing review submission...', null);
      
      const reviewData = {
        productId: 1, // Test with product ID 1
        rating: 5,
        comment: 'Test review from test component - ' + new Date().toISOString()
      };
      
      const response = await API.post('/reviews', reviewData);
      addTestResult('Submit Review', true, 'Review submitted successfully!', response.data);
    } catch (error) {
      addTestResult('Submit Review', false, `Error: ${error.response?.data?.message || error.message}`, error.response?.data);
    }
  };

  // Test 3: Check database connection
  const testDatabaseConnection = async () => {
    try {
      addTestResult('Database Connection', null, 'Testing database connection...', null);
      const response = await API.get('/test-db'); // This endpoint should exist
      addTestResult('Database Connection', true, 'Database connected successfully', response.data);
    } catch (error) {
      addTestResult('Database Connection', false, `Error: ${error.response?.data?.error || error.message}`, error.response?.data);
    }
  };

  // Test 4: Check if products exist
  const testProducts = async () => {
    try {
      addTestResult('Products Check', null, 'Checking if products exist...', null);
      const response = await API.get('/products');
      const productCount = response.data.products?.length || 0;
      addTestResult('Products Check', true, `Found ${productCount} products`, response.data);
    } catch (error) {
      addTestResult('Products Check', false, `Error: ${error.response?.data?.message || error.message}`, error.response?.data);
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    clearResults();
    
    addTestResult('Test Session', null, '🚀 Starting comprehensive review system test...', null);
    
    await testDatabaseConnection();
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
    
    await testProducts();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testFetchReviews();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testSubmitReview();
    
    addTestResult('Test Session', true, '✅ All tests completed!', null);
    setLoading(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <View className="p-4">
        <Text className="mb-4 text-2xl font-bold text-center text-gray-900">
          Review System Tester
        </Text>
        
        <View className="flex-row justify-between mb-4">
          <TouchableOpacity
            onPress={runAllTests}
            disabled={loading}
            className={`flex-1 mr-2 py-3 rounded-lg ${loading ? 'bg-gray-400' : 'bg-blue-600'}`}
          >
            <Text className="font-semibold text-center text-white">
              {loading ? 'Running Tests...' : 'Run All Tests'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={clearResults}
            className="flex-1 py-3 ml-2 bg-gray-600 rounded-lg"
          >
            <Text className="font-semibold text-center text-white">Clear Results</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between mb-4">
          <TouchableOpacity
            onPress={testDatabaseConnection}
            className="flex-1 py-2 mr-1 bg-purple-600 rounded"
          >
            <Text className="text-xs font-medium text-center text-white">Test DB</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={testProducts}
            className="flex-1 py-2 mx-1 bg-green-600 rounded"
          >
            <Text className="text-xs font-medium text-center text-white">Test Products</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={testFetchReviews}
            className="flex-1 py-2 mx-1 bg-orange-600 rounded"
          >
            <Text className="text-xs font-medium text-center text-white">Fetch Reviews</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={testSubmitReview}
            className="flex-1 py-2 ml-1 bg-red-600 rounded"
          >
            <Text className="text-xs font-medium text-center text-white">Submit Review</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView className="flex-1 p-4 bg-white rounded-lg">
          {testResults.length === 0 ? (
            <Text className="text-center text-gray-500">
              No tests run yet. Click "Run All Tests" to start.
            </Text>
          ) : (
            testResults.map((result) => (
              <View key={result.id} className="p-3 mb-3 border-l-4 border-gray-200 bg-gray-50">
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold text-gray-900">{result.test}</Text>
                  <View className="flex-row items-center">
                    <Text className="mr-2 text-xs text-gray-500">{result.timestamp}</Text>
                    <View className={`w-3 h-3 rounded-full ${
                      result.success === null ? 'bg-yellow-400' :
                      result.success ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  </View>
                </View>
                <Text className={`mt-1 text-sm ${
                  result.success === null ? 'text-yellow-700' :
                  result.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {result.message}
                </Text>
                {result.data && (
                  <View className="p-2 mt-2 bg-gray-100 rounded">
                    <Text className="text-xs text-gray-600">
                      Data: {JSON.stringify(result.data, null, 2)}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}