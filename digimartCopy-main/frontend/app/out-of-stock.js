import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import API from '../api';

export default function OutOfStock() {
  const { user } = useAuth();
  const [outOfStockProducts, setOutOfStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Restock modal states
  const [restockModalVisible, setRestockModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [restockQuantity, setRestockQuantity] = useState('');
  const [restockLoading, setRestockLoading] = useState(false);

  useEffect(() => {
    fetchOutOfStockProducts();
  }, []);

  const fetchOutOfStockProducts = async () => {
    try {
      setLoading(true);
      console.log('Fetching products from API...');
      
      const response = await API.get('/products');
      console.log('API Response:', response.data);
      
      const allProducts = response.data.products || [];
      console.log('Total products:', allProducts.length);
      
      // Filter out-of-stock and low stock products (stockQty <= 5)
      const lowStockProducts = allProducts.filter(product => {
        const stock = parseInt(product.stockQty) || 0;
        console.log(`Product ${product.productName}: stock = ${stock}`);
        return stock <= 5; // Include both out-of-stock (0) and low stock (1-5)
      });
      
      console.log('Low stock products found:', lowStockProducts.length);
      
      // Sort by stock quantity (out of stock first, then low stock)
      lowStockProducts.sort((a, b) => {
        const stockA = parseInt(a.stockQty) || 0;
        const stockB = parseInt(b.stockQty) || 0;
        return stockA - stockB;
      });
      
      setOutOfStockProducts(lowStockProducts);
      
    } catch (error) {
      console.error('Error fetching low stock products:', error.response || error);
      Alert.alert(
        'Error', 
        `Failed to load low stock products: ${error.response?.data?.error || error.message}`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOutOfStockProducts();
  };

  const openRestockModal = (product) => {
    setSelectedProduct(product);
    setRestockQuantity('');
    setRestockModalVisible(true);
  };

  const closeRestockModal = () => {
    setRestockModalVisible(false);
    setSelectedProduct(null);
    setRestockQuantity('');
  };

  const handleRestock = async () => {
    if (!selectedProduct || !restockQuantity) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    const quantity = parseInt(restockQuantity);
    if (quantity <= 0) {
      Alert.alert('Error', 'Quantity must be greater than 0');
      return;
    }

    try {
      setRestockLoading(true);
      console.log(`Restocking product ${selectedProduct.id} with ${quantity} units...`);
      
      // Update product stock using the stock-specific API endpoint
      const response = await API.patch(`/products/${selectedProduct.id}/stock`, {
        stockQty: quantity
      });

      console.log('Restock response:', response.data);

      Alert.alert(
        'Success', 
        `Successfully restocked ${selectedProduct.productName} with ${quantity} units`,
        [
          {
            text: 'OK',
            onPress: () => {
              closeRestockModal();
              fetchOutOfStockProducts(); // Refresh the list
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Error restocking product:', error.response || error);
      
      let errorMessage = 'Failed to restock product';
      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Product not found or you do not have permission to update it.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setRestockLoading(false);
    }
  };

  const renderProductItem = (product) => (
    <View key={product.id} className="p-4 mb-4 bg-white border border-red-200 rounded-2xl shadow-sm">
      <View className="flex-row">
        {/* Product Image */}
        <View className="mr-4">
          <Image 
            source={{ 
              uri: product.imageUrl 
                ? `http://192.168.43.219:5000${product.imageUrl}` 
                : "https://via.placeholder.com/80x80" 
            }} 
            className="w-20 h-20 rounded-lg" 
            resizeMode="cover"
          />
          {/* Stock Badge */}
          <View className={`absolute -top-2 -right-2 ${
            product.stockQty === 0 ? 'bg-red-500' : 'bg-orange-500'
          } rounded-full px-2 py-1`}>
            <Text className="text-xs font-bold text-white">
              {product.stockQty || 0}
            </Text>
          </View>
        </View>

        {/* Product Details */}
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900 mb-1" numberOfLines={2}>
            {product.productName}
          </Text>
          
          <View className="flex-row items-center mb-2">
            <View className="flex-row items-center mr-4">
              <Ionicons name="pricetag" size={16} color="#8B5CF6" />
              <Text className="ml-1 text-base font-semibold text-purple-600">
                Rs. {product.price}
              </Text>
            </View>
            
            <View className="flex-row items-center">
              <Ionicons name="folder" size={16} color="#6B7280" />
              <Text className="ml-1 text-sm text-gray-600">
                {product.category}
              </Text>
            </View>
          </View>

          {/* Stock Status */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons 
                name={product.stockQty === 0 ? "close-circle" : "warning"} 
                size={18} 
                color={product.stockQty === 0 ? "#EF4444" : "#F59E0B"} 
              />
              <Text className={`ml-2 text-sm font-medium ${
                product.stockQty === 0 ? 'text-red-600' : 'text-orange-600'
              }`}>
                {product.stockQty === 0 ? 'Out of Stock' : `Low Stock (${product.stockQty} left)`}
              </Text>
            </View>
            
            <Text className="text-xs text-gray-500">
              ID: {product.id}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => openRestockModal(product)}
              className="flex-1 flex-row items-center justify-center bg-green-500 px-4 py-2 rounded-lg"
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={18} color="white" />
              <Text className="ml-2 text-sm font-semibold text-white">
                Restock
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => router.push({
                pathname: "/edit-product",
                params: { productId: product.id }
              })}
              className="flex-1 flex-row items-center justify-center bg-blue-500 px-4 py-2 rounded-lg"
              activeOpacity={0.8}
            >
              <Ionicons name="create" size={18} color="white" />
              <Text className="ml-2 text-sm font-semibold text-white">
                Edit
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="bg-red-500 px-5 py-4">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mr-4 p-2 bg-white/20 rounded-full"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View className="flex-1">
            <Text className="text-xl font-bold text-white">
              Low Stock Alert
            </Text>
            <Text className="text-sm text-white/90">
              {outOfStockProducts.length} items need restocking
            </Text>
          </View>
          
          <TouchableOpacity 
            onPress={handleRefresh}
            className="p-2 bg-white/20 rounded-full"
            disabled={loading}
          >
            <Ionicons 
              name="refresh" 
              size={24} 
              color="white"
              style={{ transform: [{ rotate: refreshing ? '180deg' : '0deg' }] }}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#EF4444" />
            <Text className="mt-4 text-gray-600">Loading low stock products...</Text>
          </View>
        ) : outOfStockProducts.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <View className="bg-green-100 p-6 rounded-full mb-4">
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">
              All Items Well Stocked!
            </Text>
            <Text className="text-center text-gray-600 mb-6">
              Great job! All your products have adequate stock levels (6+ units).
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/inventory')}
              className="bg-green-500 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold">View Inventory</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Summary Card */}
            <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
              <View className="flex-row items-center">
                <View className="bg-red-500 p-3 rounded-full mr-4">
                  <Ionicons name="warning" size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-red-800">
                    Action Required
                  </Text>
                  <Text className="text-sm text-red-600">
                    {outOfStockProducts.length} products need restocking (low or out of stock)
                  </Text>
                </View>
              </View>
            </View>

            {/* Products List */}
            {outOfStockProducts.map(renderProductItem)}

            {/* Bulk Actions */}
            {outOfStockProducts.length > 1 && (
              <View className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
                <Text className="text-lg font-bold text-gray-900 mb-3">
                  Bulk Actions
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Bulk Restock', 
                      'This feature will allow you to restock multiple items at once. Coming soon!',
                      [{ text: 'OK' }]
                    );
                  }}
                  className="flex-row items-center justify-center bg-blue-500 px-4 py-3 rounded-lg"
                >
                  <Ionicons name="layers" size={20} color="white" />
                  <Text className="ml-2 text-base font-semibold text-white">
                    Bulk Restock (Coming Soon)
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Bottom Spacing */}
            <View className="h-6" />
          </>
        )}
      </ScrollView>

      {/* Restock Modal */}
      <Modal
        visible={restockModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeRestockModal}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-900">
                Restock Product
              </Text>
              <TouchableOpacity onPress={closeRestockModal}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <View className="mb-6">
                <View className="flex-row items-center mb-4">
                  <Image 
                    source={{ 
                      uri: selectedProduct.imageUrl 
                        ? `http://192.168.43.219:5000${selectedProduct.imageUrl}` 
                        : "https://via.placeholder.com/60x60" 
                    }} 
                    className="w-16 h-16 rounded-lg mr-4" 
                    resizeMode="cover"
                  />
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900" numberOfLines={2}>
                      {selectedProduct.productName}
                    </Text>
                    <Text className="text-sm text-gray-600">
                      Current Stock: {selectedProduct.stockQty || 0} units
                    </Text>
                  </View>
                </View>

                <View className="mb-4">
                  <Text className="text-base font-medium text-gray-700 mb-2">
                    Restock Quantity
                  </Text>
                  <TextInput
                    value={restockQuantity}
                    onChangeText={setRestockQuantity}
                    placeholder="Enter quantity to add"
                    keyboardType="numeric"
                    className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                    autoFocus={true}
                  />
                </View>

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={closeRestockModal}
                    className="flex-1 bg-gray-200 py-3 rounded-lg"
                    disabled={restockLoading}
                  >
                    <Text className="text-center font-semibold text-gray-700">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={handleRestock}
                    className="flex-1 bg-green-500 py-3 rounded-lg"
                    disabled={restockLoading}
                  >
                    {restockLoading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-center font-semibold text-white">
                        Restock
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}