import React, { useEffect, useState, useCallback } from 'react';

import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { investorAPI } from '../../api';

const InvestmentProgressScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [investments, setInvestments] = useState([]);
  const [totals, setTotals] = useState({ totalAmount: 0, count: 0, byCategory: {}, dealers: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadInvestments = useCallback(async (silent = false) => {
    if (!router.isReady) return;
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
      setInvestments(list);

      let totalAmount = 0;
      const byCategory = {};
      const dealerSet = new Set();
      list.forEach(r => {
        const amt = parseFloat(r.funding_amount || r.amount || 0) || 0;
        totalAmount += amt;
        const cat = r.category || r.business_category || 'Investment';
        byCategory[cat] = (byCategory[cat] || 0) + amt;
        const dealerId = r.entrepreneur_id || r.entrepreneurId || r.entrepreneur_user_id || r.entrepreneur?.id;
        const dealerKey = dealerId ? String(dealerId) : String(r.entrepreneur_name || r.business_name || Math.random());
        dealerSet.add(dealerKey);
      });
      setTotals({ totalAmount, count: list.length, byCategory, dealers: dealerSet.size });
    } catch (e) {
      // silent
    } finally {
      if (!silent) setLoading(false);
    }
  }, [router.isReady]);

  useEffect(() => {
    loadInvestments(false);
  }, [loadInvestments]);

  useFocusEffect(
    useCallback(() => {
      // Refresh on focus and poll every 30s while focused
      loadInvestments(true);
      const id = setInterval(() => loadInvestments(true), 30000);
      return () => clearInterval(id);
    }, [loadInvestments])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInvestments(true);
    setRefreshing(false);
  }, [loadInvestments]);

  const handleNavigate = (path) => {
    if (router.isReady && path) {
      router.push(path);
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <View style={styles.statCard}>
      <LinearGradient
        colors={color}
        style={styles.statIconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={22} color="white" />
      </LinearGradient>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const InvestmentItem = ({ company, amount, roi, progress, status, color }) => (
    <View style={styles.investmentItem}>
      <View style={styles.investmentHeader}>
        <View style={styles.investmentInfo}>
          <Text style={styles.investmentCompany}>{company}</Text>
          <Text style={styles.investmentAmount}>{amount}</Text>
        </View>
        <LinearGradient
          colors={color}
          style={styles.roiBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="trending-up" size={12} color="white" />
          <Text style={styles.roiText}>{roi}</Text>
        </LinearGradient>
      </View>
      
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Progress</Text>
          <Text style={styles.progressValue}>{progress}%</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <LinearGradient
            colors={color}
            style={[styles.progressBar, { width: `${progress}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
        <View style={styles.statusRow}>
          <Ionicons name="checkmark-circle" size={14} color={color[0]} />
          <Text style={[styles.statusText, { color: color[0] }]}>{status}</Text>
        </View>
      </View>
    </View>
  );

  const ActionButton = ({ title, icon, color, onPress }) => (
    <TouchableOpacity onPress={onPress} style={styles.actionButtonContainer}>
      <LinearGradient
        colors={color}
        style={styles.actionButton}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={18} color="white" />
        <Text style={styles.actionButtonText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#22c55e', '#3b82f6']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Investment Progress</Text>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="analytics" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Overview */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <StatCard
              title="Total Portfolio"
              value={`LKR ${formatAmount(totals.totalAmount)}`}
              subtitle="Approved & Funded"
              icon="wallet"
              color={['#22c55e', '#16a34a']}
            />
            <StatCard
              title="Active Investments"
              value={String(totals.count)}
              subtitle="Admin approved or funded"
              icon="business"
              color={['#3b82f6', '#2563eb']}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title="Active Dealers"
              value={String(totals.dealers)}
              subtitle="Distinct entrepreneurs"
              icon="people"
              color={['#8b5cf6', '#7c3aed']}
            />
            <StatCard
              title="Total Returns"
              value={`LKR ${formatAmount(totals.totalAmount)}`}
              subtitle="Invested amount"
              icon="cash"
              color={['#f59e0b', '#d97706']}
            />
          </View>
        </View>

        {/* By Category Allocation */}
        <View style={styles.investmentsSection}>
          <Text style={styles.sectionTitle}>By Category Allocation</Text>
          <View style={styles.investmentsList}>
            {Object.keys(totals.byCategory).length > 0 ? (
              Object.entries(totals.byCategory).map(([cat, amt]) => {
                const pct = totals.totalAmount > 0 ? Math.round((amt / totals.totalAmount) * 100) : 0;
                const grad = pickColor(cat);
                return (
                  <View key={cat} style={{ paddingVertical: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ color: '#111827', fontWeight: '600' }}>{cat}</Text>
                      <Text style={{ color: '#6b7280', fontWeight: '600' }}>{pct}% • LKR {formatAmount(amt)}</Text>
                    </View>
                    <View style={{ height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                      <LinearGradient
                        colors={grad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ width: `${pct}%`, height: '100%' }}
                      />
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={{ color: '#6b7280' }}>No allocation yet</Text>
            )}
          </View>
        </View>

        {/* Portfolio Chart Placeholder */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Portfolio Overview</Text>
          <View style={styles.chartPlaceholder}>
            <LinearGradient
              colors={['#f8fafc', '#e2e8f0']}
              style={styles.chartBackground}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="bar-chart" size={48} color="#64748b" />
              <Text style={styles.chartText}>Portfolio Performance Chart</Text>
              <Text style={styles.chartSubtext}>Visual representation of your investments</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Investment List */}
        <View style={styles.investmentsSection}>
          <Text style={styles.sectionTitle}>Current Investments</Text>
          <View style={styles.investmentsList}>
            {investments.map((r) => {
              const key = String(r.id);
              const company = r.business_name || r.entrepreneur_name || 'Business';
              const amount = `LKR ${formatAmount(r.funding_amount || r.amount || 0)}`;
              const category = r.category || r.business_category || 'Investment';
              const isFunded = String(r.status || '').toLowerCase() === 'funded';
              const status = isFunded ? 'Funded' : 'Admin Approved';
              const color = pickColor(category);
              return (
                <InvestmentItem
                  key={key}
                  company={`${company} • ${category}`}
                  amount={amount}
                  roi={r.roi ? `${r.roi}%` : '--%'}
                  progress={100}
                  status={status}
                  color={color}
                />
              );
            })}
            {investments.length === 0 && (
              <Text style={{ color: '#6b7280' }}>No approved or funded investments yet</Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          
          <View style={styles.actionsGrid}>
            
            
            
           
          </View>
        </View>
      </ScrollView>
      {loading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 24, alignItems: 'center', minWidth: 220 }}>
            <ActivityIndicator size="large" color="#fb923c" />
            <Text style={{ marginTop: 10, fontWeight: '700', color: '#111827' }}>Loading...</Text>
            <Text style={{ marginTop: 2, color: '#6b7280', fontSize: 12 }}>Please wait a moment</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingVertical: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', flex: 1, textAlign: 'center' },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingTop: 20 },
  statsSection: { paddingHorizontal: 20, marginBottom: 25 },
  statsRow: { flexDirection: 'row', marginBottom: 15 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 15, padding: 20, marginHorizontal: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  statIconContainer: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statContent: { flex: 1 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  statTitle: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  statSubtitle: { fontSize: 11, color: '#9ca3af' },
  chartSection: { paddingHorizontal: 20, marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
  chartPlaceholder: { backgroundColor: 'white', borderRadius: 15, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  chartBackground: { paddingVertical: 60, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  chartText: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12, textAlign: 'center' },
  chartSubtext: { fontSize: 14, color: '#9ca3af', marginTop: 4, textAlign: 'center' },
  investmentsSection: { paddingHorizontal: 20, marginBottom: 25 },
  investmentsList: { backgroundColor: 'white', borderRadius: 15, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  investmentItem: { paddingVertical: 15, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  investmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  investmentInfo: { flex: 1 },
  investmentCompany: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  investmentAmount: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  roiBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginLeft: 10 },
  roiText: { color: 'white', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  progressSection: { marginTop: 5 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  progressValue: { fontSize: 13, color: '#1e293b', fontWeight: '600' },
  progressBarContainer: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressBar: { height: '100%', borderRadius: 3 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 12, fontWeight: '500', marginLeft: 5 },
  actionsSection: { paddingHorizontal: 20, paddingBottom: 30 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionButtonContainer: { width: '48%', marginBottom: 15 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 12 },
  actionButtonText: { color: 'white', fontSize: 14, fontWeight: '600', marginLeft: 8 },
});

function formatAmount(n) {
  const num = parseFloat(n || 0);
  return Number.isFinite(num) ? num.toLocaleString() : '0';
}

function pickColor(category) {
  const key = String(category || '').toLowerCase();
  if (key.includes('textile') || key.includes('handloom')) return ['#22c55e', '#16a34a'];
  if (key.includes('craft') || key.includes('artisan')) return ['#3b82f6', '#2563eb'];
  if (key.includes('pottery') || key.includes('ceramic')) return ['#8b5cf6', '#7c3aed'];
  if (key.includes('spice') || key.includes('agri') || key.includes('agro')) return ['#f59e0b', '#d97706'];
  if (key.includes('tech') || key.includes('it')) return ['#06b6d4', '#0891b2'];
  return ['#22c55e', '#16a34a'];
}

export default InvestmentProgressScreen;