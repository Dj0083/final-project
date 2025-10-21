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
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../api';
import { useAuth } from '../../context/AuthContext';

const Orders = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    if (user && user.token) {
      loadOrders();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user || !user.token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await API.get('/orders/my-orders');
      
      // Fetch order items for each order to get product images
      const ordersWithItems = await Promise.all(
        (response.data.orders || []).map(async (order) => {
          try {
            const itemsResponse = await API.get(`/orders/${order.id}/items`);
            return {
              ...order,
              items: itemsResponse.data.items || []
            };
          } catch (error) {
            console.log('Could not fetch items for order:', order.id);
            return {
              ...order,
              items: []
            };
          }
        })
      );
      
      setOrders(ordersWithItems);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleCancelOrder = async (orderId) => {
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
              await API.patch(`/orders/${orderId}/cancel`, {});
              
              Alert.alert('Success', 'Order cancelled successfully');
              loadOrders(); // Refresh orders
            } catch (error) {
              console.error('Cancel order error:', error);
              Alert.alert('Error', 'Failed to cancel order. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    return order.status === activeTab;
  });

  // Count orders
  const orderCounts = {
    all: orders.length,
    pending: orders.filter(order => order.status === 'pending').length,
    processing: orders.filter(order => order.status === 'processing').length,
    shipped: orders.filter(order => order.status === 'shipped').length,
    delivered: orders.filter(order => order.status === 'delivered').length,
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Order History</Text>
          <View className="w-8" />
        </View>
        
        <View className="items-center justify-center flex-1 px-6">
          <Ionicons name="log-in-outline" size={64} color="#9CA3AF" />
          <Text className="mt-4 text-xl font-bold text-gray-900">Login Required</Text>
          <Text className="mt-2 text-center text-gray-600">
            Please login to view your order history
          </Text>
          <TouchableOpacity
            className="px-6 py-3 mt-6 bg-purple-600 rounded-lg"
            onPress={() => router.push('/login')}
          >
            <Text className="font-semibold text-white">Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processing':
        return <Ionicons name="time" size={16} color="#F59E0B" />;
      case 'shipped':
        return <Ionicons name="car" size={16} color="#3B82F6" />;
      case 'delivered':
        return <Ionicons name="checkmark-circle" size={16} color="#10B981" />;
      default:
        return <Ionicons name="time" size={16} color="#6B7280" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'processing': return 'Processing';
      case 'shipped': return 'Shipped';
      case 'delivered': return 'Delivered';
      default: return 'Pending';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processing': return '#F59E0B';
      case 'shipped': return '#3B82F6';
      case 'delivered': return '#10B981';
      default: return '#6B7280';
    }
  };

  // Tab list
  const tabs = [
    { key: 'all', label: 'All', icon: 'layers-outline', count: orderCounts.all },
    { key: 'pending', label: 'Pending', icon: 'time-outline', count: orderCounts.pending },
    { key: 'processing', label: 'Processing', icon: 'time-outline', count: orderCounts.processing },
    { key: 'shipped', label: 'Shipped', icon: 'car-outline', count: orderCounts.shipped },
    { key: 'delivered', label: 'Delivered', icon: 'checkmark-done-outline', count: orderCounts.delivered },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View className="items-center flex-1">
            <Text className="text-lg font-semibold text-gray-900">Order History</Text>
            <Text className="text-sm text-gray-500">{orders.length} total orders</Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/customer/customerDashboard')}
            className="p-2"
          >
            <Ionicons name="add-circle-outline" size={24} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Order Status Tabs with horizontal scroll */}
      <View className="bg-white border-b border-gray-200">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8 }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                className={`flex-row items-center px-4 py-2 mx-1 rounded-full ${
                  isActive ? 'bg-purple-600' : 'bg-gray-100'
                }`}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={isActive ? '#fff' : '#6B7280'}
                />
                <Text
                  className={`ml-1 text-sm font-medium ${
                    isActive ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {tab.label}
                </Text>
                <View
                  className={`ml-2 px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-purple-500' : 'bg-gray-300'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isActive ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Orders List */}
      <ScrollView 
        className="flex-1 px-4 py-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text className="mt-4 text-gray-600">Loading orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View className="items-center justify-center py-20">
            <View className="items-center justify-center w-20 h-20 bg-purple-100 rounded-full">
              <Ionicons name="receipt-outline" size={32} color="#9333EA" />
            </View>
            <Text className="mt-4 text-xl font-semibold text-gray-800">No orders yet</Text>
            <Text className="mt-2 text-center text-gray-500">
              {activeTab === 'all'
                ? "You haven't placed any orders yet."
                : `You don't have any ${activeTab} orders.`}
            </Text>
            <TouchableOpacity
              className="px-6 py-3 mt-6 bg-purple-600 rounded-lg"
              onPress={() => router.push('/customer/customerDashboard')}
            >
              <Text className="font-semibold text-white">Start Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <View key={order.id} className="p-4 mb-4 bg-white border border-gray-100 shadow-sm rounded-xl">
              {/* Order Header */}
              <View className="flex-row items-start justify-between mb-4">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900">Order #{order.order_number}</Text>
                  <Text className="mt-1 text-sm text-gray-500">{formatDate(order.created_at)}</Text>
                  <View className="flex-row items-center mt-2">
                    <Text className="text-sm font-medium text-purple-600">Rs. {order.total_amount}.00</Text>
                    <Text className="ml-3 text-xs text-gray-500">• {order.items_count} items</Text>
                  </View>
                </View>
                <View 
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: `${getStatusColor(order.status)}20` }}
                >
                  <View className="flex-row items-center">
                    {getStatusIcon(order.status)}
                    <Text
                      className="ml-1 text-xs font-medium capitalize"
                      style={{ color: getStatusColor(order.status) }}
                    >
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Product Images Preview */}
              {order.items && order.items.length > 0 && (
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-medium text-gray-700">Items Preview</Text>
                  <View className="flex-row items-center">
                    {order.items.slice(0, 3).map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        className="mr-2"
                        onPress={() => router.push({
                          pathname: '/customer/ProductDetail',
                          params: { productId: item.product_id }
                        })}
                      >
                        <Image
                          source={{ 
                            uri: item.image ? `http://192.168.43.219:5000${item.image}` : 'https://via.placeholder.com/60x60'
                          }}
                          className="w-12 h-12 bg-gray-200 border border-gray-200 rounded-lg"
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                    {order.items.length > 3 && (
                      <View className="items-center justify-center w-12 h-12 bg-purple-100 rounded-lg">
                        <Text className="text-xs font-semibold text-purple-600">+{order.items.length - 3}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      className="ml-auto"
                      onPress={() => router.push({
                        pathname: '/customer/orderDetails',
                        params: { orderId: order.id }
                      })}
                    >
                      <View className="flex-row items-center px-3 py-1 rounded-full bg-purple-50">
                        <Text className="text-xs font-medium text-purple-600">View All</Text>
                        <Ionicons name="chevron-forward" size={12} color="#8B5CF6" />
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Order Details */}
              <View className="p-3 mb-4 rounded-lg bg-gray-50">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Ionicons name="location-outline" size={14} color="#6B7280" />
                    <Text className="ml-1 text-xs text-gray-600">Delivery Address</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="card-outline" size={14} color="#6B7280" />
                    <Text className="ml-1 text-xs text-gray-600">
                      {order.payment_status === 'paid' ? 'Paid' : 'Pending'}
                    </Text>
                  </View>
                </View>
                <Text className="text-sm text-gray-700" numberOfLines={2}>
                  {order.shipping_address}
                </Text>
                <Text className="mt-1 text-xs text-gray-500">
                  Payment: {order.payment_method === 'cash_on_delivery' ? 'Cash on Delivery' : 'Card Payment'}
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="space-y-2">
                <View className="flex-row space-x-3">
                  <TouchableOpacity 
                    className="flex-1 py-3 border border-purple-200 rounded-lg bg-purple-50"
                    onPress={() => router.push({
                      pathname: '/customer/orderDetails',
                      params: { orderId: order.id }
                    })}
                  >
                    <View className="flex-row items-center justify-center">
                      <Ionicons name="eye-outline" size={16} color="#8B5CF6" />
                      <Text className="ml-1 text-sm font-semibold text-purple-600">View Details</Text>
                    </View>
                  </TouchableOpacity>
                </View>
                
                {/* Second row of action buttons */}
                <View className="flex-row space-x-3">
                  {order.status === 'delivered' && (
                    <TouchableOpacity 
                      className="flex-1 py-3 bg-green-600 rounded-lg"
                      onPress={() => {
                        // Navigate to first product to leave review
                        if (order.items && order.items.length > 0) {
                          router.push({
                            pathname: '/customer/ProductDetail',
                            params: { productId: order.items[0].product_id }
                          });
                        }
                      }}
                    >
                      <View className="flex-row items-center justify-center">
                        <Ionicons name="star-outline" size={16} color="white" />
                        <Text className="ml-1 text-sm font-semibold text-white">Leave Review</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  
                  {order.status === 'pending' && (
                    <TouchableOpacity 
                      className="flex-1 py-3 bg-red-600 rounded-lg"
                      onPress={() => handleCancelOrder(order.id)}
                    >
                      <View className="flex-row items-center justify-center">
                        <Ionicons name="close-circle-outline" size={16} color="white" />
                        <Text className="ml-1 text-sm font-semibold text-white">Cancel Order</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Enhanced Bottom Navigation */}
      <View className="flex-row items-center justify-between px-4 py-2 bg-white border-t border-gray-200 shadow-lg">
        <TouchableOpacity 
          className="items-center px-4 py-2"
          onPress={() => router.push('/customer/customerDashboard')}
        >
          <View className="items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
            <Ionicons name="home-outline" size={20} color="#6B7280" />
          </View>
          <Text className="mt-1 text-xs text-gray-600">Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="items-center px-4 py-2"
          onPress={() => router.push('/customer/cart')}
        >
          <View className="items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
            <Ionicons name="cart-outline" size={20} color="#6B7280" />
          </View>
          <Text className="mt-1 text-xs text-gray-600">Cart</Text>
        </TouchableOpacity>
        
        <TouchableOpacity className="items-center px-4 py-2">
          <View className="items-center justify-center w-8 h-8 bg-purple-600 rounded-full">
            <Ionicons name="receipt-outline" size={20} color="white" />
          </View>
          <Text className="mt-1 text-xs font-medium text-purple-600">Orders</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="items-center px-4 py-2"
          onPress={() => router.push('/customer/favorites')}
        >
          <View className="items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
            <Ionicons name="heart-outline" size={20} color="#6B7280" />
          </View>
          <Text className="mt-1 text-xs text-gray-600">Favorites</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="items-center px-4 py-2"
          onPress={() => router.push('/customer/profile')}
        >
          <View className="items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
            <Ionicons name="person-outline" size={20} color="#6B7280" />
          </View>
          <Text className="mt-1 text-xs text-gray-600">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default Orders;
