import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function InvestorHelpSupportScreen() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Validation', 'Please enter subject and message');
      return;
    }
    try {
      setSending(true);
      await new Promise(r => setTimeout(r, 800));
      Alert.alert('Sent', 'Your message has been sent to support');
      setSubject('');
      setMessage('');
    } catch (_) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <LinearGradient colors={['#22c55e', '#3b82f6']} style={{ paddingHorizontal: 20, paddingVertical: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>Help & Support</Text>
          <View style={{ width: 40, height: 40 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={{ backgroundColor: 'white', borderRadius: 15, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Contact Support</Text>

            <TextInput
              style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 10 }}
              placeholder="Subject"
              value={subject}
              onChangeText={setSubject}
              blurOnSubmit={false}
              returnKeyType="next"
            />

            <TextInput
              style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 12, minHeight: 120, textAlignVertical: 'top' }}
              placeholder="Message"
              value={message}
              onChangeText={setMessage}
              multiline
              blurOnSubmit={false}
            />

            <TouchableOpacity onPress={send} style={{ backgroundColor: '#fb923c', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }} disabled={sending}>
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: 'white', fontWeight: '700' }}>Send</Text>}
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: 'white', borderRadius: 15, padding: 16, marginTop: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Quick Links</Text>
            <Text style={{ color: '#374151', marginBottom: 8 }}>• FAQ</Text>
            <Text style={{ color: '#374151', marginBottom: 8 }}>• Report a problem</Text>
            <Text style={{ color: '#374151' }}>• Contact: support@digimart.com</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
