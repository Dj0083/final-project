import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator, TouchableOpacity, Modal, TextInput as RNTextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Search, Users, TrendingUp, MapPin, DollarSign } from "lucide-react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { api, API_BASE } from "../config/api";
import { useAuth } from '../context/AuthContext';

export default function InvestorConnection() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("explore"); // explore | invitations
  const [search, setSearch] = useState("");
  const [investors, setInvestors] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);
  const [requestingId, setRequestingId] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [selectedConn, setSelectedConn] = useState(null); // connection id
  const [connMessages, setConnMessages] = useState([]);
  const [connDocuments, setConnDocuments] = useState([]);
  const [connLoading, setConnLoading] = useState(false);
  const [connMsgInput, setConnMsgInput] = useState("");
  const [connUploading, setConnUploading] = useState(false);

  // Prefer in-memory auth token from context
  useEffect(() => {
    if (user?.token) {
      setAuthToken(user.token);
    }
  }, [user]);

  // Fetch auth token
  useEffect(() => {
    const getToken = async () => {
      try {
        let token = await AsyncStorage.getItem('token');
        if (!token) {
          token = await AsyncStorage.getItem('authToken');
        }
        // Fallback to SecureStore where our AuthContext persists login
        if (!token) {
          token = await SecureStore.getItemAsync('token');
        }
        setAuthToken(token);
        if (!token && !user?.token) {
          setLoading(false);
          Alert.alert('Authentication', 'Please log in to view investors.');
        }
      } catch (error) {
        console.error('Error getting token:', error);
        setLoading(false);
        Alert.alert('Authentication', 'Please log in to view investors.');
      }
    };
    getToken();
  }, []);

  // Fetch all investors with preferences
  const fetchInvestors = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching investors with preferences...');
      console.log('📍 URL:', `${API_BASE}/api/investor-connections/all-with-preferences`);
      console.log('🔑 Token:', authToken ? 'Present' : 'Missing');
      
      const response = await api.get('/api/investor-connections/all-with-preferences', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      console.log('✅ Response received:', response.data);
      console.log('📊 Success:', response.data.success);
      console.log('👥 Investors count:', response.data.investors?.length);
      console.log('📋 First investor:', response.data.investors?.[0]);

      if (response.data.success) {
        setInvestors(response.data.investors || []);
        console.log('✅ Investors set in state:', response.data.investors?.length);
      } else {
        console.log('❌ Response not successful');
      }
    } catch (error) {
      console.error('❌ Error fetching investors:', error);
      console.error('📄 Error response:', error.response?.data);
      console.error('🔢 Error status:', error.response?.status);
      Alert.alert('Error', error.response?.data?.error || 'Failed to load investors');
    } finally {
      setLoading(false);
    }
  };

  // Fetch seller's connections (pending + accepted)
  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/investor-connections/seller/connections', {
        params: { status: 'all' },
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (response.data.success) {
        setInvitations(response.data.connections || []);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
      Alert.alert('Error', 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authToken) return;

    if (activeTab === 'explore') {
      fetchInvestors();
    } else if (activeTab === 'invitations') {
      fetchInvitations();
    }
  }, [authToken, activeTab]);

  const requestConnection = async (investor) => {
    try {
      setRequestingId(investor.id);
      const response = await api.post(
        '/api/investor-connections/request',
        { investor_id: investor.id },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (response.data.success) {
        const newConnId = response.data.connection_id;
        Alert.alert(
          'Success',
          `Connection request sent to ${investor.full_name}`,
          [
            { text: 'Close', style: 'cancel' },
            {
              text: 'Open Chat',
              onPress: () => {
                if (newConnId) openConnectionChat(newConnId);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error sending connection request:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to send connection request');
    } finally {
      setRequestingId(null);
    }
  };

  // Connection chat/docs helpers
  const loadConnectionMessages = async (connectionId) => {
    try {
      setConnLoading(true);
      const res = await api.get(`/api/investor-connections/connections/${connectionId}/messages`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setConnMessages(Array.isArray(res.data?.messages) ? res.data.messages : []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setConnLoading(false);
    }
  };

  const loadConnectionDocuments = async (connectionId) => {
    try {
      setConnLoading(true);
      const res = await api.get(`/api/investor-connections/connections/${connectionId}/documents`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setConnDocuments(Array.isArray(res.data?.documents) ? res.data.documents : []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load documents');
    } finally {
      setConnLoading(false);
    }
  };

  const openConnectionChat = async (connectionId) => {
    setSelectedConn(connectionId);
    setChatOpen(true);
    await loadConnectionMessages(connectionId);
  };

  const openConnectionDocs = async (connectionId) => {
    setSelectedConn(connectionId);
    setDocsOpen(true);
    await loadConnectionDocuments(connectionId);
  };

  const sendConnectionMessage = async () => {
    if (!connMsgInput.trim() || !selectedConn) return;
    try {
      setConnLoading(true);
      await api.post(`/api/investor-connections/connections/${selectedConn}/messages`, { message: connMsgInput.trim() }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setConnMsgInput("");
      await loadConnectionMessages(selectedConn);
    } catch (e) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setConnLoading(false);
    }
  };

  const uploadConnectionDocument = async () => {
    try {
      if (!selectedConn) return;
      const picker = await (await import('expo-document-picker')).getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
      if (picker.canceled) return;
      const asset = picker.assets?.[0];
      if (!asset) return;
      setConnUploading(true);
      const form = new FormData();
      form.append('document', { uri: asset.uri, type: asset.mimeType || 'application/pdf', name: asset.name || `doc_${Date.now()}.pdf` });
      form.append('doc_type', 'intro');
      await api.post(`/api/investor-connections/connections/${selectedConn}/documents`, form, {
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'multipart/form-data' }
      });
      await loadConnectionDocuments(selectedConn);
    } catch (e) {
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setConnUploading(false);
    }
  };

  const filteredInvestors = investors.filter(investor => {
    const searchLower = search.toLowerCase();
    return (
      (investor.full_name || '').toLowerCase().includes(searchLower) ||
      (investor.email || '').toLowerCase().includes(searchLower) ||
      (investor.categories || []).some(cat => cat.toLowerCase().includes(searchLower)) ||
      (investor.regions || []).some(reg => reg.toLowerCase().includes(searchLower))
    );
  });

  const filteredInvitations = invitations.filter(inv => {
    const searchLower = search.toLowerCase();
    return (
      (inv.investor_name || '').toLowerCase().includes(searchLower) ||
      (inv.investor_email || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <SafeAreaView className="flex-1 bg-orange-400">
      {/* Header */}
      <View className="flex-row items-center p-4">
        <Pressable onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={28} color="white" />
        </Pressable>
        <Text className="text-xl font-extrabold text-white">Investor Connections</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row justify-around p-2 bg-white rounded-t-2xl">
        {[
          { key: "explore", label: "Explore", icon: Search },
          { key: "invitations", label: "Invitations", icon: Users }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <Pressable
              key={tab.key}
              className={`flex-1 flex-row items-center justify-center p-3 mx-1 rounded-xl ${
                activeTab === tab.key ? "bg-orange-400" : "bg-gray-200"
              }`}
              onPress={() => setActiveTab(tab.key)}
            >
              <Icon size={18} color={activeTab === tab.key ? "white" : "black"} className="mr-1" />
              <Text className={`font-semibold ${activeTab === tab.key ? "text-white" : "text-gray-700"}`}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Search Bar */}
      <View className="px-4 py-3 bg-gray-100">
        <View className="flex-row items-center px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm">
          <Search size={18} color="gray" className="mr-2" />
          <TextInput
            placeholder="Search by role or name"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-base"
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 p-4 bg-gray-100">
        {loading ? (
          <View className="items-center justify-center py-10">
            <ActivityIndicator size="large" color="#fb923c" />
            <Text className="mt-2 text-gray-500">Loading...</Text>
          </View>
        ) : (
          <>
            {/* === Explore Tab === */}
            {activeTab === "explore" && (
              <>
                {/* Debug Info */}
                <View className="p-3 mb-3 border border-blue-200 rounded-lg bg-blue-50">
                  <Text className="mb-1 text-xs font-bold text-blue-800">🐛 Debug Info:</Text>
                  <Text className="text-xs text-blue-700">Total investors: {investors.length}</Text>
                  <Text className="text-xs text-blue-700">Filtered: {filteredInvestors.length}</Text>
                  <Text className="text-xs text-blue-700">Auth Token: {authToken ? '✓ Present' : '✗ Missing'}</Text>
                  <Text className="text-xs text-blue-700">Active Tab: {activeTab}</Text>
                </View>

                {filteredInvestors.length === 0 ? (
                  <View className="items-center justify-center py-10">
                    <Text className="text-lg text-gray-500">No investors found</Text>
                    <Text className="mt-2 text-sm text-gray-400">Check back later for investment opportunities</Text>
                  </View>
                ) : (
                  filteredInvestors.map((investor) => (
                    <View key={investor.id} className="p-4 mb-3 bg-white shadow rounded-xl">
                      {/* Header */}
                      <View className="flex-row items-center mb-3">
                        <View className="items-center justify-center mr-3 bg-purple-100 rounded-full w-14 h-14">
                          <Users size={28} color="#9333ea" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-lg font-bold text-gray-800">{investor.full_name || 'Unknown Investor'}</Text>
                          <Text className="text-sm text-gray-600">{investor.email}</Text>
                          {investor.phone && (
                            <Text className="mt-1 text-xs text-gray-500">📱 {investor.phone}</Text>
                          )}
                        </View>
                      </View>

                      {/* Investment Range */}
                      {(investor.min_investment || investor.max_investment) && (
                        <View className="flex-row items-center p-2 mb-2 rounded-lg bg-green-50">
                          <DollarSign size={16} color="#10b981" />
                          <Text className="ml-2 text-sm font-semibold text-green-700">
                            Investment Range: Rs {investor.min_investment ? parseFloat(investor.min_investment).toLocaleString() : '0'} - {investor.max_investment ? parseFloat(investor.max_investment).toLocaleString() : '∞'}
                          </Text>
                        </View>
                      )}

                      {/* Risk Level */}
                      {investor.risk_level && (
                        <View className="flex-row items-center mb-2">
                          <TrendingUp size={16} color="#f97316" />
                          <Text className="ml-2 text-sm text-gray-700">
                            Risk Level: <Text className="font-semibold text-orange-600">{investor.risk_level.charAt(0).toUpperCase() + investor.risk_level.slice(1)}</Text>
                          </Text>
                        </View>
                      )}

                      {/* Categories */}
                      {investor.categories && investor.categories.length > 0 && (
                        <View className="mb-2">
                          <Text className="mb-1 text-xs text-gray-500">Interested Categories:</Text>
                          <View className="flex-row flex-wrap">
                            {investor.categories.map((cat, idx) => (
                              <View key={idx} className="px-2 py-1 mb-1 mr-2 bg-blue-100 rounded-full">
                                <Text className="text-xs font-medium text-blue-700">{cat}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Regions */}
                      {investor.regions && investor.regions.length > 0 && (
                        <View className="mb-3">
                          <Text className="mb-1 text-xs text-gray-500">Preferred Regions:</Text>
                          <View className="flex-row flex-wrap">
                            {investor.regions.map((reg, idx) => (
                              <View key={idx} className="flex-row items-center px-2 py-1 mb-1 mr-2 bg-gray-100 rounded-full">
                                <MapPin size={12} color="#6b7280" />
                                <Text className="ml-1 text-xs text-gray-700">{reg}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Request Button */}
                      <Pressable
                        onPress={() => requestConnection(investor)}
                        disabled={requestingId === investor.id}
                        className={`rounded-lg py-3 items-center ${
                          requestingId === investor.id ? 'bg-gray-400' : 'bg-orange-500'
                        }`}
                      >
                        {requestingId === investor.id ? (
                          <ActivityIndicator color="white" />
                        ) : (
                          <Text className="font-bold text-white">Send Connection Request</Text>
                        )}
                      </Pressable>
                    </View>
                  ))
                )}
              </>
            )}

            {/* === Invitations Tab (Pending + Accepted Connections) === */}
            {activeTab === "invitations" && (
              <>
                {filteredInvitations.length === 0 ? (
                  <View className="items-center justify-center py-10">
                    <Text className="text-lg text-gray-500">No connections yet</Text>
                    <Text className="mt-2 text-sm text-gray-400">Send requests from the Explore tab</Text>
                  </View>
                ) : (
                  filteredInvitations.map((connection) => (
                    <View key={connection.id} className="p-4 mb-3 bg-white shadow rounded-xl">
                      {/* Header */}
                      <View className="flex-row items-center mb-3">
                        <View className="items-center justify-center mr-3 bg-green-100 rounded-full w-14 h-14">
                          <Users size={28} color="#10b981" />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center">
                            <Text className="text-lg font-bold text-gray-800">{connection.investor_name}</Text>
                            <View className={`px-2 py-1 ml-2 rounded-full ${connection.status === 'accepted' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                              <Text className={`text-xs font-semibold ${connection.status === 'accepted' ? 'text-green-700' : 'text-yellow-700'}`}>{connection.status === 'accepted' ? 'Connected' : 'Pending'}</Text>
                            </View>
                          </View>
                          <Text className="text-sm text-gray-600">{connection.investor_email}</Text>
                          {connection.investor_phone && (
                            <Text className="mt-1 text-xs text-gray-500">📱 {connection.investor_phone}</Text>
                          )}
                        </View>
                      </View>

                      {/* Investment Details */}
                      {(connection.min_investment || connection.max_investment) && (
                        <View className="p-3 mb-2 rounded-lg bg-gray-50">
                          <Text className="mb-1 text-xs text-gray-500">Investment Capacity:</Text>
                          <Text className="text-sm font-semibold text-gray-800">
                            Rs {connection.min_investment ? parseFloat(connection.min_investment).toLocaleString() : '0'} - {connection.max_investment ? parseFloat(connection.max_investment).toLocaleString() : '∞'}
                          </Text>
                        </View>
                      )}

                      {/* Categories & Regions */}
                      <View className="flex-row justify-between">
                        {connection.categories && connection.categories.length > 0 && (
                          <View className="flex-1 mr-2">
                            <Text className="mb-1 text-xs text-gray-500">Categories:</Text>
                            <View className="flex-row flex-wrap">
                              {connection.categories.slice(0, 3).map((cat, idx) => (
                                <Text key={idx} className="px-2 py-1 mb-1 mr-1 text-xs text-blue-700 rounded bg-blue-50">{cat}</Text>
                              ))}
                            </View>
                          </View>
                        )}
                        {connection.regions && connection.regions.length > 0 && (
                          <View className="flex-1">
                            <Text className="mb-1 text-xs text-gray-500">Regions:</Text>
                            <View className="flex-row flex-wrap">
                              {connection.regions.slice(0, 2).map((reg, idx) => (
                                <Text key={idx} className="px-2 py-1 mb-1 mr-1 text-xs text-gray-700 bg-gray-100 rounded">{reg}</Text>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>

                      {/* Connection Actions */}
                      <View className="flex-row mt-3 space-x-2">
                        <Pressable onPress={() => openConnectionChat(connection.id)} className="flex-1 items-center py-2 bg-gray-100 border border-gray-300 rounded-lg">
                          <Text className="font-semibold text-gray-700">Chat</Text>
                        </Pressable>
                        <Pressable onPress={() => openConnectionDocs(connection.id)} className="flex-1 items-center py-2 bg-gray-100 border border-gray-300 rounded-lg">
                          <Text className="font-semibold text-gray-700">Documents</Text>
                        </Pressable>
                      </View>

                      {/* Connection Date */}
                      <Text className="mt-3 text-xs text-gray-400">
                        Connected: {new Date(connection.responded_at || connection.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  ))
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Chat Modal */}
      <Modal visible={chatOpen} transparent animationType="slide" onRequestClose={() => setChatOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[75%] bg-white rounded-t-2xl p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-gray-900">Connection Chat</Text>
              <Pressable onPress={() => setChatOpen(false)} className="px-2 py-1">
                <Text className="text-gray-500">Close</Text>
              </Pressable>
            </View>
            <ScrollView className="mt-3">
              {connLoading && (
                <View className="items-center py-4"><ActivityIndicator color="#fb923c" /></View>
              )}
              {connMessages.map(m => (
                <View key={m.id} className="mb-2">
                  <View className="px-3 py-2 bg-gray-100 rounded-xl">
                    <Text className="font-semibold text-gray-800">{m.sender_name || 'User'}</Text>
                    <Text className="text-gray-800">{m.message}</Text>
                  </View>
                  <Text className="mt-1 text-xs text-gray-400">{new Date(m.created_at).toLocaleString()}</Text>
                </View>
              ))}
              {connMessages.length === 0 && !connLoading && (
                <Text className="text-center text-gray-500">No messages yet</Text>
              )}
            </ScrollView>
            <View className="flex-row items-center mt-3">
              <RNTextInput value={connMsgInput} onChangeText={setConnMsgInput} placeholder="Write a message" className="flex-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg" />
              <Pressable onPress={sendConnectionMessage} className="px-4 py-2 ml-2 bg-orange-500 rounded-lg">
                <Text className="font-bold text-white">Send</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Documents Modal */}
      <Modal visible={docsOpen} transparent animationType="slide" onRequestClose={() => setDocsOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[75%] bg-white rounded-t-2xl p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-gray-900">Connection Documents</Text>
              <Pressable onPress={() => setDocsOpen(false)} className="px-2 py-1">
                <Text className="text-gray-500">Close</Text>
              </Pressable>
            </View>
            <View className="flex-row mt-3">
              <Pressable disabled={connUploading} onPress={uploadConnectionDocument} className="flex-1 items-center py-2 bg-gray-900 rounded-lg">
                <Text className="font-semibold text-white">{connUploading ? 'Uploading…' : 'Upload Document'}</Text>
              </Pressable>
            </View>
            <ScrollView className="mt-3">
              {connLoading && (
                <View className="items-center py-4"><ActivityIndicator color="#fb923c" /></View>
              )}
              {connDocuments.map(d => (
                <Pressable key={d.id} onPress={() => {
                  const url = `${API_BASE}${d.file_path}`;
                  require('react-native').Linking.openURL(url);
                }} className="p-3 mb-2 bg-gray-50 border border-gray-200 rounded-xl">
                  <Text className="font-semibold text-gray-800">{(d.doc_type || 'DOC').toUpperCase()} • {d.mime_type}</Text>
                  <Text className="mt-1 text-xs text-gray-400">{new Date(d.created_at).toLocaleString()}</Text>
                </Pressable>
              ))}
              {connDocuments.length === 0 && !connLoading && (
                <Text className="text-center text-gray-500">No documents yet</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
