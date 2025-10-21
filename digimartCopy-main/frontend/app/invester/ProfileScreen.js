import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { authAPI, removeToken } from '../../api';
import * as SecureStore from 'expo-secure-store';

const ProfileScreen = () => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Profile data
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    company: '',
  });

  // Temporary editing data
  const [editData, setEditData] = useState({ ...profileData });

  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoInvest, setAutoInvest] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    (async () => {
      try {
        const cached = await SecureStore.getItemAsync('userData');
        if (cached) {
          try {
            const u = JSON.parse(cached);
            const cachedPayload = {
              name: u?.name || '',
              email: u?.email || '',
              phone: u?.phone || '',
              location: u?.address || '',
              company: u?.company || '',
            };
            setProfileData(cachedPayload);
            setEditData(cachedPayload);
          } catch (_) {}
        }
      } catch (_) {}

      try {
        const res = await authAPI.getProfile();
        const name = res?.name || '';
        const email = res?.email || '';
        const phone = res?.phone || '';
        const location = res?.address || '';
        const company = res?.company || '';
        const payload = { name, email, phone, location, company };
        setProfileData(payload);
        setEditData(payload);
        try { await SecureStore.setItemAsync('userData', JSON.stringify(res || {})); } catch (_) {}
      } catch (_) {
        // keep cached values if API fails
      }
    })();
  }, [router.isReady]);

  const handleStartEdit = () => {
    setEditData({ ...profileData });
    setIsEditing(true);
  };

  const handleSaveProfile = () => {
    // Validation
    if (!editData.name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    if (!editData.email.trim()) {
      Alert.alert('Error', 'Email cannot be empty');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Save data
    setProfileData({ ...editData });
    setIsEditing(false);
    Alert.alert('Success', 'Profile updated successfully!');
  };

  const handleCancelEdit = () => {
    setEditData({ ...profileData });
    setIsEditing(false);
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    setIsLoggingOut(true);

    try {
      await removeToken();
      try { await SecureStore.deleteItemAsync('userData'); } catch (_) {}

      // Navigate to login screen
      router.replace('/login');

      // Hide loading after navigation starts
      setTimeout(() => {
        setIsLoggingOut(false);
      }, 500);

    } catch (error) {
      setIsLoggingOut(false);
      console.error('Logout error:', error);
      Alert.alert('Error', `Failed to logout: ${error.message || 'Please try again'}`);
    }
  };

  const openLogoutModal = () => {
    setShowLogoutModal(true);
  };

  const SettingItem = ({ icon, title, subtitle, color, onPress, hasToggle, toggleValue, onToggle }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={hasToggle}
      activeOpacity={hasToggle ? 1 : 0.7}
    >
      <LinearGradient
        colors={color}
        style={styles.settingIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={20} color="white" />
      </LinearGradient>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {hasToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: '#e5e7eb', true: '#86efac' }}
          thumbColor={toggleValue ? '#22c55e' : '#f3f4f6'}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      )}
    </TouchableOpacity>
  );

  const StatCard = ({ title, value, icon, color }) => (
    <View style={styles.statCardSmall}>
      <LinearGradient
        colors={color}
        style={styles.statIconSmall}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={18} color="white" />
      </LinearGradient>
      <Text style={styles.statValueSmall}>{value}</Text>
      <Text style={styles.statTitleSmall}>{title}</Text>
    </View>
  );

  const EditField = ({ label, icon, value, onChangeText, placeholder, keyboardType = 'default', multiline = false }) => (
    <View style={styles.editFieldContainer}>
      <View style={styles.editFieldHeader}>
        <Ionicons name={icon} size={16} color="#64748b" />
        <Text style={styles.editFieldLabel}>{label}</Text>
      </View>
      <TextInput
        style={[styles.editFieldInput, multiline && styles.editFieldMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
        multiline={multiline}
        blurOnSubmit={false}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <LinearGradient
            colors={['#22c55e', '#3b82f6']}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                  style={styles.avatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="person" size={40} color="white" />
                </LinearGradient>
                <TouchableOpacity style={styles.editButton} onPress={() => Alert.alert('Change Photo', 'Photo upload functionality')}>
                  <LinearGradient
                    colors={['#3b82f6', '#2563eb']}
                    style={styles.editButtonInner}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="camera" size={16} color="white" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {!isEditing ? (
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{profileData.name}</Text>
                  <Text style={styles.profileEmail}>{profileData.email}</Text>
                  <TouchableOpacity style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                    <Text style={styles.verifiedText}>Verified Investor</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.profileInfo}>
                  <Text style={styles.editingTitle}>Editing Profile</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {!isEditing && (
            <View style={styles.statsRow}>
              <StatCard title="Portfolio" value="LKR 25.8M" icon="wallet" color={['#22c55e', '#16a34a']} />
              <StatCard title="Active" value="12" icon="business" color={['#3b82f6', '#2563eb']} />
              <StatCard title="ROI" value="24.5%" icon="trending-up" color={['#8b5cf6', '#7c3aed']} />
            </View>
          )}

          {isEditing && (
            <View style={styles.editSection}>
              <View style={styles.editCard}>
                <Text style={styles.editCardTitle}>Personal Information</Text>
                <EditField
                  label="Full Name"
                  icon="person"
                  value={editData.name}
                  onChangeText={(text) => setEditData({ ...editData, name: text })}
                  placeholder="Enter your full name"
                />
                <EditField
                  label="Email Address"
                  icon="mail"
                  value={editData.email}
                  onChangeText={(text) => setEditData({ ...editData, email: text })}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                />
                <EditField
                  label="Phone Number"
                  icon="call"
                  value={editData.phone}
                  onChangeText={(text) => setEditData({ ...editData, phone: text })}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                />
                <EditField
                  label="Location"
                  icon="location"
                  value={editData.location}
                  onChangeText={(text) => setEditData({ ...editData, location: text })}
                  placeholder="Enter your location"
                />
                <EditField
                  label="Company"
                  icon="business"
                  value={editData.company}
                  onChangeText={(text) => setEditData({ ...editData, company: text })}
                  placeholder="Enter your company name"
                />
              </View>

              <View style={styles.editActions}>
                <TouchableOpacity onPress={handleSaveProfile} style={styles.saveButtonContainer}>
                  <LinearGradient
                    colors={['#22c55e', '#16a34a']}
                    style={styles.saveButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButtonContainer}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!isEditing && (
            <>


              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notifications</Text>
                <View style={styles.settingsCard}>
                  <SettingItem
                    icon="notifications"
                    title="Push Notifications"
                    subtitle="Get notified about new opportunities"
                    color={['#22c55e', '#16a34a']}
                    hasToggle={true}
                    toggleValue={notifications}
                    onToggle={setNotifications}
                  />
                  <SettingItem
                    icon="mail"
                    title="Email Alerts"
                    subtitle="Receive investment updates via email"
                    color={['#3b82f6', '#2563eb']}
                    hasToggle={true}
                    toggleValue={emailAlerts}
                    onToggle={setEmailAlerts}
                  />
                  <SettingItem
                    icon="pulse"
                    title="Auto-Invest"
                    subtitle="Automatically invest in matched opportunities"
                    color={['#8b5cf6', '#7c3aed']}
                    hasToggle={true}
                    toggleValue={autoInvest}
                    onToggle={setAutoInvest}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Settings</Text>
                <View style={styles.settingsCard}>
                  <SettingItem
                    icon="person-circle"
                    title="Edit Profile"
                    subtitle="Update your personal information"
                    color={['#22c55e', '#16a34a']}
                    onPress={handleStartEdit}
                  />
                  <SettingItem
                    icon="shield-checkmark"
                    title="Security"
                    subtitle="Change password & 2FA settings"
                    color={['#3b82f6', '#2563eb']}
                    onPress={() => router.push('/invester/security')}
                  />
                  <SettingItem
                    icon="card"
                    title="Payment Methods"
                    subtitle="Manage your payment options"
                    color={['#8b5cf6', '#7c3aed']}
                    onPress={() => Alert.alert('Payment Methods', 'Payment settings screen')}
                  />
                  <SettingItem
                    icon="document-text"
                    title="Legal Documents"
                    subtitle="View terms, privacy & agreements"
                    color={['#f59e0b', '#d97706']}
                    onPress={() => router.push('/invester/legal-documents')}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.settingsCard}>
                  <SettingItem
                    icon="help-circle"
                    title="Help & Support"
                    subtitle="Get assistance with your account"
                    color={['#3b82f6', '#2563eb']}
                    onPress={() => router.push('/invester/help-support')}
                  />
                  <TouchableOpacity style={styles.logoutButton} onPress={openLogoutModal}>
                    <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.logoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <Ionicons name="log-out" size={20} color="white" />
                      <Text style={styles.logoutText}>Logout</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.versionText}>Version 1.0.0</Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.modalIconContainer}
            >
              <Ionicons name="log-out" size={32} color="white" />
            </LinearGradient>

            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to logout from your account?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowLogoutModal(false)}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLogout}
                style={styles.modalLogoutButtonWrapper}
              >
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  style={styles.modalLogoutButton}
                >
                  <Text style={styles.modalLogoutText}>Logout</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {isLoggingOut && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#22c55e" />
            <Text style={styles.loadingText}>Logging out...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  keyboardView: { flex: 1 },
  header: { paddingTop: 20, paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  backButton: { position: 'absolute', top: 20, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  profileHeader: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatar: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'rgba(255, 255, 255, 0.3)' },
  editButton: { position: 'absolute', bottom: 0, right: 0 },
  editButtonInner: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'white' },
  profileInfo: { alignItems: 'center', marginBottom: 10 },
  profileName: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 5, textAlign: 'center' },
  profileEmail: { fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', marginBottom: 10, textAlign: 'center' },
  editingTitle: { fontSize: 18, fontWeight: '600', color: 'white', marginBottom: 10 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  verifiedText: { color: 'white', fontSize: 13, fontWeight: '600', marginLeft: 5 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: -25, marginBottom: 20, justifyContent: 'space-between' },
  statCardSmall: { flex: 1, backgroundColor: 'white', borderRadius: 15, padding: 15, marginHorizontal: 5, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  statIconSmall: { width: 35, height: 35, borderRadius: 17.5, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValueSmall: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 2 },
  statTitleSmall: { fontSize: 11, color: '#64748b', textAlign: 'center' },
  editSection: { paddingHorizontal: 20, paddingTop: 20 },
  editCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  editCardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 20 },
  editFieldContainer: { marginBottom: 20 },
  editFieldHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  editFieldLabel: { fontSize: 14, fontWeight: '600', color: '#64748b', marginLeft: 8 },
  editFieldInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: '#1e293b' },
  editFieldMultiline: { minHeight: 80, textAlignVertical: 'top' },
  editActions: { marginBottom: 30 },
  saveButtonContainer: { marginBottom: 12 },
  saveButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12 },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  cancelButtonContainer: { paddingVertical: 16, alignItems: 'center' },
  cancelButtonText: { color: '#64748b', fontSize: 16, fontWeight: '600' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  settingsCard: { backgroundColor: 'white', borderRadius: 15, padding: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  settingIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginBottom: 3 },
  settingSubtitle: { fontSize: 13, color: '#64748b' },
  logoutButton: { marginTop: 10, marginHorizontal: 10, marginBottom: 5 },
  logoutGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 12 },
  logoutText: { color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 10 },
  versionText: { textAlign: 'center', color: '#9ca3af', fontSize: 12, paddingVertical: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 30, width: '100%', maxWidth: 400, alignItems: 'center' },
  modalIconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
  modalMessage: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  modalButtons: { flexDirection: 'row', width: '100%', gap: 12 },
  modalCancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  modalLogoutButtonWrapper: { flex: 1 },
  modalLogoutButton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalLogoutText: { fontSize: 15, fontWeight: 'bold', color: 'white' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  loadingContent: { backgroundColor: 'white', borderRadius: 20, padding: 30, alignItems: 'center', minWidth: 150 },
  loadingText: { marginTop: 15, fontSize: 16, fontWeight: '600', color: '#1e293b' },
});

export default ProfileScreen;