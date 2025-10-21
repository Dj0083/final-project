import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Image, Pressable, TextInput, Alert, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Search, Users } from "lucide-react-native"; // ✅ icons
import { api } from "../config/api";
import { useFocusEffect } from "@react-navigation/native";

export default function AffiliateConnection() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("explore"); // explore | partnered
  const [search, setSearch] = useState("");
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [partnered, setPartnered] = useState([]);
  const [pLoading, setPLoading] = useState(false);
  const [pError, setPError] = useState('');
  const [sellerReqs, setSellerReqs] = useState([]);

  // Load approved affiliates from backend users endpoint
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/users/all', { params: { role: 'affiliate', status: 'approved' } });
        const rows = Array.isArray(res.data?.users) ? res.data.users : [];
        const mapped = rows.map(u => ({
          id: u.id,
          name: u.full_name || u.name || 'Affiliate',
          role: u.affiliate_type || 'Affiliate',
          img: u.business_image ? `${u.business_image}` : 'https://i.pravatar.cc/100',
          requested: false,
          requestStatus: null,
          requestId: null,
          website: u.website_url || ''
        }));
        if (mounted) {
          setAffiliates(mapped);
          setError("");
        }
        // Load seller requests and merge statuses
        if (mounted) {
          const reqRes = await api.get('/api/seller/affiliate/requests');
          const reqs = Array.isArray(reqRes.data?.requests) ? reqRes.data.requests : [];
          if (!mounted) return;
          setSellerReqs(reqs);
          setAffiliates(prev => prev.map(a => {
            const r = reqs.find(x => x.affiliate_user_id === a.id);
            if (!r) return a;
            return { ...a, requested: r.status === 'pending' || r.status === 'accepted', requestStatus: r.status, requestId: r.id };
          }));
        }
      } catch (e) {
        if (mounted) setError('Failed to load affiliates');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Refresh requests + partnered on screen focus to ensure latest statuses and messages
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const refresh = async () => {
        try {
          const [reqRes, partRes] = await Promise.all([
            api.get('/api/seller/affiliate/requests'),
            api.get('/api/seller/affiliate/partnered')
          ]);
          if (cancelled) return;
          const reqs = Array.isArray(reqRes.data?.requests) ? reqRes.data.requests : [];
          const parts = Array.isArray(partRes.data?.affiliates) ? partRes.data.affiliates : [];
          setSellerReqs(reqs);
          setPartnered(parts);
          setAffiliates(prev => prev.map(a => {
            const r = reqs.find(x => x.affiliate_user_id === a.id);
            if (!r) return { ...a, requestStatus: null, requested: false, requestId: null };
            return { ...a, requested: r.status === 'pending' || r.status === 'accepted', requestStatus: r.status, requestId: r.id };
          }));
        } catch {}
      };
      refresh();
      return () => { cancelled = true; };
    }, [])
  );

  // Load partnered affiliates when tab is active
  useEffect(() => {
    let mounted = true;
    const loadPartnered = async () => {
      try {
        setPLoading(true);
        const res = await api.get('/api/seller/affiliate/partnered');
        if (!mounted) return;
        const rows = Array.isArray(res.data?.affiliates) ? res.data.affiliates : [];
        setPartnered(rows);
        setPError('');
      } catch (e) {
        if (mounted) setPError('Failed to load partnered affiliates');
      } finally {
        if (mounted) setPLoading(false);
      }
    };
    if (activeTab === 'partnered') loadPartnered();
    return () => { mounted = false; };
  }, [activeTab]);

  // Toggle request
  const toggleRequest = (id) => {
    setAffiliates((prev) =>
      prev.map((a) => (a.id === id ? { ...a, requested: !a.requested } : a))
    );
  };

  const openChatByRequestId = async (requestId, affiliateDisplay) => {
    try {
      setChatAffiliate({ name: affiliateDisplay || 'Affiliate' });
      setChatLoading(true);
      setCurrentRequestId(requestId);
      await fetchMessages(requestId);
      setChatOpen(true);
    } catch (e) {
      Alert.alert('Chat', 'Unable to open chat.');
    } finally {
      setChatLoading(false);
    }
  };

  const generateLink = async (requestId, productId) => {
    try {
      const res = await api.get(`/api/seller/affiliate/requests/${requestId}/product-link`, { params: { product_id: productId || 'demo-1' } });
      const link = res.data?.link || '';
      if (!link) throw new Error('No link');
      Alert.alert('Product Link', link);
    } catch (e) {
      Alert.alert('Product Link', 'Failed to generate link');
    }
  };

  const viewAgreement = async (requestId) => {
    try {
      const res = await api.get(`/api/seller/affiliate/requests/${requestId}/agreement`);
      const agreement = res.data?.agreement;
      if (!agreement) throw new Error('No agreement');
      Alert.alert('Agreement', `Title: ${agreement.title}\nSeller: ${agreement.seller?.name}\nAffiliate: ${agreement.affiliate?.name}\nStatus: ${agreement.status}\nEffective: ${agreement.effective_date}`);
    } catch (e) {
      Alert.alert('Agreement', 'Failed to fetch agreement');
    }
  };

  const viewFlyers = async (requestId) => {
    try {
      const res = await api.get(`/api/affiliate/requests/${requestId}/documents`);
      const docs = Array.isArray(res.data?.documents) ? res.data.documents : [];
      const flyers = docs.filter(d => (d.doc_type || '').toLowerCase() === 'flyer');
      if (flyers.length === 0) return Alert.alert('Flyers', 'No flyers uploaded yet');
      const list = flyers.slice(0, 5).map(f => `• ${f.file_path}`).join('\n');
      Alert.alert('Flyers', list);
    } catch (e) {
      Alert.alert('Flyers', 'Failed to load flyers');
    }
  };

  const uploadFlyer = async (requestId) => {
    try {
      // Dynamically import to avoid bundling issues if not present
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
      form.append('doc_type', 'flyer');
      form.append('document', {
        uri: file.uri,
        name: file.name || 'flyer',
        type: file.mimeType || 'application/octet-stream',
      });

      await api.post(`/api/affiliate/requests/${requestId}/documents`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Upload Flyer', 'Uploaded successfully');
    } catch (e) {
      Alert.alert('Upload Flyer', 'Failed to upload. Ensure expo-document-picker is installed.');
    }
  };

  // Filter by search
  const filteredAffiliates = affiliates.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase())
  );

  const onChat = (affiliate) => {
    openChatForAffiliate(affiliate);
  };

  // Chat modal state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [chatAffiliate, setChatAffiliate] = useState(null);
  const [currentRequestId, setCurrentRequestId] = useState(null);
  const [chatRefreshing, setChatRefreshing] = useState(false);

  const openChatForAffiliate = async (affiliate) => {
    try {
      setChatAffiliate(affiliate);
      setChatLoading(true);
      // Refresh seller requests to find existing request
      let requestId = affiliate.requestId;
      if (!requestId) {
        const reqRes = await api.get('/api/seller/affiliate/requests');
        const reqs = Array.isArray(reqRes.data?.requests) ? reqRes.data.requests : [];
        const found = reqs.find(r => r.affiliate_user_id === affiliate.id);
        if (found) {
          requestId = found.id;
        }
      }
      // If still no request, create
      if (!requestId) {
        const sendRes = await api.post('/api/seller/affiliate/requests', { affiliate_user_id: affiliate.id, message: '' });
        requestId = sendRes.data?.request?.id || sendRes.data?.requestId || sendRes.data?.id;
      }
      if (!requestId) throw new Error('No request id');
      setCurrentRequestId(requestId);
      const msgRes = await api.get(`/api/affiliate/requests/${requestId}/messages`);
      setChatMessages(Array.isArray(msgRes.data?.messages) ? msgRes.data.messages : []);
      setChatOpen(true);
    } catch (e) {
      Alert.alert('Chat', 'Unable to open chat. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatText.trim() || !currentRequestId) return;
    try {
      const text = chatText.trim();
      setChatText("");
      await api.post(`/api/affiliate/requests/${currentRequestId}/messages`, { message: text });
      await fetchMessages(currentRequestId);
    } catch (e) {
      Alert.alert('Chat', 'Failed to send message');
    }
  };

  // Fetch messages helper
  const fetchMessages = async (reqId) => {
    const id = reqId || currentRequestId;
    if (!id) return;
    try {
      const msgRes = await api.get(`/api/affiliate/requests/${id}/messages`);
      setChatMessages(Array.isArray(msgRes.data?.messages) ? msgRes.data.messages : []);
    } catch (e) {
      // keep silent, UI will show previous state
    }
  };

  // Ensure previous messages appear when chat opens
  useEffect(() => {
    if (chatOpen && currentRequestId) {
      fetchMessages(currentRequestId);
    }
  }, [chatOpen, currentRequestId]);

  // Auto-poll messages while chat is open
  useEffect(() => {
    if (!chatOpen || !currentRequestId) return;
    const t = setInterval(() => {
      fetchMessages(currentRequestId);
    }, 5000);
    return () => clearInterval(t);
  }, [chatOpen, currentRequestId]);

  return (
    <SafeAreaView className="flex-1 bg-orange-400">
      {/* Header */}
      <View className="flex-row items-center p-4">
        <Pressable onPress={() => router.push("/profile")} className="mr-3">
          <ChevronLeft size={28} color="white" />
        </Pressable>
        <Text className="text-xl font-extrabold text-white">Affiliate Connection</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row justify-around p-2 bg-white rounded-t-2xl">
        <Pressable
          className={`flex-1 flex-row items-center justify-center p-3 mx-1 rounded-xl ${
            activeTab === "explore" ? "bg-orange-400" : "bg-gray-200"
          }`}
          onPress={() => setActiveTab("explore")}
        >
          <Search size={18} color={activeTab === "explore" ? "white" : "black"} className="mr-1" />
          <Text
            className={`font-semibold ${
              activeTab === "explore" ? "text-white" : "text-gray-700"
            }`}
          >
            Explore Affiliates
          </Text>
        </Pressable>

        <Pressable
          className={`flex-1 flex-row items-center justify-center p-3 mx-1 rounded-xl ${
            activeTab === "partnered" ? "bg-orange-400" : "bg-gray-200"
          }`}
          onPress={() => setActiveTab("partnered")}
        >
          <Users size={18} color={activeTab === "partnered" ? "white" : "black"} className="mr-1" />
          <Text
            className={`font-semibold ${
              activeTab === "partnered" ? "text-white" : "text-gray-700"
            }`}
          >
            Partnered Affiliates
          </Text>
        </Pressable>
      </View>

      {/* Search Bar (common) */}
      <View className="px-4 py-3 bg-gray-100">
        <View className="flex-row items-center px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm">
          <Search size={18} color="gray" className="mr-2" />
          <TextInput
            placeholder="Search by type (YouTube Vlogger, Instagram Influencer, Blogger...)"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-base"
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 p-4 bg-gray-100">
        {loading && (
          <View className="items-center justify-center py-10">
            <ActivityIndicator size="large" color="#fb923c" />
            <Text className="mt-2 text-gray-500">Loading affiliates…</Text>
          </View>
        )}
        {!!error && (
          <View className="px-3 py-2 mb-3 bg-red-50 border border-red-300 rounded">
            <Text className="text-red-700">{error}</Text>
          </View>
        )}
        {/* === EXPLORE TAB === */}
        {activeTab === "explore" && (
          <>
            {filteredAffiliates.map((affiliate) => (
              <View
                key={affiliate.id}
                className="flex-row items-center p-3 mb-3 bg-white rounded-lg shadow"
              >
                <Image
                  source={{ uri: affiliate.img }}
                  className="w-12 h-12 mr-3 rounded-full"
                />
                <View className="flex-1">
                  <Text className="font-semibold">{affiliate.name}</Text>
                  <Text className="text-gray-500">{affiliate.role}</Text>
                  {!!affiliate.website && (
                    <Text className="text-xs text-gray-400">{affiliate.website}</Text>
                  )}
                </View>
                <View className="flex-row items-center">
                  <Pressable
                    onPress={() => onChat(affiliate)}
                    className="px-3 py-1 mr-2 bg-yellow-400 rounded-lg"
                  >
                    <Text className="font-semibold">Chat</Text>
                  </Pressable>
                  <Pressable
                    onPress={async () => {
                      try {
                        await api.post('/api/seller/affiliate/requests', { affiliate_user_id: affiliate.id, message: 'Hi, let\'s collaborate!' });
                        // Refresh seller requests and reflect status
                        const reqRes = await api.get('/api/seller/affiliate/requests');
                        const reqs = Array.isArray(reqRes.data?.requests) ? reqRes.data.requests : [];
                        setSellerReqs(reqs);
                        setAffiliates(prev => prev.map(a => {
                          if (a.id !== affiliate.id) return a;
                          const r = reqs.find(x => x.affiliate_user_id === a.id);
                          if (!r) return a;
                          return { ...a, requested: true, requestStatus: r.status, requestId: r.id };
                        }));
                        Alert.alert('Request', 'Request sent');
                      } catch (e) {
                        Alert.alert('Request', 'Failed to send request');
                      }
                    }}
                    className={`px-3 py-1 rounded-lg ${
                      affiliate.requestStatus === 'accepted' ? "bg-green-500" : (affiliate.requested ? "bg-blue-300" : "bg-blue-500")
                    }`}
                  >
                    <Text className="text-white">
                      {affiliate.requestStatus === 'accepted' ? 'Partnered' : (affiliate.requested ? 'Requested' : 'Request')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}

        {/* === PARTNERED TAB === */}
        {activeTab === "partnered" && (
          <>
            {pLoading && (
              <View className="items-center justify-center py-10">
                <ActivityIndicator size="large" color="#fb923c" />
                <Text className="mt-2 text-gray-500">Loading partnered…</Text>
              </View>
            )}
            {!!pError && (
              <View className="px-3 py-2 mb-3 bg-red-50 border border-red-300 rounded">
                <Text className="text-red-700">{pError}</Text>
              </View>
            )}
            {!pLoading && partnered.length === 0 && (
              <View className="items-center justify-center py-10">
                <Text className="text-gray-500">No partnered affiliates yet</Text>
              </View>
            )}
            {partnered.map((p) => (
              <View key={p.request_id} className="p-4 mb-3 bg-white shadow rounded-xl">
                <View className="flex-row items-center mb-3">
                  <Image
                    source={{ uri: 'https://i.pravatar.cc/100' }}
                    className="w-12 h-12 mr-3 rounded-full"
                  />
                  <View>
                    <Text className="font-semibold">{p.name || 'Affiliate'}</Text>
                    <Text className="text-gray-500">{p.email}</Text>
                  </View>
                </View>

                <Pressable onPress={() => openChatByRequestId(p.request_id, p.name)} className="w-20 px-3 py-1 mb-3 bg-yellow-400 rounded-lg">
                  <Text className="font-semibold text-center">Chat</Text>
                </Pressable>

                <Text className="text-sm text-gray-500">Actions</Text>
                <View className="flex-row mt-2">
                  <Pressable onPress={() => generateLink(p.request_id)} className="px-3 py-2 mr-2 bg-orange-400 rounded-lg">
                    <Text className="text-white">Generate Link</Text>
                  </Pressable>
                  <Pressable onPress={() => viewAgreement(p.request_id)} className="px-3 py-2 bg-green-500 rounded-lg">
                    <Text className="text-white">View Agreement</Text>
                  </Pressable>
                </View>
                <View className="flex-row mt-2">
                  <Pressable onPress={() => uploadFlyer(p.request_id)} className="px-3 py-2 mr-2 bg-purple-600 rounded-lg">
                    <Text className="text-white">Upload Flyer</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      {/* Chat Modal */}
      {chatOpen && (
        <View className="absolute inset-0 bg-black/40 items-center justify-end">
          <View className="w-full bg-white rounded-t-2xl max-h-[70%] p-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-semibold">Chat {chatAffiliate ? `with ${chatAffiliate.name}` : ''}</Text>
              <Pressable onPress={() => setChatOpen(false)} className="px-3 py-1 bg-gray-200 rounded">
                <Text>Close</Text>
              </Pressable>
            </View>
            {chatLoading ? (
              <View className="py-10 items-center"><ActivityIndicator size="large" color="#fb923c" /></View>
            ) : (
              <ScrollView
                className="flex-1 mb-2"
                refreshControl={
                  <RefreshControl
                    refreshing={chatRefreshing}
                    onRefresh={async () => {
                      try { setChatRefreshing(true); await fetchMessages(currentRequestId); } finally { setChatRefreshing(false); }
                    }}
                    tintColor="#fb923c"
                  />
                }
              >
                {chatMessages.map((m) => {
                  const isMine = (m.sender_type || '').toLowerCase() === 'vendor';
                  const time = m.created_at ? new Date(m.created_at).toLocaleString() : '';
                  return (
                    <View key={m.id} className={`mb-2 ${isMine ? 'items-end' : 'items-start'}`}>
                      <Text className="text-[10px] text-gray-400 mb-1">{m.sender_name}{time ? ` • ${time}` : ''}</Text>
                      <View className={`${isMine ? 'bg-orange-100' : 'bg-gray-100'} rounded px-3 py-2 max-w-[85%]`}>
                        <Text>{m.message}</Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
            <View className="flex-row items-center">
              <TextInput
                value={chatText}
                onChangeText={setChatText}
                placeholder="Type a message"
                className="flex-1 border border-gray-300 rounded px-3 py-2 mr-2"
              />
              <Pressable onPress={sendChatMessage} className="px-3 py-2 bg-orange-400 rounded">
                <Text className="text-white font-semibold">Send</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
