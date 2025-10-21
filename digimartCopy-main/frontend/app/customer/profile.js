import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  TextInput,
  Alert,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Profile = () => {
  const router = useRouter();
  const [userData, setUserData] = useState({
    name: 'User',
    email: '',
    phone: '',
    address: '',
    memberSince: '2025',
    accountStatus: 'Inactive'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (userDataString) {
        setUserData(JSON.parse(userDataString));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const saveUserData = async (newData) => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(newData));
      setUserData(newData);
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const handleEditField = (field, value) => {
    setEditField(field);
    setEditValue(value);
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (editValue.trim() === '') {
      Alert.alert('Error', 'Please enter a value');
      return;
    }

    const updatedData = { ...userData, [editField]: editValue };
    saveUserData(updatedData);
    setEditModalVisible(false);
    setEditField('');
    setEditValue('');
  };

  const getFieldLabel = (field) => {
    switch (field) {
      case 'name': return 'Full Name';
      case 'email': return 'Email Address';
      case 'phone': return 'Phone Number';
      case 'address': return 'Address';
      default: return field;
    }
  };

  const getKeyboardType = (field) => {
    switch (field) {
      case 'email': return 'email-address';
      case 'phone': return 'phone-pad';
      default: return 'default';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-5 py-4 bg-white">
        <Text className="text-2xl font-bold text-gray-900">Profile</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* User Header Section */}
        <View className="px-5 py-6 mb-4 bg-white">
          <View className="items-center mb-4">
            <View className="items-center justify-center w-20 h-20 mb-3 bg-purple-100 rounded-full">
              <Ionicons name="person" size={32} color="#8B5CF6" />
            </View>
            <Text className="text-xl font-bold text-gray-900">Hi, {userData.name}</Text>
            <Text className="mt-1 text-gray-500">Member since {userData.memberSince}</Text>
          </View>

          <TouchableOpacity 
            className="items-center py-3 bg-purple-600 rounded-lg"
            onPress={() => setIsEditing(!isEditing)}
          >
            <Text className="font-semibold text-white">
              {isEditing ? 'Cancel Editing' : 'Edit Profile'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Personal Information Section */}
        <View className="mb-4 bg-white">
          <View className="px-5 py-4 border-b border-gray-200">
            <Text className="text-lg font-semibold text-gray-900">Personal Information</Text>
          </View>

          <View className="px-5 py-4">
            {/* Full Name */}
            <TouchableOpacity 
              className="flex-row items-center justify-between py-3 border-b border-gray-100"
              onPress={() => isEditing && handleEditField('name', userData.name)}
            >
              <View className="flex-1">
                <Text className="text-sm text-gray-600">Full Name</Text>
                <Text className="mt-1 text-gray-900">
                  {userData.name || 'Not provided'}
                </Text>
              </View>
              {isEditing && (
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>

            {/* Email Address */}
            <TouchableOpacity 
              className="flex-row items-center justify-between py-3 border-b border-gray-100"
              onPress={() => isEditing && handleEditField('email', userData.email)}
            >
              <View className="flex-1">
                <Text className="text-sm text-gray-600">Email Address</Text>
                <Text className="mt-1 text-gray-900">
                  {userData.email || 'Not provided'}
                </Text>
              </View>
              {isEditing && (
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>

            {/* Phone Number */}
            <TouchableOpacity 
              className="flex-row items-center justify-between py-3 border-b border-gray-100"
              onPress={() => isEditing && handleEditField('phone', userData.phone)}
            >
              <View className="flex-1">
                <Text className="text-sm text-gray-600">Phone Number</Text>
                <Text className="mt-1 text-gray-900">
                  {userData.phone || 'Not provided'}
                </Text>
              </View>
              {isEditing && (
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>

            {/* Address */}
            <TouchableOpacity 
              className="flex-row items-center justify-between py-3 border-b border-gray-100"
              onPress={() => isEditing && handleEditField('address', userData.address)}
            >
              <View className="flex-1">
                <Text className="text-sm text-gray-600">Address</Text>
                <Text className="mt-1 text-gray-900" numberOfLines={2}>
                  {userData.address || 'Not provided'}
                </Text>
              </View>
              {isEditing && (
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>

            {/* Account Status */}
            <View className="flex-row items-center justify-between py-3">
              <View className="flex-1">
                <Text className="text-sm text-gray-600">Account Status</Text>
                <Text className="mt-1 text-gray-900">{userData.accountStatus}</Text>
              </View>
              <View className={`px-3 py-1 rounded-full ${
                userData.accountStatus === 'Active' ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                <Text className={`text-xs font-medium ${
                  userData.accountStatus === 'Active' ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {userData.accountStatus}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Overview Section */}
        <View className="mb-4 bg-white">
          <View className="px-5 py-4 border-b border-gray-200">
            <Text className="text-lg font-semibold text-gray-900">Account Overview</Text>
          </View>

          {/* Order History */}
          <TouchableOpacity 
            className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100"
            onPress={() => router.push('/customer/orders')}
          >
            <View className="flex-row items-center">
              <Ionicons name="receipt-outline" size={20} color="#6B7280" />
              <Text className="ml-3 text-gray-900">Order History</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="mr-2 text-gray-500">View your past orders</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          {/* Favorites */}
          <TouchableOpacity 
            className="flex-row items-center justify-between px-5 py-4"
            onPress={() => router.push('/customer/favorites')}
          >
            <View className="flex-row items-center">
              <Ionicons name="heart-outline" size={20} color="#6B7280" />
              <Text className="ml-3 text-gray-900">Favorites</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="mr-2 text-gray-500">Your saved products</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Settings Section */}
        <View className="mb-8 bg-white">
          <View className="px-5 py-4 border-b border-gray-200">
            <Text className="text-lg font-semibold text-gray-900">Settings</Text>
          </View>

          {/* Notifications */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="notifications-outline" size={20} color="#6B7280" />
              <Text className="ml-3 text-gray-900">Notifications</Text>
            </View>
            <Switch
              value={true}
              onValueChange={() => {}}
              trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Privacy */}
          <TouchableOpacity className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" />
              <Text className="ml-3 text-gray-900">Privacy & Security</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Help & Support */}
          <TouchableOpacity className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <Ionicons name="help-circle-outline" size={20} color="#6B7280" />
              <Text className="ml-3 text-gray-900">Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity className="flex-row items-center justify-between px-5 py-4">
            <View className="flex-row items-center">
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text className="ml-3 text-red-600">Logout</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="items-center justify-center flex-1 bg-black/50">
          <View className="w-5/6 p-5 bg-white rounded-xl">
            <Text className="mb-4 text-lg font-semibold text-gray-900">
              Edit {getFieldLabel(editField)}
            </Text>
            
            <TextInput
              className="p-3 mb-4 border border-gray-300 rounded-lg"
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Enter your ${getFieldLabel(editField).toLowerCase()}`}
              keyboardType={getKeyboardType(editField)}
              autoFocus={true}
            />
            
            <View className="flex-row justify-end space-x-3">
              <TouchableOpacity 
                className="px-4 py-2 border border-gray-300 rounded-lg"
                onPress={() => setEditModalVisible(false)}
              >
                <Text className="text-gray-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="px-4 py-2 bg-purple-600 rounded-lg"
                onPress={handleSaveEdit}
              >
                <Text className="text-white">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
        
        <TouchableOpacity className="items-center">
          <Ionicons name="person-outline" size={24} color="#8B5CF6" />
          <Text className="mt-1 text-xs font-medium text-purple-600">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default Profile;