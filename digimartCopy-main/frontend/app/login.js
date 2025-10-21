import React, { useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, SafeAreaView, Pressable, ActivityIndicator, Alert,
  ScrollView
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Handle login with backend API
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      const response = await login(email, password);

      Alert.alert("Success", "Logged in successfully!");

      // Navigate based on role
      switch(response.user.role) {
        case "admin":
          router.replace("/admin/adminDashboard");
          break;
        case "seller":
          router.replace("/sellerCenter");
          break;
        case "customer":
          router.replace("/customer/customerDashboard");
          break;
        case "investor":
          router.replace("/invester/investorDashboard");
          break;
        case "affiliate":
          router.replace("/affiliate/affiliateDashboard");
          break;
        default:
          router.replace("/");
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Login Failed", error.response?.data?.error || error.error || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <SafeAreaView className="flex-1 bg-orange-400">
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-5 py-6 bg-orange-400 shadow-lg rounded-b-3xl">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </Pressable>
          <View style={{ width: 28 }} />
        </View>

        <View className="items-center">
          <View className="items-center justify-center w-20 h-20 mb-4 bg-white rounded-full bg-opacity-20">
            <Ionicons name="log-in" size={40} color="white" />
          </View>
          <Text className="text-2xl font-bold text-center text-white">Welcome Back</Text>
          <Text className="mt-2 text-center text-orange-100">Sign in to continue</Text>
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

              {/* Login Form Card */}
              <View className="p-6 mb-6 bg-white shadow rounded-2xl">
                <Text className="mb-6 text-xl font-bold text-center text-gray-900">Login</Text>

                <TextInput
                  className="p-4 mb-4 text-gray-900 border border-gray-200 bg-gray-50 rounded-xl"
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
                
                <View className="flex-row items-center p-1 mb-3 text-gray-900 border border-gray-200 bg-gray-50 rounded-xl">
                  <TextInput
                    className="flex-1 p-3"
                    placeholder="Password"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={togglePasswordVisibility} className="p-2">
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={22} 
                      color="#6B7280" 
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  onPress={() => router.push("/fogetPassword")} 
                  className="items-end mb-6"
                >
                  <Text className="text-sm font-medium text-orange-500">Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleLogin}
                  className="items-center py-3 bg-orange-500 rounded-xl"
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-lg font-bold text-white">Login</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Register Link */}
              <View className="p-4 bg-white shadow rounded-2xl">
                <TouchableOpacity onPress={() => router.push("/register")} className="items-center py-4">
                  <Text className="text-base text-gray-600">
                    Don&#39;t have an account?{' '}
                    <Text className="font-bold text-orange-500">Register Here</Text>
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
