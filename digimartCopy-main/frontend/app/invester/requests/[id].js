import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, TextInput, Alert, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { investmentRequestsAPI } from '../../../api';
import { API_BASE } from '../../../config/api';
import { useFocusEffect } from '@react-navigation/native';

export default function InvestorFundingRequestDetail() {
  const { id } = useLocalSearchParams();
  const requestId = String(id);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [approvalPrompted, setApprovalPrompted] = useState(false);
  const loadingRef = useRef(false);

  const loadAll = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      setLoading(true);
      const [reqRes, msgRes, docRes] = await Promise.all([
        investmentRequestsAPI.getRequest(requestId),
        investmentRequestsAPI.listMessages(requestId),
        investmentRequestsAPI.listDocuments(requestId),
      ]);
      setRequest(reqRes.request || null);
      setMessages(msgRes.messages || []);
      setDocuments(docRes.documents || []);
    } catch (e) {
      console.error('Load request detail error', e);
      Alert.alert('Error', e?.error || 'Failed to load request');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [requestId]);

  // Load on focus only (prevents double initial + flicker)
  // Refresh when screen gains focus (ensures latest status/docs)
  useFocusEffect(
    useCallback(() => {
      loadAll();
      return () => {};
    }, [loadAll])
  );

  // When request becomes approved, prompt investor to open messages and upload slip
  useEffect(() => {
    if (!request) return;
    const isApprovedNow = String(request.status) === 'approved';
    if (isApprovedNow && !approvalPrompted) {
      setApprovalPrompted(true);
      Alert.alert(
        'Approved',
        'Your funding request was approved. Open messages to see admin notes and upload your payment slip.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Open Messages', onPress: () => {} }
        ]
      );
    }
  }, [request, approvalPrompted]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  // Removed auto-reload on admin-approval message to avoid request storms; UI already reflects latest load

  const onSend = async () => {
    if (!message.trim()) return;
    try {
      setSending(true);
      await investmentRequestsAPI.sendMessage(requestId, message.trim());
      setMessage('');
      const { messages: fresh } = await investmentRequestsAPI.listMessages(requestId);
      setMessages(fresh || []);
    } catch (e) {
      console.error('Send message error', e);
      Alert.alert('Error', e?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const onUploadSlip = async () => {
    // If a payment slip already exists, open it instead of uploading another
    const lower = (s) => String(s || '').toLowerCase();
    const existingSlip = documents.find(d => lower(d.doc_type) === 'payment_slip');
    if (existingSlip) {
      openDoc(existingSlip);
      return;
    }
    if (String(request.status) !== 'approved') {
      Alert.alert('Not Approved', 'You can upload the payment slip after admin approval.');
      return;
    }
    try {
      const pick = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (pick.canceled) return;
      const asset = pick.assets?.[0];
      if (!asset) return;
      setUploading(true);
      const name = asset.name || `payment_slip_${Date.now()}.pdf`;
      const mime = asset.mimeType || 'application/pdf';
      await investmentRequestsAPI.uploadDocument(requestId, asset.uri, mime, name, 'payment_slip');
      const { documents: freshDocs } = await investmentRequestsAPI.listDocuments(requestId);
      setDocuments(freshDocs || []);
      Alert.alert('Uploaded', 'Payment slip uploaded successfully');
    } catch (e) {
      console.error('Upload error', e);
      Alert.alert('Error', e?.error || 'Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  

  const onUploadFinalAgreement = async () => {
    // If final agreement already exists, open it instead of uploading another
    const lower = (s) => String(s || '').toLowerCase();
    const existingFA = documents.find(d => lower(d.doc_type) === 'final_agreement');
    if (existingFA) {
      openDoc(existingFA);
      return;
    }
    try {
      const pick = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (pick.canceled) return;
      const asset = pick.assets?.[0];
      if (!asset) return;
      setUploading(true);
      const name = asset.name || `final_agreement_${Date.now()}.pdf`;
      const mime = asset.mimeType || 'application/pdf';
      await investmentRequestsAPI.uploadDocument(requestId, asset.uri, mime, name, 'final_agreement');
      const { documents: freshDocs } = await investmentRequestsAPI.listDocuments(requestId);
      setDocuments(freshDocs || []);
      Alert.alert('Uploaded', 'Final agreement uploaded successfully');
    } catch (e) {
      console.error('Upload final agreement error', e);
      Alert.alert('Error', e?.error || 'Failed to upload final agreement');
    } finally {
      setUploading(false);
    }
  };

  const openDoc = (doc) => {
    const url = `${API_BASE}${doc.file_path}`;
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={{ marginTop: 8, color: '#6b7280' }}>Loading request…</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Text style={{ color: '#6b7280' }}>Request not found</Text>
      </View>
    );
  }

  const isApproved = String(request.status) === 'approved';
  const isAdminApproved = !!(request.admin_approved || request.adminApproved || isApproved);
  const hasFinalAgreement = Array.isArray(documents) && documents.some(d => String(d.doc_type || '').toLowerCase() === 'final_agreement');
  const hasPaymentSlip = Array.isArray(documents) && documents.some(d => String(d.doc_type || '').toLowerCase() === 'payment_slip');
  const isPending = String(request.status) === 'pending';

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 6 }}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Status banner */}
      <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
        <View style={{ backgroundColor: isApproved ? '#ecfdf5' : '#e0f2fe', borderColor: isApproved ? '#10b981' : '#0ea5e9', borderWidth: 1, padding: 12, borderRadius: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={isApproved ? 'checkmark-circle' : 'time-outline'} size={18} color={isApproved ? '#10b981' : '#0ea5e9'} />
            <Text style={{ marginLeft: 8, color: '#111827', fontWeight: '600' }}>Status: {String(request.status || '').toUpperCase()}</Text>
          </View>
          <Text style={{ marginTop: 6, color: '#6b7280' }}>
            {isApproved
              ? 'Approved by admin. Please upload your payment slip / final agreement for verification.'
              : 'Awaiting admin approval. You can still use chat to coordinate and share documents if needed.'}
          </Text>
        </View>
      </View>

      {/* Documents */}
      <View style={{ backgroundColor: 'white', padding: 12, borderRadius: 12, marginHorizontal: 12, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="document-attach-outline" size={18} color="#10b981" />
            <Text style={{ marginLeft: 6, fontWeight: '700', color: '#111827' }}>Documents</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(hasPaymentSlip || (isAdminApproved && hasFinalAgreement)) && (
              <TouchableOpacity onPress={onUploadSlip} disabled={uploading || (!hasPaymentSlip && !(isAdminApproved && hasFinalAgreement))} style={{ backgroundColor: hasPaymentSlip ? '#0ea5e9' : '#3b82f6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
                <Text style={{ color: 'white', fontWeight: '600' }}>{uploading ? 'Uploading…' : (hasPaymentSlip ? 'View Payment Slip' : 'Upload Payment Slip')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onUploadFinalAgreement} disabled={uploading} style={{ backgroundColor: hasFinalAgreement ? '#0ea5e9' : '#111827', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
              <Text style={{ color: 'white', fontWeight: '600' }}>{uploading ? 'Uploading…' : (hasFinalAgreement ? 'View Final Agreement' : 'Upload Final Agreement')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {!hasFinalAgreement && (
          <Text style={{ color: '#6b7280', marginBottom: 8 }}>Upload the final agreement now. Admin will review and approve it before you can submit a payment slip.</Text>
        )}
        {isAdminApproved && !hasFinalAgreement && (
          <Text style={{ color: '#6b7280', marginBottom: 8 }}>Upload the final agreement first to enable payment slip upload.</Text>
        )}
        {documents.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 10 }}>
            <Ionicons name="cloud-upload-outline" size={40} color="#9ca3af" />
            <Text style={{ color: '#6b7280', marginTop: 6 }}>No documents yet</Text>
          </View>
        ) : (
          <FlatList
            data={documents}
            keyExtractor={(d) => String(d.id)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => openDoc(item)} style={{ paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, backgroundColor: '#f8fafc', marginBottom: 8 }}>
                <Text style={{ color: '#111827', fontWeight: '600' }}>{(item.doc_type || 'DOC').toUpperCase()} • {item.mime_type}</Text>
                <Text style={{ color: '#9ca3af', fontSize: 12 }}>{new Date(item.created_at).toLocaleString()}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Chat */}
      <View style={{ flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 12, marginHorizontal: 12, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#10b981" />
          <Text style={{ marginLeft: 6, fontWeight: '700', color: '#111827' }}>Messages</Text>
        </View>
        {/* Admin approval notification banner */}
        {Array.isArray(messages) && messages.some(m => String(m.message || '').toLowerCase().includes('approved by admin')) && (
          <View style={{ backgroundColor: '#ecfeff', borderColor: '#06b6d4', borderWidth: 1, padding: 10, borderRadius: 10, marginBottom: 8 }}>
            <Text style={{ color: '#075985', fontWeight: '700' }}>Approved by Admin</Text>
            <Text style={{ color: '#0e7490', marginTop: 4 }}>Please proceed to upload your payment slip for verification.</Text>
          </View>
        )}
        <FlatList
          data={messages}
          keyExtractor={(m) => String(m.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 6, alignItems: 'flex-start' }}>
              <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 }}>
                <Text style={{ color: '#111827', fontWeight: '600' }}>{item.sender_name || 'User'}</Text>
                <Text style={{ color: '#111827' }}>{item.message}</Text>
              </View>
              <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Ionicons name="chatbubbles-outline" size={40} color="#9ca3af" />
              <Text style={{ color: '#6b7280', marginTop: 6 }}>No messages yet</Text>
            </View>
          )}
        />
      </View>
    </View>
  );
}
