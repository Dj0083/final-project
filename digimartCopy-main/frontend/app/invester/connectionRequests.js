import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { investorAPI } from '../../api';

export default function InvestorConnectionRequests() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('pending'); // pending | accepted | rejected | all
  const [requests, setRequests] = useState([]);
  const [actingId, setActingId] = useState(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await investorAPI.getInvestorRequests(status);
      if (res && res.success) {
        setRequests(res.requests || []);
      } else {
        setRequests([]);
      }
    } catch (e) {
      console.error('Load investor requests error', e);
      Alert.alert('Error', 'Failed to load requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const respond = async (connectionId, nextStatus) => {
    try {
      setActingId(connectionId);
      const res = await investorAPI.respondToRequest(connectionId, nextStatus);
      if (res && res.success) {
        Alert.alert('Success', `Request ${nextStatus}`);
        loadRequests();
      } else {
        Alert.alert('Error', res?.error || `Failed to ${nextStatus}`);
      }
    } catch (e) {
      console.error('Respond error', e);
      Alert.alert('Error', `Failed to ${nextStatus}`);
    } finally {
      setActingId(null);
    }
  };

  const renderItem = ({ item }) => {
    return (
      <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 4 }}>{item.seller_name || 'Seller'}</Text>
        {!!item.business_name && (
          <Text style={{ color: '#555', marginBottom: 2 }}>Business: {item.business_name}</Text>
        )}
        {!!item.business_address && (
          <Text style={{ color: '#555', marginBottom: 8 }}>Address: {item.business_address}</Text>
        )}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/invester/ProfileScreen', params: { sellerId: item.seller_id } })}
            style={{ backgroundColor: '#f3f4f6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}
          >
            <Text>View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/invester/MessagesScreen', params: { sellerId: item.seller_id } })}
            style={{ backgroundColor: '#f3f4f6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}
          >
            <Text>Message</Text>
          </TouchableOpacity>
          {item.status === 'pending' && (
            <>
              <TouchableOpacity
                onPress={() => respond(item.id, 'accepted')}
                disabled={actingId === item.id}
                style={{ backgroundColor: '#10b981', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff' }}>{actingId === item.id ? 'Accepting...' : 'Accept'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => respond(item.id, 'rejected')}
                disabled={actingId === item.id}
                style={{ backgroundColor: '#ef4444', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff' }}>{actingId === item.id ? 'Rejecting...' : 'Reject'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const Header = () => (
    <View style={{ flexDirection: 'row', backgroundColor: '#fff', padding: 8, borderRadius: 12, marginBottom: 12 }}>
      {['pending', 'accepted', 'rejected', 'all'].map(s => (
        <TouchableOpacity
          key={s}
          onPress={() => setStatus(s)}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
            marginRight: 8,
            backgroundColor: status === s ? '#fb923c' : '#f3f4f6'
          }}
        >
          <Text style={{ color: status === s ? '#fff' : '#111827', fontWeight: '600', textTransform: 'capitalize' }}>{s}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 12, backgroundColor: '#f8fafc' }}>
      <Header />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#fb923c" />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={() => (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: '#6b7280' }}>No requests found for "{status}"</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
