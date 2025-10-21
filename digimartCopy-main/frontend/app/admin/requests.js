import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api, API_BASE } from '../../config/api';

export default function AdminRequests() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState([]);
  const [errorText, setErrorText] = useState('');
  const [actingId, setActingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/investment-requests/pending-agreements/list');
      setRequests(Array.isArray(res.data?.requests) ? res.data.requests : []);
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

  const approve = async (id) => {
    Alert.alert('Mark as Funded', 'Approve this agreement and mark as funded?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        style: 'default',
        onPress: async () => {
          try {
            setActingId(id);
            await api.post(`/api/investment-requests/${id}/funded`, {});
            Alert.alert('Success', 'Marked as funded');
            load();
          } catch (e) {
            console.error('Approve funded error', e);
            Alert.alert('Error', 'Failed to mark funded');
          } finally {
            setActingId(null);
          }
        }
      }
    ]);
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

  const viewFinalAgreement = async (id) => {
    try {
      const res = await api.get(`/api/investment-requests/${id}/documents`);
      const docs = Array.isArray(res.data?.documents) ? res.data.documents : [];
      const final = docs.find(d => String(d.doc_type).toLowerCase() === 'final_agreement');
      if (!final) {
        Alert.alert('Final Agreement', 'No final agreement uploaded yet');
        return;
      }
      const url = `${API_BASE}${final.file_path}`;
      require('react-native').Linking.openURL(url);
    } catch (e) {
      console.error('View final agreement error', e);
      Alert.alert('Error', 'Failed to open final agreement');
    }
  };

  const renderItem = ({ item }) => (
    <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 4 }}>Seller: {item.seller_name}</Text>
      <Text style={{ color: '#6b7280', marginBottom: 2 }}>Email: {item.seller_email}</Text>
      <Text style={{ color: '#6b7280', marginBottom: 8 }}>Request ID: {item.id}</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <TouchableOpacity onPress={() => viewDocs(item.id)} style={{ backgroundColor: '#f3f4f6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
          <Text>View Docs</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => viewFinalAgreement(item.id)} style={{ backgroundColor: '#3b82f6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
          <Text style={{ color: '#fff' }}>View Final Agreement</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => approve(item.id)} disabled={actingId === item.id} style={{ backgroundColor: '#10b981', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
          <Text style={{ color: '#fff' }}>{actingId === item.id ? 'Approving…' : 'Mark Funded'}</Text>
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
          <FlatList
            data={requests}
            keyExtractor={(it) => String(it.id)}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={() => (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Ionicons name="document-outline" size={48} color="#9ca3af" />
                <Text style={{ color: '#6b7280', marginTop: 8 }}>No pending requests with documents</Text>
                <Text style={{ color: '#9ca3af', marginTop: 4, fontSize: 12, textAlign: 'center' }}>Ensure a request is approved and a document is uploaded from the investor request detail.</Text>
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
}
