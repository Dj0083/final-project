import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, TextInput, Alert, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { investmentRequestsAPI } from '../../../api';
import { API_BASE } from '../../../config/api';

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

  const loadAll = useCallback(async () => {
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
    }
  }, [requestId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

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

  const onUpload = async () => {
    if (String(request.status) !== 'approved') {
      Alert.alert('Not Approved', 'You can upload the final agreement after admin approval.');
      return;
    }
    try {
      const pick = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (pick.canceled) return;
      const asset = pick.assets?.[0];
      if (!asset) return;
      setUploading(true);
      const name = asset.name || `document_${Date.now()}`;
      const mime = asset.mimeType || 'application/pdf';
      await investmentRequestsAPI.uploadDocument(requestId, asset.uri, mime, name, 'final_agreement');
      const { documents: freshDocs } = await investmentRequestsAPI.listDocuments(requestId);
      setDocuments(freshDocs || []);
      Alert.alert('Uploaded', 'Document uploaded successfully');
    } catch (e) {
      console.error('Upload error', e);
      Alert.alert('Error', e?.error || 'Failed to upload');
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
        <ActivityIndicator size="large" color="#fb923c" />
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
  const isPending = String(request.status) === 'pending';

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 6 }}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Funding Request #{request.id}</Text>
      </View>

      {/* Status banner */}
      <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
        <View style={{ backgroundColor: isApproved ? '#ecfdf5' : '#fff7ed', borderColor: isApproved ? '#10b981' : '#fb923c', borderWidth: 1, padding: 12, borderRadius: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={isApproved ? 'checkmark-circle' : 'time-outline'} size={18} color={isApproved ? '#10b981' : '#fb923c'} />
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
            <Ionicons name="document-attach-outline" size={18} color="#111827" />
            <Text style={{ marginLeft: 6, fontWeight: '700', color: '#111827' }}>Documents</Text>
          </View>
          <TouchableOpacity onPress={onUpload} disabled={uploading || !isApproved} style={{ backgroundColor: isApproved ? '#3b82f6' : '#9ca3af', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
            <Text style={{ color: 'white', fontWeight: '600' }}>{uploading ? 'Uploading…' : 'Upload Final Agreement (PDF)'}</Text>
          </TouchableOpacity>
        </View>
        {!isApproved && (
          <Text style={{ color: '#6b7280', marginBottom: 8 }}>You can upload the final agreement after admin approves the request.</Text>
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
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#111827" />
          <Text style={{ marginLeft: 6, fontWeight: '700', color: '#111827' }}>Messages</Text>
        </View>
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
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Write a message"
            style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }}
          />
          <TouchableOpacity onPress={onSend} disabled={sending} style={{ marginLeft: 8, backgroundColor: '#fb923c', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontWeight: '700' }}>{sending ? '...' : 'Send'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
