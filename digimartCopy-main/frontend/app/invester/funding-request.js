import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { investorAPI } from '../../api';
import { api, API_BASE } from '../../config/api';
import * as DocumentPicker from 'expo-document-picker';

const FundingRequestScreen = () => {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState([]);
  // UI placeholders to avoid reference errors
  const [chatOpen, setChatOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [documents, setDocuments] = useState([]);
  const [selectedConn, setSelectedConn] = useState(null);
  const [profile, setProfile] = useState(null);

  const load = async (opts = {}) => {
    try {
      if (!opts.silent) setLoading(true);
      setError('');
      console.log('📥 Fetching connection requests for investor...');
      
      const response = await investorAPI.getInvestorRequests(filterStatus);
      const list = response.requests || [];
      setRequests(list);
      
      console.log('✅ Received', list.length, 'requests');
    } catch (e) {
      console.error('❌ Error loading requests:', e);
      setError(e?.error || 'Failed to load requests');
    } finally {
      if (!opts.silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  }, [filterStatus]);

  const handleRespond = async (connectionId, newStatus) => {
    try {
      console.log(`📝 Responding to connection ${connectionId} with status: ${newStatus}`);
      await investorAPI.respondToRequest(connectionId, newStatus);
      Alert.alert('Success', `Connection request ${newStatus} successfully`);
      await load({ silent: true });
    } catch (e) {
      console.error('❌ Error responding:', e);
      Alert.alert('Error', e?.error || 'Failed to respond');
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filterStatus === 'all') return true;
    return req.status === filterStatus;
  });
  const totalAsked = 0;
  const handleNavigate = () => router.back();
  const uploadAgreementInline = async () => {
    try {
      if (!selectedConn) return;
      const pick = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (pick.canceled) return;
      const asset = pick.assets?.[0];
      if (!asset) return;
      setModalLoading(true);
      const form = new FormData();
      const fileName = asset.name || `doc_${Date.now()}.pdf`;
      const fileType = asset.mimeType || 'application/pdf';
      form.append('document', { uri: asset.uri, type: fileType, name: fileName });
      form.append('doc_type', 'intro');
      await api.post(`/api/investor-connections/connections/${selectedConn}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      await loadConnectionDocuments(selectedConn);
      Alert.alert('Uploaded', 'Document uploaded');
    } catch (e) {
      console.error('Connection doc upload error:', e?.response?.data || e?.message || e);
      const msg = e?.response?.data?.error || e?.message || 'Failed to upload';
      Alert.alert('Error', String(msg));
    } finally {
      setModalLoading(false);
    }
  };
  const viewDocument = (d) => {
    if (!d?.file_path) return;
    const url = `${API_BASE}${d.file_path}`;
    require('react-native').Linking.openURL(url);
  };
  const shareDocument = () => {};
  const sendMsg = async () => {
    if (!selectedConn || !message.trim()) return;
    try {
      setModalLoading(true);
      await api.post(`/api/investor-connections/connections/${selectedConn}/messages`, { message: message.trim() });
      setMessage('');
      await loadConnectionMessages(selectedConn);
    } catch (e) {
      console.error('Connection message send error:', e?.response?.data || e?.message || e);
      const msg = e?.response?.data?.error || e?.message || 'Failed to send';
      Alert.alert('Error', String(msg));
    } finally {
      setModalLoading(false);
    }
  };

  const loadConnectionMessages = async (connectionId) => {
    try {
      setModalLoading(true);
      const res = await api.get(`/api/investor-connections/connections/${connectionId}/messages`);
      setMessages(Array.isArray(res.data?.messages) ? res.data.messages : []);
    } catch (e) {
      setMessages([]);
    } finally {
      setModalLoading(false);
    }
  };
  const loadConnectionDocuments = async (connectionId) => {
    try {
      setModalLoading(true);
      const res = await api.get(`/api/investor-connections/connections/${connectionId}/documents`);
      setDocuments(Array.isArray(res.data?.documents) ? res.data.documents : []);
    } catch (e) {
      setDocuments([]);
    } finally {
      setModalLoading(false);
    }
  };

  const openRequestDetail = (req) => {
    const reqId = req?.investment_request_id || req?.request_id || req?.requestId;
    if (!reqId) {
      // Fallback to connection-level chat/docs using connection id (req.id)
      const connectionId = req?.id;
      if (!connectionId) {
        Alert.alert('Chat', 'Unable to open chat.');
        return;
      }
      setSelectedConn(connectionId);
      // Default open Chat; Documents can be opened via its own button
      setChatOpen(true);
      loadConnectionMessages(connectionId);
      return;
    }
    router.push(`/invester/requests/${reqId}`);
  };

  const RequestCard = ({ request }) => {
    const statusColor = request.status === 'pending' ? '#fb923c' : 
                       request.status === 'accepted' ? '#10b981' : '#ef4444';
    const statusText = request.status.toUpperCase();

    return (
      <View style={styles.requestCard}>
        <LinearGradient
          colors={['#ffffff', '#f8fafc']}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          {/* Seller Info */}
          <View style={styles.cardHeader}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatarCircle, { backgroundColor: '#8b5cf6' }]}>
                <Ionicons name="person" size={32} color="white" />
              </View>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.sellerName}>{request.seller_name}</Text>
              <Text style={styles.businessName}>{request.business_name || 'Business'}</Text>
              <Text style={styles.contactText}>📧 {request.seller_email}</Text>
              {request.seller_phone && (
                <Text style={styles.contactText}>📱 {request.seller_phone}</Text>
              )}
            </View>
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadgeContainer, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>{statusText}</Text>
          </View>

          {/* Business Address */}
          {request.business_address && (
            <View style={styles.addressContainer}>
              <Ionicons name="location-outline" size={16} color="#64748b" />
              <Text style={styles.addressText}>{request.business_address}</Text>
            </View>
          )}

          {/* Notes */}
          {request.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesText}>{request.notes}</Text>
            </View>
          )}

          {/* Dates */}
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={14} color="#64748b" />
            <Text style={styles.dateText}>
              Requested: {new Date(request.requested_at || request.created_at).toLocaleDateString()}
            </Text>
          </View>
          {request.responded_at && (
            <View style={styles.dateContainer}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#10b981" />
              <Text style={styles.dateText}>
                Responded: {new Date(request.responded_at).toLocaleDateString()}
              </Text>
            </View>
          )}

          {/* Action Buttons - Only show for pending requests */}
          {request.status === 'pending' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleRespond(request.id, 'accepted')}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.actionButtonText}>Accept</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleRespond(request.id, 'rejected')}
              >
                <Ionicons name="close-circle" size={20} color="white" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Chat & Documents Buttons (navigate to funding request detail) */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.secondaryButton, { flex: 1 }]}
              onPress={() => {
                const reqId = request?.investment_request_id || request?.request_id || request?.requestId;
                if (reqId) return router.push(`/invester/requests/${reqId}`);
                // open connection chat
                setSelectedConn(request.id);
                setChatOpen(true);
                loadConnectionMessages(request.id);
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#475569" />
              <Text style={styles.secondaryButtonText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { flex: 1 }]}
              onPress={() => {
                const reqId = request?.investment_request_id || request?.request_id || request?.requestId;
                if (reqId) return router.push(`/invester/requests/${reqId}`);
                // open connection docs
                setSelectedConn(request.id);
                setDocsOpen(true);
                loadConnectionDocuments(request.id);
              }}
            >
              <Ionicons name="document-attach-outline" size={18} color="#475569" />
              <Text style={styles.secondaryButtonText}>Documents</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <LinearGradient
          colors={['#22c55e', '#3b82f6']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => handleNavigate('back')}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Funding Requests</Text>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{filteredRequests.length}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Status Filter */}
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            {['pending', 'accepted', 'rejected', 'all'].map(s => (
              <TouchableOpacity key={s} onPress={() => setFilterStatus(s)} style={{
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginRight: 8,
                backgroundColor: filterStatus === s ? '#fb923c' : '#e5e7eb'
              }}>
                <Text style={{ color: filterStatus === s ? 'white' : '#374151' }}>{capitalize(s)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stats Overview */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{filteredRequests.length}</Text>
              <Text style={styles.statLabel}>New Requests</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>LKR {formatAmount(totalAsked)}</Text>
              <Text style={styles.statLabel}>Total Asked</Text>
            </View>
          </View>

          {/* Requests List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Incoming Requests</Text>
            {loading ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator color="#fb923c" />
              </View>
            ) : (
              filteredRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
            {!loading && filteredRequests.length === 0 && (
              <Text style={{ color: '#64748b', marginTop: 8 }}>No {filterStatus} requests</Text>
            )}
            {!!error && (
              <Text style={{ color: '#ef4444', marginTop: 8 }}>{error}</Text>
            )}
          </View>
        </View>
      </ScrollView>
      {/* Chat Modal */}
      <Modal visible={chatOpen} animationType="slide" transparent onRequestClose={() => setChatOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chat</Text>
              <TouchableOpacity onPress={() => setChatOpen(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {modalLoading && <ActivityIndicator color="#fb923c" />}
              {messages.map((m) => (
                <View key={m.id} style={{ marginBottom: 8 }}>
                  <Text style={{ color: '#111827' }}>{m.message}</Text>
                  <Text style={{ color: '#9ca3af', fontSize: 12 }}>{new Date(m.created_at).toLocaleString()}</Text>
                </View>
              ))}
              {messages.length === 0 && !modalLoading && (
                <Text style={{ color: '#6b7280' }}>No messages</Text>
              )}
            </ScrollView>
            <View style={{ flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Write a message"
                style={{ flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
              />
              <TouchableOpacity disabled={modalLoading} onPress={sendMsg} style={{ marginLeft: 8, backgroundColor: '#fb923c', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontWeight: '600' }}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Documents Modal */}
      <Modal visible={docsOpen} animationType="slide" transparent onRequestClose={() => setDocsOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Documents</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={() => setDocsOpen(false)}>
                  <Text style={{ color: '#64748b', fontWeight: '600' }}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDocsOpen(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.modalBody}>
              {documents.length === 0 ? (
                <TouchableOpacity onPress={uploadAgreementInline} style={{ backgroundColor: '#111827', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ color: 'white', fontWeight: '600' }}>Upload Final Agreement (PDF)</Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ color: '#6b7280', marginBottom: 12 }}>A final agreement has been uploaded. Upload is disabled.</Text>
              )}
              {modalLoading && <ActivityIndicator color="#fb923c" />}
              {documents.map((d) => {
                const key = String(d.id || d.document_id || d.documentId || d.file_name || Math.random());
                return (
                  <View key={key} style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 10 }}>
                    <Text style={{ color: '#111827', fontWeight: '700', marginBottom: 4 }}>{d.file_name || d.fileName}</Text>
                    <Text style={{ color: '#6b7280', fontSize: 12, marginBottom: 10 }}>
                      {(d.document_type || d.documentType || 'other').toUpperCase()} • {(d.created_at || d.uploaded_at) ? new Date(d.created_at || d.uploaded_at).toLocaleString() : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={() => viewDocument(d)} style={{ flex: 1, backgroundColor: 'white', borderColor: '#e2e8f0', borderWidth: 1.5, paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}>
                        <Text style={{ color: '#374151', fontWeight: '600' }}>View</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => shareDocument(d)} style={{ flex: 1, backgroundColor: '#3b82f6', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontWeight: '600' }}>Share</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              {documents.length === 0 && !modalLoading && (
                <Text style={{ color: '#6b7280' }}>No documents</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Profile Modal */}
      <Modal visible={profileOpen} animationType="slide" transparent onRequestClose={() => setProfileOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Entrepreneur Profile</Text>
              <TouchableOpacity onPress={() => setProfileOpen(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {modalLoading && <ActivityIndicator color="#fb923c" />}
              {profile && (
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 }}>{profile.name}</Text>
                  <Text style={{ color: '#374151', marginBottom: 2 }}>Email: {profile.email || '-'}</Text>
                  <Text style={{ color: '#374151', marginBottom: 2 }}>Phone: {profile.phone || '-'}</Text>
                  <Text style={{ color: '#374151', marginBottom: 2 }}>Address: {profile.address || '-'}</Text>
                  <Text style={{ color: '#6b7280', marginTop: 6, fontSize: 12 }}>Joined: {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}</Text>
                </View>
              )}
              {!modalLoading && !profile && (
                <Text style={{ color: '#6b7280' }}>No profile found</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {(loading || modalLoading) && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 24, alignItems: 'center', minWidth: 220 }}>
            <ActivityIndicator size="large" color="#fb923c" />
            <Text style={{ marginTop: 10, fontWeight: '700', color: '#111827' }}>Please wait...</Text>
            <Text style={{ marginTop: 2, color: '#6b7280', fontSize: 12 }}>Processing your request</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingVertical: 20, paddingHorizontal: 16 },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  backButton: { padding: 8 },
  headerTitle: { flex: 1, textAlign: 'center', color: 'white', fontSize: 20, fontWeight: 'bold' },
  headerBadge: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  headerBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  content: { padding: 16 },
  statsContainer: { flexDirection: 'row', marginBottom: 24, gap: 12 },
  statCard: { flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#3b82f6', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#64748b' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#1e293b' },
  requestCard: { marginBottom: 16, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  cardGradient: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: 'white' },
  statusBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'white', borderRadius: 10, padding: 2 },
  statusDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e' },
  headerInfo: { flex: 1 },
  entrepreneurName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 2 },
  businessName: { fontSize: 14, color: '#64748b', marginBottom: 6 },
  categoryBadge: { backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  categoryText: { fontSize: 12, color: '#0284c7', fontWeight: '600' },
  fundingBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  fundingAmount: { fontSize: 16, fontWeight: 'bold', color: '#16a34a' },
  description: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 12 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dateText: { fontSize: 12, color: '#64748b', marginLeft: 4 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  primaryButton: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  buttonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 14 },
  secondaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: 'white', borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0', gap: 6 },
  secondaryButtonText: { color: '#475569', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalBody: { padding: 20 },
});

export default FundingRequestScreen;

function formatAmount(n) {
  const num = parseFloat(n || 0);
  return Number.isFinite(num) ? num.toLocaleString() : '0';
}

function capitalize(s) {
  return (s || '').charAt(0).toUpperCase() + (s || '').slice(1);
}