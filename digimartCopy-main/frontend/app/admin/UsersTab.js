import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = 'http://192.168.43.219:5000/api';

const UsersTab = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [authToken, setAuthToken] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    customers: 0,
    sellers: 0,
    investors: 0,
    affiliates: 0,
    activeUsers: 0,
    inactiveUsers: 0,
  });

  useEffect(() => {
    loadAuthToken();
  }, []);

  useEffect(() => {
    if (authToken) {
      fetchUsers();
    }
  }, [authToken]);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, activeFilter, users]);

  const loadAuthToken = async () => {
    try {
      if (user && user.token) {
        setAuthToken(user.token);
        return;
      }
      
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        setAuthToken(token);
      }
    } catch (error) {
      console.error('Error loading auth token:', error);
    }
  };

  const reapproveUser = async (user) => {
    try {
      Alert.alert('Re-Approve Account', `Re-activate and approve ${user.full_name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Re-Approve', style: 'default', onPress: async () => {
            try {
              // Activate (remove from blacklist)
              await axios.post(`${BASE_URL}/users/${user.id}/activate`, {}, { headers: { 'Authorization': `Bearer ${authToken}` } });
              // Approve role status if not approved
              if (user.status !== 'approved') {
                await axios.post(`${BASE_URL}/users/${user.id}/approve`, {}, { headers: { 'Authorization': `Bearer ${authToken}` } });
              }
              await fetchUsers();
              Alert.alert('Success', 'User account has been re-approved.');
            } catch (e) {
              Alert.alert('Error', e?.response?.data?.error || 'Failed to re-approve user');
            }
          }
        }
      ]);
    } catch {}
  };

  const suspendUser = async (userId) => {
    try {
      Alert.alert('Suspend User', 'Are you sure you want to suspend this user?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend', style: 'destructive', onPress: async () => {
            try {
              await axios.post(`${BASE_URL}/users/${userId}/suspend`, {}, { headers: { 'Authorization': `Bearer ${authToken}` } });
              await fetchUsers();
              Alert.alert('User Suspended', 'The user has been suspended.');
            } catch (e) {
              Alert.alert('Error', e?.response?.data?.error || 'Failed to suspend user');
            }
          }
        }
      ]);
    } catch {}
  };

  const activateUser = async (userId) => {
    try {
      Alert.alert('Activate User', 'Activate this suspended user?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate', style: 'default', onPress: async () => {
            try {
              await axios.post(`${BASE_URL}/users/${userId}/activate`, {}, { headers: { 'Authorization': `Bearer ${authToken}` } });
              await fetchUsers();
              Alert.alert('User Activated', 'The user has been activated.');
            } catch (e) {
              Alert.alert('Error', e?.response?.data?.error || 'Failed to activate user');
            }
          }
        }
      ]);
    } catch {}
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/users/all`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.data.success) {
        setUsers(response.data.users);
        calculateStats(response.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to load users. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (userList) => {
    setStats({
      totalUsers: userList.length,
      customers: userList.filter(u => u.role === 'customer').length,
      sellers: userList.filter(u => u.role === 'seller').length,
      investors: userList.filter(u => u.role === 'investor').length,
      affiliates: userList.filter(u => u.role === 'affiliate').length,
      activeUsers: userList.filter(u => u.is_active).length,
      inactiveUsers: userList.filter(u => !u.is_active).length,
    });
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by special 'suspended' tab
    if (activeFilter === 'suspended') {
      filtered = filtered.filter(user => !!user.suspended);
    } else if (activeFilter !== 'all') {
      // Filter by role
      filtered = filtered.filter(user => user.role === activeFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query) ||
        user.business_name?.toLowerCase().includes(query) ||
        user.status?.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'customer': return '#3B82F6';
      case 'seller': return '#10B981';
      case 'investor': return '#8B5CF6';
      case 'affiliate': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'customer': return 'cart';
      case 'seller': return 'storefront';
      case 'investor': return 'cash';
      case 'affiliate': return 'link';
      default: return 'person';
    }
  };

  if (loading && !refreshing) {
    return (
      <View className="items-center justify-center flex-1 bg-gray-50">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="mt-4 text-gray-500">Loading users...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-5 pt-12 pb-6 bg-orange-500">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mb-4"
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="mb-2 text-2xl font-bold text-white">All Users</Text>
        <View className="flex-row items-center">
          <Text className="mr-4 text-orange-100">{stats.totalUsers} registered users</Text>
          <View className="flex-row items-center px-3 py-1 mr-2 bg-white rounded-full bg-opacity-20">
            <View className="w-2 h-2 mr-1 bg-green-400 rounded-full" />
            <Text className="text-xs font-semibold text-white">{stats.activeUsers} Active</Text>
          </View>
          <View className="flex-row items-center px-3 py-1 bg-white rounded-full bg-opacity-20">
            <View className="w-2 h-2 mr-1 bg-gray-300 rounded-full" />
            <Text className="text-xs font-semibold text-white">{stats.inactiveUsers} Inactive</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        className="flex-1"
      >
        {/* Search Bar */}
        <View className="px-5 py-4">
          <View className="flex-row items-center px-4 py-3 bg-white border border-gray-200 shadow-sm rounded-xl">
            <Ionicons name="search" size={20} color="#6B7280" />
            <TextInput
              className="flex-1 ml-3 text-base text-gray-800"
              placeholder="Search by name, email, or role..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <View className="px-5 pb-4">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="flex-row"
          >
            <TouchableOpacity
              onPress={() => setActiveFilter('all')}
              className={`px-4 py-2 mr-2 rounded-xl ${
                activeFilter === 'all' ? 'bg-orange-500' : 'bg-white border border-gray-200'
              }`}
            >
              <Text className={`font-semibold ${
                activeFilter === 'all' ? 'text-white' : 'text-gray-700'
              }`}>
                All ({stats.totalUsers})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveFilter('customer')}
              className={`px-4 py-2 mr-2 rounded-xl ${
                activeFilter === 'customer' ? 'bg-blue-500' : 'bg-white border border-gray-200'
              }`}
            >
              <Text className={`font-semibold ${
                activeFilter === 'customer' ? 'text-white' : 'text-gray-700'
              }`}>
                Customers ({stats.customers})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveFilter('seller')}
              className={`px-4 py-2 mr-2 rounded-xl ${
                activeFilter === 'seller' ? 'bg-green-500' : 'bg-white border border-gray-200'
              }`}
            >
              <Text className={`font-semibold ${
                activeFilter === 'seller' ? 'text-white' : 'text-gray-700'
              }`}>
                Sellers ({stats.sellers})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveFilter('investor')}
              className={`px-4 py-2 mr-2 rounded-xl ${
                activeFilter === 'investor' ? 'bg-purple-500' : 'bg-white border border-gray-200'
              }`}
            >
              <Text className={`font-semibold ${
                activeFilter === 'investor' ? 'text-white' : 'text-gray-700'
              }`}>
                Investors ({stats.investors})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveFilter('affiliate')}
              className={`px-4 py-2 mr-2 rounded-xl ${
                activeFilter === 'affiliate' ? 'bg-yellow-500' : 'bg-white border border-gray-200'
              }`}
            >
              <Text className={`font-semibold ${
                activeFilter === 'affiliate' ? 'text-white' : 'text-gray-700'
              }`}>
                Affiliates ({stats.affiliates})
              </Text>
            </TouchableOpacity>

            {/* Suspended Tab */}
            <TouchableOpacity
              onPress={() => setActiveFilter('suspended')}
              className={`px-4 py-2 mr-2 rounded-xl ${
                activeFilter === 'suspended' ? 'bg-red-500' : 'bg-white border border-gray-200'
              }`}
            >
              <Text className={`font-semibold ${
                activeFilter === 'suspended' ? 'text-white' : 'text-gray-700'
              }`}>
                Suspended ({users.filter(u => u.suspended).length})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* User List */}
        <View className="px-5 pb-6">
          <View className="p-4 mb-3 bg-white shadow-sm rounded-2xl">
            <View className="flex-row items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <Text className="text-lg font-bold text-gray-900">
                {activeFilter === 'all' ? 'All Users' : `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}s`}
              </Text>
              <View className="px-3 py-1 bg-gray-100 rounded-full">
                <Text className="text-xs font-medium text-gray-500">
                  {filteredUsers.length} users
                </Text>
              </View>
            </View>

            {filteredUsers.length === 0 ? (
              <View className="items-center py-8">
                <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                <Text className="mt-3 text-base font-medium text-gray-500">No users found</Text>
                <Text className="mt-1 text-sm text-gray-400">Try adjusting your search or filter</Text>
              </View>
            ) : (
              filteredUsers.map((user, index) => (
                <View
                  key={user.id}
                  className={`flex-row items-center justify-between py-3 ${
                    index < filteredUsers.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <View className="flex-row items-center flex-1">
                    <View 
                      style={{ backgroundColor: getRoleColor(user.role) + '20' }}
                      className="items-center justify-center w-12 h-12 mr-3 rounded-full"
                    >
                      <Ionicons name={getRoleIcon(user.role)} size={24} color={getRoleColor(user.role)} />
                    </View>
                    <View className="flex-1">
                      <Text className="mb-1 text-base font-bold text-gray-900">
                        {user.full_name}
                      </Text>
                      <Text className="mb-1 text-sm text-gray-600">
                        {user.email}
                      </Text>
                      <View className="flex-row flex-wrap items-center">
                        {/* Role Badge */}
                        <View 
                          style={{ backgroundColor: getRoleColor(user.role) + '20' }}
                          className="px-2 py-1 mb-1 mr-2 rounded"
                        >
                          <Text 
                            style={{ color: getRoleColor(user.role) }}
                            className="text-xs font-semibold"
                          >
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Text>
                        </View>
                        
                        {/* Status Badge (Pending/Approved/Rejected) */}
                        <View 
                          className={`px-2 py-1 mr-2 mb-1 rounded ${
                            user.status === 'approved' ? 'bg-green-100' :
                            user.status === 'pending' ? 'bg-yellow-100' :
                            'bg-red-100'
                          }`}
                        >
                          <Text className={`text-xs font-semibold ${
                            user.status === 'approved' ? 'text-green-700' :
                            user.status === 'pending' ? 'text-yellow-700' :
                            'text-red-700'
                          }`}>
                            {user.status?.charAt(0).toUpperCase() + user.status?.slice(1)}
                          </Text>
                        </View>

                        {/* Active/Inactive Indicator */}
                        <View className="flex-row items-center mb-1">
                          <View 
                            className={`w-2 h-2 rounded-full mr-1 ${
                              user.is_active ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          />
                          <Text className={`text-xs font-medium ${
                            user.is_active ? 'text-green-700' : 'text-gray-600'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View className="flex-row ml-2 space-x-2">
                    <TouchableOpacity className="p-2 bg-gray-100 rounded-lg">
                      <Ionicons name="eye" size={18} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity className="p-2 bg-orange-100 rounded-lg">
                      <Ionicons name="create" size={18} color="#F97316" />
                    </TouchableOpacity>
                    {user.suspended ? (
                      <TouchableOpacity onPress={() => activateUser(user.id)} className="p-2 bg-green-100 rounded-lg">
                        <Ionicons name="lock-open" size={18} color="#10B981" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={() => suspendUser(user.id)} className="p-2 bg-red-100 rounded-lg">
                        <Ionicons name="lock-closed" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                    {user.suspended && (
                      <TouchableOpacity onPress={() => reapproveUser(user)} className="p-2 bg-blue-100 rounded-lg">
                        <Ionicons name="checkmark-done" size={18} color="#3B82F6" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default UsersTab;
