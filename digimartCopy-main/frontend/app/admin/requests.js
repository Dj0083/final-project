import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Alert, RefreshControl, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api, API_BASE } from '../../config/api';

export default function AdminRequests() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [awaitingFunding, setAwaitingFunding] = useState([]);
  const [errorText, setErrorText] = useState('');
  const [actingId, setActingId] = useState(null);
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [fundId, setFundId] = useState(null);
  const [fundAmount, setFundAmount] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/investment-requests/pending-agreements/list');
      setPendingApprovals(Array.isArray(res.data?.pending_approvals) ? res.data.pending_approvals : []);
      setAwaitingFunding(Array.isArray(res.data?.awaiting_funding) ? res.data.awaiting_funding : []);
      setErrorText('');
    } catch (e) {
      console.error('Load pending agreements error', e);
      setErrorText(e?.response?.data?.error || 'Failed to load agreements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openFundModal = async (id) => {
    setFundId(id);
    setFundAmount('');
    setFundModalOpen(true);
  };

  const approvePending = async (id) => {
    try {
      setActingId(id);
      await api.post(`/api/investment-requests/${id}/approve`, {});
      Alert.alert('Approved', 'Request approved. Investor will be notified to proceed with funding.');
      load();
    } catch (e) {
      console.error('Approve error', e);
      Alert.alert('Error', e?.response?.data?.error || 'Failed to approve');
    } finally {
      setActingId(null);
    }
  };

  const confirmFund = async () => {
    const id = fundId;
    if (!id) return;
    try {
      setActingId(id);
      const amt = fundAmount && fundAmount.trim() !== '' ? Number(fundAmount) : undefined;
      await api.post(`/api/investment-requests/${id}/funded`, amt ? { funded_amount: amt } : {});
      Alert.alert('Success', 'Marked as funded');
      setFundModalOpen(false);
      setFundId(null);
      setFundAmount('');
      load();
    } catch (e) {
      console.error('Approve funded error', e);
      Alert.alert('Error', 'Failed to mark funded');
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id) => {
    Alert.alert('Reject Agreement', 'Reject this agreement?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            setActingId(id);
            await api.post(`/api/investment-requests/${id}/reject`, {});
            Alert.alert('Rejected', 'Agreement has been rejected');
            load();
          } catch (e) {
            console.error('Reject error', e);
            Alert.alert('Error', 'Failed to reject');
          } finally {
            setActingId(null);
          }
        }
      }
    ]);
  };

  const viewDocs = async (id) => {
    try {
      const res = await api.get(`/api/investment-requests/${id}/documents`);
      const docs = Array.isArray(res.data?.documents) ? res.data.documents : [];
      if (docs.length === 0) {
        Alert.alert('Documents', 'No documents uploaded');
        return;
      }
      // Simple inline list in an alert; for a richer viewer, make a dedicated screen
      Alert.alert(
        'Documents',
        docs.map(d => `${d.doc_type?.toUpperCase() || 'DOC'} • ${d.mime_type}`).join('\n'),
        [
          { text: 'Close', style: 'cancel' },
          ...(docs[0]?.file_path ? [{
            text: 'Open First',
            onPress: () => {
              const url = `${API_BASE}${docs[0].file_path}`;
              // Rely on OS handler to open; for auth-secure view, move to WebView with headers
              // Note: static /uploads are public; if restricted, add a signed URL endpoint
              require('react-native').Linking.openURL(url);
            }
          }] : [])
        ]
      );
    } catch (e) {
      console.error('View docs error', e);
      Alert.alert('Error', 'Failed to load documents');
    }
  };

  const viewSlipOrAgreement = async (id) => {
    try {
      const res = await api.get(`/api/investment-requests/${id}/documents`);
      const docs = Array.isArray(res.data?.documents) ? res.data.documents : [];
      const lower = (s) => String(s || '').toLowerCase();
      const target = docs.find(d => lower(d.doc_type) === 'payment_slip') || docs.find(d => lower(d.doc_type) === 'final_agreement');
      if (!target) {
        Alert.alert('Slip/Agreement', 'No payment slip or final agreement uploaded yet');
        return;
      }
      const url = `${API_BASE}${target.file_path}`;
      require('react-native').Linking.openURL(url);
    } catch (e) {
      console.error('View slip/agreement error', e);
      Alert.alert('Error', 'Failed to open slip/agreement');
    }
  };

  const renderPendingItem = ({ item }) => (
    <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 4 }}>Seller: {item.seller_name}</Text>
      <Text style={{ color: '#6b7280', marginBottom: 2 }}>Email: {item.seller_email}</Text>
      <Text style={{ color: '#6b7280', marginBottom: 8 }}>Request ID: {item.id}</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <TouchableOpacity onPress={() => viewSlipOrAgreement(item.id)} style={{ backgroundColor: '#3b82f6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
          <Text style={{ color: '#fff' }}>View Final Agreement</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => approvePending(item.id)} disabled={actingId === item.id} style={{ backgroundColor: '#111827', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
          <Text style={{ color: '#fff' }}>{actingId === item.id ? '...' : 'Approve'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => reject(item.id)} disabled={actingId === item.id} style={{ backgroundColor: '#ef4444', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
          <Text style={{ color: '#fff' }}>{actingId === item.id ? 'Rejecting…' : 'Reject'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAwaitingFundingItem = ({ item }) => (
    <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 4 }}>Seller: {item.seller_name}</Text>
      <Text style={{ color: '#6b7280', marginBottom: 2 }}>Email: {item.seller_email}</Text>
      <Text style={{ color: '#6b7280', marginBottom: 8 }}>Request ID: {item.id}</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <TouchableOpacity onPress={() => viewSlipOrAgreement(item.id)} style={{ backgroundColor: '#3b82f6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
          <Text style={{ color: '#fff' }}>View Slip</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openFundModal(item.id)} disabled={actingId === item.id} style={{ backgroundColor: '#10b981', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
          <Text style={{ color: '#fff' }}>{actingId === item.id ? 'Saving…' : 'Mark Funded'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => reject(item.id)} disabled={actingId === item.id} style={{ backgroundColor: '#ef4444', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
          <Text style={{ color: '#fff' }}>{actingId === item.id ? 'Rejecting…' : 'Reject'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 6 }}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Requests</Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#fb923c" />
          <Text style={{ marginTop: 8, color: '#6b7280' }}>Loading…</Text>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 12 }}>
          {errorText ? (
            <View style={{ padding: 12, borderRadius: 8, backgroundColor: '#fef2f2', borderColor: '#ef4444', borderWidth: 1, marginBottom: 12 }}>
              <Text style={{ color: '#b91c1c' }}>{errorText}</Text>
            </View>
          ) : null}
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontWeight: '800', color: '#111827', marginBottom: 6 }}>Pending Approval (Final Agreement uploaded)</Text>
            <FlatList
              data={pendingApprovals}
              keyExtractor={(it) => `p-${it.id}`}
              renderItem={renderPendingItem}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListEmptyComponent={() => (
                <View style={{ padding: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#6b7280' }}>No items</Text>
                </View>
              )}
            />
          </View>
          <View style={{ marginTop: 4 }}>
            <Text style={{ fontWeight: '800', color: '#111827', marginBottom: 6 }}>Awaiting Funding (Payment Slip uploaded)</Text>
            <FlatList
              data={awaitingFunding}
              keyExtractor={(it) => `f-${it.id}`}
              renderItem={renderAwaitingFundingItem}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListEmptyComponent={() => (
                <View style={{ padding: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#6b7280' }}>No items</Text>
                </View>
              )}
            />
          </View>
        </View>
      )}

      {/* Fund Amount Modal */}
      <Modal visible={fundModalOpen} transparent animationType="fade" onRequestClose={() => setFundModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, width: '85%' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Enter Funded Amount (optional)</Text>
            <TextInput
              value={fundAmount}
              onChangeText={setFundAmount}
              placeholder="e.g. 100000"
              keyboardType="numeric"
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
              <TouchableOpacity onPress={() => { setFundModalOpen(false); setFundId(null); }} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                <Text style={{ color: '#6b7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmFund} disabled={actingId === fundId} style={{ backgroundColor: '#10b981', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
                <Text style={{ color: 'white', fontWeight: '600' }}>{actingId === fundId ? 'Saving…' : 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
