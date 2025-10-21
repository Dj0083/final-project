// Admin - Manage Users (Account Approval/Rejection)

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../config/api';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../context/AuthContext';

export default function ManageUsers() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'seller', 'investor', 'affiliate'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  useEffect(() => {
    loadAuthToken();
  }, []);

  useEffect(() => {
    if (authToken) {
      fetchUsers();
    }
  }, [authToken]);

  // Apply filters whenever users, filter, or searchQuery changes
  useEffect(() => {
    applyFilters();
  }, [users, filter, searchQuery]);

  const loadAuthToken = async () => {
    try {
      if (user && user.token) {
        if (user.role !== 'admin') {
          Alert.alert('Access Denied', 'Only administrators can access this page', [
            { text: 'OK', onPress: () => router.back() }
          ]);
          return;
        }
        setAuthToken(user.token);
        return;
      }
      
      const token = await SecureStore.getItemAsync('token');
      const userData = await SecureStore.getItemAsync('userData');
      
      if (token && userData) {
        const parsedUserData = JSON.parse(userData);
        if (parsedUserData.role !== 'admin') {
          Alert.alert('Access Denied', 'Only administrators can access this page', [
            { text: 'OK', onPress: () => router.back() }
          ]);
          return;
        }
        setAuthToken(token);
      } else {
        Alert.alert('Authentication Required', 'Please login first', [
          { text: 'Go to Login', onPress: () => router.push('/login') },
          { text: 'Cancel', onPress: () => router.back(), style: 'cancel' }
        ]);
      }
    } catch (error) {
      console.error('Error loading auth token:', error);
      Alert.alert('Error', 'Failed to load authentication', [
        { text: 'OK', onPress: () => router.push('/login') }
      ]);
    }
  };

  const fetchUsers = async () => {
    if (!authToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const response = await api.get('/api/users/all', { 
        params: { status: 'pending' },
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (response.data.success) {
        const pendingUsers = (response.data.users || []).filter(u => u.status === 'pending');
        setUsers(pendingUsers);
      } else {
        throw new Error(response.data.message || 'Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please login again', [
          { text: 'Login', onPress: () => router.push('/login') }
        ]);
      } else {
        Alert.alert('Error', 'Failed to load users', [
          { text: 'Retry', onPress: fetchUsers },
          { text: 'Cancel', style: 'cancel' }
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (userId) => {
    Alert.alert(
      'Approve User',
      'Are you sure you want to approve this account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              setActionLoading(true);
              const response = await api.post(`/api/users/${userId}/approve`, {}, {
                headers: {
                  'Authorization': `Bearer ${authToken}`
                }
              });
              
              if (response.data.success) {
                // Close modal first
                setShowDetailsModal(false);
                
                // Refresh the pending users list
                await fetchUsers();
                
                // Show success message
                Alert.alert(
                  '✅ User Approved!', 
                  'The user has been approved and is now active. They have been moved to the "All Users" screen and can now login to the system.',
                  [{ text: 'OK' }]
                );
              } else {
                throw new Error(response.data.message || 'Failed to approve user');
              }
            } catch (error) {
              console.error('Approve error:', error);
              const errorMsg = error.response?.data?.message || error.message || 'Failed to approve user';
              Alert.alert('❌ Error', errorMsg);
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleReject = async (userId) => {
    Alert.alert(
      'Reject User',
      'Are you sure you want to reject this account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              const response = await api.post(`/api/users/${userId}/reject`, {}, {
                headers: {
                  'Authorization': `Bearer ${authToken}`
                }
              });
              
              if (response.data.success) {
                // Close modal first
                setShowDetailsModal(false);
                
                // Refresh the pending users list
                await fetchUsers();
                
                // Show success message
                Alert.alert(
                  '✅ User Rejected', 
                  'The user has been rejected and removed from pending approvals. They will appear as inactive in the "All Users" screen.',
                  [{ text: 'OK' }]
                );
              } else {
                throw new Error(response.data.message || 'Failed to reject user');
              }
            } catch (error) {
              console.error('Reject error:', error);
              const errorMsg = error.response?.data?.message || error.message || 'Failed to reject user';
              Alert.alert('❌ Error', errorMsg);
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const openUserDetails = (user) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  // Apply filters to users list
  const applyFilters = () => {
    const filtered = users.filter(user => {
      const matchesSearch = searchQuery.trim() === '' || 
                           user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           user.business_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = filter === 'all' || user.role === filter;
      
      return matchesSearch && matchesRole;
    });
    
    setFilteredUsers(filtered);
  };

  // Calculate counts for each role - memoized to prevent recalculation on every render
  const roleCounts = useMemo(() => {
    return {
      all: users.length,
      seller: users.filter(u => u.role === 'seller').length,
      investor: users.filter(u => u.role === 'investor').length,
      affiliate: users.filter(u => u.role === 'affiliate').length,
      customer: users.filter(u => u.role === 'customer').length,
    };
  }, [users]);

  // Filter tabs
  const filterTabs = [
    { key: 'all', label: 'All Users', icon: 'people', color: 'bg-orange-500', borderColor: 'border-orange-500' },
    { key: 'seller', label: 'Sellers', icon: 'storefront', color: 'bg-blue-500', borderColor: 'border-blue-500' },
    { key: 'investor', label: 'Investors', icon: 'cash', color: 'bg-purple-500', borderColor: 'border-purple-500' },
    { key: 'affiliate', label: 'Affiliates', icon: 'link', color: 'bg-green-500', borderColor: 'border-green-500' }
  ];

  const getRoleBadgeColor = (role) => {
    const colors = {
      seller: 'bg-blue-100 text-blue-800',
      investor: 'bg-purple-100 text-purple-800',
      affiliate: 'bg-yellow-100 text-yellow-800',
      customer: 'bg-gray-100 text-gray-800'
    };
    return colors[role] || colors.customer;
  };



  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-5 pt-12 pb-6 bg-orange-500">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-center text-white">
              Pending Approvals
            </Text>
            <Text className="text-xs text-center text-orange-100">
              Review and approve new registrations
            </Text>
          </View>
          <TouchableOpacity onPress={fetchUsers}>
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center px-4 py-3 bg-white rounded-xl">
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            className="flex-1 ml-3 text-base"
            placeholder="Search pending users by name or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs - Role-Based Display */}
      <View className="px-5 py-4 bg-white border-b border-gray-200">
        <Text className="mb-3 text-sm font-semibold text-gray-600">Filter by Role</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 20 }}
        >
          {filterTabs.map((item) => {
            const count = roleCounts[item.key] || 0;
            const isActive = filter === item.key;
            
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setFilter(item.key)}
                className={`mr-3 px-5 py-3 rounded-2xl flex-row items-center border-2 ${
                  isActive 
                    ? `${item.color} ${item.borderColor} shadow-lg` 
                    : 'bg-white border-gray-200'
                }`}
                style={{
                  elevation: isActive ? 5 : 0,
                  shadowColor: isActive ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                }}
              >
                {/* Icon Circle */}
                <View className={`items-center justify-center w-12 h-12 rounded-full ${
                  isActive ? 'bg-white bg-opacity-30' : 'bg-gray-100'
                }`}>
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={isActive ? 'white' : '#666'}
                  />
                </View>
                
                {/* Label and Count */}
                <View className="ml-3">
                  <Text
                    className={`font-bold text-base ${
                      isActive ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {item.label}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <View className={`px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white bg-opacity-30' : 'bg-gray-200'
                    }`}>
                      <Text
                        className={`text-xs font-bold ${
                          isActive ? 'text-white' : 'text-gray-600'
                        }`}
                      >
                        {count}
                      </Text>
                    </View>
                    <Text
                      className={`ml-1 text-xs ${
                        isActive ? 'text-white text-opacity-90' : 'text-gray-500'
                      }`}
                    >
                      {count === 1 ? 'user' : 'users'}
                    </Text>
                  </View>
                </View>

                {/* Active Indicator */}
                {isActive && (
                  <View className="ml-2">
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Users List */}
      <ScrollView
        className="flex-1 px-5 py-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchUsers} />
        }
      >
        {loading ? (
          <View className="items-center justify-center flex-1 py-20">
            <ActivityIndicator size="large" color="#F97316" />
            <Text className="mt-4 text-gray-500">Loading users...</Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View className="items-center justify-center flex-1 py-20">
            <View className="items-center justify-center w-20 h-20 mb-4 bg-green-100 rounded-full">
              <Ionicons name="checkmark-done-circle" size={48} color="#10B981" />
            </View>
            <Text className="mt-4 text-lg font-bold text-gray-900">
              {searchQuery ? 'No matching users' : 'All Caught Up!'}
            </Text>
            <Text className="px-8 mt-2 text-center text-gray-500">
              {searchQuery 
                ? 'No pending users match your search criteria' 
                : 'No pending user approvals at the moment. All new registrations have been processed!'}
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center px-6 py-3 mt-6 bg-orange-500 rounded-xl"
            >
              <Ionicons name="arrow-back" size={20} color="white" />
              <Text className="ml-2 font-semibold text-white">Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredUsers.map((user) => (
            <TouchableOpacity
              key={user.id}
              onPress={() => openUserDetails(user)}
              className="p-4 mb-3 bg-white border border-gray-200 rounded-xl"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <View className="items-center justify-center w-10 h-10 mr-3 bg-orange-100 rounded-full">
                      <Text className="text-lg font-bold text-orange-600">
                        {user.full_name?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-900">
                        {user.full_name}
                      </Text>
                      <Text className="text-sm text-gray-500">{user.email}</Text>
                    </View>
                  </View>

                  <View className="flex-row flex-wrap items-center mt-2">
                    <View className={`px-3 py-1 rounded-full ${getRoleBadgeColor(user.role)} mr-2 mb-1`}>
                      <Text className="text-xs font-medium">{user.role?.toUpperCase()}</Text>
                    </View>
                    <View className={`px-3 py-1 rounded-full mb-1 ${
                      user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      user.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      <Text className="text-xs font-medium">{user.status?.toUpperCase()}</Text>
                    </View>
                    {user.business_name && (
                      <Text className="mb-1 ml-2 text-xs text-gray-500">
                        🏪 {user.business_name}
                      </Text>
                    )}
                  </View>

                  {user.created_at && (
                    <Text className="mt-2 text-xs text-gray-400">
                      Registered: {new Date(user.created_at).toLocaleDateString()}
                    </Text>
                  )}
                </View>

                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>

              {/* Quick Action Buttons (only for pending users) */}
              {user.status === 'pending' && (
                <View className="flex-row mt-3 space-x-2">
                  <TouchableOpacity
                    onPress={() => handleApprove(user.id)}
                    className="flex-row items-center justify-center flex-1 py-2 bg-green-500 rounded-lg"
                  >
                    <Ionicons name="checkmark-circle" size={18} color="white" />
                    <Text className="ml-2 font-medium text-white">Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleReject(user.id)}
                    className="flex-row items-center justify-center flex-1 py-2 bg-red-500 rounded-lg"
                  >
                    <Ionicons name="close-circle" size={18} color="white" />
                    <Text className="ml-2 font-medium text-white">Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* User Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View className="justify-end flex-1 bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-900">User Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="items-center mb-6">
                  <View className="items-center justify-center w-20 h-20 mb-3 bg-orange-100 rounded-full">
                    <Text className="text-3xl font-bold text-orange-600">
                      {selectedUser.full_name?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text className="text-xl font-bold text-gray-900">
                    {selectedUser.full_name}
                  </Text>
                  <Text className="text-gray-500">{selectedUser.email}</Text>
                  <View className="flex-row items-center mt-2 space-x-2">
                    <View className={`px-4 py-1 rounded-full ${getRoleBadgeColor(selectedUser.role)}`}>
                      <Text className="text-sm font-medium">{selectedUser.role?.toUpperCase()}</Text>
                    </View>
                    <View className={`px-4 py-1 rounded-full ${
                      selectedUser.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      selectedUser.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      <Text className="text-sm font-medium">{selectedUser.status?.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>

                {/* User Information */}
                <View className="space-y-3">
                  {selectedUser.phone && (
                    <View className="p-3 rounded-lg bg-gray-50">
                      <Text className="mb-1 text-xs text-gray-500">Phone Number</Text>
                      <Text className="font-medium text-gray-900">{selectedUser.phone}</Text>
                    </View>
                  )}
                  {selectedUser.business_name && (
                    <View className="p-3 rounded-lg bg-gray-50">
                      <Text className="mb-1 text-xs text-gray-500">Business Name</Text>
                      <Text className="font-medium text-gray-900">{selectedUser.business_name}</Text>
                    </View>
                  )}
                  {selectedUser.address && (
                    <View className="p-3 rounded-lg bg-gray-50">
                      <Text className="mb-1 text-xs text-gray-500">Address</Text>
                      <Text className="font-medium text-gray-900">{selectedUser.address}</Text>
                    </View>
                  )}
                  <View className="p-3 rounded-lg bg-gray-50">
                    <Text className="mb-1 text-xs text-gray-500">Registration Date</Text>
                    <Text className="font-medium text-gray-900">
                      {new Date(selectedUser.created_at).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons (only for pending users) */}
                {selectedUser.status === 'pending' && (
                  <View className="mt-6 space-y-3">
                    <TouchableOpacity
                      onPress={() => handleApprove(selectedUser.id)}
                      disabled={actionLoading}
                      className="flex-row items-center justify-center py-4 bg-green-500 rounded-xl"
                    >
                      {actionLoading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={24} color="white" />
                          <Text className="ml-2 text-lg font-bold text-white">
                            Approve Account
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleReject(selectedUser.id)}
                      disabled={actionLoading}
                      className="flex-row items-center justify-center py-4 bg-red-500 rounded-xl"
                    >
                      {actionLoading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <>
                          <Ionicons name="close-circle" size={24} color="white" />
                          <Text className="ml-2 text-lg font-bold text-white">
                            Reject Account
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Stats Footer - Pending Approvals Only */}
      <View className="px-5 py-4 bg-white border-t border-gray-200">
        <View className="flex-row justify-around">
          <View className="items-center">
            <Text className="text-2xl font-bold text-yellow-500">
              {filteredUsers.length}
            </Text>
            <Text className="text-sm text-gray-500">Pending Approvals</Text>
          </View>
          <View className="w-px bg-gray-200" />
          <View className="items-center">
            <View className="flex-row items-center">
              <Ionicons name="storefront" size={20} color="#3B82F6" />
              <Text className="ml-2 text-xl font-bold text-blue-500">
                {filteredUsers.filter(u => u.role === 'seller').length}
              </Text>
            </View>
            <Text className="text-sm text-gray-500">Sellers</Text>
          </View>
          <View className="w-px bg-gray-200" />
          <View className="items-center">
            <View className="flex-row items-center">
              <Ionicons name="cash" size={20} color="#8B5CF6" />
              <Text className="ml-2 text-xl font-bold text-purple-500">
                {filteredUsers.filter(u => u.role === 'investor').length}
              </Text>
            </View>
            <Text className="text-sm text-gray-500">Investors</Text>
          </View>
          <View className="w-px bg-gray-200" />
          <View className="items-center">
            <View className="flex-row items-center">
              <Ionicons name="link" size={20} color="#10B981" />
              <Text className="ml-2 text-xl font-bold text-green-500">
                {filteredUsers.filter(u => u.role === 'affiliate').length}
              </Text>
            </View>
            <Text className="text-sm text-gray-500">Affiliates</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
