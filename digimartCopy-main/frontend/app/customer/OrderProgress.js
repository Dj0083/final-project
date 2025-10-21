import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const OrderProgress = ({ status }) => {
  const getProgress = (status) => {
    switch (status) {
      case 'pending': return 25;
      case 'processing': return 50;
      case 'shipped': return 75;
      case 'delivered': return 100;
      default: return 0;
    }
  };

  const progress = getProgress(status);

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm font-medium text-gray-700">Order Progress</Text>
        <Text className="text-sm font-semibold text-purple-600">{progress}%</Text>
      </View>
      
      <View className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <View 
          className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </View>
      
      <View className="flex-row justify-between mt-2">
        {['pending', 'processing', 'shipped', 'delivered'].map((step, index) => (
          <View key={step} className="items-center">
            <View 
              className={`w-6 h-6 rounded-full items-center justify-center ${
                getProgress(status) > index * 25 ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <Ionicons 
                name={getProgress(status) > index * 25 ? 'checkmark' : 'ellipse'} 
                size={12} 
                color="white" 
              />
            </View>
            <Text className={`text-xs mt-1 capitalize ${
              getProgress(status) > index * 25 ? 'text-purple-600' : 'text-gray-500'
            }`}>
              {step}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default OrderProgress;