import React, { useCallback, useEffect, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { investorAPI } from '../../api';

const MessagesScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Fetch recent requests across statuses likely to have chats/updates
      const statuses = ['pending', 'approved', 'funded'];
      const results = await Promise.all(statuses.map(s => investorAPI.listRequests({ status: s })));
      // Flatten, unique by id
      const all = [];
      results.forEach(arr => { if (Array.isArray(arr)) all.push(...arr); });
      const map = new Map();
      all.forEach(r => map.set(String(r.id), r));
      const requests = Array.from(map.values())
        .sort((a,b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
        .slice(0, 20);

      // For each request, fetch latest messages (limit if backend supports params)
      const enriched = await Promise.all(requests.map(async (r) => {
        let msgs = [];
        try {
          msgs = await investorAPI.listMessages(r.id, { limit: 1, order: 'desc' });
        } catch (_) {}
        const last = Array.isArray(msgs) && msgs.length > 0 ? msgs[0] : null;
        // Build a notification line
        const sysStatus = String(r.status || '').toLowerCase();
        const adminApproved = r.admin_approved || r.adminApproved;
        let note = last?.message || '';
        // Surface system highlights
        if (adminApproved && sysStatus === 'approved') {
          note = 'Admin approved - proceed to fund';
        }
        if (sysStatus === 'funded') {
          note = 'Agreement approved • Funding completed';
        }
        const time = (last?.created_at || r.updated_at || r.created_at) ? new Date(last?.created_at || r.updated_at || r.created_at).toLocaleString() : '';
        return {
          id: r.id,
          name: r.entrepreneur_name || r.business_name || 'Entrepreneur',
          message: note || (r.business_description ? String(r.business_description).slice(0, 80) : 'No message'),
          time,
          unread: false,
        };
      }));
      setItems(enriched);
    } catch (_) {
      // keep existing
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(false); }, [load]);
  useFocusEffect(useCallback(() => { load(true); }, [load]));
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(true); setRefreshing(false); }, [load]);

  const MessageItem = ({ id, name, message, time, unread = false, avatar }) => (
    <TouchableOpacity 
      style={styles.messageItem} 
      onPress={() => router.push(`/investor/requests/${id}`)}
    >
      <LinearGradient
        colors={avatar ? avatar.colors : ['#64748b', '#475569']}
        style={styles.avatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="person" size={24} color="white" />
      </LinearGradient>

      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={styles.messageName}>{name}</Text>
          <View style={styles.timeContainer}>
            <Text style={styles.messageTime}>{time}</Text>
            {unread && <View style={styles.unreadDot} />}
          </View>
        </View>
        <View style={styles.messageTextRow}>
          <Text style={styles.messageText} numberOfLines={1}>
            {message}
          </Text>
          {unread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>1</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const QuickActionButton = ({ title, icon, color, onPress }) => (
    <TouchableOpacity onPress={onPress} style={styles.quickActionContainer}>
      <LinearGradient
        colors={color}
        style={styles.quickActionButton}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={20} color="white" />
        <Text style={styles.quickActionText}>{title}</Text>
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
          <Text style={styles.headerTitle}>Messages & Requests</Text>
          <TouchableOpacity style={styles.headerButton} onPress={() => Alert.alert('New Message', 'Compose new message')}>
            <Ionicons name="add-circle" size={28} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Empowering Village Entrepreneurs</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Quick Actions */}
        

        {/* Filter Tabs */}
        <View style={styles.filterSection}>
          <TouchableOpacity style={styles.filterTabActive}>
            <Ionicons name="mail" size={18} color="white" />
            <Text style={styles.filterTextActive}>All Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterTab}>
            <Ionicons name="mail-unread" size={18} color="#64748b" />
            <Text style={styles.filterText}>Unread (2)</Text>
          </TouchableOpacity>
        </View>

        {/* Messages Section */}
        <View style={styles.messagesSection}>
          <Text style={styles.sectionTitle}>Recent Messages</Text>

          <View style={styles.messagesList}>
            {items.map((n) => (
              <MessageItem key={n.id} id={n.id} name={n.name} message={n.message} time={n.time} unread={n.unread} />
            ))}
            {items.length === 0 && (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ color: '#6b7280' }}>{loading ? 'Loading...' : 'No messages yet'}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityList}>
              {[
                { text: 'New funding request received', time: '5 min ago', icon: 'document-text', color: '#22c55e' },
                { text: 'Document verification completed', time: '1 hr ago', icon: 'checkmark-circle', color: '#3b82f6' },
                { text: 'Investment proposal sent', time: '2 hrs ago', icon: 'paper-plane', color: '#8b5cf6' },
                { text: 'Meeting scheduled with entrepreneur', time: '4 hrs ago', icon: 'calendar', color: '#f59e0b' },
              ].map((item, index) => (
                <View key={index} style={styles.activityItem}>
                  <View style={[styles.activityIconContainer, { backgroundColor: item.color + '20' }]}>
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingVertical: 25, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', flex: 1, textAlign: 'center' },
  headerButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  content: { flex: 1, paddingTop: 20 },
  quickActionsSection: { paddingHorizontal: 20, marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickActionContainer: { flex: 1, marginHorizontal: 5 },
  quickActionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 12 },
  quickActionText: { color: 'white', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  filterSection: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20 },
  filterTabActive: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: '#3b82f6', borderRadius: 12, marginRight: 10 },
  filterTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  filterTextActive: { color: 'white', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  filterText: { color: '#64748b', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  messagesSection: { paddingHorizontal: 20, marginBottom: 25 },
  messagesList: { backgroundColor: 'white', borderRadius: 15, padding: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  messageItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  messageContent: { flex: 1 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  messageName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  timeContainer: { flexDirection: 'row', alignItems: 'center' },
  messageTime: { fontSize: 12, color: '#9ca3af' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', marginLeft: 8 },
  messageTextRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  messageText: { fontSize: 14, color: '#64748b', lineHeight: 20, flex: 1 },
  unreadBadge: { backgroundColor: '#22c55e', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  unreadCount: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  activitySection: { paddingHorizontal: 20, paddingBottom: 30 },
  activityCard: { backgroundColor: 'white', borderRadius: 15, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  activityList: { flex: 1 },
  activityItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  activityIconContainer: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  activityContent: { flex: 1 },
  activityText: { fontSize: 14, color: '#374151', marginBottom: 3 },
  activityTime: { fontSize: 12, color: '#9ca3af' },
});

export default MessagesScreen;