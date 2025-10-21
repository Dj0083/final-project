import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { authAPI } from '../api';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendResetCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      const result = await authAPI.forgotPassword(email.trim().toLowerCase());
      
      if (result.success) {
        setEmailSent(true);
        Alert.alert('Email Sent!', result.message || 'Reset code sent to your email');
      } else {
        Alert.alert('Failed to Send', result.error || 'Please check your email address');
      }
    } catch (error) {
      Alert.alert('Network Error', error.error || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToResetPassword = () => {
    router.push({
      pathname: '/resetPassword',
      params: { email: email.trim().toLowerCase() }
    });
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const result = await authAPI.forgotPassword(email.trim().toLowerCase());
      
      if (result.success) {
        Alert.alert('Email Sent!', 'Reset code sent to your email');
      } else {
        Alert.alert('Failed to Send', result.error || 'Please try again');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-orange-400">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-5 py-6 bg-orange-400 shadow-lg rounded-b-3xl">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <View style={{ width: 28 }} />
        </View>

        <View className="items-center">
          <View className="items-center justify-center w-20 h-20 mb-4 bg-white rounded-full bg-opacity-20">
            <Ionicons 
              name={emailSent ? "mail-open" : "lock-closed"} 
              size={40} 
              color="white" 
            />
          </View>
          <Text className="text-2xl font-bold text-center text-white">
            {emailSent ? 'Check Your Email' : 'Forgot Password'}
          </Text>
          <Text className="mt-2 text-center text-orange-100">
            {emailSent 
              ? `Code sent to ${email}`
              : 'Recover your account'
            }
          </Text>
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 bg-white">
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View className="flex-1 px-5 py-8">
              
              {/* Form Card */}
              <View className="p-6 mb-6 bg-white shadow rounded-2xl">
                {!emailSent ? (
                  <>
                    <Text className="mb-6 text-base text-center text-gray-600">
                      Enter your email address and we'll send you a verification code to reset your password.
                    </Text>
                    
                    <TextInput
                      className="p-4 mb-6 text-gray-900 border border-gray-200 bg-gray-50 rounded-xl"
                      placeholder="Enter your email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                    
                    <TouchableOpacity
                      onPress={handleSendResetCode}
                      className="items-center py-4 bg-orange-500 rounded-xl"
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text className="text-lg font-bold text-white">Send Reset Code</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text className="mb-6 text-base text-center text-gray-600">
                      We've sent a reset code to your email. Check your inbox and follow the instructions below.
                    </Text>

                    {/* Instructions */}
                    <View className="p-4 mb-6 rounded-xl bg-orange-50">
                      <Text className="mb-3 font-semibold text-gray-700">What to do next:</Text>
                      <View className="flex-row mb-2">
                        <Text className="mr-2 text-orange-500">1.</Text>
                        <Text className="flex-1 text-gray-600">Check your email for the reset code</Text>
                      </View>
                      <View className="flex-row mb-2">
                        <Text className="mr-2 text-orange-500">2.</Text>
                        <Text className="flex-1 text-gray-600">Click "Reset Password" below</Text>
                      </View>
                      <View className="flex-row">
                        <Text className="mr-2 text-orange-500">3.</Text>
                        <Text className="flex-1 text-gray-600">Enter code and new password</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={handleGoToResetPassword}
                      className="items-center py-4 mb-4 bg-orange-500 rounded-xl"
                    >
                      <Text className="text-lg font-bold text-white">Reset Password</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleResendCode}
                      className="items-center py-3"
                      disabled={loading}
                    >
                      <Text className="font-semibold text-orange-500">
                        {loading ? 'Sending...' : "Didn't receive? Resend Code"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* Already have code option */}
              <View className="p-4 mb-4 border border-orange-200 rounded-xl bg-orange-50">
                <Text className="mb-2 text-sm text-center text-gray-600">
                  Already have a reset code?
                </Text>
                <TouchableOpacity 
                  onPress={handleGoToResetPassword}
                  className="flex-row items-center justify-center"
                >
                  <Ionicons name="key" size={16} color="#f97316" />
                  <Text className="ml-2 font-semibold text-orange-500">
                    Enter Reset Code
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Back to Login */}
              <View className="items-center mt-4">
                <TouchableOpacity onPress={() => router.push('/login')}>
                  <Text className="font-semibold text-orange-500">
                    Back to Login
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}