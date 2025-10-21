import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import API from '../api';

export default function OutOfStockSimple() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    testApiConnection();
  }, []);

  const testApiConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Testing API connection...');
      
      const response = await API.get('/products');
      console.log('API Response Status:', response.status);
      console.log('API Response Data:', response.data);
      
      const allProducts = response.data.products || [];
      const lowStock = allProducts.filter(p => (p.stockQty || 0) <= 5);
      
      setProducts(lowStock);
      console.log('Low stock products:', lowStock.length);
      
    } catch (error) {
      console.error('API Error:', error);
      setError(error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="bg-blue-500 px-5 py-4">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => {
              console.log('Going back...');
              router.back();
            }}
            className="mr-4 p-2 bg-white/20 rounded-full"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View className="flex-1">
            <Text className="text-xl font-bold text-white">
              Out of Stock (Simple Test)
            </Text>
            <Text className="text-sm text-white/90">
              Testing page functionality
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 p-4">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="mt-4 text-gray-600">Loading products...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="alert-circle" size={64} color="#EF4444" />
            <Text className="mt-4 text-xl font-bold text-red-600">Error</Text>
            <Text className="mt-2 text-center text-gray-600">{error}</Text>
            <TouchableOpacity
              onPress={testApiConnection}
              className="mt-4 bg-blue-500 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-4">
              Low Stock Products: {products.length}
            </Text>
            
            {products.length === 0 ? (
              <View className="items-center py-8">
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                <Text className="mt-4 text-lg font-semibold text-gray-900">
                  All products well stocked!
                </Text>
              </View>
            ) : (
              <>
                {products.slice(0, 5).map((product, index) => (
                  <View key={product.id || index} className="p-4 mb-3 bg-white rounded-lg">
                    <Text className="font-semibold text-gray-900">
                      {product.productName || 'Unknown Product'}
                    </Text>
                    <Text className="text-sm text-gray-600">
                      Stock: {product.stockQty || 0} units
                    </Text>
                    <Text className="text-sm text-purple-600">
                      Rs. {product.price || 0}
                    </Text>
                  </View>
                ))}
                
                {products.length > 5 && (
                  <Text className="text-center text-gray-500 mt-4">
                    ... and {products.length - 5} more products
                  </Text>
                )}
              </>
            )}
            
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Success', 'Simple version is working! The complex version should work too.');
              }}
              className="mt-6 bg-green-500 px-6 py-3 rounded-lg"
            >
              <Text className="text-white text-center font-semibold">
                Test Complete
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}