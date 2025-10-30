import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import API from '../api';
import { useAuth } from '../context/AuthContext';

export default function LowStockManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [restockModal, setRestockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [restockQuantity, setRestockQuantity] = useState('');
  const [restockLoading, setRestockLoading] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);

  useEffect(() => {
    if (user) {
      fetchLowStockProducts();
    }
  }, [user]);

  const fetchLowStockProducts = async () => {
    try {
      setLoading(true);
      console.log('Fetching low stock products...');

      // Fetch seller's products
      let response;
      let allProducts = [];

      try {
        response = await API.get('/products/inventory');
        console.log('Products response:', response.data);

        const categorizedProducts = response.data;
        allProducts = [
          ...(categorizedProducts.Active || []),
          ...(categorizedProducts['Out of Stock'] || []),
          ...(categorizedProducts.Violation || [])
        ];

        // Debug image data
        allProducts.forEach(product => {
          console.log(`Product ${product.name || product.id}: image = ${product.image}`);
        });
      } catch (error) {
        if (error.response?.status === 404) {
          // Fallback to general products endpoint
          console.log('Trying fallback products endpoint...');
          response = await API.get('/products');
          allProducts = response.data.products || [];

          // Process images for fallback data (convert images array to image URL)
          allProducts = allProducts.map(product => {
            let processedImage = 'https://via.placeholder.com/150';

            if (product.images) {
              let imgs = product.images;
              if (typeof imgs === 'string') {
                try {
                  imgs = JSON.parse(imgs);
                } catch (err) {
                  console.error("Invalid JSON in product.images:", product.id, err);
                  imgs = [];
                }
              }
              if (Array.isArray(imgs) && imgs.length > 0) {
                processedImage = `http://192.168.43.219:5000${imgs[0].path}`;
              }
            }

            return {
              ...product,
              name: product.name || product.productName,
              stock: product.stock || product.stockQty || product.stock_qty,
              stockQty: product.stockQty || product.stock_qty || product.stock,
              image: processedImage
            };
          });

          console.log('Processed fallback products with images:', allProducts.length);
        } else {
          throw error;
        }
      }

      // Filter low stock products (stock > 0 AND stock < 4) and out of stock (stock = 0)
      const lowStockProducts = allProducts.filter(product => {
        const stock = product.stock || product.stockQty || 0;
        return stock >= 0 && stock < 4;
      });

      // Sort by stock quantity (lowest first)
      lowStockProducts.sort((a, b) => {
        const stockA = a.stock || a.stockQty || 0;
        const stockB = b.stock || b.stockQty || 0;
        return stockA - stockB;
      });

      setProducts(lowStockProducts);
      console.log('Low stock products found:', lowStockProducts.length);

    } catch (error) {
      console.error('Error fetching low stock products:', error);
      Alert.alert('Error', 'Failed to load products. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLowStockProducts();
  };

  const handleRestock = (product) => {
    setSelectedProduct(product);
    setRestockQuantity('');
    setRestockModal(true);
  };

  const confirmRestock = async () => {
    if (!selectedProduct || !restockQuantity) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    const quantity = parseInt(restockQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid positive number');
      return;
    }

    try {
      setRestockLoading(true);
      console.log('Restocking product:', selectedProduct.id, 'with quantity:', quantity);

      // Calculate new stock (current + additional)
      const currentStock = selectedProduct.stock || selectedProduct.stockQty || 0;
      const newStockQuantity = currentStock + quantity;

      // Update stock using the PATCH endpoint
      const response = await API.patch(`/products/${selectedProduct.id}/stock`, {
        stockQty: newStockQuantity
      });

      console.log('Restock response:', response.data);

      // Verify the update was successful
      if (response.data && (response.data.message || response.data.newStock !== undefined)) {
        // Update local state
        setProducts(prev =>
          prev.map(product =>
            product.id === selectedProduct.id
              ? { ...product, stock: newStockQuantity, stockQty: newStockQuantity }
              : product
          ).filter(product => {
            const stock = product.stock || product.stockQty || 0;
            return stock < 4; // Remove items that are no longer low stock
          })
        );

        Alert.alert(
          'Success',
          `✅ Successfully added ${quantity} units to ${selectedProduct.name || selectedProduct.productName}.\n\nNew stock level: ${newStockQuantity} units`,
          [{
            text: 'OK',
            onPress: () => {
              setRestockModal(false);
              // Refresh the data to ensure consistency
              fetchLowStockProducts();
            }
          }]
        );
      } else {
        throw new Error('Invalid response from server');
      }

    } catch (error) {
      console.error('Restock error:', error);

      let errorMessage = 'Failed to update stock. Please try again.';

      if (error.response) {
        // Server responded with error
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);

        if (error.response.status === 404) {
          errorMessage = 'Product not found. Please refresh and try again.';
        } else if (error.response.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.request) {
        // Network error
        console.error('Network error:', error.request);
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        console.error('Error message:', error.message);
        errorMessage = `Error: ${error.message}`;
      }

      Alert.alert('Restock Failed', errorMessage);
    } finally {
      setRestockLoading(false);
    }
  };

  const getStockStatus = (stockQty) => {
    const stock = stockQty || 0;
    if (stock === 0) {
      return { text: 'Out of Stock', color: 'text-red-600', bgColor: 'bg-red-100', iconColor: '#EF4444' };
    } else if (stock < 4) {
      return { text: 'Low Stock', color: 'text-orange-600', bgColor: 'bg-orange-100', iconColor: '#F59E0B' };
    }
    return { text: 'In Stock', color: 'text-green-600', bgColor: 'bg-green-100', iconColor: '#10B981' };
  };

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount).toLocaleString()}`;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-5 py-4 shadow-lg bg-amber-500">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 mr-4 rounded-full bg-white/20"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-xl font-bold text-white">
              Low Stock Management
            </Text>
            <Text className="text-sm text-white/90">
              {loading ? 'Loading...' : `${products.length} items need attention`}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onRefresh}
            className="p-2 rounded-full bg-white/20"
            disabled={loading}
          >
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-4 py-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View className="items-center justify-center flex-1 py-20">
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text className="mt-4 text-gray-600">Loading products...</Text>
          </View>
        ) : products.length === 0 ? (
          <View className="items-center justify-center flex-1 py-20">
            <Text className="text-gray-500">No low stock items.</Text>
          </View>
        ) : (
          <View>
            {/* Stock Categories */}
            <View className="mb-6">
              <Text className="mb-3 text-lg font-bold text-gray-900">Stock Categories</Text>
              <View className="flex-row justify-between">
                <View className="flex-1 p-3 mr-2 border border-red-200 rounded-lg bg-red-50">
                  <Text className="text-sm font-medium text-red-800">Out of Stock</Text>
                  <Text className="text-xl font-bold text-red-600">
                    {products.filter(p => (p.stock || p.stockQty || 0) === 0).length}
                  </Text>
                </View>
                <View className="flex-1 p-3 ml-2 border border-orange-200 rounded-lg bg-orange-50">
                  <Text className="text-sm font-medium text-orange-800">Low Stock (1-3)</Text>
                  <Text className="text-xl font-bold text-orange-600">
                    {products.filter(p => {
                      const stock = p.stock || p.stockQty || 0;
                      return stock > 0 && stock < 4;
                    }).length}
                  </Text>
                </View>
              </View>
            </View>

            {/* Products List */}
            <Text className="mb-4 text-lg font-bold text-gray-900">
              Products Requiring Attention
            </Text>

            {products.map((product, index) => {
              const currentStock = product.stock || product.stockQty || 0;
              const stockStatus = getStockStatus(currentStock);
              return (
                <View key={product.id || index} className="mb-4 overflow-hidden bg-white border border-gray-100 shadow-sm rounded-xl">
                  <View className="p-4">
                    <View className="flex-row items-start">
                      {/* Product Image */}
                      <View className="mr-4">
                        <Image
                          source={{
                            uri: (() => {
                              console.log(`🖼️ Processing image for ${product.name || product.productName}:`);
                              console.log(`   imageUrl: ${product.imageUrl}`);
                              console.log(`   image: ${product.image}`);
                              console.log(`   images: ${product.images}`);

                              // Try product.image first (from processed data)
                              if (product.image && product.image !== 'https://via.placeholder.com/150') {
                                if (typeof product.image === 'string' && product.image.startsWith('http')) {
                                  console.log(`   ✅ Using processed image: ${product.image}`);
                                  return product.image;
                                }
                              }

                              // Try imageUrl field
                              if (product.imageUrl) {
                                if (typeof product.imageUrl === 'string' && product.imageUrl.startsWith('http')) {
                                  console.log(`   ✅ Using imageUrl: ${product.imageUrl}`);
                                  return product.imageUrl;
                                } else if (typeof product.imageUrl === 'string') {
                                  const fullUrl = `http://192.168.43.219:5000${product.imageUrl.startsWith('/') ? product.imageUrl : '/' + product.imageUrl}`;
                                  console.log(`   ✅ Constructed URL from imageUrl: ${fullUrl}`);
                                  return fullUrl;
                                }
                              }

                              // Try images field if imageUrl doesn't work
                              if (product.images) {
                                let imgs = product.images;
                                if (typeof imgs === 'string') {
                                  try {
                                    imgs = JSON.parse(imgs);
                                  } catch (err) {
                                    console.log(`   ❌ Failed to parse images JSON: ${err.message}`);
                                    return 'https://picsum.photos/80/80?random=' + (product.id || Math.random());
                                  }
                                }
                                if (Array.isArray(imgs) && imgs.length > 0) {
                                  const firstImage = imgs[0];
                                  if (firstImage && firstImage.path) {
                                    const fullUrl = `http://192.168.43.219:5000${firstImage.path}`;
                                    console.log(`   ✅ Using images array: ${fullUrl}`);
                                    return fullUrl;
                                  }
                                }
                              }

                              console.log(`   ❌ No valid image found, using test image`);
                              // Use a test image that definitely works to verify Image component is functioning
                              return 'https://picsum.photos/80/80?random=' + (product.id || Math.random());
                            })()
                          }}
                          className="w-20 h-20 bg-gray-200 rounded-lg"
                          resizeMode="cover"
                          onError={(e) => {
                            console.log('❌ Image load FAILED for product:', product.name || product.productName);
                            console.log('   Error details:', e.nativeEvent);
                          }}
                          onLoad={() => {
                            console.log('✅ Image loaded SUCCESSFULLY for product:', product.name || product.productName);
                          }}
                        />
                      </View>

                      {/* Product Details */}
                      <View className="flex-1">
                        <Text className="mb-1 text-lg font-bold text-gray-900" numberOfLines={2}>
                          {product.name || product.productName || 'Unknown Product'}
                        </Text>
                        <Text className="mb-2 text-sm text-gray-600">
                          Category: {product.category || 'N/A'}
                        </Text>
                        <Text className="mb-2 text-base font-semibold text-purple-600">
                          {formatCurrency(product.price || 0)}
                        </Text>

                        {/* Stock Status Badge */}
                        <View className={`inline-flex flex-row items-center px-3 py-1 rounded-full ${stockStatus.bgColor} self-start`}>
                          <Ionicons
                            name={currentStock === 0 ? "close-circle" : "warning"}
                            size={16}
                            color={stockStatus.iconColor}
                          />
                          <Text className={`ml-1 text-sm font-medium ${stockStatus.color}`}>
                            {stockStatus.text}: {currentStock} units
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                      className="flex-row items-center justify-center py-3 mt-4 rounded-lg bg-amber-500"
                      onPress={() => handleRestock(product)}
                    >
                      <Ionicons name="add-circle-outline" size={20} color="white" />
                      <Text className="ml-2 font-semibold text-white">
                        Restock Product
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Restock Modal */}
      <Modal
        visible={restockModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRestockModal(false)}
      >
        <View className="justify-end flex-1 bg-black/50">
          <View className="p-6 bg-white rounded-t-3xl">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-900">
                Restock Product
              </Text>
              <TouchableOpacity
                onPress={() => setRestockModal(false)}
                className="p-2 bg-gray-100 rounded-full"
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <>
                <Text className="mb-2 text-lg font-medium text-gray-900">
                  {selectedProduct.name || selectedProduct.productName}
                </Text>
                <Text className="mb-4 text-sm text-gray-600">
                  Current Stock: {selectedProduct.stock || selectedProduct.stockQty || 0} units
                </Text>

                <Text className="mb-2 text-base font-medium text-gray-900">
                  Add Quantity:
                </Text>
                <TextInput
                  className="px-4 py-3 mb-4 text-base border border-gray-300 rounded-lg"
                  placeholder="Enter quantity to add"
                  value={restockQuantity}
                  onChangeText={setRestockQuantity}
                  keyboardType="numeric"
                  autoFocus
                />

                <View className="flex-row space-x-3">
                  <TouchableOpacity
                    className="flex-1 py-3 border border-gray-300 rounded-lg"
                    onPress={() => setRestockModal(false)}
                    disabled={restockLoading}
                  >
                    <Text className="font-semibold text-center text-gray-700">
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`flex-1 py-3 rounded-lg ${restockLoading ? 'bg-amber-400' : 'bg-amber-500'}`}
                    onPress={confirmRestock}
                    disabled={restockLoading}
                  >
                    {restockLoading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="font-semibold text-center text-white">
                        Update Stock
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}