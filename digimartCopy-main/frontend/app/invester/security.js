import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Switch, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function InvestorSecurityScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [saving, setSaving] = useState(false);

  const savePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Validation', 'Fill all password fields');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Validation', 'New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation', 'Passwords do not match');
      return;
    }
    try {
      setSaving(true);
      await new Promise(r => setTimeout(r, 800));
      Alert.alert('Success', 'Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      Alert.alert('Error', 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const saveTwoFA = async (value) => {
    try {
      setTwoFA(value);
      setSaving(true);
      await new Promise(r => setTimeout(r, 500));
      Alert.alert('Success', value ? 'Two-factor enabled' : 'Two-factor disabled');
    } catch (_) {
      Alert.alert('Error', 'Failed to update 2FA');
      setTwoFA(!value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <LinearGradient colors={['#22c55e', '#3b82f6']} style={{ paddingHorizontal: 20, paddingVertical: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>Security</Text>
          <View style={{ width: 40, height: 40 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={{ backgroundColor: 'white', borderRadius: 15, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Change Password</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', borderRadius: 12, marginBottom: 10, paddingHorizontal: 10 }}>
              <TextInput
                style={{ flex: 1, paddingVertical: 12 }}
                placeholder="Current Password"
                secureTextEntry={!showCurrent}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                blurOnSubmit={false}
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={{ padding: 6 }}>
                <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', borderRadius: 12, marginBottom: 10, paddingHorizontal: 10 }}>
              <TextInput
                style={{ flex: 1, paddingVertical: 12 }}
                placeholder="New Password"
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
                blurOnSubmit={false}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} style={{ padding: 6 }}>
                <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', borderRadius: 12, marginBottom: 14, paddingHorizontal: 10 }}>
              <TextInput
                style={{ flex: 1, paddingVertical: 12 }}
                placeholder="Confirm New Password"
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                blurOnSubmit={false}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={{ padding: 6 }}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={savePassword} style={{ backgroundColor: '#fb923c', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '700' }}>Update Password</Text>
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: 'white', borderRadius: 15, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Two-factor Authentication</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#374151', fontWeight: '600' }}>Enable 2FA</Text>
              <Switch value={twoFA} onValueChange={saveTwoFA} trackColor={{ false: '#e5e7eb', true: '#86efac' }} thumbColor={twoFA ? '#22c55e' : '#f3f4f6'} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {saving && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 24, alignItems: 'center', minWidth: 220 }}>
            <ActivityIndicator size="large" color="#22c55e" />
            <Text style={{ marginTop: 10, fontWeight: '700', color: '#111827' }}>Saving...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
