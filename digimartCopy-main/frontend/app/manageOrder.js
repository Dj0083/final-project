import { View, Text, ScrollView, Pressable, Image, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import API from "../api";
import { useAuth } from "../context/AuthContext";

export default function ManageOrder() {
  const router = useRouter();
  const { user } = useAuth();

  // Real order data
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch real orders from API
  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      console.log('Fetching orders for seller...');
      
      // Get seller-specific orders using the new endpoint
      const response = await API.get('/orders/seller');
      console.log('Seller orders response:', response.data);
      
      if (response.data && response.data.orders) {
        setOrders(response.data.orders);
        console.log('Seller orders loaded:', response.data.orders.length);
      } else {
        setOrders([]);
        console.log('No orders found for seller');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (error.response?.status === 403) {
        Alert.alert('Access Denied', 'You need to be a seller to view orders. Please check your account role.');
      } else {
        Alert.alert('Error', 'Failed to load orders. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle Accept Order
  const handleAccept = async (orderId) => {
    try {
      console.log('Accepting order:', orderId);
      
      // Use the new accept endpoint
      const response = await API.patch(`/orders/${orderId}/accept`);
      
      if (response.data.success) {
        // Update local state
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId ? { ...order, status: "confirmed" } : order
          )
        );
        
        Alert.alert('Success', response.data.message || 'Order accepted successfully!');
      } else {
        Alert.alert('Error', response.data.message || 'Failed to accept order');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      
      if (error.response?.data?.error) {
        Alert.alert('Error', error.response.data.error);
      } else {
        Alert.alert('Error', 'Failed to accept order. Please try again.');
      }
    }
  };

  // Handle Reject Order
  const handleReject = async (orderId) => {
    Alert.alert(
      'Reject Order',
      'Are you sure you want to reject this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Rejecting order:', orderId);
              
              // Use the new reject endpoint
              const response = await API.patch(`/orders/${orderId}/reject`, {
                reason: 'Order rejected by seller'
              });
              
              if (response.data.success) {
                // Update local state
                setOrders((prev) =>
                  prev.map((order) =>
                    order.id === orderId ? { ...order, status: "rejected" } : order
                  )
                );
                
                Alert.alert('Success', response.data.message || 'Order rejected successfully!');
              } else {
                Alert.alert('Error', response.data.message || 'Failed to reject order');
              }
            } catch (error) {
              console.error('Error rejecting order:', error);
              
              if (error.response?.data?.error) {
                Alert.alert('Error', error.response.data.error);
              } else {
                Alert.alert('Error', 'Failed to reject order. Please try again.');
              }
            }
          }
        }
      ]
    );
  };

  // Handle Status Update (Shipped / Delivered)
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      console.log('Updating order status:', orderId, 'to:', newStatus);
      
      const response = await API.patch(`/orders/${orderId}/status`, { status: newStatus });
      
      // Update local state
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      
      Alert.alert('Success', `Order marked as ${newStatus} successfully!`);
    } catch (error) {
      console.error('Error updating order status:', error);
      
      if (error.response?.data?.error) {
        Alert.alert('Error', error.response.data.error);
      } else {
        Alert.alert('Error', `Failed to mark order as ${newStatus}. Please try again.`);
      }
    }
  };



  // Refresh orders
  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'text-yellow-600';
      case 'confirmed':
        return 'text-blue-600';
      case 'processing':
        return 'text-indigo-600';
      case 'shipped':
        return 'text-purple-600';
      case 'delivered':
        return 'text-green-600';
      case 'cancelled':
        return 'text-red-600';
      case 'rejected':
        return 'text-red-700';
      default:
        return 'text-gray-600';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <SafeAreaView className="flex-1 bg-orange-400">
      {/* Header */}
      <View className="px-5 py-4 bg-orange-400 shadow-md rounded-b-3xl">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </Pressable>
          <Text className="absolute left-0 right-0 text-xl font-bold text-center text-white">
            Manage Orders
          </Text>
          <View style={{ width: 28 }} />
        </View>
      </View>

      {/* Orders List */}
      <ScrollView
        className="flex-1 bg-pink-50 rounded-t-3xl"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <View>
            <Pressable onPress={handleRefresh} className="p-2">
              <Text className="text-center text-gray-600">Pull to refresh</Text>
            </Pressable>
          </View>
        }
      >
        {loading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#fb923c" />
            <Text className="mt-4 text-gray-600">Loading orders...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
            <Text className="mt-4 text-lg font-semibold text-gray-600">No Orders Found</Text>
            <Text className="mt-2 text-center text-gray-500">
              Orders from customers will appear here
            </Text>
          </View>
        ) : (
          orders.map((order) => (
            <View
              key={order.id}
              className="p-4 mb-4 bg-white shadow-lg rounded-2xl"
            >
              {/* Order Header */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-bold text-gray-800">
                  Order #{order.order_number || order.id}
                </Text>
                <Text className={`font-semibold ${getStatusColor(order.status)}`}>
                  {order.status?.toUpperCase()}
                </Text>
              </View>

              {/* Customer Info */}
              <View className="p-3 mb-3 rounded-lg bg-gray-50">
                <Text className="text-sm font-medium text-gray-700">Customer Details:</Text>
                <Text className="text-sm text-gray-600">Name: {order.customer_name || 'N/A'}</Text>
                <Text className="text-sm text-gray-600">Phone: {order.customer_phone || 'N/A'}</Text>
                <Text className="text-sm text-gray-600">
                  Address: {order.shipping_address || 'N/A'}
                </Text>
                <Text className="text-sm text-gray-600">
                  Date: {formatDate(order.created_at)}
                </Text>
              </View>

              {/* Order Items with Images */}
              <Text className="mb-2 text-sm font-medium text-gray-700">Order Items:</Text>
              {order.items && order.items.map((item, index) => (
                <View key={index} className="flex-row items-center p-3 mb-2 rounded-lg bg-gray-50">
                  {/* Product Image */}
                  <View className="mr-3">
                    <Image
                      source={{ 
                        uri: item.image 
                          ? `http://192.168.43.219:5000${item.image}` 
                          : 'https://via.placeholder.com/60x60?text=No+Image'
                      }}
                      className="w-16 h-16 rounded-lg"
                      resizeMode="cover"
                      defaultSource={{ uri: 'https://via.placeholder.com/60x60?text=Loading' }}
                    />
                  </View>
                  
                  {/* Product Details */}
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900" numberOfLines={2}>
                      {item.product_name || item.productName || 'Unknown Product'}
                    </Text>
                    <Text className="text-xs text-gray-600">
                      Quantity: {item.quantity} × Rs.{parseFloat(item.price).toFixed(2)}
                    </Text>
                    <Text className="text-xs font-medium text-purple-600">
                      Subtotal: Rs.{parseFloat(item.subtotal).toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Total Amount */}
              <View className="pt-3 mt-3 border-t border-gray-200">
                <Text className="text-lg font-bold text-right text-gray-900">
                  Total: Rs.{parseFloat(order.total_amount).toFixed(2)}
                </Text>
                <Text className="text-sm text-right text-gray-600">
                  Payment: {order.payment_method?.replace('_', ' ') || 'N/A'}
                </Text>
              </View>

              {/* Action Buttons */}
              {order.status === "pending" && (
                <View className="flex-row mt-4">
                  <Pressable
                    onPress={() => handleAccept(order.id)}
                    className="flex-1 px-4 py-3 mr-2 bg-green-500 rounded-xl"
                  >
                    <Text className="font-semibold text-center text-white">
                      Accept Order
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleReject(order.id)}
                    className="flex-1 px-4 py-3 ml-2 bg-red-500 rounded-xl"
                  >
                    <Text className="font-semibold text-center text-white">
                      Reject Order
                    </Text>
                  </Pressable>
                </View>
              )}

              {order.status === "confirmed" && (
                <View className="mt-4">
                  <View className="flex-row mb-2">
                    <Pressable
                      onPress={() => handleStatusUpdate(order.id, "processing")}
                      className="flex-1 px-4 py-3 mr-1 bg-indigo-500 rounded-xl"
                    >
                      <Text className="font-semibold text-center text-white">
                        Start Processing
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleStatusUpdate(order.id, "shipped")}
                      className="flex-1 px-4 py-3 mx-1 bg-purple-500 rounded-xl"
                    >
                      <Text className="font-semibold text-center text-white">
                        Shipped
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleStatusUpdate(order.id, "delivered")}
                      className="flex-1 px-4 py-3 ml-1 bg-green-600 rounded-xl"
                    >
                      <Text className="font-semibold text-center text-white">
                        Delivered
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {order.status === "processing" && (
                <View className="mt-4">
                  <View className="flex-row mb-2">
                    <Pressable
                      onPress={() => handleStatusUpdate(order.id, "shipped")}
                      className="flex-1 px-4 py-3 mr-2 bg-purple-500 rounded-xl"
                    >
                      <Text className="font-semibold text-center text-white">
                        Shipped
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleStatusUpdate(order.id, "delivered")}
                      className="flex-1 px-4 py-3 ml-2 bg-green-600 rounded-xl"
                    >
                      <Text className="font-semibold text-center text-white">
                        Delivered
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {order.status === "shipped" && (
                <View className="mt-4">
                  <Pressable
                    onPress={() => handleStatusUpdate(order.id, "delivered")}
                    className="w-full px-4 py-3 bg-green-600 rounded-xl"
                  >
                    <Text className="font-semibold text-center text-white">
                      Mark as Delivered
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
