import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import API from '../../api';

const ReportsScreen = () => {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState('Monthly');
  const [snapshot, setSnapshot] = useState({ total: 0, deals: 0, awaiting: 0 });
  const [recentFunded, setRecentFunded] = useState([]);

  const loadSnapshot = useCallback(async () => {
    try {
      const res = await API.get('/investment-requests/stats');
      const data = res?.data || {};
      let awaiting = 0;
      try {
        const approved = await API.get('/investment-requests/investor/requests', { params: { status: 'approved' } });
        const arr = Array.isArray(approved?.data) ? approved.data : (Array.isArray(approved?.data?.requests) ? approved.data.requests : []);
        awaiting = arr.length;
      } catch (_) {}
      if (String(data.role) === 'investor') {
        setSnapshot({ total: Number(data.total_invested || 0), deals: Number(data.active_deals || 0), awaiting });
      }
    } catch (_) {}
  }, []);

  const loadRecentFunded = useCallback(async () => {
    try {
      const res = await API.get('/investment-requests/investor/requests', { params: { status: 'funded' } });
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.requests) ? res.data.requests : []);
      const items = list
        .slice(0, 5)
        .map(r => ({
          id: String(r.id),
          name: r.business_name || r.entrepreneur_name || 'Business',
          amount: Number(r.funded_amount || r.funding_amount || r.amount || 0),
          date: r.updated_at || r.created_at,
        }));
      setRecentFunded(items);
    } catch (_) {}
  }, []);

  useEffect(() => { loadSnapshot(); loadRecentFunded(); }, [loadSnapshot, loadRecentFunded]);
  useFocusEffect(useCallback(() => { loadSnapshot(); loadRecentFunded(); return () => {}; }, [loadSnapshot, loadRecentFunded]));

  const ReportCard = ({ title, description, date, icon, color, fileType }) => (
    <TouchableOpacity 
      style={styles.reportCard}
      onPress={() => Alert.alert('Download Report', `Downloading ${title}...`)}
    >
      <View style={styles.reportHeader}>
        <LinearGradient
          colors={color}
          style={styles.reportIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={icon} size={24} color="white" />
        </LinearGradient>
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle}>{title}</Text>
          <Text style={styles.reportDescription}>{description}</Text>
          <View style={styles.reportMeta}>
            <Ionicons name="calendar" size={14} color="#64748b" />
            <Text style={styles.reportDate}>{date}</Text>
          </View>
        </View>
      </View>
      <View style={styles.reportActions}>
        <View style={styles.fileTypeBadge}>
          <Text style={styles.fileTypeText}>{fileType}</Text>
        </View>
        <TouchableOpacity style={styles.downloadButton}>
          <Ionicons name="download-outline" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const PeriodButton = ({ title, isActive }) => (
    <TouchableOpacity 
      onPress={() => setSelectedPeriod(title)}
      style={styles.periodButtonContainer}
    >
      {isActive ? (
        <LinearGradient
          colors={['#3b82f6', '#2563eb']}
          style={styles.periodButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.periodTextActive}>{title}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.periodButtonInactive}>
          <Text style={styles.periodTextInactive}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <View style={styles.statCard}>
      <LinearGradient
        colors={color}
        style={styles.statIconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={20} color="white" />
      </LinearGradient>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
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
          <Text style={styles.headerTitle}>Reports & Analytics</Text>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => Alert.alert('Generate Report', 'Create custom report')}
          >
            <Ionicons name="add-circle" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Investor Snapshot */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Investor Snapshot</Text>
          <View style={styles.statsRow}>
            <StatCard
              title="Total Invested"
              value={`LKR ${formatAmount(snapshot.total)}`}
              icon="cash"
              color={['#22c55e', '#16a34a']}
              subtitle="Funded deals"
            />
            <StatCard
              title="Active Deals"
              value={String(snapshot.deals)}
              icon="briefcase"
              color={['#3b82f6', '#2563eb']}
              subtitle="Currently active"
            />
            <StatCard
              title="Awaiting Funding"
              value={String(snapshot.awaiting)}
              icon="hourglass"
              color={['#f59e0b', '#d97706']}
              subtitle="Approved stage"
            />
          </View>
        </View>
        {/* Period Filter */}
        <View style={styles.periodSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.periodScroll}
          >
            {['Weekly', 'Monthly', 'Quarterly', 'Yearly'].map((period) => (
              <PeriodButton
                key={period}
                title={period}
                isActive={selectedPeriod === period}
              />
            ))}
          </ScrollView>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.statsRow}>
            <StatCard
              title="Total Reports"
              value="24"
              icon="document-text"
              color={['#22c55e', '#16a34a']}
              subtitle="Generated"
            />
            <StatCard
              title="Investments"
              value="12"
              icon="business"
              color={['#3b82f6', '#2563eb']}
              subtitle="Active"
            />
            <StatCard
              title="ROI"
              value="24.5%"
              icon="trending-up"
              color={['#8b5cf6', '#7c3aed']}
              subtitle="Average"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => Alert.alert('Generate Report', 'Creating new report...')}
            >
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                style={styles.quickActionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add-circle" size={22} color="white" />
                <Text style={styles.quickActionText}>Generate New</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => Alert.alert('Export All', 'Exporting all reports...')}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.quickActionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="download" size={22} color="white" />
                <Text style={styles.quickActionText}>Export All</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Funded (live) */}
        <View style={styles.reportsSection}>
          <Text style={styles.sectionTitle}>Recent Funded</Text>
          {recentFunded.length === 0 ? (
            <Text style={{ color: '#6b7280', paddingHorizontal: 20 }}>No funded items yet</Text>
          ) : (
            recentFunded.map((it) => (
              <View key={it.id} style={[styles.reportCard, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}> 
                <View>
                  <Text style={styles.reportTitle}>{it.name}</Text>
                  <Text style={styles.reportDescription}>LKR {formatAmount(it.amount)}</Text>
                </View>
                <Text style={styles.reportDate}>{new Date(it.date).toLocaleString()}</Text>
              </View>
            ))
          )}
        </View>

        {/* Recent Reports (static templates) */}
        <View style={styles.reportsSection}>
          <Text style={styles.sectionTitle}>Recent Reports</Text>
          
          <ReportCard
            title="Investment Performance Report"
            description="Detailed analysis of all investments for October 2025"
            date="Oct 8, 2025"
            icon="bar-chart"
            color={['#22c55e', '#16a34a']}
            fileType="PDF"
          />
          
          <ReportCard
            title="Portfolio Summary"
            description="Complete portfolio overview with ROI metrics"
            date="Oct 1, 2025"
            icon="pie-chart"
            color={['#3b82f6', '#2563eb']}
            fileType="PDF"
          />
          
          <ReportCard
            title="Q3 Financial Statement"
            description="Quarterly financial performance and projections"
            date="Sep 30, 2025"
            icon="stats-chart"
            color={['#8b5cf6', '#7c3aed']}
            fileType="XLSX"
          />
          
          <ReportCard
            title="Tax Documentation"
            description="Investment tax records for fiscal year 2025"
            date="Sep 28, 2025"
            icon="document-text"
            color={['#f59e0b', '#d97706']}
            fileType="PDF"
          />
          
          <ReportCard
            title="Risk Analysis Report"
            description="Portfolio risk assessment and recommendations"
            date="Sep 25, 2025"
            icon="shield-checkmark"
            color={['#ef4444', '#dc2626']}
            fileType="PDF"
          />
          
          <ReportCard
            title="Investment Opportunities Analysis"
            description="Market trends and new investment opportunities"
            date="Sep 20, 2025"
            icon="bulb"
            color={['#06b6d4', '#0891b2']}
            fileType="PDF"
          />
        </View>

        {/* Report Types */}
        <View style={styles.typesSection}>
          <Text style={styles.sectionTitle}>Report Types</Text>
          <View style={styles.typesList}>
            {[
              { name: 'Financial Reports', icon: 'cash', count: '8', color: '#22c55e' },
              { name: 'Performance Analytics', icon: 'analytics', count: '6', color: '#3b82f6' },
              { name: 'Tax Documents', icon: 'document-attach', count: '4', color: '#f59e0b' },
              { name: 'Risk Assessments', icon: 'alert-circle', count: '3', color: '#ef4444' },
              { name: 'Market Analysis', icon: 'trending-up', count: '3', color: '#8b5cf6' },
            ].map((type, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.typeItem}
                onPress={() => Alert.alert(type.name, `View all ${type.name}`)}
              >
                <View style={[styles.typeIcon, { backgroundColor: type.color + '20' }]}>
                  <Ionicons name={type.icon} size={20} color={type.color} />
                </View>
                <View style={styles.typeContent}>
                  <Text style={styles.typeName}>{type.name}</Text>
                  <Text style={styles.typeCount}>{type.count} reports</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingVertical: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', flex: 1, textAlign: 'center' },
  headerButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  periodSection: { paddingVertical: 20 },
  periodScroll: { paddingLeft: 20 },
  periodButtonContainer: { marginRight: 12 },
  periodButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  periodButtonInactive: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb' },
  periodTextActive: { color: 'white', fontSize: 14, fontWeight: '600' },
  periodTextInactive: { color: '#6b7280', fontSize: 14, fontWeight: '500' },
  statsSection: { paddingHorizontal: 20, marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 15, padding: 15, marginHorizontal: 5, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  statIconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  statTitle: { fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 2 },
  statSubtitle: { fontSize: 10, color: '#9ca3af', textAlign: 'center' },
  quickActionsSection: { paddingHorizontal: 20, marginBottom: 25 },
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickActionButton: { flex: 1, marginHorizontal: 5 },
  quickActionGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
  quickActionText: { color: 'white', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  reportsSection: { paddingHorizontal: 20, marginBottom: 25 },
  reportCard: { backgroundColor: 'white', borderRadius: 15, padding: 15, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  reportHeader: { flexDirection: 'row', marginBottom: 12 },
  reportIcon: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  reportInfo: { flex: 1 },
  reportTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  reportDescription: { fontSize: 13, color: '#64748b', marginBottom: 6, lineHeight: 18 },
  reportMeta: { flexDirection: 'row', alignItems: 'center' },
  reportDate: { fontSize: 12, color: '#64748b', marginLeft: 5 },
  reportActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  fileTypeBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  fileTypeText: { fontSize: 12, fontWeight: '600', color: '#3b82f6' },
  downloadButton: { padding: 8 },
  typesSection: { paddingHorizontal: 20, paddingBottom: 30 },
  typesList: { backgroundColor: 'white', borderRadius: 15, padding: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  typeItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  typeIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  typeContent: { flex: 1 },
  typeName: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginBottom: 3 },
  typeCount: { fontSize: 13, color: '#64748b' },
});

function formatAmount(n) {
  const num = parseFloat(n || 0);
  return Number.isFinite(num) ? num.toLocaleString() : '0';
}

export default ReportsScreen;