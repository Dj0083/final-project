import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../api';

export default function Notifications() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // load last seen map for seller threads
      let stored = {};
      try {
        const raw = await AsyncStorage.getItem('seller_msg_last_seen');
        if (raw) stored = JSON.parse(raw);
      } catch (_) {}

      // fetch seller requests
      const reqResp = await API.get('/investment-requests/seller/requests', { params: { status: 'all' } });
      const reqs = Array.isArray(reqResp?.data?.requests) ? reqResp.data.requests : [];

      const enriched = await Promise.all(reqs.slice(0, 25).map(async (r) => {
        let msgs = [];
        try {
          const m = await API.get(`/investment-requests/${r.id}/messages`);
          msgs = Array.isArray(m?.data?.messages) ? m.data.messages : [];
        } catch (_) {}
        const last = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        const lastISO = last?.created_at || r.updated_at || r.created_at;
        const lastTs = lastISO ? new Date(lastISO).getTime() : 0;
        const seenTs = Number(stored[String(r.id)] || 0);
        const unread = lastTs > seenTs;
        let note = last?.message || '';
        const lower = (s) => String(s || '').toLowerCase();
        const lmsg = lower(last?.message || '');
        if (lmsg.includes('funded') || String(r.status).toLowerCase() === 'funded') note = 'Funding completed';
        return {
          id: r.id,
          title: r.investor_name || 'Investor',
          message: note || 'Update available',
          time: lastISO ? new Date(lastISO).toLocaleString() : '',
          unread,
        };
      }));

      // Filter out investor-targeted prompts (keep these for investor only)
      const filtered = enriched.filter(it => {
        const m = String(it.message || '').toLowerCase();
        return !(
          m.includes('approved by admin') ||
          m.includes('upload your payment slip')
        );
      });
      // order by time desc
      const ordered = filtered.sort((a,b) => new Date(b.time) - new Date(a.time));
      setItems(ordered);
    } catch (_) {
      // keep existing
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(false); }, [load]);
  useFocusEffect(useCallback(() => { load(true); const t = setInterval(() => load(true), 15000); return () => clearInterval(t); }, [load]));
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(true); setRefreshing(false); }, [load]);

  const openThread = async (id) => {
    try {
      const raw = await AsyncStorage.getItem('seller_msg_last_seen');
      const map = raw ? JSON.parse(raw) : {};
      map[String(id)] = Date.now();
      await AsyncStorage.setItem('seller_msg_last_seen', JSON.stringify(map));
    } catch (_) {}
    router.push(`/seller/requests/${id}`);
  };

  const Item = ({ id, title, message, time, unread }) => (
    <TouchableOpacity onPress={() => openThread(id)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
      <LinearGradient colors={['#f59e0b', '#ef4444']} style={{ width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
        <Ionicons name="document-text" size={20} color="white" />
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
        {items.length === 0 && (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <Text style={{ color: '#64748b' }}>{loading ? 'Loading...' : 'No notifications yet'}</Text>
          </View>
        )}
        {items.map((n) => (
          <Item key={n.id} id={n.id} title={n.title} message={n.message} time={n.time} unread={n.unread} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
