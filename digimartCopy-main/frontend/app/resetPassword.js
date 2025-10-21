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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { authAPI } from '../api';

export default function resetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const emailFromParams = params.email || '';

  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const getPasswordStrength = () => {
    if (!newPassword) return { strength: '', color: '#666', width: '0%' };
    
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/\d/.test(newPassword)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) score++;

    switch (score) {
      case 0:
      case 1: 
        return { strength: 'Very Weak', color: '#ef4444', width: '20%' };
      case 2: 
        return { strength: 'Weak', color: '#f97316', width: '40%' };
      case 3: 
        return { strength: 'Fair', color: '#eab308', width: '60%' };
      case 4: 
        return { strength: 'Good', color: '#84cc16', width: '80%' };
      case 5: 
        return { strength: 'Strong', color: '#22c55e', width: '100%' };
      default: 
        return { strength: '', color: '#666', width: '0%' };
    }
  };

  const passwordStrength = getPasswordStrength();

  const validateForm = () => {
    if (!verificationCode.trim()) {
      Alert.alert('Missing Code', 'Please enter the reset code from your email');
      return false;
    }

    if (!newPassword) {
      Alert.alert('Missing Password', 'Please enter a new password');
      return false;
    }

    if (newPassword.length < 8) {
      Alert.alert('Password Too Short', 'Password must be at least 8 characters');
      return false;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      Alert.alert('Weak Password', 'Password must contain uppercase, lowercase, and numbers');
      return false;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const result = await authAPI.resetPassword(verificationCode.trim(), newPassword);
      
      if (result.success) {
        setResetSuccess(true);
        Alert.alert('Password Reset!', result.message || 'Your password has been updated successfully');
      } else {
        Alert.alert('Reset Failed', result.error || 'Invalid code or failed to reset password');
      }
    } catch (error) {
      Alert.alert('Error', error.error || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (resetSuccess) {
    return (
      <SafeAreaView className="flex-1 bg-green-400">
        <StatusBar style="light" />
        
        {/* Success Header */}
        <View className="px-5 py-6 bg-green-400 shadow-lg rounded-b-3xl">
          <View className="items-center">
            <View className="items-center justify-center w-20 h-20 mb-4 bg-white rounded-full bg-opacity-20">
              <Ionicons name="checkmark-circle" size={50} color="white" />
            </View>
            <Text className="text-2xl font-bold text-center text-white">
              Password Reset!
            </Text>
            <Text className="mt-2 text-center text-green-100">
              Your password has been updated
            </Text>
          </View>
        </View>

        {/* Success Content */}
        <View className="flex-1 bg-white">
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View className="justify-center flex-1 px-5 py-8">
              
              <View className="items-center mb-8">
                <Text className="mb-4 text-lg text-center text-gray-600">
                  Your password has been updated successfully. You can now login with your new password.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => router.replace('/login')}
                className="items-center py-4 mb-6 bg-green-500 rounded-xl"
              >
                <Text className="text-lg font-bold text-white">Continue to Login</Text>
              </TouchableOpacity>

              {/* Security Tips */}
              <View className="p-6 rounded-2xl bg-green-50">
                <Text className="mb-4 text-base font-bold text-green-700">Security Tips:</Text>
                <View className="flex-row mb-3">
                  <Ionicons name="shield-checkmark" size={20} color="#16a34a" />
                  <Text className="flex-1 ml-3 text-gray-600">
                    Keep your password secure and don't share it
                  </Text>
                </View>
                <View className="flex-row mb-3">
                  <Ionicons name="lock-closed" size={20} color="#16a34a" />
                  <Text className="flex-1 ml-3 text-gray-600">
                    Use a unique password for DigiMarket
                  </Text>
                </View>
                <View className="flex-row">
                  <Ionicons name="finger-print" size={20} color="#16a34a" />
                  <Text className="flex-1 ml-3 text-gray-600">
                    Consider enabling two-factor authentication
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

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
            <Ionicons name="lock-open" size={40} color="white" />
          </View>
          <Text className="text-2xl font-bold text-center text-white">
            Reset Password
          </Text>
          <Text className="mt-2 text-center text-orange-100">
            Create a new secure password
          </Text>
          {emailFromParams && (
            <Text className="mt-1 text-sm font-semibold text-white">
              For: {emailFromParams}
            </Text>
          )}
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
                <Text className="mb-6 text-base text-center text-gray-600">
                  Enter the verification code from your email and create a new password.
                </Text>
                
                {/* Verification Code */}
                <TextInput
                  className="p-4 mb-4 text-gray-900 border border-gray-200 bg-gray-50 rounded-xl"
                  placeholder="Enter verification code"
                  keyboardType="default"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                />
                
                {/* New Password */}
                <View className="flex-row items-center p-4 mb-2 text-gray-900 border border-gray-200 bg-gray-50 rounded-xl">
                  <TextInput
                    className="flex-1"
                    placeholder="New Password"
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Ionicons 
                      name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                      size={22} 
                      color="#6B7280" 
                    />
                  </TouchableOpacity>
                </View>

                {/* Password Strength */}
                {newPassword.length > 0 && (
                  <View className="px-2 mb-4">
                    <View className="h-2 mb-1 overflow-hidden bg-gray-200 rounded-full">
                      <View 
                        style={{ 
                          width: passwordStrength.width, 
                          backgroundColor: passwordStrength.color,
                          height: '100%'
                        }} 
                      />
                    </View>
                    <Text style={{ color: passwordStrength.color, fontSize: 12, textAlign: 'right', fontWeight: '600' }}>
                      {passwordStrength.strength}
                    </Text>
                  </View>
                )}
                
                {/* Confirm Password */}
                <View className="flex-row items-center p-4 mb-4 text-gray-900 border border-gray-200 bg-gray-50 rounded-xl">
                  <TextInput
                    className="flex-1"
                    placeholder="Confirm New Password"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons 
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                      size={22} 
                      color="#6B7280" 
                    />
                  </TouchableOpacity>
                </View>

                {/* Password Requirements */}
                <View className="p-4 mb-6 rounded-xl bg-gray-50">
                  <Text className="mb-3 font-semibold text-gray-700">Password Requirements:</Text>
                  <View className="flex-row items-center mb-2">
                    <Ionicons 
                      name={newPassword.length >= 8 ? "checkmark-circle" : "ellipse-outline"} 
                      size={16} 
                      color={newPassword.length >= 8 ? "#22c55e" : "#9ca3af"} 
                    />
                    <Text className={`ml-2 text-sm ${newPassword.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                      At least 8 characters
                    </Text>
                  </View>
                  <View className="flex-row items-center mb-2">
                    <Ionicons 
                      name={/[A-Z]/.test(newPassword) ? "checkmark-circle" : "ellipse-outline"} 
                      size={16} 
                      color={/[A-Z]/.test(newPassword) ? "#22c55e" : "#9ca3af"} 
                    />
                    <Text className={`ml-2 text-sm ${/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}`}>
                      One uppercase letter
                    </Text>
                  </View>
                  <View className="flex-row items-center mb-2">
                    <Ionicons 
                      name={/[a-z]/.test(newPassword) ? "checkmark-circle" : "ellipse-outline"} 
                      size={16} 
                      color={/[a-z]/.test(newPassword) ? "#22c55e" : "#9ca3af"} 
                    />
                    <Text className={`ml-2 text-sm ${/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}`}>
                      One lowercase letter
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons 
                      name={/\d/.test(newPassword) ? "checkmark-circle" : "ellipse-outline"} 
                      size={16} 
                      color={/\d/.test(newPassword) ? "#22c55e" : "#9ca3af"} 
                    />
                    <Text className={`ml-2 text-sm ${/\d/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}`}>
                      One number
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  onPress={handleResetPassword}
                  className="items-center py-4 bg-orange-500 rounded-xl"
                  disabled={loading || !verificationCode.trim() || !newPassword || !confirmPassword}
                  style={{ opacity: (loading || !verificationCode.trim() || !newPassword || !confirmPassword) ? 0.5 : 1 }}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-lg font-bold text-white">Reset Password</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Back to Login */}
              <View className="items-center mt-1">
                <TouchableOpacity onPress={() => router.replace('/login')}>
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