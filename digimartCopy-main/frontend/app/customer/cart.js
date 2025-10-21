import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../api';

export default function Cart() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    loadCartItems();
  }, []);

  // Calculate total safely
  const calculateTotal = useCallback(() => {
    const total = cartItems.reduce((sum, item) => {
      const price = typeof item.price === 'string'
        ? parseInt(item.price.replace(/[^0-9]/g, '')) || 0
        : Number(item.price) || 0;
      return sum + (price * item.quantity);
    }, 0);
    setTotalPrice(total);
  }, [cartItems]);

  useEffect(() => {
    calculateTotal();
  }, [calculateTotal]);

  const loadCartItems = async () => {
    try {
      const cartData = await AsyncStorage.getItem('cart');
      if (cartData) {
        const parsedCart = JSON.parse(cartData);
        setCartItems(parsedCart);
        
        // Refresh stock information for all cart items
        await refreshStockInfo(parsedCart);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const refreshStockInfo = async (cartItems) => {
    try {
      const updatedCartItems = await Promise.all(
        cartItems.map(async (item) => {
          try {
            const response = await API.get(`/products/${item.id}`);
            const productData = response.data;
            return {
              ...item,
              stock_quantity: productData.stock_quantity || productData.stockQty || 0
            };
          } catch (error) {
            console.warn(`Failed to fetch stock for product ${item.id}:`, error);
            // Keep existing stock_quantity if API call fails
            return item;
          }
        })
      );
      
      setCartItems(updatedCartItems);
      await AsyncStorage.setItem('cart', JSON.stringify(updatedCartItems));
    } catch (error) {
      console.error('Error refreshing stock info:', error);
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    try {
      const updatedCart = cartItems.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      );
      setCartItems(updatedCart);
      await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const removeFromCart = async (productId) => {
    try {
      const updatedCart = cartItems.filter(item => item.id !== productId);
      setCartItems(updatedCart);
      await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const clearCart = async () => {
    try {
      setCartItems([]);
      await AsyncStorage.removeItem('cart');
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert('Cart Empty', 'Your cart is empty. Add some items first.');
      return;
    }
    router.push('/customer/checkout');
  };

  const handleIncrement = async (item) => {
    try {
      // Fetch current stock from API to ensure accuracy
      const response = await API.get(`/products/${item.id}`);
      const currentStock = response.data.stock_quantity || response.data.stockQty || 0;
      
      if (item.quantity >= currentStock) {
        Alert.alert(
          'Stock Limit Reached', 
          `Only ${currentStock} items available in stock. You already have ${item.quantity} in your cart.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      updateQuantity(item.id, item.quantity + 1);
    } catch (error) {
      console.error('Error checking stock:', error);
      // Fallback: check against stored stock_quantity if API fails
      const storedStock = item.stock_quantity || 0;
      if (storedStock > 0 && item.quantity >= storedStock) {
        Alert.alert(
          'Stock Limit Reached', 
          `Only ${storedStock} items available in stock.`,
          [{ text: 'OK' }]
        );
        return;
      }
      updateQuantity(item.id, item.quantity + 1);
    }
  };
  
  const handleDecrement = (item) => {
    if (item.quantity > 0) {
      updateQuantity(item.id, item.quantity - 1);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Shopping Cart</Text>
        {cartItems.length > 0 && (
          <TouchableOpacity onPress={clearCart} className="p-2">
            <Text className="text-purple-600">Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {cartItems.length === 0 ? (
        <View className="items-center justify-center flex-1 py-20">
          <Ionicons name="cart-outline" size={64} color="#9CA3AF" />
          <Text className="mt-4 text-xl font-semibold text-gray-600">Your cart is empty</Text>
          <Text className="mt-2 text-center text-gray-500">
            Looks like you haven&apos;t added any items to your cart yet.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="px-6 py-3 mt-6 bg-purple-600 rounded-lg"
          >
            <Text className="font-semibold text-white">Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView className="flex-1 px-4 py-6">
            {cartItems.filter(item => item && item.id).map((item) => {
              // Ensure all values are safe for rendering
              const safeName = item.name || item.productName || 'Unknown Product';
              const safePrice = item.price || 0;
              const safeQuantity = parseInt(item.quantity) || 1;
              const safeStockQuantity = typeof item.stock_quantity === 'number' ? item.stock_quantity : null;
              const safeImage = item.image || item.imageUrl || 'https://via.placeholder.com/80x80';

              return (
                <View key={item.id} className="p-4 mb-4 bg-white rounded-lg shadow-sm">
                  <View className="flex-row">
                    <Image 
                      source={{ uri: safeImage }} 
                      className="w-20 h-20 rounded-lg" 
                    />
                    <View className="flex-1 ml-4">
                      <Text className="text-lg font-semibold text-gray-900" numberOfLines={1}>
                        {safeName}
                      </Text>
                      <Text className="mt-1 font-bold text-purple-600">
                        {typeof safePrice === 'string' ? safePrice : `Rs. ${safePrice}.00`}
                      </Text>
                      {safeStockQuantity !== null && (
                        <View className="flex-row items-center mt-1">
                          <Ionicons 
                            name={safeStockQuantity > 0 ? "checkmark-circle" : "close-circle"} 
                            size={14} 
                            color={safeStockQuantity > 0 ? "#10B981" : "#EF4444"} 
                          />
                          <Text className={`ml-1 text-xs ${safeStockQuantity > 0 ? "text-green-600" : "text-red-600"}`}>
                            {safeStockQuantity > 0 ? `${safeStockQuantity} in stock` : 'Out of stock'}
                          </Text>
                        </View>
                      )}

                      <View className="flex-row items-center justify-between mt-4">
                        <View className="flex-row items-center border border-gray-300 rounded-lg">
                          <TouchableOpacity 
                            onPress={() => handleDecrement(item)} 
                            className="px-3 py-1"
                            disabled={safeQuantity <= 1}
                          >
                            <Text className={`text-lg ${safeQuantity <= 1 ? "text-gray-300" : "text-gray-700"}`}>-</Text>
                          </TouchableOpacity>
                          <Text className="px-3 py-1 text-lg font-semibold text-gray-900">
                            {safeQuantity}
                          </Text>
                          <TouchableOpacity 
                            onPress={() => handleIncrement(item)} 
                            className="px-3 py-1"
                            disabled={safeStockQuantity !== null && safeQuantity >= safeStockQuantity}
                          >
                            <Text className={`text-lg ${
                              safeStockQuantity !== null && safeQuantity >= safeStockQuantity 
                                ? "text-gray-300" 
                                : "text-gray-700"
                            }`}>+</Text>
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={() => removeFromCart(item.id)} className="p-2">
                          <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Checkout Section */}
          <View className="p-4 bg-white border-t border-gray-200">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg text-gray-600">Total</Text>
              <Text className="text-xl font-bold text-purple-600">Rs. {totalPrice || 0}.00</Text>
            </View>
            <TouchableOpacity onPress={handleCheckout} className="py-4 bg-purple-600 rounded-lg">
              <Text className="text-lg font-semibold text-center text-white">Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
