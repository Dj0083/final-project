import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, ScrollView, TextInput, Alert, Modal, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, API_BASE } from '../../../config/api';
import { Linking } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';

export default function AffiliateChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const requestId = params?.id;
  const displayName = params?.name || '';

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [role, setRole] = useState(''); // raw role from profile (e.g., 'affiliate' or 'affiliator')
  const [busy, setBusy] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [invLoading, setInvLoading] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [pickedProductId, setPickedProductId] = useState(null);
  const [utmSource, setUtmSource] = useState('');
  const [flyers, setFlyers] = useState([]);
  const [flyersLoading, setFlyersLoading] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const downloadToGallery = async (uri) => {
    try {
      if (!uri) return;
      const MediaLibrary = await import('expo-media-library');
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        return Alert.alert('Permission', 'Storage permission is required to save the image.');
      }
      const extMatch = String(uri).match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
      const ext = (extMatch && extMatch[1]) ? extMatch[1].toLowerCase() : 'jpg';
      const filename = `flyer_${Date.now()}.${ext}`;
      const fileUri = FileSystem.cacheDirectory + filename;
      const res = await FileSystem.downloadAsync(uri, fileUri);
      await MediaLibrary.saveToLibraryAsync(res.uri);
      Alert.alert('Saved', 'Flyer saved to your gallery');
    } catch (e) {
      try {
        await Linking.openURL(uri);
      } catch {
        Alert.alert('Download', 'Failed to download flyer');
      }
    }
  };

  const getLatestLink = useCallback(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]?.message;
      if (typeof msg === 'string') {
        const match = msg.match(/https?:\/\/\S+/i);
        if (match && match[0]) return match[0];
      }
    }
    return null;
  }, [messages]);

  const copyLatestLink = async () => {
    const link = getLatestLink();
    if (!link) return Alert.alert('Copy Link', 'No link found in this chat yet');
    try { await Clipboard.setStringAsync(link); Alert.alert('Copied', 'Latest link copied to clipboard'); } catch { }
  };

  const openProductFromLink = (url) => {
    try {
      if (!url) return Alert.alert('Open', 'Invalid link');
      let productId = null;
      let aff = null;
      try {
        const u = new URL(url);
        aff = u.searchParams.get('aff') || undefined;
        // support /p/{id} and /product/{id}
        const path = u.pathname || '';
        let m = path.match(/\/p\/(\d+)/);
        if (!m) m = path.match(/\/product\/(\d+)/);
        if (m && m[1]) productId = m[1];
        // also support if link was direct to app route /customer/ProductDetail?productId=..
        const pidQ = u.searchParams.get('productId');
        if (!productId && pidQ) productId = pidQ;
      } catch {
        // Fallback basic parse
        const m1 = url.match(/\/p\/(\d+)/) || url.match(/product\/(\d+)/);
        productId = m1 && m1[1] ? m1[1] : null;
        const affM = url.match(/[?&]aff=([^&]+)/);
        aff = affM && affM[1] ? decodeURIComponent(affM[1]) : undefined;
      }
      if (!productId) return Alert.alert('Open', 'Product not found in link');
      router.push({ pathname: '/customer/ProductDetail', params: { productId, ...(aff ? { aff } : {}) } });
    } catch (e) {
      Alert.alert('Open', 'Failed to open product');
    }
  };

  const loadProfileRole = useCallback(async () => {
    try {
      const prof = await api.get('/api/users/profile');
      const r = (prof.data?.user?.role || '').toLowerCase();
      setRole(r);
    } catch { }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!requestId) return;
    try {
      const res = await api.get(`/api/affiliate/requests/${requestId}/messages`);
      const arr = Array.isArray(res.data?.messages) ? res.data.messages : [];
      setMessages(arr);
    } catch (e) {
    }
  }, [requestId]);

  const normalizeFileUrl = (u) => {
    if (!u) return null;
    const s = String(u);
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('/')) return `${API_BASE}${s}`;
    return `${API_BASE}/${s}`;
  };

  const fetchFlyers = useCallback(async () => {
    if (!requestId) return;
    try {
      setFlyersLoading(true);
      const res = await api.get(`/api/affiliate/requests/${requestId}/documents`);
      const docs = Array.isArray(res.data?.documents) ? res.data.documents : [];
      const fl = docs.filter(d => String(d.doc_type || '').toLowerCase() === 'flyer');
      setFlyers(fl);
    } catch (e) {
      // silent
    } finally {
      setFlyersLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        await Promise.all([loadProfileRole(), fetchMessages(), fetchFlyers()]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [fetchMessages, fetchFlyers, loadProfileRole]);

  useEffect(() => {
    if (!requestId) return;
    const t = setInterval(() => { fetchMessages(); }, 5000);
    return () => clearInterval(t);
  }, [requestId, fetchMessages]);

  const send = async () => {
    if (!text.trim() || !requestId) return;
    try {
      setSending(true);
      const msg = text.trim();
      setText('');
      await api.post(`/api/affiliate/requests/${requestId}/messages`, { message: msg });
      await fetchMessages();
    } catch (e) {
      Alert.alert('Chat', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const viewFlyers = async () => {
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

  const uploadDoc = async () => {
    try {
      setBusy(true);
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], multiple: true, copyToCacheDirectory: true });
      if (result.canceled) return;
      const assets = result.assets || [];
      if (!assets.length) return;
      const docType = role === 'affiliate' ? 'agreement' : 'flyer';
      let ok = 0, fail = 0;
      for (const file of assets) {
        try {
          const form = new FormData();
          form.append('doc_type', docType);
          form.append('document', { uri: file.uri, name: file.name || docType, type: file.mimeType || 'application/octet-stream' });
          await api.post(`/api/affiliate/requests/${requestId}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
          ok++;
        } catch (e) {
          fail++;
        }
      }
      await fetchFlyers();
      Alert.alert('Upload', `Uploaded ${ok}${fail ? `, Failed ${fail}` : ''}`);
    } catch (e) {
      Alert.alert('Upload', 'Failed to upload');
    } finally {
      setBusy(false);
    }
  };

  const viewAgreement = async () => {
    try {
      const res = await api.get(`/api/seller/affiliate/requests/${requestId}/agreement`);
      const agreement = res.data?.agreement;
      if (!agreement) return Alert.alert('Agreement', 'No agreement found');
      Alert.alert('Agreement', `Title: ${agreement.title}\nSeller: ${agreement.seller?.name}\nAffiliate: ${agreement.affiliate?.name}\nStatus: ${agreement.status}`);
    } catch (e) {
      Alert.alert('Agreement', 'Failed to load agreement');
    }
  };

  const generateLink = async () => {
    try {
      if (role === 'affiliate') {
        return Alert.alert('Product Link', 'Only sellers can generate links here.');
      }
      // If product_id not provided via params, show picker
      const initialPid = params?.product_id;
      if (!initialPid && !pickedProductId) {
        try {
          setInvLoading(true);
          setShowLinkPicker(true);
          if (inventory.length === 0) {
            const inv = await api.get('/api/products/inventory');
            const data = inv.data || {};
            let list = [];
            if (Array.isArray(data)) list = data;
            else if (Array.isArray(data.products)) list = data.products;
            else list = [
              ...(Array.isArray(data.Active) ? data.Active : []),
              ...(Array.isArray(data['Out of Stock']) ? data['Out of Stock'] : []),
              ...(Array.isArray(data.Violation) ? data.Violation : []),
            ];
            setInventory(list);
          }
        } finally {
          setInvLoading(false);
        }
        return;
      }
      const pid = initialPid || pickedProductId;
      if (!pid) return Alert.alert('Product Link', 'Please select a product');
      const res = await api.get(`/api/seller/affiliate/requests/${requestId}/product-link`, { params: { product_id: pid } });
      let link = res.data?.short_link || res.data?.link || '';
      if (!link) throw new Error('No link');
      if (utmSource) {
        const sep = link.includes('?') ? '&' : '?';
        link = `${link}${sep}utm_source=${encodeURIComponent(utmSource)}&utm_medium=affiliate&utm_campaign=req-${requestId}`;
      }
      setShowLinkPicker(false);
      setPickedProductId(null);
      await Clipboard.setStringAsync(link);
      try { await Share.share({ message: link }); } catch { }
      Alert.alert('Product Link', 'Link copied. Paste or share to send.');
    } catch (e) {
      Alert.alert('Product Link', 'Failed to generate link');
    }
  };

  const generateLinkAndSend = async () => {
    try {
      if (role === 'affiliate') {
        return Alert.alert('Product Link', 'Only sellers can generate links here.');
      }
      const pid = params?.product_id || pickedProductId;
      if (!pid) return Alert.alert('Product Link', 'Please select a product');
      const res = await api.get(`/api/seller/affiliate/requests/${requestId}/product-link`, { params: { product_id: pid } });
      let link = res.data?.short_link || res.data?.link || '';
      if (!link) throw new Error('No link');
      if (utmSource) {
        const sep = link.includes('?') ? '&' : '?';
        link = `${link}${sep}utm_source=${encodeURIComponent(utmSource)}&utm_medium=affiliate&utm_campaign=req-${requestId}`;
      }
      await api.post(`/api/affiliate/requests/${requestId}/messages`, { message: link });
      setShowLinkPicker(false);
      setPickedProductId(null);
      await fetchMessages();
      Alert.alert('Sent', 'Link posted in chat.');
    } catch (e) {
      Alert.alert('Product Link', 'Failed to send link');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, backgroundColor: '#f3f4f6', borderRadius: 10 }}>
          <Text>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>{displayName ? `Chat with ${displayName}` : 'Chat'}</Text>
        {(role === 'affiliate' || role === 'affiliator') ? (
          <TouchableOpacity onPress={copyLatestLink} style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#e5e7eb', borderRadius: 10 }}>
            <Text style={{ fontWeight: '600' }}>Copy Link</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <View style={{ paddingHorizontal: 12, paddingBottom: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
        <TouchableOpacity onPress={viewFlyers} style={{ backgroundColor: '#3B82F6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8, marginBottom: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>View Flyers</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={busy} onPress={uploadDoc} style={{ backgroundColor: '#8B5CF6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8, marginBottom: 8, opacity: busy ? 0.7 : 1 }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>{role === 'affiliate' ? 'Upload Agreement' : 'Upload Flyer'}</Text>
        </TouchableOpacity>
        {!(role === 'affiliate' || role === 'affiliator') && (
          <TouchableOpacity onPress={generateLink} style={{ backgroundColor: '#F59E0B', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8, marginBottom: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Generate Link</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={viewAgreement} style={{ backgroundColor: '#10B981', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8, marginBottom: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>View Agreement</Text>
        </TouchableOpacity>
      </View>

      {/* Composer moved to top */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message"
          style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginRight: 8 }}
        />
        <TouchableOpacity disabled={sending} onPress={send} style={{ backgroundColor: '#FF6B35', paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', opacity: sending ? 0.7 : 1 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Send</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#FF6B35" size="large" />
        </View>
      ) : (
        <>
          {/* Flyers inline gallery for sellers (who upload flyers). Affiliates will still see flyers list. */}
          {(flyersLoading && flyers.length === 0) ? (
            <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
              <ActivityIndicator color="#8B5CF6" />
            </View>
          ) : flyers.length > 0 ? (
            <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
              <Text style={{ fontWeight: '700', marginBottom: 6 }}>Flyers</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {flyers.map(f => {
                  const href = normalizeFileUrl(f.file_path || f.url);
                  const isImg = (f.mime_type || '').startsWith('image') || /\.(png|jpg|jpeg|gif|webp)$/i.test(f.file_path || '');
                  return (
                    <TouchableOpacity key={f.id} onPress={() => href && Alert.alert('Flyer', href)} style={{ marginRight: 10 }}>
                      {isImg ? (
                        <View style={{ width: 120, height: 120, backgroundColor: '#f3f4f6', borderRadius: 8, overflow: 'hidden' }}>
                          <Image source={{ uri: href }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        </View>
                      ) : (
                        <View style={{ width: 120, height: 120, backgroundColor: '#eef2ff', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#4f46e5', fontWeight: '700' }}>View File</Text>
                        </View>
                      )}
                      {isImg && (
                        <TouchableOpacity onPress={() => downloadToGallery(href)} style={{ position: 'absolute', bottom: 6, right: 6, backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Download</Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity onPress={fetchFlyers} style={{ alignSelf: 'flex-start', backgroundColor: '#e5e7eb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ fontWeight: '600' }}>Refresh Flyers</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <ScrollView style={{ flex: 1, padding: 12 }}>
            {messages.map(m => {
              const isMine = (m.sender_type || '').toLowerCase() === (role === 'affiliate' ? 'affiliate' : 'vendor');
              const time = m.created_at ? new Date(m.created_at).toLocaleString() : '';
              const hasLink = typeof m.message === 'string' && /https?:\/\/\S+/i.test(m.message);
              const firstLink = hasLink ? (m.message.match(/https?:\/\/\S+/i) || [null])[0] : null;
              return (
                <View key={m.id} style={{ marginBottom: 10, alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                  <Text style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>{m.sender_name}{time ? ` • ${time}` : ''}</Text>
                  <View style={{ backgroundColor: isMine ? '#fde68a' : '#f3f4f6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, maxWidth: '85%' }}>
                    <Text style={{ color: '#111' }}>{m.message}</Text>
                  </View>
                  {hasLink && firstLink && (
                    <View style={{ flexDirection: 'row', marginTop: 6 }}>
                      <TouchableOpacity onPress={async () => { try { await Clipboard.setStringAsync(firstLink); Alert.alert('Copied', 'Link copied to clipboard'); } catch { } }} style={{ backgroundColor: '#e5e7eb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 8 }}>
                        <Text style={{ color: '#111', fontWeight: '600' }}>Copy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={async () => { try { await Share.share({ message: firstLink }); } catch { } }} style={{ backgroundColor: '#e5e7eb', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                        <Text style={{ color: '#111', fontWeight: '600' }}>Share</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openProductFromLink(firstLink)} style={{ backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 8 }}>
                        <Text style={{ color: '#fff', fontWeight: '600' }}>Open Product</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Link Product Picker (seller) */}
      <Modal visible={showLinkPicker} transparent animationType="slide" onRequestClose={() => setShowLinkPicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '70%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>Select Product</Text>
              <TouchableOpacity onPress={() => setShowLinkPicker(false)} style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#e5e7eb', borderRadius: 8 }}>
                <Text>Close</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginBottom: 8 }}>
              {['instagram', 'youtube', 'facebook', 'whatsapp', 'x', 'tiktok', 'blog'].map(ch => (
                <TouchableOpacity key={ch} onPress={() => setUtmSource(ch)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: utmSource === ch ? '#8B5CF6' : '#e5e7eb', marginRight: 8, marginBottom: 8 }}>
                  <Text style={{ color: utmSource === ch ? '#8B5CF6' : '#111' }}>{ch}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Product search */}
            <View style={{ marginBottom: 8 }}>
              <TextInput
                placeholder="Search product"
                value={productQuery}
                onChangeText={setProductQuery}
                style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}
              />
            </View>
            {/* Product list */}
            <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, maxHeight: 220, marginBottom: 10 }}>
              {invLoading ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                  <ActivityIndicator color="#F59E0B" />
                </View>
              ) : (
                <ScrollView>
                  {inventory
                    .filter(p => {
                      const q = productQuery.trim().toLowerCase();
                      if (!q) return true;
                      const name = (p.product_name || p.name || '').toLowerCase();
                      const idStr = String(p.id || '').toLowerCase();
                      return name.includes(q) || idStr.includes(q);
                    })
                    .map(p => {
                      const pid = p.id;
                      const title = p.product_name || p.name || `#${pid}`;
                      const selected = String(pickedProductId) === String(pid);
                      return (
                        <TouchableOpacity key={pid} onPress={() => setPickedProductId(pid)} style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: selected ? '#FEF3C7' : '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                          <Text style={{ fontWeight: '600', color: '#111' }}>{title}</Text>
                          <Text style={{ color: '#6b7280', fontSize: 12 }}>ID: {pid}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  {Array.isArray(inventory) && inventory.length === 0 && (
                    <View style={{ padding: 16 }}>
                      <Text style={{ color: '#6b7280' }}>No products found.</Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
              <TouchableOpacity onPress={generateLink} style={{ backgroundColor: '#F59E0B', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginRight: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Generate</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={generateLinkAndSend} style={{ backgroundColor: '#16a34a', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Generate & Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
