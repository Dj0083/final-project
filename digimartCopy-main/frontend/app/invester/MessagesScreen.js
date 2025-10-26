import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../api';

export default function MessagesScreen() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const navLockRef = useRef(false);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);
  const [debugInfo, setDebugInfo] = useState({ investorReqs: 0, builtItems: 0 });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (loadingRef.current) return; // prevent overlapping loads
    loadingRef.current = true;
    try {
      // load last seen map for investor threads
      let stored = {};
      try {
        const raw = await AsyncStorage.getItem('investor_msg_last_seen');
        if (raw) stored = JSON.parse(raw);
      } catch (_) {}

      // Investor-centric: list investor requests directly
      const invResp = await API.get('/investment-requests/investor/requests', { params: { status: 'all' } });
      const raw = invResp?.data;
      const reqs = Array.isArray(raw) ? raw : (Array.isArray(raw?.requests) ? raw.requests : []);
      const threads = reqs.map(r => ({
        requestId: String(r.id),
        title: r.entrepreneur_name || r.business_name || 'Entrepreneur',
        status: r.status,
        admin_approved: r.admin_approved,
        updated_at: r.updated_at,
        created_at: r.created_at,
      }));
      const enriched = await Promise.all(threads.slice(0, 50).map(async (t) => {
        let msgs = [];
        try {
          const m = await API.get(`/investment-requests/${t.requestId}/messages`);
          msgs = Array.isArray(m?.data?.messages) ? m.data.messages : [];
        } catch (_) {}
        const last = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        const lastISO = last?.created_at || t.updated_at || t.created_at || Date.now();
        const lastTs = lastISO ? new Date(lastISO).getTime() : 0;
        const seenTs = Number(stored[String(t.requestId)] || 0);
        const unread = lastTs > seenTs;
        const lmsg = String(last?.message || '').toLowerCase();
        const canUploadSlip = lmsg.includes('approved by admin') || lmsg.includes('please upload your payment slip') || String(t.status || '').toLowerCase() === 'approved' || Boolean(t.admin_approved);
        const paymentOk = lmsg.includes('payment verified') || lmsg.includes('payment approved') || lmsg.includes('marked as funded') || String(t.status || '').toLowerCase() === 'funded';
        return {
          id: String(t.requestId),
          title: t.title,
          message: last?.message || 'Update available',
          time: lastISO ? new Date(lastISO).toLocaleString() : '',
          unread,
          canUploadSlip,
          paymentOk,
          real: true,
        };
      }));
      const ordered = enriched.sort((a,b) => new Date(b.time) - new Date(a.time));
      const dedup = [];
      const seen = new Set();
      for (const item of ordered) { if (!seen.has(item.id)) { seen.add(item.id); dedup.push(item); } }
      // update debug counts
      if (mountedRef.current) setDebugInfo({ investorReqs: reqs.length, builtItems: dedup.length });
      if (dedup.length > 0) {
        if (mountedRef.current) setItems(dedup);
      } else {
        if (mountedRef.current) setItems([]);
      }
    } catch (_) {
      // keep existing
    } finally {
      if (!silent) setLoading(false);
      if (!initialized) setInitialized(true);
      loadingRef.current = false;
    }
  }, []);

  // Use focus effect only; no auto-interval to avoid flicker
  useFocusEffect(useCallback(() => {
    mountedRef.current = true;
    load(true);
    return () => { mountedRef.current = false; };
  }, [load]));
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(true); setRefreshing(false); }, [load]);

  const openThread = async (id, real) => {
    if (!real) { Alert.alert('Not available', 'This thread is not ready yet. Please create or open the funding request first.'); return; }
    if (navLockRef.current) return;
    navLockRef.current = true;
    try {
      const raw = await AsyncStorage.getItem('investor_msg_last_seen');
      const map = raw ? JSON.parse(raw) : {};
      map[String(id)] = Date.now();
      await AsyncStorage.setItem('investor_msg_last_seen', JSON.stringify(map));
    } catch (_) {}
    console.log('INVESTOR_NOTIF: navigate to request detail', id);
    router.push({ pathname: '/invester/requests/[id]', params: { id: String(id) } });
    setTimeout(() => { navLockRef.current = false; }, 800);
  };

  const Item = ({ id, title, message, time, unread, canUploadSlip, paymentOk, real = true }) => (
    <TouchableOpacity onPress={() => openThread(id, real)} disabled={!real} style={{ opacity: real ? 1 : 0.6, flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
      <LinearGradient colors={['#3b82f6', '#2563eb']} style={{ width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
        <Ionicons name="chatbubbles" size={20} color="white" />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontWeight: '700', color: '#111827' }}>{title}</Text>
          <Text style={{ color: '#9ca3af', fontSize: 12 }}>{time}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Text numberOfLines={1} style={{ color: '#475569', flex: 1 }}>{message}</Text>
          {unread && <View style={{ marginLeft: 8, backgroundColor: '#22c55e', width: 10, height: 10, borderRadius: 5 }} />}
        </View>
        {canUploadSlip && (
          <View style={{ marginTop: 8, alignItems: 'flex-start' }}>
            <Pressable onPress={(e) => { e?.stopPropagation?.(); console.log('INVESTOR_NOTIF: upload slip navigate', id); router.push({ pathname: '/invester/requests/[id]', params: { id: String(id) } }); }} style={{ backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Upload Slip</Text>
            </Pressable>
          </View>
        )}
        {paymentOk && (
          <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ color: '#166534', fontWeight: '700' }}>Payment Verified</Text>
            </View>
            <Pressable onPress={(e) => { e?.stopPropagation?.(); router.push('/invester/investorDashboard'); }} style={{ backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Go to Dashboard</Text>
            </Pressable>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <LinearGradient colors={["#fb923c", "#f97316"]} style={{ paddingHorizontal: 16, paddingVertical: 16 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginRight: 8 }}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 18, flex: 1 }}>Notifications</Text>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> }>
        {/* Debug panel */}
        <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
          <View style={{ backgroundColor: '#eef2ff', borderRadius: 8, padding: 8 }}>
            <Text style={{ color: '#3730a3', fontSize: 12 }}>investorReqs: {debugInfo.investorReqs} • builtItems: {debugInfo.builtItems}</Text>
          </View>
        </View>
        {items.length === 0 && initialized && !loading && !refreshing && (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <Text style={{ color: '#64748b' }}>{loading ? 'Loading...' : 'No notifications yet'}</Text>
          </View>
        )}
        {items.map((n) => (
          <Item key={n.id} id={n.id} title={n.title} message={n.message} time={n.time} unread={n.unread} canUploadSlip={n.canUploadSlip} paymentOk={n.paymentOk} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
