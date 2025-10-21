import React, { useEffect, useState } from "react";
import { 
  View, Text, TouchableOpacity, 
  ScrollView, SafeAreaView, Image, Alert,
  ActivityIndicator, RefreshControl
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import API from "../../api";
import { useAuth } from "../../context/AuthContext";

export default function Favorites() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = async () => {
    if (!user || !user.token) {
      setLoading(false);
      return;
    }

    try {
      const response = await API.get('/products/user/favorites');
      setFavorites(response.data.favorites || []);
    } catch (error) {
      console.error('Error fetching favorites:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to load favorites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const removeFromFavorites = async (productId) => {
    if (!user || !user.token) {
      Alert.alert('Login Required', 'Please login to manage favorites');
      return;
    }

    try {
      await API.delete(`/products/${productId}/favorite`);
      
      // Remove from local state
      setFavorites(prevFavorites => 
        prevFavorites.filter(item => item.id !== productId)
      );
      
      Alert.alert('Success', 'Product removed from favorites');
    } catch (error) {
      console.error('Remove favorite error:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to remove from favorites');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  useEffect(() => {
    if (!authLoading) {
      fetchFavorites();
    }
  }, [user, authLoading]);

  // Render empty state
  const renderEmptyState = () => (
    <View className="items-center justify-center flex-1 px-6">
      <Ionicons name="heart-outline" size={80} color="#9CA3AF" />
      <Text className="mt-4 text-xl font-bold text-gray-900">No Favorites Yet</Text>
      <Text className="mt-2 text-center text-gray-600">
        Start exploring and add products to your favorites by tapping the heart icon
      </Text>
      <TouchableOpacity 
        className="px-6 py-3 mt-6 bg-purple-600 rounded-full"
        onPress={() => router.push('/customer/customerDashboard')}
      >
        <Text className="font-semibold text-white">Explore Products</Text>
      </TouchableOpacity>
    </View>
  );

  // Render favorite item
  const renderFavoriteItem = (item) => (
    <TouchableOpacity 
      key={item.id}
      className="flex-row p-4 mb-3 bg-white shadow-sm rounded-2xl"
      onPress={() => router.push({
        pathname: "/customer/ProductDetail",
        params: { productId: item.id }
      })}
    >
      <Image 
        source={{ 
          uri: item.imageUrl 
            ? `http://192.168.43.219:5000${item.imageUrl}` 
            : "https://via.placeholder.com/80" 
        }} 
        className="w-20 h-20 rounded-xl" 
        defaultSource={{ uri: 'https://via.placeholder.com/80' }}
        resizeMode="cover"
      />
      
      <View className="flex-1 ml-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900" numberOfLines={2}>
              {item.productName}
            </Text>
            <Text className="mt-1 text-sm text-gray-600" numberOfLines={2}>
              {item.description}
            </Text>
          </View>
          
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              Alert.alert(
                'Remove Favorite',
                'Are you sure you want to remove this product from favorites?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => removeFromFavorites(item.id) }
                ]
              );
            }}
            className="p-2 ml-2"
          >
            <Ionicons name="heart" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
        
        <View className="flex-row items-center justify-between mt-3">
          <Text className="text-lg font-bold text-purple-600">Rs. {item.price}</Text>
          <View className="flex-row items-center">
            <Ionicons name="star" size={14} color="#FCD34D" />
            <Text className="ml-1 text-sm text-gray-600">{item.rating || "4.5"}</Text>
            <Text className="ml-2 text-sm text-gray-500">• {item.category}</Text>
          </View>
        </View>
        
        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-sm text-gray-500">By {item.sellerName || item.seller_name}</Text>
          <View className="flex-row items-center">
            <Ionicons 
              name={item.stockQty > 0 ? "checkmark-circle" : "close-circle"} 
              size={14} 
              color={item.stockQty > 0 ? "#10B981" : "#EF4444"} 
            />
            <Text className={`ml-1 text-sm ${item.stockQty > 0 ? "text-green-600" : "text-red-600"}`}>
              {item.stockQty > 0 ? `${item.stockQty} left` : 'Out of stock'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-5 py-4 bg-white shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="p-2 -ml-2"
          >
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="ml-2 text-xl font-bold text-gray-900">My Favorites</Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View className="items-center justify-center flex-1">
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text className="mt-4 text-gray-600">Loading favorites...</Text>
        </View>
      ) : favorites.length === 0 ? (
        renderEmptyState()
      ) : (
        <ScrollView 
          className="flex-1" 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ padding: 20 }}
        >
          <Text className="mb-4 text-sm text-gray-600">
            {favorites.length} {favorites.length === 1 ? 'item' : 'items'} in favorites
          </Text>
          
          {favorites.map((item) => renderFavoriteItem(item))}
        </ScrollView>
      )}

      {/* Bottom Navigation */}
      <View className="flex-row items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
        <TouchableOpacity 
          className="items-center"
          onPress={() => router.push('/customer/customerDashboard')}
        >
          <Ionicons name="home-outline" size={24} color="#6B7280" />
          <Text className="mt-1 text-xs text-gray-600">Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="items-center"
          onPress={() => router.push('/customer/cart')}
        >
          <Ionicons name="cart-outline" size={24} color="#6B7280" />
          <Text className="mt-1 text-xs text-gray-600">Cart</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="items-center"
          onPress={() => router.push('/customer/orders')}
        >
          <Ionicons name="receipt-outline" size={24} color="#6B7280" />
          <Text className="mt-1 text-xs text-gray-600">Orders</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="items-center"
          onPress={() => router.push('/customer/profile')}
        >
          <Ionicons name="person-outline" size={24} color="#6B7280" />
          <Text className="mt-1 text-xs text-gray-600">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}