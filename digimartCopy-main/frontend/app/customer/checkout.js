import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  Image, 
  Alert, 
  Modal, 
  TextInput,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../api';
import { useAuth } from '../../context/AuthContext';

// eslint-disable-next-line no-unused-vars
const { width } = Dimensions.get('window');

export default function Checkout() {
  const router = useRouter();
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [deliveryFee] = useState(200);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCartItems();
  }, []);

  // Calculate total price safely
  const calculateTotal = useCallback(() => {
    const total = cartItems.reduce((sum, item) => {
      // Ensure item.price is a string
      const priceString = item.price ? item.price.toString() : '0';
      const price = parseInt(priceString.replace(/[^0-9]/g, ''), 10);
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
        setCartItems(JSON.parse(cartData));
      }
    } catch (error) {
      console.error('Error loading cart:', error);
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
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this item from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          onPress: async () => {
            try {
              const updatedCart = cartItems.filter(item => item.id !== productId);
              setCartItems(updatedCart);
              await AsyncStorage.setItem('cart', JSON.stringify(updatedCart));
            } catch (error) {
              console.error('Error removing from cart:', error);
            }
          }
        }
      ]
    );
  };

  const clearCart = async () => {
    Alert.alert(
      "Clear Cart",
      "Are you sure you want to clear your entire cart?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          onPress: async () => {
            try {
              setCartItems([]);
              await AsyncStorage.removeItem('cart');
            } catch (error) {
              console.error('Error clearing cart:', error);
            }
          }
        }
      ]
    );
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert('Cart Empty', 'Your cart is empty. Add some items first.');
      return;
    }
    setShowCheckoutModal(true);
  };

  const handlePlaceOrder = async () => {
    if (!user || !user.token) {
      Alert.alert('Login Required', 'Please login to place an order.');
      return;
    }

    if (!paymentMethod) {
      Alert.alert('Payment Method Required', 'Please select a payment method.');
      return;
    }
    
    if (!deliveryAddress.trim()) {
      Alert.alert('Address Required', 'Please enter your delivery address.');
      return;
    }
    
    if (!phoneNumber.trim()) {
      Alert.alert('Phone Number Required', 'Please enter your phone number.');
      return;
    }

    setLoading(true);

    try {
      console.log('Current user:', user);
      console.log('Cart items:', cartItems);

      // Validate cart items
      if (!cartItems || cartItems.length === 0) {
        Alert.alert('Empty Cart', 'Your cart is empty. Please add items first.');
        return;
      }

      // Prepare order data for backend - make sure data matches backend expectations
      const orderItems = cartItems.map(item => {
        console.log('Processing item:', item);
        
        // Ensure price is a number
        let itemPrice = 0;
        if (typeof item.price === 'string') {
          // Extract numeric value from string like "Rs. 150.00"
          itemPrice = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
        } else if (typeof item.price === 'number') {
          itemPrice = item.price;
        }

        const orderItem = {
          productId: parseInt(item.id), // Ensure productId is integer
          quantity: parseInt(item.quantity) || 1, // Ensure quantity is integer
          price: itemPrice // Price as number
        };

        console.log('Mapped order item:', orderItem);
        return orderItem;
      });

      const shippingAddress = `${deliveryAddress.trim()}\nPhone: ${phoneNumber.trim()}`;
      
      const orderData = {
        items: orderItems,
        shippingAddress,
        paymentMethod,
        notes: `Delivery fee: Rs. ${deliveryFee}.00`
      };

      console.log('Final order data being sent to API:', JSON.stringify(orderData, null, 2));

      const response = await API.post('/orders', orderData);
      console.log('Order response:', response.data);

      // Clear cart after successful order
      await AsyncStorage.removeItem('cart');
      setCartItems([]);
      setShowCheckoutModal(false);
      
      Alert.alert(
        'Order Placed Successfully!', 
        `Your order #${response.data.order.orderNumber || response.data.order.id} has been confirmed. Total amount: Rs. ${(response.data.order.totalAmount || 0) + deliveryFee}.00`, 
        [
          {
            text: 'View Orders',
            onPress: () => router.push('/customer/orders')
          },
          {
            text: 'Continue Shopping',
            onPress: () => router.push('/customer/customerDashboard')
          }
        ]
      );
    } catch (error) {
      console.error('Error placing order:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      let errorMessage = 'There was an error placing your order. Please try again.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid order data. Please check your cart and try again.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. Please check your permissions.';
      }
      
      Alert.alert('Order Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleIncrement = (item) => {
    updateQuantity(item.id, item.quantity + 1);
  };

  const handleDecrement = (item) => {
    updateQuantity(item.id, item.quantity - 1);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white shadow-sm">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="p-2 bg-gray-100 rounded-full"
        >
          <Ionicons name="arrow-back" size={20} color="#4B5563" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">My Cart</Text>
        {cartItems.length > 0 && (
          <TouchableOpacity 
            onPress={clearCart} 
            className="p-2 bg-gray-100 rounded-full"
          >
            <Text className="text-sm font-medium text-purple-600">Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {cartItems.length === 0 ? (
        <View className="items-center justify-center flex-1 px-6 py-20">
          <View className="items-center justify-center w-24 h-24 bg-purple-100 rounded-full">
            <Ionicons name="cart-outline" size={40} color="#9333EA" />
          </View>
          <Text className="mt-6 text-2xl font-bold text-gray-800">Your cart is empty</Text>
          <Text className="mt-2 text-base text-center text-gray-500">
            Looks like you haven&apos;t added any items to your cart yet.
          </Text>
          <TouchableOpacity 
            onPress={() => router.back()}
            className="px-8 py-4 mt-8 bg-purple-600 shadow-sm rounded-xl"
          >
            <Text className="text-base font-semibold text-white">Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView className="flex-1 px-5 py-6" showsVerticalScrollIndicator={false}>
            <Text className="mb-4 text-lg font-bold text-gray-900">Cart Items ({cartItems.length})</Text>
            
            {cartItems.map((item) => (
              <View key={item.id} className="p-4 mb-4 bg-white shadow-sm rounded-2xl">
                <View className="flex-row">
                  <Image 
                    source={{ uri: item.image }} 
                    className="w-24 h-24 rounded-xl" 
                    resizeMode="cover"
                  />
                  <View className="justify-between flex-1 ml-4">
                    <View>
                      <Text className="text-base font-semibold text-gray-900" numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text className="mt-1 text-lg font-bold text-purple-600">
                        {item.price}
                      </Text>
                    </View>
                    
                    <View className="flex-row items-center justify-between mt-4">
                      <View className="flex-row items-center overflow-hidden border border-gray-200 rounded-xl">
                        <TouchableOpacity 
                          onPress={() => handleDecrement(item)}
                          className="px-4 py-2 bg-gray-100"
                        >
                          <Text className="text-lg font-bold text-gray-700">-</Text>
                        </TouchableOpacity>
                        <Text className="px-4 py-1 text-lg font-semibold text-gray-900">
                          {item.quantity}
                        </Text>
                        <TouchableOpacity 
                          onPress={() => handleIncrement(item)}
                          className="px-4 py-2 bg-gray-100"
                        >
                          <Text className="text-lg font-bold text-gray-700">+</Text>
                        </TouchableOpacity>
                      </View>
                      
                      <TouchableOpacity 
                        onPress={() => removeFromCart(item.id)}
                        className="p-2 rounded-full bg-red-50"
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))}
            
            {/* Order Summary Preview */}
            <View className="p-5 mb-6 bg-white shadow-sm rounded-2xl">
              <Text className="mb-4 text-lg font-bold text-gray-900">Order Summary</Text>
              
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Subtotal</Text>
                <Text className="font-semibold text-gray-900">Rs. {totalPrice}.00</Text>
              </View>
              
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-600">Delivery Fee</Text>
                <Text className="font-semibold text-gray-900">Rs. {deliveryFee}.00</Text>
              </View>
              
              <View className="h-px my-3 bg-gray-200" />
              
              <View className="flex-row justify-between">
                <Text className="text-lg font-bold text-gray-900">Total</Text>
                <Text className="text-lg font-bold text-purple-600">Rs. {totalPrice + deliveryFee}.00</Text>
              </View>
            </View>
          </ScrollView>

          {/* Checkout Footer */}
          <View className="p-5 bg-white border-t border-gray-200 shadow-lg">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-gray-600">Total Amount</Text>
                <Text className="text-xl font-bold text-purple-600">Rs. {totalPrice + deliveryFee}.00</Text>
              </View>
              
              <TouchableOpacity 
                onPress={handleCheckout}
                className="px-8 py-4 bg-purple-600 shadow-sm rounded-xl"
              >
                <Text className="text-base font-bold text-white">Checkout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Checkout Modal */}
      <Modal
        visible={showCheckoutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCheckoutModal(false)}
      >
        <View className="justify-end flex-1 bg-black/50">
          <View className="p-6 bg-white rounded-t-3xl h-4/5">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-bold text-gray-900">Checkout</Text>
              <TouchableOpacity 
                onPress={() => setShowCheckoutModal(false)}
                className="p-2 bg-gray-100 rounded-full"
              >
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Order Items */}
              <Text className="mb-4 text-lg font-bold text-gray-900">Order Items</Text>
              
              {cartItems.map((item) => (
                <View key={item.id} className="flex-row items-center mb-4">
                  <Image 
                    source={{ uri: item.image }} 
                    className="w-16 h-16 rounded-lg" 
                    resizeMode="cover"
                  />
                  <View className="flex-1 ml-3">
                    <Text className="font-medium text-gray-900" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="font-semibold text-purple-600">{item.price}</Text>
                    <Text className="text-sm text-gray-500">Qty: {item.quantity}</Text>
                  </View>
                </View>
              ))}

              {/* Delivery Info */}
              <Text className="mb-3 text-lg font-bold text-gray-900">Delivery Information</Text>
              <TextInput
                className="p-4 mb-4 text-gray-800 bg-white border border-gray-300 rounded-xl"
                placeholder="Delivery Address"
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                multiline
              />
              <TextInput
                className="p-4 mb-4 text-gray-800 bg-white border border-gray-300 rounded-xl"
                placeholder="Phone Number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />

              {/* Payment Method */}
              <Text className="mb-3 text-lg font-bold text-gray-900">Payment Method</Text>
              <View className="flex-row mb-5">
                <TouchableOpacity 
                  className={`flex-1 p-4 mr-3 border-2 rounded-xl ${paymentMethod === 'cash_on_delivery' ? 'border-purple-600 bg-purple-50' : 'border-gray-300 bg-white'}`}
                  onPress={() => setPaymentMethod('cash_on_delivery')}
                >
                  <View className="flex-row items-center">
                    <View className={`w-5 h-5 rounded-full mr-3 border-2 ${paymentMethod === 'cash_on_delivery' ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-400'}`}>
                      {paymentMethod === 'cash_on_delivery' && <View className="w-2 h-2 rounded-full bg-white m-0.5" />}
                    </View>
                    <Text className={`font-medium ${paymentMethod === 'cash_on_delivery' ? 'text-purple-600' : 'text-gray-700'}`}>Cash on Delivery</Text>
                  </View>
                  <Text className="mt-1 text-xs text-gray-500">Pay when you receive your order</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className={`flex-1 p-4 ml-3 border-2 rounded-xl ${paymentMethod === 'card' ? 'border-purple-600 bg-purple-50' : 'border-gray-300 bg-white'}`}
                  onPress={() => setPaymentMethod('card')}
                >
                  <View className="flex-row items-center">
                    <View className={`w-5 h-5 rounded-full mr-3 border-2 ${paymentMethod === 'card' ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-400'}`}>
                      {paymentMethod === 'card' && <View className="w-2 h-2 rounded-full bg-white m-0.5" />}
                    </View>
                    <Text className={`font-medium ${paymentMethod === 'card' ? 'text-purple-600' : 'text-gray-700'}`}>Credit Card</Text>
                  </View>
                  <Text className="mt-1 text-xs text-gray-500">Pay securely with your card</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity 
              onPress={handlePlaceOrder}
              disabled={loading}
              className={`py-4 mt-4 shadow-sm rounded-xl ${loading ? 'bg-gray-400' : 'bg-purple-600'}`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-lg font-bold text-center text-white">Place Order • Rs. {totalPrice + deliveryFee}.00</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
