import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, StatusBar, ActivityIndicator, Modal, ScrollView, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { api } from '../../config/api';

function AffiliateDashboard() {
  const [pendingCount, setPendingCount] = useState(0);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState('');
  const [affId, setAffId] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState({ total_clicks: 0, total_sales: 0, total_commission: 0 });
  const [showReqModal, setShowReqModal] = useState(false);
  const [requests, setRequests] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [currentRequest, setCurrentRequest] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setReqLoading(true);
        const res = await api.get('/api/affiliate/requests');
        if (!mounted) return;
        const arr = Array.isArray(res.data?.requests) ? res.data.requests : [];
        setRequests(arr);
        const pending = arr.filter(r => r.status === 'pending').length;
        setPendingCount(pending);
        setReqError('');
      } catch (e) {
        if (mounted) setReqError('Failed to load requests');
      } finally {
        if (mounted) setReqLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const ensureAffiliateId = async () => {
    if (affId) return affId;
    const prof = await api.get('/api/users/profile');
    const id = prof.data?.user?.profile?.id;
    if (!id) throw new Error('Affiliate profile not found');
    setAffId(id);
    return id;
  };

  const refreshRequests = async () => {
    try {
      setReqLoading(true);
      const res = await api.get('/api/affiliate/requests');
      const arr = Array.isArray(res.data?.requests) ? res.data.requests : [];
      setRequests(arr);
      const pending = arr.filter(r => r.status === 'pending').length;
      setPendingCount(pending);
      setReqError('');
    } catch (e) {
      setReqError('Failed to refresh requests');
    } finally {
      setReqLoading(false);
    }
  };

  const acceptRequest = async (id) => {
    try {
      await api.post(`/api/affiliate/requests/${id}/accept`);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'accepted', responded_at: new Date().toISOString() } : r));
      const pending = requests.filter(r => r.id === id ? false : r.status === 'pending').length;
      setPendingCount(pending);
    } catch (e) {
      Alert.alert('Request', 'Failed to accept request');
    }
  };

  const rejectRequest = async (id) => {
    try {
      await api.post(`/api/affiliate/requests/${id}/reject`);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected', responded_at: new Date().toISOString() } : r));
      const pending = requests.filter(r => r.id === id ? false : r.status === 'pending').length;
      setPendingCount(pending);
    } catch (e) {
      Alert.alert('Request', 'Failed to reject request');
    }
  };

  const openChat = async (reqItem) => {
    try {
      setCurrentRequest(reqItem);
      setChatLoading(true);
      const msgRes = await api.get(`/api/affiliate/requests/${reqItem.id}/messages`);
      setChatMessages(Array.isArray(msgRes.data?.messages) ? msgRes.data.messages : []);
      setChatOpen(true);
    } catch (e) {
      Alert.alert('Chat', 'Unable to open chat');
    } finally {
      setChatLoading(false);
    }
  };

  const sendChat = async () => {
    if (!chatText.trim() || !currentRequest) return;
    try {
      const text = chatText.trim();
      setChatText('');
      await api.post(`/api/affiliate/requests/${currentRequest.id}/messages`, { message: text });
      const msgRes = await api.get(`/api/affiliate/requests/${currentRequest.id}/messages`);
      setChatMessages(Array.isArray(msgRes.data?.messages) ? msgRes.data.messages : []);
    } catch (e) {
      Alert.alert('Chat', 'Failed to send message');
    }
  };

  // Partner docs (flyers/agreements)
  const viewFlyers = async (requestId) => {
    try {
      const res = await api.get(`/api/affiliate/requests/${requestId}/documents`);
      const docs = Array.isArray(res.data?.documents) ? res.data.documents : [];
      const flyers = docs.filter(d => (d.doc_type || '').toLowerCase() === 'flyer');
      if (flyers.length === 0) return Alert.alert('Flyers', 'No flyers uploaded yet');
      const list = flyers.slice(0, 5).map(f => `- ${f.file_path}`).join('\n');
      Alert.alert('Flyers', list);
    } catch (e) {
      Alert.alert('Flyers', 'Failed to load flyers');
    }
  };

  const viewAgreement = async (requestId) => {
    try {
      const res = await api.get(`/api/seller/affiliate/requests/${requestId}/agreement`);
      const agreement = res.data?.agreement;
      if (!agreement) return Alert.alert('Agreement', 'No agreement found');
      Alert.alert('Agreement', `Title: ${agreement.title}\nSeller: ${agreement.seller?.name}\nAffiliate: ${agreement.affiliate?.name}\nStatus: ${agreement.status}\nEffective: ${agreement.effective_date}`);
    } catch (e) {
      Alert.alert('Agreement', 'Failed to load agreement');
    }
  };

  const uploadAgreement = async (requestId) => {
    try {
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file) return;

      const form = new FormData();
      form.append('doc_type', 'agreement');
      form.append('document', {
        uri: file.uri,
        name: file.name || 'agreement',
        type: file.mimeType || 'application/octet-stream',
      });

      await api.post(`/api/affiliate/requests/${requestId}/documents`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Upload Agreement', 'Uploaded successfully');
    } catch (e) {
      Alert.alert('Upload Agreement', 'Failed to upload. Ensure expo-document-picker is installed.');
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const id = await ensureAffiliateId();
      const dash = await api.get(`/api/affiliate/dashboard/${id}`);
      const s = dash.data?.stats || {};
      setStats({
        total_clicks: Number(s.total_clicks || 0),
        total_sales: Number(s.total_sales || 0),
        total_commission: Number(s.total_commission || 0),
      });
    } finally {
      setStatsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <Text style={styles.title}>Affiliate</Text>
        <Text style={styles.subtitle}>Quick Actions</Text>
      </View>

      {/* Requests Modal */}
      <Modal visible={showReqModal} animationType="slide" onRequestClose={() => setShowReqModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>Affiliate Requests</Text>
            <TouchableOpacity onPress={() => setShowReqModal(false)}><Text style={{ color: '#f43f5e', fontWeight: '600' }}>Close</Text></TouchableOpacity>
          </View>
          {reqLoading && (
            <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="#FF6B35" />
              <Text style={{ marginLeft: 8 }}>Loading…</Text>
            </View>
          )}
          {!!reqError && (
            <View style={{ paddingHorizontal: 16 }}><Text style={{ color: '#ef4444' }}>{reqError}</Text></View>
          )}
          <ScrollView style={{ flex: 1, padding: 16 }}>
            {requests.map(r => (
              <View key={r.id} style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <Text style={{ fontWeight: '700', color: '#111' }}>{r.seller_name || 'Seller'}</Text>
                <Text style={{ color: '#666', marginTop: 2 }}>{r.seller_email}</Text>
                {!!r.message && <Text style={{ color: '#444', marginTop: 8 }}>{r.message}</Text>}
                <Text style={{ color: '#6b7280', marginTop: 6 }}>Status: {r.status}</Text>
                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                  <TouchableOpacity onPress={() => openChat(r)} style={{ backgroundColor: '#F59E0B', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginRight: 8 }}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Chat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={r.status !== 'pending'} onPress={() => acceptRequest(r.id)} style={{ backgroundColor: r.status !== 'pending' ? '#9ca3af' : '#22C55E', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginRight: 8 }}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={r.status !== 'pending'} onPress={() => rejectRequest(r.id)} style={{ backgroundColor: r.status !== 'pending' ? '#9ca3af' : '#EF4444', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 }}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Reject</Text>
                  </TouchableOpacity>
                </View>
                {r.status === 'accepted' && (
                  <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    <TouchableOpacity onPress={() => viewFlyers(r.id)} style={{ backgroundColor: '#3B82F6', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, marginRight: 8 }}>
                      <Text style={{ color: '#fff', fontWeight: '600' }}>View Flyers</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => uploadAgreement(r.id)} style={{ backgroundColor: '#8B5CF6', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 }}>
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Upload Agreement</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
            {!reqLoading && requests.length === 0 && (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: '#6b7280' }}>No requests yet</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Chat Modal */}
      <Modal visible={chatOpen} animationType="slide" onRequestClose={() => setChatOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>Chat</Text>
            <TouchableOpacity onPress={() => setChatOpen(false)}><Text style={{ color: '#f43f5e', fontWeight: '600' }}>Close</Text></TouchableOpacity>
          </View>
          {chatLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color="#FF6B35" size="large" />
            </View>
          ) : (
            <ScrollView style={{ flex: 1, padding: 16 }}>
              {chatMessages.map(m => (
                <View key={m.id} style={{ marginBottom: 12 }}>
                  <Text style={{ color: '#6b7280', marginBottom: 4 }}>{m.sender_name}</Text>
                  <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, padding: 10 }}>
                    <Text style={{ color: '#111' }}>{m.message}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
          <View style={{ flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#eee' }}>
            <TextInput
              value={chatText}
              onChangeText={setChatText}
              placeholder="Type a message"
              style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginRight: 8 }}
            />
            <TouchableOpacity onPress={sendChat} style={{ backgroundColor: '#FF6B35', paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Send</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <View style={styles.grid}>
        <TouchableOpacity style={styles.card} onPress={async () => { setShowReqModal(true); await refreshRequests(); }}>
          <MaterialIcons name="inbox" size={28} color="#fff" />
          <Text style={styles.cardText}>Affiliate Requests</Text>
          <View style={styles.badgeWrap}>
            {reqLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View style={[styles.badge, pendingCount === 0 && { backgroundColor: '#22C55E' }]}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={async () => {
          try {
            await loadStats();
            Alert.alert('My Earnings', `Total Commission: $${stats.total_commission.toFixed(2)}\nTotal Sales: ${stats.total_sales}`);
          } catch (e) {
            Alert.alert('My Earnings', 'Failed to load earnings');
          }
        }}>
          <MaterialIcons name="attach-money" size={28} color="#fff" />
          <Text style={styles.cardText}>My Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={async () => {
          try {
            await loadStats();
            Alert.alert('Commission', `Total Commission: $${stats.total_commission.toFixed(2)}\nClicks: ${stats.total_clicks}`);
          } catch (e) {
            Alert.alert('Commission', 'Failed to load commission');
          }
        }}>
          <MaterialIcons name="percent" size={28} color="#fff" />
          <Text style={styles.cardText}>Commission</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, marginBottom: 20 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 16 }}>Quick Actions</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <TouchableOpacity style={{ width: '48%', backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 24, paddingHorizontal: 12, marginBottom: 16, alignItems: 'center', justifyContent: 'center' }} onPress={() => Alert.alert('Get Links')}>
            <MaterialIcons name="link" size={24} color="#fff" />
            <Text style={{ color: '#fff', marginTop: 8, fontWeight: '600', textAlign: 'center' }}>Get Links</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ width: '48%', backgroundColor: '#F59E0B', borderRadius: 12, paddingVertical: 24, paddingHorizontal: 12, marginBottom: 16, alignItems: 'center', justifyContent: 'center' }} onPress={() => Alert.alert('Share')}>
            <MaterialIcons name="share" size={24} color="#fff" />
            <Text style={{ color: '#fff', marginTop: 8, fontWeight: '600', textAlign: 'center' }}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ width: '48%', backgroundColor: '#8B5CF6', borderRadius: 12, paddingVertical: 24, paddingHorizontal: 12, marginBottom: 16, alignItems: 'center', justifyContent: 'center' }} onPress={() => Alert.alert('Resources')}>
            <MaterialIcons name="document" size={24} color="#fff" />
            <Text style={{ color: '#fff', marginTop: 8, fontWeight: '600', textAlign: 'center' }}>Resources</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Commissions */}
      <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, marginBottom: 20 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 16 }}>Recent Commissions</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomColor: '#ccc', borderBottomWidth: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111' }}>Product</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111' }}>Commission</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomColor: '#ccc', borderBottomWidth: 1 }}>
          <Text style={{ fontSize: 16, color: '#666' }}>Product 1</Text>
          <Text style={{ fontSize: 16, color: '#666' }}>$10.00</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomColor: '#ccc', borderBottomWidth: 1 }}>
          <Text style={{ fontSize: 16, color: '#666' }}>Product 2</Text>
          <Text style={{ fontSize: 16, color: '#666' }}>$20.00</Text>
        </View>
        <TouchableOpacity style={{ backgroundColor: '#10B981', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, marginTop: 16, alignItems: 'center', justifyContent: 'center' }} onPress={() => Alert.alert('View All Commissions')}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>View All Commissions</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#111' },
  subtitle: { marginTop: 4, fontSize: 14, color: '#666' },
  grid: { paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#FF6B35', borderRadius: 12, paddingVertical: 24, paddingHorizontal: 12, marginBottom: 16, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cardText: { color: '#fff', marginTop: 8, fontWeight: '600', textAlign: 'center' },
  badgeWrap: { position: 'absolute', top: 10, right: 10 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

export default AffiliateDashboard;