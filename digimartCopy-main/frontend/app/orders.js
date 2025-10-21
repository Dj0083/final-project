import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import API from "../api";
import { useAuth } from "../context/AuthContext";

export default function ViewOrders() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState("All");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filters = ["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Rejected"];

  // Fetch real orders from API
  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      console.log('Fetching orders...');
      
      // Determine API endpoint based on user role
      const endpoint = user.role === 'seller' ? '/orders/seller' : 
                     user.role === 'admin' ? '/orders' : '/orders/my-orders';
      
      const response = await API.get(endpoint);
      console.log('Orders response:', response.data);
      
      if (response.data && response.data.orders) {
        setOrders(response.data.orders);
        console.log('Orders loaded:', response.data.orders.length);
      } else {
        setOrders([]);
        console.log('No orders found');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (error.response?.status === 403) {
        Alert.alert('Access Denied', 'You do not have permission to view orders.');
      } else {
        Alert.alert('Error', 'Failed to load orders. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh orders
  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return "bg-yellow-500";
      case 'processing':
        return "bg-indigo-500";
      case 'shipped':
        return "bg-purple-500";
      case 'delivered':
        return "bg-green-500";
      case 'cancelled':
        return "bg-red-500";
      case 'rejected':
        return "bg-red-700";
      default:
        return "bg-gray-500";
    }
  };

  const filteredOrders = useMemo(() => {
    if (activeFilter === "All") return orders;
    return orders.filter((order) => order.status?.toLowerCase() === activeFilter.toLowerCase());
  }, [activeFilter, orders]);

  const OrderItem = ({ item }) => (
    <View className="p-4 mx-5 mb-4 bg-white shadow rounded-2xl">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900">
            Order #{item.order_number || item.id}
          </Text>
          <Text className="mt-1 text-sm text-gray-500">
            {formatDate(item.created_at)}
          </Text>
        </View>
        <View className={`px-3 py-1 rounded-full ${getStatusColor(item.status)}`}>
          <Text className="text-xs font-semibold text-white">
            {item.status?.toUpperCase()}
          </Text>
        </View>
      </View>

      <View className="pt-3 border-t border-gray-200">
        <Text className="mb-1 text-base font-semibold text-gray-900">
          {item.customer_name || 'N/A'}
        </Text>
        <Text className="mb-2 text-sm text-gray-600">
          {item.shipping_address || 'N/A'}
        </Text>

        {/* Order Items with Images */}
        <Text className="mb-2 text-sm font-medium text-gray-700">Order Items:</Text>
        {item.items && item.items.map((orderItem, index) => (
          <View key={index} className="flex-row items-center p-2 mb-2 rounded-lg bg-gray-50">
            {/* Product Image */}
            <View className="mr-3">
              <Image
                source={{ 
                  uri: orderItem.image 
                    ? `http://192.168.43.219:5000${orderItem.image}` 
                    : 'https://via.placeholder.com/50x50?text=No+Image'
                }}
                className="w-12 h-12 rounded-lg"
                resizeMode="cover"
                defaultSource={{ uri: 'https://via.placeholder.com/50x50?text=Loading' }}
              />
            </View>
            
            {/* Product Details */}
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-900" numberOfLines={2}>
                {orderItem.product_name || orderItem.productName || 'Unknown Product'}
              </Text>
              <Text className="text-xs text-gray-600">
                Qty: {orderItem.quantity} × Rs.{parseFloat(orderItem.price).toFixed(2)}
              </Text>
              <Text className="text-xs font-medium text-purple-600">
                Subtotal: Rs.{parseFloat(orderItem.subtotal).toFixed(2)}
              </Text>
            </View>
          </View>
        ))}

        <View className="mt-3">
          <Text className="text-lg font-bold text-right text-orange-600">
            Total: Rs.{parseFloat(item.total_amount).toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-orange-400">
      {/* Header */}
      <View className="px-5 py-4 bg-orange-400 shadow-md rounded-b-3xl">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </Pressable>
          <Text className="absolute left-0 right-0 text-xl font-bold text-center text-white">
            Orders
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Filter Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          className="flex-row px-1 mt-4"
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              className={`px-5 py-2 rounded-full mr-3 ${
                activeFilter === filter ? "bg-white" : "bg-orange-300"
              }`}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                className={`font-medium text-sm ${
                  activeFilter === filter ? "text-orange-600" : "text-white"
                }`}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Orders List */}
      <View className="flex-1 bg-white">
        {loading ? (
          <View className="items-center justify-center flex-1">
            <ActivityIndicator size="large" color="#fb923c" />
            <Text className="mt-4 text-lg font-semibold text-gray-600">
              Loading orders...
            </Text>
          </View>
        ) : filteredOrders.length > 0 ? (
          <FlatList
            data={filteredOrders}
            renderItem={({ item }) => <OrderItem item={item} />}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 20 }}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        ) : (
          <View className="items-center justify-center flex-1 px-5">
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text className="mt-4 text-lg font-semibold text-center text-gray-600">
              No orders found for &quot;{activeFilter}&quot;
            </Text>
            <Text className="mt-2 text-sm text-center text-gray-400">
              Orders will appear here once customers place them
            </Text>
            <TouchableOpacity onPress={handleRefresh} className="px-4 py-2 mt-4 bg-orange-100 rounded-xl">
              <Text className="text-sm font-medium text-orange-600">
                Refresh
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}