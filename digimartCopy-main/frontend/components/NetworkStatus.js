import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  getBaseUrl, 
  refreshBaseUrl, 
  addCustomUrl, 
  getPossibleUrls,
  removeCustomUrl 
} from '../api';

const NetworkStatus = ({ expanded = false }) => {
  const [currentUrl, setCurrentUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [allUrls, setAllUrls] = useState([]);
  const [isExpanded, setIsExpanded] = useState(expanded);

  useEffect(() => {
    updateUrl();
  }, []);

  const updateUrl = () => {
    const url = getBaseUrl();
    const urls = getPossibleUrls();
    setCurrentUrl(url);
    setAllUrls(urls);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const newUrl = await refreshBaseUrl();
      setCurrentUrl(newUrl);
      updateUrl();
      Alert.alert('✅ Success', `Connected to backend:\n${getShortUrl(newUrl)}`);
    } catch (error) {
      Alert.alert('❌ Error', 'Could not find any working backend URL');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddCustomUrl = async () => {
    if (!customUrl.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    setRefreshing(true);
    const result = await addCustomUrl(customUrl.trim());
    setRefreshing(false);

    if (result.success) {
      Alert.alert('✅ Success', `Backend connected!\n${result.url}`);
      setCustomUrl('');
      setShowModal(false);
      updateUrl();
    } else {
      Alert.alert('❌ Failed', result.error || 'Could not connect to backend');
    }
  };

  const handleRemoveUrl = (url) => {
    Alert.alert(
      'Remove URL',
      `Remove ${getShortUrl(url)} from list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeCustomUrl(url);
            updateUrl();
          }
        }
      ]
    );
  };

  // Extract just the IP address from URL
  const getShortUrl = (url) => {
    const match = url.match(/https?:\/\/([\d.]+|localhost|[\w.-]+):\d+/);
    return match ? match[1] : url;
  };

  if (!isExpanded) {
    // Compact mode
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.statusBar}
          onPress={() => setIsExpanded(true)}
          onLongPress={() => setShowModal(true)}
        >
          <View style={styles.urlContainer}>
            <View style={[styles.statusDot, { backgroundColor: '#22c55e' }]} />
            <Ionicons name="server" size={16} color="#22c55e" />
            <Text style={styles.urlText}>{getShortUrl(currentUrl)}</Text>
          </View>
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              handleRefresh();
            }} 
            disabled={refreshing}
            style={styles.refreshButton}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Ionicons name="refresh" size={18} color="#3b82f6" />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  }

  // Expanded mode
  return (
    <View style={styles.container}>
      <View style={styles.expandedCard}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="server" size={20} color="#1e293b" />
            <Text style={styles.headerTitle}>Backend Connection</Text>
          </View>
          <TouchableOpacity onPress={() => setIsExpanded(false)}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.currentUrlSection}>
          <Text style={styles.label}>Current Backend:</Text>
          <View style={styles.currentUrlCard}>
            <View style={[styles.statusDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.currentUrlText}>{currentUrl}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <>
                <Ionicons name="refresh" size={20} color="#3b82f6" />
                <Text style={styles.actionButtonText}>Find Backend</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.addButton]}
            onPress={() => setShowModal(true)}
          >
            <Ionicons name="add-circle" size={20} color="#22c55e" />
            <Text style={[styles.actionButtonText, { color: '#22c55e' }]}>Add URL</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Available URLs ({allUrls.length}):</Text>
        <ScrollView style={styles.urlList} nestedScrollEnabled>
          {allUrls.map((url, index) => (
            <View key={index} style={styles.urlItem}>
              <View style={styles.urlItemLeft}>
                <Ionicons 
                  name={url === currentUrl ? "checkmark-circle" : "radio-button-off"} 
                  size={20} 
                  color={url === currentUrl ? "#22c55e" : "#cbd5e1"} 
                />
                <Text style={[
                  styles.urlItemText,
                  url === currentUrl && styles.urlItemTextActive
                ]}>
                  {url}
                </Text>
              </View>
              {url !== currentUrl && (
                <TouchableOpacity onPress={() => handleRemoveUrl(url)}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Add Custom URL Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Backend URL</Text>
            <Text style={styles.modalSubtitle}>
              Enter your backend server URL
            </Text>

            <TextInput
              style={styles.input}
              placeholder="http://192.168.1.100:5000"
              value={customUrl}
              onChangeText={setCustomUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={styles.hint}>
              💡 Examples:{'\n'}
              • http://192.168.1.100:5000{'\n'}
              • http://10.0.2.2:5000 (Android emulator){'\n'}
              • http://localhost:5000
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowModal(false);
                  setCustomUrl('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.addButtonModal]}
                onPress={handleAddCustomUrl}
                disabled={refreshing}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.addButtonText}>Add & Test</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  urlText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginLeft: 6,
  },
  refreshButton: {
    padding: 4,
  },
  expandedCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: 320,
    maxHeight: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    marginTop: 10,
  },
  currentUrlSection: {
    marginBottom: 10,
  },
  currentUrlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  currentUrlText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addButton: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 6,
  },
  urlList: {
    maxHeight: 200,
  },
  urlItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  urlItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  urlItemText: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 8,
    flex: 1,
  },
  urlItemTextActive: {
    color: '#166534',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
  addButtonModal: {
    backgroundColor: '#22c55e',
  },
  addButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default NetworkStatus;
