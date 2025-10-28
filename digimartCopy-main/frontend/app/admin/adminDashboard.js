import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../config/api';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingApprovals: 0,
    totalRevenue: 0,
    todayOrders: 0,
    totalProducts: 0,
    pendingAgreements: 0
  });
  const [userDist, setUserDist] = useState({ customers: 0, sellers: 0, investors: 0, affiliates: 0 });

  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem('admin_stats');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') {
            setStats(prev => ({ ...prev, ...parsed }));
            setLoading(false);
          }
        }
      } catch { }
      fetchDashboardStats();
      fetchPendingAgreements();
      fetchUserDistribution();
    })();
  }, []);

  useEffect(() => {
    let t = setInterval(() => {
      fetchDashboardStats();
      fetchPendingAgreements();
      fetchUserDistribution();
    }, 10000);
    return () => {
      if (t) clearInterval(t);
    };
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/stats');
      const data = res.data || {};
      const next = {
        totalUsers: Number(data.totalUsers ?? data.total_users ?? 0),
        activeUsers: Number(data.activeUsers ?? data.active_users ?? 0),
        pendingApprovals: Number(data.pendingApprovals ?? data.pending_approvals ?? 0),
        totalRevenue: Number(data.totalRevenue ?? data.total_revenue ?? 0),
        todayOrders: Number(data.todayOrders ?? data.today_orders ?? 0),
        totalProducts: Number(data.totalProducts ?? data.total_products ?? 0),
      };
      setStats(prev => ({ ...prev, ...next }));
      try { await AsyncStorage.setItem('admin_stats', JSON.stringify({ ...stats, ...next })); } catch { }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPendingAgreements = async () => {
    try {
      const res = await api.get('/api/investment-requests/pending-agreements/list');
      const count = Array.isArray(res.data?.requests) ? res.data.requests.length : 0;
      setStats(prev => ({ ...prev, pendingAgreements: count }));
      try { await AsyncStorage.setItem('admin_stats', JSON.stringify({ ...stats, pendingAgreements: count })); } catch { }
    } catch (e) {
      // leave count as-is on error
    }
  };

  const fetchUserDistribution = async () => {
    try {
      const roles = [
        { key: 'customers', role: 'customer' },
        { key: 'sellers', role: 'seller' },
        { key: 'investors', role: 'investor' },
        { key: 'affiliates', role: 'affiliate' },
      ];
      const results = await Promise.all(
        roles.map(r => api.get('/api/users/all', { params: { role: r.role } }).catch(() => ({ data: { users: [] } })))
      );
      const next = { ...userDist };
      results.forEach((res, idx) => {
        const arr = Array.isArray(res.data?.users) ? res.data.users : [];
        next[roles[idx].key] = arr.length;
      });
      setUserDist(next);
    } catch { }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
    fetchPendingAgreements();
    fetchUserDistribution();
  };

  if (loading && !refreshing) {
    return (
      <View className="items-center justify-center flex-1 bg-gray-50">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="mt-4 text-gray-500">Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-5 pt-12 pb-6 bg-orange-500">
        <Text className="mb-2 text-2xl font-bold text-white">Admin Dashboard</Text>
        <Text className="text-orange-100">Welcome back, Admin</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        className="flex-1"
      >
        {/* Quick Actions */}
        <View className="px-5 py-6">
          <Text className="mb-4 text-lg font-bold text-gray-900">Quick Actions</Text>
          <View className="flex-row flex-wrap justify-between">
            <TouchableOpacity
              onPress={() => {/* Stay on current page */ }}
              className="items-center p-4 mb-3 bg-white shadow-sm rounded-2xl"
              style={{ width: '48%' }}
            >
              <View className="items-center justify-center mb-3 bg-indigo-100 rounded-full w-14 h-14">
                <Ionicons name="analytics" size={28} color="#6366F1" />
              </View>
              <Text className="font-semibold text-center text-gray-900">Overview</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/admin/UsersTab')}
              className="items-center p-4 mb-3 bg-white shadow-sm rounded-2xl"
              style={{ width: '48%' }}
            >
              <View className="items-center justify-center mb-3 bg-orange-100 rounded-full w-14 h-14">
                <Ionicons name="people" size={28} color="#F97316" />
              </View>
              <Text className="font-semibold text-center text-gray-900">All Users</Text>
              {stats.pendingApprovals > 0 && (
                <View className="px-2 py-1 mt-2 bg-red-500 rounded-full">
                  <Text className="text-xs font-bold text-white">{stats.pendingApprovals} Pending</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/admin/ManageUsers')}
              className="items-center p-4 mb-3 bg-white shadow-sm rounded-2xl"
              style={{ width: '48%' }}
            >
              <View className="items-center justify-center mb-3 bg-blue-100 rounded-full w-14 h-14">
                <Ionicons name="person-add" size={28} color="#3B82F6" />
              </View>
              <Text className="font-semibold text-center text-gray-900">Manage Users</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/admin/requests')}
              className="items-center p-4 mb-3 bg-white shadow-sm rounded-2xl"
              style={{ width: '48%' }}
            >
              <View className="items-center justify-center mb-3 bg-green-100 rounded-full w-14 h-14">
                <Ionicons name="document" size={28} color="#10B981" />
              </View>
              <Text className="font-semibold text-center text-gray-900">Requests</Text>
              {stats.pendingAgreements > 0 && (
                <View className="px-2 py-1 mt-2 bg-red-500 rounded-full">
                  <Text className="text-xs font-bold text-white">{stats.pendingAgreements} Pending</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/admin/SettingsTab')}
              className="items-center p-4 mb-3 bg-white shadow-sm rounded-2xl"
              style={{ width: '48%' }}
            >
              <View className="items-center justify-center mb-3 bg-purple-100 rounded-full w-14 h-14">
                <Ionicons name="settings" size={28} color="#8B5CF6" />
              </View>
              <Text className="font-semibold text-center text-gray-900">Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Platform Statistics */}
        <View className="px-5 pb-6">
          <Text className="mb-4 text-lg font-bold text-gray-900">Platform Statistics</Text>
          <View className="flex-row justify-between mb-4">
            <View className="p-5 bg-white shadow-sm rounded-xl" style={{ width: '48%' }}>
              <View className="items-center justify-center mb-3 bg-blue-100 rounded-full w-11 h-11">
                <Ionicons name="people" size={26} color="#3B82F6" />
              </View>
              <Text className="mb-1 text-sm font-medium text-gray-600">Total Users</Text>
              <Text className="text-3xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</Text>
            </View>

            <View className="p-5 bg-white shadow-sm rounded-xl" style={{ width: '48%' }}>
              <View className="items-center justify-center mb-3 bg-green-100 rounded-full w-11 h-11">
                <Ionicons name="checkmark-circle" size={26} color="#10B981" />
              </View>
              <Text className="mb-1 text-sm font-medium text-gray-600">Active Users</Text>
              <Text className="text-3xl font-bold text-gray-900">{stats.activeUsers.toLocaleString()}</Text>
            </View>
          </View>

          {/* Product & Orders Statistics */}
          <View className="flex-row justify-between">
            <View className="p-5 bg-white shadow-sm rounded-xl" style={{ width: '48%' }}>
              <View className="items-center justify-center mb-3 bg-purple-100 rounded-full w-11 h-11">
                <Ionicons name="cube" size={26} color="#8B5CF6" />
              </View>
              <Text className="mb-1 text-sm font-medium text-gray-600">Total Products</Text>
              <Text className="text-3xl font-bold text-gray-900">
                {stats.totalProducts.toLocaleString()}
              </Text>
            </View>

            <View className="p-5 bg-white shadow-sm rounded-xl" style={{ width: '48%' }}>
              <View className="items-center justify-center mb-3 bg-yellow-100 rounded-full w-11 h-11">
                <Ionicons name="cart" size={26} color="#F59E0B" />
              </View>
              <Text className="mb-1 text-sm font-medium text-gray-600">Today's Orders</Text>
              <Text className="text-3xl font-bold text-gray-900">
                {stats.todayOrders}
              </Text>
            </View>
          </View>
        </View>

        {/* User Distribution */}
        <View className="px-5 pb-6">
          <View className="p-5 bg-white shadow-sm rounded-2xl">
            <Text className="mb-4 text-lg font-bold text-gray-900">User Distribution</Text>
            {[
              { label: 'Customers', value: userDist.customers, color: '#3B82F6', icon: 'cart' },
              { label: 'Sellers', value: userDist.sellers, color: '#10B981', icon: 'storefront' },
              { label: 'Investors', value: userDist.investors, color: '#8B5CF6', icon: 'cash' },
              { label: 'Affiliates', value: userDist.affiliates, color: '#F59E0B', icon: 'link' },
            ].map((item, index) => (
              <View key={index} className="flex-row items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <View className="flex-row items-center">
                  <View style={{ backgroundColor: item.color + '20' }} className="items-center justify-center w-10 h-10 mr-3 rounded-full">
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text className="text-base font-medium text-gray-700">{item.label}</Text>
                </View>
                <Text className="text-lg font-bold text-gray-900">{Number(item.value || 0).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
