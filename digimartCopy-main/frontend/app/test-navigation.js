import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TestNavigation() {
  return (
    <SafeAreaView className="flex-1 bg-white p-4">
      <View className="flex-row items-center mb-6">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="ml-4 text-xl font-bold">Navigation Test</Text>
      </View>
      
      <Text className="text-lg mb-4">Testing navigation to out-of-stock page</Text>
      
      <TouchableOpacity
        onPress={() => {
          console.log('Testing navigation to /out-of-stock');
          try {
            router.push('/out-of-stock');
          } catch (error) {
            console.error('Navigation error:', error);
            alert(`Navigation error: ${error.message}`);
          }
        }}
        className="bg-blue-500 p-4 rounded-lg mb-4"
      >
        <Text className="text-white text-center font-semibold">
          Go to Out of Stock
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={() => {
          console.log('Testing navigation to /sellerCenter');
          try {
            router.push('/sellerCenter');
          } catch (error) {
            console.error('Navigation error:', error);
            alert(`Navigation error: ${error.message}`);
          }
        }}
        className="bg-green-500 p-4 rounded-lg"
      >
        <Text className="text-white text-center font-semibold">
          Back to Seller Center
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}