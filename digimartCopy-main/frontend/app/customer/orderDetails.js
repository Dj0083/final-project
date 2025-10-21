import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import API from '../../api';
import { useAuth } from '../../context/AuthContext';

const OrderDetails = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingSteps, setTrackingSteps] = useState([]);

  useEffect(() => {
    if (user && params.orderId) {
      loadOrderDetails();
    }
  }, [user, params.orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/orders/${params.orderId}`);
      const orderData = response.data.order;
      
      setOrder(orderData);
      
      // Fetch detailed order items with images
      try {
        const itemsResponse = await API.get(`/orders/${params.orderId}/items`);
        setOrderItems(itemsResponse.data.items || []);
      } catch (itemsError) {
        console.error('Error loading order items:', itemsError);
        // Fallback to basic order items if detailed fetch fails
        setOrderItems(orderData.items || []);
      }
      
      // Set up tracking steps based on order status
      setTrackingSteps(getTrackingSteps(orderData.status, orderData.created_at));
    } catch (error) {
      console.error('Error loading order details:', error);
      Alert.alert('Error', 'Failed to load order details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const getTrackingSteps = (currentStatus, orderDate) => {
    const steps = [
      { 
        key: 'pending', 
        title: 'Order Placed', 
        description: 'Your order has been received',
        icon: 'checkmark-circle',
        date: orderDate
      },
      { 
        key: 'processing', 
        title: 'Processing', 
        description: 'Your order is being prepared',
        icon: 'time',
        date: null
      },
      { 
        key: 'shipped', 
        title: 'Shipped', 
        description: 'Your order is on the way',
        icon: 'car',
        date: null
      },
      { 
        key: 'delivered', 
        title: 'Delivered', 
        description: 'Your order has been delivered',
        icon: 'home',
        date: null
      }
    ];

    const statusIndex = steps.findIndex(step => step.key === currentStatus);
    return steps.map((step, index) => ({
      ...step,
      completed: index <= statusIndex,
      active: index === statusIndex
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processing': return '#F59E0B';
      case 'shipped': return '#3B82F6';
      case 'delivered': return '#10B981';
      default: return '#6B7280';
    }
  };

  const handleCancelOrder = async () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              await API.patch(`/orders/${order.id}/cancel`, {});
              Alert.alert('Success', 'Order cancelled successfully');
              router.back();
            } catch (error) {
              console.error('Cancel order error:', error);
              Alert.alert('Error', 'Failed to cancel order');
            }
          }
        }
      ]
    );
  };

  const handleViewProduct = (productId) => {
    console.log('Navigating to product with ID:', productId);
    if (!productId) {
      Alert.alert('Error', 'Product ID not found');
      return;
    }
    router.push({
      pathname: '/customer/ProductDetail',
      params: { productId: productId.toString() }
    });
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'How would you like to contact our support team?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => Linking.openURL('tel:+94701234567')
        },
        { 
          text: 'Email', 
          onPress: () => Linking.openURL('mailto:support@digimart.com')
        }
      ]
    );
  };

  const handleAddToCart = async (item) => {
    try {
      // First, get the current product details to check stock
      const productResponse = await API.get(`/products/${item.product_id || item.productId}`);
      const product = productResponse.data;
      
      if (!product) {
        Alert.alert('Error', 'Product not found');
        return;
      }

      // Check if product is out of stock
      if (product.stock_quantity <= 0) {
        Alert.alert(
          'Out of Stock',
          'This item is currently out of stock.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get current cart
      const cartData = await AsyncStorage.getItem('cart');
      let cart = cartData ? JSON.parse(cartData) : [];
      
      // Check if item already exists in cart
      const existingItemIndex = cart.findIndex(cartItem => 
        cartItem.id === (item.product_id || item.productId)
      );
      
      const currentInCart = existingItemIndex >= 0 ? cart[existingItemIndex].quantity : 0;
      const totalAvailableStock = product.stock_quantity;
      const availableToAdd = totalAvailableStock - currentInCart;
      
      // Check if we can add more items (only consider current cart, not previous orders)
      if (availableToAdd <= 0) {
        Alert.alert(
          'Cart Limit Reached',
          `You already have ${currentInCart} of this item in your cart. Available stock: ${totalAvailableStock}`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Show quantity selection dialog with available options
      const buttons = [
        { text: 'Cancel', style: 'cancel' }
      ];
      
      // Add quantity options based on available stock
      if (availableToAdd >= 1) {
        buttons.push({ 
          text: 'Add 1', 
          onPress: () => addItemToCart(item, product, 1)
        });
      }
      
      if (availableToAdd >= 5) {
        buttons.push({ 
          text: 'Add 5', 
          onPress: () => addItemToCart(item, product, 5)
        });
      }
      
      if (availableToAdd > 1) {
        buttons.push({ 
          text: `Add All (${availableToAdd})`, 
          onPress: () => addItemToCart(item, product, availableToAdd)
        });
      }
      
      Alert.alert(
        'Add to Cart',
        `Stock Available: ${totalAvailableStock}\nIn Cart: ${currentInCart}\nCan Add: ${availableToAdd}`,
        buttons
      );
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const addItemToCart = async (orderItem, productDetails, quantityToAdd) => {
    try {
      const cartData = await AsyncStorage.getItem('cart');
      let cart = cartData ? JSON.parse(cartData) : [];
      
      const productId = orderItem.product_id || orderItem.productId;
      const existingItemIndex = cart.findIndex(cartItem => cartItem.id === productId);
      
      // Calculate current quantity in cart
      const currentInCart = existingItemIndex >= 0 ? cart[existingItemIndex].quantity : 0;
      const newTotalQuantity = currentInCart + quantityToAdd;
      
      // Final check to ensure we don't exceed available stock
      if (newTotalQuantity > productDetails.stock_quantity) {
        const maxCanAdd = productDetails.stock_quantity - currentInCart;
        Alert.alert(
          'Stock Limit Exceeded',
          `Can only add ${maxCanAdd} more items. Current stock: ${productDetails.stock_quantity}, In cart: ${currentInCart}`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      const cartItem = {
        id: productId,
        name: orderItem.product_name || productDetails.name || productDetails.productName,
        price: parseFloat(orderItem.price || productDetails.price),
        image: orderItem.image || orderItem.imageUrl || productDetails.image || productDetails.imageUrl,
        sellerId: productDetails.seller_id,
        stock_quantity: productDetails.stock_quantity
      };
      
      if (existingItemIndex >= 0) {
        // Update existing item quantity
        cart[existingItemIndex].quantity = newTotalQuantity;
      } else {
        // Add new item to cart
        cart.push({ ...cartItem, quantity: quantityToAdd });
      }
      
      await AsyncStorage.setItem('cart', JSON.stringify(cart));
      
      Alert.alert(
        'Added to Cart',
        `${quantityToAdd} ${cartItem.name} added to your cart\nTotal in cart: ${newTotalQuantity}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Error saving to cart:', error);
      Alert.alert('Error', 'Failed to save item to cart');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Order Details</Text>
          <View className="w-8" />
        </View>
        <View className="items-center justify-center flex-1">
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text className="mt-4 text-gray-600">Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Order Details</Text>
          <View className="w-8" />
        </View>
        <View className="items-center justify-center flex-1">
          <Text className="text-xl font-semibold text-gray-900">Order not found</Text>
          <TouchableOpacity
            className="px-6 py-3 mt-4 bg-purple-600 rounded-lg"
            onPress={() => router.back()}
          >
            <Text className="font-semibold text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Order Details</Text>
        <TouchableOpacity onPress={handleContactSupport} className="p-2">
          <Ionicons name="headset-outline" size={24} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {/* Order Header */}
        <View className="p-4 m-4 bg-white rounded-lg shadow-sm">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xl font-bold text-gray-900">Order #{order.order_number}</Text>
            <View 
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: `${getStatusColor(order.status)}20` }}
            >
              <Text 
                className="text-sm font-medium capitalize"
                style={{ color: getStatusColor(order.status) }}
              >
                {order.status}
              </Text>
            </View>
          </View>
          
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-gray-600">Placed on {formatDate(order.created_at)}</Text>
            <Text className="text-lg font-bold text-purple-600">Rs. {order.total_amount}.00</Text>
          </View>
        </View>

        {/* Order Tracking */}
        <View className="p-4 m-4 bg-white rounded-lg shadow-sm">
          <Text className="mb-4 text-lg font-semibold text-gray-900">Order Tracking</Text>
          
          {trackingSteps.map((step, index) => (
            <View key={step.key} className="flex-row items-start mb-4 last:mb-0">
              <View className="items-center mr-3">
                <View 
                  className={`w-8 h-8 rounded-full items-center justify-center ${
                    step.completed ? 'bg-green-500' : step.active ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <Ionicons 
                    name={step.completed ? "checkmark" : step.icon} 
                    size={16} 
                    color="white" 
                  />
                </View>
                {index < trackingSteps.length - 1 && (
                  <View 
                    className={`w-0.5 h-8 mt-1 ${
                      step.completed ? 'bg-green-500' : 'bg-gray-300'
                    }`} 
                  />
                )}
              </View>
              
              <View className="flex-1">
                <Text className={`font-medium ${step.completed || step.active ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step.title}
                </Text>
                <Text className={`text-sm ${step.completed || step.active ? 'text-gray-600' : 'text-gray-400'}`}>
                  {step.description}
                </Text>
                {step.date && (
                  <Text className="text-xs text-gray-500">{formatDate(step.date)}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Order Items */}
        <View className="p-4 m-4 bg-white rounded-lg shadow-sm">
          <Text className="mb-4 text-lg font-semibold text-gray-900">Items Ordered ({orderItems.length})</Text>
          
          {orderItems.length === 0 ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text className="mt-2 text-gray-600">Loading order items...</Text>
            </View>
          ) : orderItems.map((item, index) => {
            // Handle different image path formats and field names
            let imageUri = 'https://via.placeholder.com/80x80?text=No+Image';
            const imageSource = item.image || item.imageUrl;
            
            if (imageSource && imageSource !== null && imageSource !== 'null') {
              if (imageSource.startsWith('http')) {
                imageUri = imageSource;
              } else if (imageSource.startsWith('/uploads')) {
                imageUri = `http://192.168.43.219:5000${imageSource}`;
              } else {
                imageUri = `http://192.168.43.219:5000/uploads/${imageSource}`;
              }
            }
            
            const isPlaceholder = imageUri.includes('placeholder') || !imageSource;
            
            return (
              <View key={index} className="flex-row items-start p-3 mb-3 rounded-lg bg-gray-50 last:mb-0">
                <View className="relative w-16 h-16 mr-3 overflow-hidden bg-gray-200 rounded-lg">
                  {isPlaceholder ? (
                    // Show placeholder icon when no real image
                    <View className="items-center justify-center w-full h-full bg-gray-100">
                      <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                      <Text className="mt-1 text-xs text-gray-500">No Image</Text>
                    </View>
                  ) : (
                    <Image
                      source={{ uri: imageUri }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  )}
                </View>
              
              <View className="flex-1">
                <Text className="font-medium text-gray-900" numberOfLines={2}>
                  {item.product_name}
                </Text>
                <Text className="text-sm text-gray-600">
                  Quantity: {item.quantity}
                </Text>
                <Text className="text-sm font-medium text-purple-600">
                  Rs. {item.price}.00 each
                </Text>
              </View>
              
              <View className="items-end">
                <Text className="font-semibold text-gray-900">
                  Rs. {(item.price * item.quantity).toFixed(0)}.00
                </Text>
                <View className="mt-2 space-y-1">
                  <TouchableOpacity
                    className="px-3 py-1 bg-purple-100 rounded-full"
                    onPress={() => handleViewProduct(item.product_id || item.productId)}
                  >
                    <Text className="text-xs font-medium text-purple-600">View Product</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`px-3 py-1 rounded-full ${
                      item.stock_quantity > 0 ? 'bg-green-100' : 'bg-gray-100'
                    }`}
                    onPress={() => item.stock_quantity > 0 ? handleAddToCart(item) : null}
                    disabled={item.stock_quantity <= 0}
                  >
                    <Text className={`text-xs font-medium ${
                      item.stock_quantity > 0 ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {item.stock_quantity > 0 ? 'Add to Cart' : 'Out of Stock'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            );
          })}
        </View>

        {/* Shipping Information */}
        <View className="p-4 m-4 bg-white rounded-lg shadow-sm">
          <Text className="mb-4 text-lg font-semibold text-gray-900">Shipping Information</Text>
          
          <View className="flex-row items-start mb-3">
            <Ionicons name="location-outline" size={20} color="#6B7280" />
            <View className="flex-1 ml-3">
              <Text className="font-medium text-gray-900">Delivery Address</Text>
              <Text className="text-gray-600">{order.shipping_address}</Text>
            </View>
          </View>
          
          <View className="flex-row items-start">
            <Ionicons name="card-outline" size={20} color="#6B7280" />
            <View className="flex-1 ml-3">
              <Text className="font-medium text-gray-900">Payment Method</Text>
              <Text className="text-gray-600">
                {order.payment_method === 'cash_on_delivery' ? 'Cash on Delivery' : 'Card Payment'}
              </Text>
              <Text className={`text-sm ${order.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                {order.payment_status === 'paid' ? 'Payment Completed' : 'Payment Pending'}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View className="p-4 m-4 bg-white rounded-lg shadow-sm">
          <Text className="mb-4 text-lg font-semibold text-gray-900">Order Summary</Text>
          
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Subtotal</Text>
            <Text className="text-gray-900">Rs. {(order.total_amount * 0.9).toFixed(0)}.00</Text>
          </View>
          
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Delivery Fee</Text>
            <Text className="text-gray-900">Rs. {(order.total_amount * 0.1).toFixed(0)}.00</Text>
          </View>
          
          <View className="pt-2 border-t border-gray-200">
            <View className="flex-row justify-between">
              <Text className="text-lg font-semibold text-gray-900">Total</Text>
              <Text className="text-lg font-bold text-purple-600">Rs. {order.total_amount}.00</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="p-4 m-4">
          <View className="space-y-3">
            {order.status === 'pending' && (
              <TouchableOpacity 
                className="py-3 bg-red-600 rounded-lg"
                onPress={handleCancelOrder}
              >
                <Text className="font-semibold text-center text-white">Cancel Order</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              className="py-3 border border-purple-600 rounded-lg"
              onPress={handleContactSupport}
            >
              <Text className="font-semibold text-center text-purple-600">Contact Support</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            className="py-3 mt-3 bg-purple-600 rounded-lg"
            onPress={() => router.push('/customer/customerDashboard')}
          >
            <Text className="font-semibold text-center text-white">Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default OrderDetails;