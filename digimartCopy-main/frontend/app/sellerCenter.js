import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import API from '../api';

export default function SellerCenter() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('Good Morning');
  const [businessLogo, setBusinessLogo] = useState('https://via.placeholder.com/150');
  const [businessName, setBusinessName] = useState('Your Store');
  
  // Real data states
  const [todaysOrders, setTodaysOrders] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    if (user?.businessDetails) {
      setBusinessName(user.businessDetails.businessName);
      if (user.businessDetails.businessImage) {
        setBusinessLogo(user.businessDetails.businessImage);
      }
    }
    
    // Fetch real data when user is available
    if (user) {
      fetchSellerStats();
    }
  }, [user]);

  const loadUnread = useCallback(async () => {
    try {
      let stored = {};
      try {
        const raw = await AsyncStorage.getItem('seller_msg_last_seen');
        if (raw) stored = JSON.parse(raw);
      } catch (_) {}
      const reqResp = await API.get('/investment-requests/seller/requests', { params: { status: 'all' } });
      const reqs = Array.isArray(reqResp?.data?.requests) ? reqResp.data.requests : [];
      let count = 0;
      for (const r of reqs.slice(0, 20)) {
        try {
          const msgsResp = await API.get(`/investment-requests/${r.id}/messages`);
          const msgs = Array.isArray(msgsResp?.data?.messages) ? msgsResp.data.messages : [];
          const last = msgs.length > 0 ? msgs[msgs.length - 1] : null;
          const lastISO = last?.created_at || r.updated_at || r.created_at;
          const lastTs = lastISO ? new Date(lastISO).getTime() : 0;
          const seenTs = Number(stored[String(r.id)] || 0);
          if (lastTs > seenTs) count += 1;
        } catch (_) {}
      }
      setUnreadCount(count);
    } catch (_) {}
  }, []);

  useFocusEffect(useCallback(() => { loadUnread(); const t = setInterval(() => loadUnread(), 15000); return () => clearInterval(t); }, [loadUnread]));

  // Fetch real seller statistics
  const fetchSellerStats = async () => {
    try {
      setLoading(true);
      console.log('Fetching seller stats...');
      
      // Fetch today's orders
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      // Fetch orders for this seller with error handling
      let allOrders = [];
      try {
        console.log('🔄 Fetching seller orders...');
        const ordersResponse = await API.get('/orders/seller');
        allOrders = ordersResponse.data.orders || [];
        console.log('✅ Orders fetched:', allOrders.length);
      } catch (ordersError) {
        console.log('❌ Orders endpoint failed:', ordersError.response?.status, ordersError.message);
        console.log('⚠️ Using empty orders array');
        allOrders = [];
      }
      
      // Filter today's orders
      const todayOrders = allOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= todayStart;
      });
      
      // Calculate monthly revenue (current month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyOrders = allOrders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.getMonth() === currentMonth && 
               orderDate.getFullYear() === currentYear &&
               (order.status === 'delivered' || order.status === 'confirmed');
      });
      
      const monthlyRevenue = monthlyOrders.reduce((sum, order) => {
        return sum + parseFloat(order.total_amount || 0);
      }, 0);
      
      // Fetch seller's products count with fallback endpoints
      let sellerProducts = [];
      try {
        console.log('🔄 Trying inventory endpoint...');
        const productsResponse = await API.get('/products/inventory');
        const categorizedProducts = productsResponse.data;
        sellerProducts = [
          ...(categorizedProducts.Active || []),
          ...(categorizedProducts['Out of Stock'] || []),
          ...(categorizedProducts.Violation || [])
        ];
        console.log('✅ Products fetched from inventory endpoint:', sellerProducts.length);
      } catch (inventoryError) {
        console.log('❌ Inventory endpoint failed:', inventoryError.response?.status, inventoryError.message);
        
        try {
          // Fallback to general products endpoint
          console.log('🔄 Trying general products endpoint as fallback...');
          const fallbackResponse = await API.get('/products');
          const allProducts = fallbackResponse.data.products || [];
          
          console.log('📊 Total products in system:', allProducts.length);
          console.log('👤 Current user ID:', user?.id);
          
          // Filter by seller - try multiple seller ID fields
          sellerProducts = allProducts.filter(product => {
            return product.sellerId === user?.id || 
                   product.userId === user?.id || 
                   product.seller_id === user?.id || 
                   product.user_id === user?.id ||
                   product.sellerId === user?.id?.toString() ||
                   product.userId === user?.id?.toString();
          });
          
          console.log('✅ Filtered seller products:', sellerProducts.length);
          
        } catch (fallbackError) {
          console.log('❌ Fallback endpoint also failed:', fallbackError.response?.status);
          console.log('⚠️ Using empty products array');
          sellerProducts = [];
        }
      }
      
      // Calculate low stock products (stock > 0 AND stock < 4) and out of stock (stock = 0)
      // Combine both categories for the low stock management section
      const outOfStockProducts = sellerProducts.filter(product => 
        (product.stock || product.stockQty) === 0 || (product.stock || product.stockQty) === null
      );
      const criticalStockProducts = sellerProducts.filter(product => 
        (product.stock || product.stockQty) > 0 && (product.stock || product.stockQty) < 4
      );
      
      // Combine out of stock and low stock products for display
      const allLowStockProducts = [...outOfStockProducts, ...criticalStockProducts];
      
      // Sort by stock quantity (lowest first - out of stock, then low stock)
      allLowStockProducts.sort((a, b) => {
        const stockA = a.stock || a.stockQty || 0;
        const stockB = b.stock || b.stockQty || 0;
        return stockA - stockB;
      });
      
      // Limit to top 5 most critical for seller center display
      const topLowStockProducts = allLowStockProducts.slice(0, 5);
      
      console.log('Out of stock products:', outOfStockProducts.length);
      console.log('Low stock products (1-3 items):', criticalStockProducts.length);
      console.log('Top critical products for display:', topLowStockProducts.length);
      
      // Update states
      setTodaysOrders(todayOrders.length);
      setMonthlyRevenue(monthlyRevenue);
      setTotalProducts(sellerProducts.length);
      setLowStockCount(allLowStockProducts.length);
      setLowStockProducts(topLowStockProducts);
      
    } catch (error) {
      console.error('❌ Error fetching seller stats:', error.response?.status, error.message);
      
      // Only show critical errors to user
      if (error.response?.status === 401) {
        Alert.alert('Authentication Error', 'Please login again to continue.');
      } else {
        // Log other errors but don't show to user - use default values instead
        console.warn('⚠️ Stats fetch failed, using default values. Error:', error.response?.status || error.message);
      }
      
      // Set safe default values on error
      setTodaysOrders(0);
      setMonthlyRevenue(0);
      setTotalProducts(0);
      setLowStockCount(0);
      setLowStockProducts([]);
      
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format currency
  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount || 0).toLocaleString()}`;
  };

  // Helper function to get stock status similar to customerDashboard
  const getStockStatus = (stockQty) => {
    const stock = stockQty || 0;
    if (stock === 0) {
      return { 
        text: 'Out of Stock', 
        color: 'text-red-600', 
        bgColor: 'bg-red-100', 
        iconColor: '#EF4444',
        iconName: 'close-circle'
      };
    } else if (stock < 4) {
      return { 
        text: 'Low Stock', 
        color: 'text-orange-600', 
        bgColor: 'bg-orange-100', 
        iconColor: '#F59E0B',
        iconName: 'warning'
      };
    }
    return { 
      text: 'In Stock', 
      color: 'text-green-600', 
      bgColor: 'bg-green-100', 
      iconColor: '#10B981',
      iconName: 'checkmark-circle'
    };
  };

  const mainActions = [
    { id: 1, title: 'Low Stock Alert', icon: 'alert-circle', route: '/low-stock-management' },
    { id: 2, title: 'Add New Product', icon: 'add-circle', route: '/add-product' },
    { id: 3, title: 'View All Orders', icon: 'cube-outline', route: '/orders' },
  ];

  const otherActions = [
    { id: 1, title: 'Sales Report', icon: 'bar-chart-outline', route: '/sales-report' },
    { id: 2, title: 'Inventory', icon: 'archive-outline', route: '/inventory' },
    { id: 3, title: 'Manage Order', icon: 'chatbubbles-outline', route: '/manageOrder' },
    { id: 4, title: 'Profile', icon: 'person-outline', route: '/profile' },
  ];

  const handleNavigation = (route) => {
    try {
      console.log('Navigating to:', route);
      router.push(route);
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', `Failed to navigate to ${route}: ${error.message}`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-orange-400">
      {/* Header */}
      <View className="px-5 py-6 bg-orange-400">
        <View className="flex-row items-center mb-6">
          <View className="items-center justify-center w-16 h-16 mr-4 overflow-hidden rounded-lg bg-white/20">
            {user?.businessDetails?.businessImage ? (
              <Image 
                source={{ uri: `http://192.168.43.219:5000${user.businessDetails.businessImage}` }} 
                className="w-full h-full" 
                resizeMode="cover" 
              />
            ) : (
              <Ionicons name="business" size={32} color="white" />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-xl font-bold text-white">
              {greeting}!
            </Text>
            <Text className="text-lg text-white/90">
              {user?.businessDetails?.businessName || user?.name || 'Your Business'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleNavigation('/seller/notifications')} style={{ position: 'relative' }}>
            <Ionicons name="notifications-outline" size={28} color="white" />
            <View style={{ position: 'absolute', top: -4, right: -8, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' }}>
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{unreadCount}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View className="flex-row justify-between">
          <View className="flex-1 p-4 mr-2 bg-white/20 rounded-2xl">
            <Text className="text-2xl font-bold text-white">
              {loading ? '--' : todaysOrders}
            </Text>
            <Text className="text-sm text-white/90">Today's Orders</Text>
          </View>
          <View className="flex-1 p-4 mx-2 bg-white/20 rounded-2xl">
            <Text className="text-2xl font-bold text-white">
              {loading ? '--' : `Rs.${monthlyRevenue.toLocaleString()}`}
            </Text>
            <Text className="text-sm text-white/90">This Month</Text>
          </View>
          <View className="flex-1 p-4 ml-2 bg-white/20 rounded-2xl">
            <Text className="text-2xl font-bold text-white">
              {loading ? '--' : totalProducts}
            </Text>
            <Text className="text-sm text-white/90">Products</Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1 pt-6 bg-white rounded-t-3xl">
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Main Actions */}
          <View className="px-5 mb-6">
            <Text className="mb-4 text-xl font-bold text-gray-900">
              Quick Actions
            </Text>
            {mainActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                className="flex-row items-center p-5 mb-3 border border-orange-200 bg-orange-50 rounded-2xl"
                onPress={() => handleNavigation(action.route)}
                activeOpacity={0.7}
              >
                <View className="items-center justify-center mr-4 bg-orange-500 w-14 h-14 rounded-2xl">
                  <Ionicons name={action.icon} size={28} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900">
                    {action.title}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#666" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Other Actions */}
          <View className="px-5 mb-6">
            <Text className="mb-4 text-xl font-bold text-gray-900">
              More Options
            </Text>
            <View className="p-1 bg-gray-50 rounded-2xl">
              {otherActions.map((action, index) => (
                <TouchableOpacity
                  key={action.id}
                  className={`flex-row items-center p-4 ${
                    index !== otherActions.length - 1 ? 'border-b border-gray-200' : ''
                  }`}
                  onPress={() => handleNavigation(action.route)}
                  activeOpacity={0.6}
                >
                  <View className="items-center justify-center w-10 h-10 mr-4 bg-gray-600 rounded-full">
                    <Ionicons name={action.icon} size={20} color="white" />
                  </View>
                  <Text className="flex-1 text-base font-medium text-gray-900">
                    {action.title}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bottom Spacing */}
          <View className="h-10" />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}