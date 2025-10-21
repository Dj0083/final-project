import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { investorAPI } from '../../api';

const DashboardScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalInvested: 0, activeDeals: 0 });

  const loadStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [approved, funded] = await Promise.all([
        investorAPI.listRequests({ status: 'approved' }),
        investorAPI.listRequests({ status: 'funded' }),
      ]);
      const listA = Array.isArray(approved) ? approved : [];
      const listF = Array.isArray(funded) ? funded : [];
      const normalized = [...listA.filter(r => (r.admin_approved || r.adminApproved)), ...listF];
      const map = new Map();
      normalized.forEach(r => map.set(String(r.id), r));
      const list = Array.from(map.values());
      let total = 0;
      list.forEach(r => { total += parseFloat(r.funding_amount || r.amount || 0) || 0; });
      setStats({ totalInvested: total, activeDeals: list.length });
    } catch (_) {
      // silent
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(false); }, [loadStats]);
  useFocusEffect(useCallback(() => { loadStats(true); }, [loadStats]));
  const onRefresh = useCallback(async () => { setRefreshing(true); await loadStats(true); setRefreshing(false); }, [loadStats]);

  // ✅ Clean navigation (no router.isReady)
  const handleNavigate = (path) => {
  console.log("Navigating to:", path);
  router.push(path);
};


  const QuickActionButton = ({ title, icon, color, path, onPress }) => (
    <TouchableOpacity
      style={styles.quickActionContainer}
      onPress={onPress ? onPress : () => handleNavigate(path)}
    >
      <LinearGradient
        colors={color}
        style={styles.quickActionButton}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={28} color="white" />
        <Text style={styles.quickActionText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Explicit navigation helpers for investor screens
  const goToInvestmentPreferences = () => router.push('/invester/InvestmentPreferenceScreen');
  const goToFundingRequests = () => router.push('/invester/funding-request');
  const goToInvestmentProgress = () => router.push('/invester/investment-progress');
  const goToReports = () => router.push('/invester/ReportsScreen');

  const StatCard = ({ title, value, progress, icon }) => (
    <View style={styles.statCard}>
      <LinearGradient
        colors={['#22c55e', '#16a34a']}
        style={styles.statIconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={24} color="white" />
      </LinearGradient>
      <View style={styles.statContent}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={[styles.progressBar, { width: `${progress}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> }>
        {/* Header */}
        <LinearGradient
          colors={['#22c55e', '#3b82f6']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={styles.profileSection}>
              <TouchableOpacity
                style={styles.profileIcon}
                onPress={() => handleNavigate('/invester/ProfileScreen')}
              >
                <Ionicons name="person" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>INVESTOR</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => handleNavigate('/invester/MessagesScreen')}
              >
                <Ionicons name="notifications-outline" size={24} color="white" />
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>2</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => handleNavigate('/invester/ProfileScreen')}
              >
                <Ionicons name="settings-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.tagline}>Connecting Local Entrepreneurs</Text>
        </LinearGradient>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <StatCard
            title="Total Invested"
            value={`LKR ${formatAmount(stats.totalInvested)}`}
            progress={stats.totalInvested > 0 ? 100 : 0}
            icon="trending-up"
          />
          <StatCard
            title="Active Deals"
            value={String(stats.activeDeals)}
            progress={stats.activeDeals > 0 ? 100 : 0}
            icon="briefcase"
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            
            <QuickActionButton
              title="Investment Preferences"
              icon="settings"
              color={['#22c55e', '#16a34a']}
              onPress={goToInvestmentPreferences}
            />
            <QuickActionButton
              title="Funding Requests"
              icon="document-text"
              color={['#f59e0b', '#d97706']}
              onPress={goToFundingRequests}
            />
            <QuickActionButton
              title="Investment Progress"
              icon="stats-chart"
              color={['#84cc16', '#65a30d']}
              onPress={goToInvestmentProgress}
            />
            <QuickActionButton
              title="Reports"
              icon="document-attach"
              color={['#ef4444', '#dc2626']}
              onPress={goToReports}
            />
            
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.recentActivity}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityList}>
            {[
              { text: 'New funding request from Handloom Center', time: '2 min ago', icon: 'document-text', color: '#22c55e' },
              { text: 'Investment approved for Craft Lanka', time: '1 hr ago', icon: 'checkmark-circle', color: '#3b82f6' },
              { text: 'Report generated for Q3 investments', time: '3 hrs ago', icon: 'bar-chart', color: '#f59e0b' },
            ].map((item, index) => (
              <View key={index} style={styles.activityItem}>
                <View
                  style={[
                    styles.activityIconContainer,
                    { backgroundColor: item.color + '20' },
                  ]}
                >
                  <Ionicons name={item.icon} size={16} color={item.color} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>{item.text}</Text>
                  <Text style={styles.activityTime}>{item.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 5,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBackground: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionContainer: {
    width: '48%',
    marginBottom: 15,
  },
  quickActionButton: {
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
  recentActivity: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  activityList: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  activityIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 3,
  },
  activityTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

export default DashboardScreen;

function formatAmount(n) {
  const num = parseFloat(n || 0);
  return Number.isFinite(num) ? num.toLocaleString() : '0';
}
