import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Entypo, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { authAPI, storeToken } from '../api';

// Roles
const roles = [
  { 
    name: "Seller", 
    icon: "storefront-outline",
    description: "Sell products on our platform" 
  },
  { 
    name: "Customer", 
    icon: "person-outline",
    description: "Shop and purchase items" 
  },
  { 
    name: "Investor", 
    icon: "trending-up-outline",
    description: "Invest in businesses" 
  },
  { 
    name: "Affiliate", 
    icon: "share-social-outline",
    description: "Promote and earn commissions" 
  }
];

// Affiliate types
const affiliateTypes = [
  "Instagram Influencer",
  "YouTube Creator",
  "TikTok Creator",
  "Blogger / Website Owner",
  "Podcaster",
  "Facebook Content Creator",
  "Email Newsletter Publisher"
];

export default function Register() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConditions, setShowConditions] = useState({ role: null, visible: false });
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    // Seller fields
    businessName: '',
    businessAddress: '',
    idNumber: '',
    bankAccount: '',
    businessImage: null,
    idImage: null,
    bankProofImage: null,
    // Investor fields
    investorAgree: false,
    // Affiliate fields
    websiteUrl: '',
    affiliateType: '',
    affiliateAgree: false,
  });

  const pickImage = async (field) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your photos to upload images.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData((prev) => ({ ...prev, [field]: result.assets[0].uri }));
    }
  };

  const toggleRole = (role) => {
    setSelectedRole(role === selectedRole ? null : role);
  };

  const validateBasicInfo = () => {
    if (!formData.name.trim()) {
      Alert.alert('Missing Information', 'Please enter your full name.');
      return false;
    }
    
    if (!formData.email.trim() || !formData.email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }
    
    if (!formData.password || formData.password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return false;
    }
    
    return true;
  };

  const validateRoleSpecificInfo = () => {
    if (selectedRole === "Seller") {
      if (!formData.businessName.trim()) {
        Alert.alert('Missing Information', 'Please enter your business name.');
        return false;
      }
    }
    
    if (selectedRole === "Affiliate") {
      if (!formData.affiliateType) {
        Alert.alert('Missing Information', 'Please select your affiliate type.');
        return false;
      }
      if (!formData.affiliateAgree) {
        Alert.alert('Agreement Required', 'You must agree to the affiliate terms.');
        return false;
      }
    }
    
    if (selectedRole === "Investor" && !formData.investorAgree) {
      Alert.alert('Agreement Required', 'You must agree to the investor terms.');
      return false;
    }
    
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateBasicInfo()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && !selectedRole) {
      Alert.alert('Role Required', 'Please select a role to continue.');
    } else if (currentStep === 2 && selectedRole) {
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    if (!validateRoleSpecificInfo()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare data for API call
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        address: formData.address,
        role: selectedRole.toLowerCase(),
      };

      // Add role-specific data
      if (selectedRole === "Seller") {
        userData.businessName = formData.businessName;
        userData.businessAddress = formData.businessAddress;
        userData.idNumber = formData.idNumber;
        userData.bankAccount = formData.bankAccount;
        userData.businessImage = formData.businessImage;
        userData.idImage = formData.idImage;
        userData.bankProofImage = formData.bankProofImage;
      } else if (selectedRole === "Affiliate") {
        userData.websiteUrl = formData.websiteUrl;
        userData.affiliateType = formData.affiliateType;
        userData.agreedToTerms = formData.affiliateAgree;
      } else if (selectedRole === "Investor") {
        userData.agreedToTerms = formData.investorAgree;
        userData.bankProofImage = formData.bankProofImage;
      }

      const response = await authAPI.register(userData);
      
      // Store token
      await storeToken(response.token);
      
      setShowSuccess(true);
      
    } catch (error) {
      Alert.alert('Registration Failed', error.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View className="flex-row justify-center mb-6">
      {[1, 2, 3].map((step) => (
        <View key={step} className="flex-row items-center">
          <View 
            className={`w-8 h-8 rounded-full justify-center items-center ${
              currentStep === step ? 'bg-orange-400' : 
              currentStep > step ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            {currentStep > step ? (
              <Ionicons name="checkmark" size={16} color="white" />
            ) : (
              <Text className={`font-medium ${currentStep === step ? 'text-white' : 'text-gray-600'}`}>
                {step}
              </Text>
            )}
          </View>
          {step < 3 && (
            <View className={`h-1 w-10 ${currentStep > step ? 'bg-green-500' : 'bg-gray-300'}`} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStepTitle = () => {
    const titles = {
      1: "Basic Information",
      2: "Select Your Role",
      3: `${selectedRole} Information`
    };
    
    return (
      <Text className="mb-4 text-xl font-bold text-center text-gray-800">
        {titles[currentStep]}
      </Text>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-5 pt-10 pb-4 bg-orange-400">
        <TouchableOpacity onPress={handlePrevStep}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-center text-white">
          {currentStep === 1 ? "Create Account" : `Step ${currentStep} of 3`}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={110}
      >
        <ScrollView contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: 16 }}>
          {renderStepIndicator()}
          {renderStepTitle()}

          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <View className="p-5 mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
              {/* Name Field */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-gray-700">Full Name *</Text>
                <View className="flex-row items-center p-4 bg-white border border-gray-300 rounded-xl">
                  <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-3 text-base"
                    placeholder="John Doe"
                    value={formData.name}
                    onChangeText={(t) => setFormData({ ...formData, name: t })}
                  />
                </View>
              </View>

              {/* Email Field */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-gray-700">Email *</Text>
                <View className="flex-row items-center p-4 bg-white border border-gray-300 rounded-xl">
                  <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-3 text-base"
                    placeholder="your@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formData.email}
                    onChangeText={(t) => setFormData({ ...formData, email: t })}
                  />
                </View>
              </View>

              {/* Password Field */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-gray-700">Password *</Text>
                <View className="flex-row items-center p-4 bg-white border border-gray-300 rounded-xl">
                  <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-3 text-base"
                    placeholder="At least 6 characters"
                    secureTextEntry
                    value={formData.password}
                    onChangeText={(t) => setFormData({ ...formData, password: t })}
                  />
                </View>
                <Text className="mt-1 text-xs text-gray-500">Must be at least 6 characters</Text>
              </View>

              {/* Phone Field */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-gray-700">Phone Number</Text>
                <View className="flex-row items-center p-4 bg-white border border-gray-300 rounded-xl">
                  <Ionicons name="call-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-3 text-base"
                    placeholder="(123) 456-7890"
                    keyboardType="phone-pad"
                    value={formData.phone}
                    onChangeText={(t) => setFormData({ ...formData, phone: t })}
                  />
                </View>
              </View>

              {/* Address Field */}
              <View className="mb-2">
                <Text className="mb-2 text-sm font-medium text-gray-700">Address</Text>
                <View className="flex-row items-center p-4 bg-white border border-gray-300 rounded-xl">
                  <Ionicons name="location-outline" size={20} color="#9CA3AF" />
                  <TextInput
                    className="flex-1 ml-3 text-base"
                    placeholder="Your address"
                    value={formData.address}
                    onChangeText={(t) => setFormData({ ...formData, address: t })}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Step 2: Role Selection */}
          {currentStep === 2 && (
            <View className="mb-4">
              <Text className="mb-4 text-base text-center text-gray-600">
                Select how you&apos;d like to use our platform
              </Text>
              
              <View className="flex-row flex-wrap justify-between">
                {roles.map((role) => (
                  <TouchableOpacity
                    key={role.name}
                    onPress={() => toggleRole(role.name)}
                    className={`w-[48%] p-4 mb-4 rounded-2xl flex-col items-center justify-center ${
                      selectedRole === role.name 
                        ? "bg-orange-100 border-2 border-orange-400" 
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <Ionicons 
                      name={role.icon} 
                      size={32} 
                      color={selectedRole === role.name ? "#F97316" : "#6B7280"} 
                    />
                    <Text className={`mt-2 font-semibold text-center ${selectedRole === role.name ? "text-orange-400" : "text-gray-800"}`}>
                      {role.name}
                    </Text>
                    <Text className="mt-1 text-xs text-center text-gray-500">
                      {role.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Step 3: Role-Specific Information */}
          {currentStep === 3 && (
            <>
              {/* Seller Section */}
              {selectedRole === "Seller" && (
                <View className="p-5 mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
                  <Text className="mb-4 text-lg font-semibold text-gray-900">Seller Information</Text>
                  
                  {/* Business Name */}
                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-medium text-gray-700">Business Name *</Text>
                    <View className="flex-row items-center p-4 bg-white border border-gray-300 rounded-xl">
                      <Ionicons name="business-outline" size={20} color="#9CA3AF" />
                      <TextInput
                        className="flex-1 ml-3 text-base"
                        placeholder="Your business name"
                        value={formData.businessName}
                        onChangeText={(t) => setFormData({ ...formData, businessName: t })}
                      />
                    </View>
                  </View>

                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-medium text-gray-700">Business Image</Text>
                    <TouchableOpacity
                      className="items-center justify-center p-6 mb-3 border-2 border-gray-300 border-dashed rounded-xl bg-gray-50"
                      onPress={() => pickImage('businessImage')}
                    >
                      {formData.businessImage ? (
                        <View className="items-center">
                          <Image source={{ uri: formData.businessImage }} className="w-20 h-20 mb-2 rounded-lg" />
                          <Text className="text-sm text-orange-400">Change Image</Text>
                        </View>
                      ) : (
                        <>
                          <Entypo name="upload" size={28} color="gray" />
                          <Text className="mt-2 text-sm text-gray-500">Tap to upload</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Business Address */}
                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-medium text-gray-700">Business Address</Text>
                    <View className="flex-row items-center p-4 bg-white border border-gray-300 rounded-xl">
                      <Ionicons name="location-outline" size={20} color="#9CA3AF" />
                      <TextInput
                        className="flex-1 ml-3 text-base"
                        placeholder="Business location"
                        value={formData.businessAddress}
                        onChangeText={(t) => setFormData({ ...formData, businessAddress: t })}
                      />
                    </View>
                  </View>

                  {/* ID Number */}
                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-medium text-gray-700">ID Number</Text>
                    <View className="flex-row items-center p-4 bg-white border border-gray-300 rounded-xl">
                      <FontAwesome name="id-card-o" size={20} color="#9CA3AF" />
                      <TextInput
                        className="flex-1 ml-3 text-base"
                        placeholder="Your ID number"
                        value={formData.idNumber}
                        onChangeText={(t) => setFormData({ ...formData, idNumber: t })}
                      />
                    </View>
                  </View>

                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-medium text-gray-700">ID Image</Text>
                    <TouchableOpacity
                      className="items-center justify-center p-6 mb-3 border-2 border-gray-300 border-dashed rounded-xl bg-gray-50"
                      onPress={() => pickImage('idImage')}
                    >
                      {formData.idImage ? (
                        <View className="items-center">
                          <Image source={{ uri: formData.idImage }} className="w-20 h-20 mb-2 rounded-lg" />
                          <Text className="text-sm text-orange-400">Change Image</Text>
                        </View>
                      ) : (
                        <>
                          <FontAwesome name="id-card" size={28} color="gray" />
                          <Text className="mt-2 text-sm text-gray-500">Tap to upload ID</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Bank Account */}
                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-medium text-gray-700">Bank Account Number</Text>
                    <View className="flex-row items-center p-4 bg-white border border-gray-300 rounded-xl">
                      <FontAwesome name="bank" size={20} color="#9CA3AF" />
                      <TextInput
                        className="flex-1 ml-3 text-base"
                        placeholder="Account number"
                        keyboardType="numeric"
                        value={formData.bankAccount}
                        onChangeText={(t) => setFormData({ ...formData, bankAccount: t })}
                      />
                    </View>
                  </View>

                  <View className="mb-2">
                    <Text className="mb-2 text-sm font-medium text-gray-700">Bank Proof</Text>
                    <TouchableOpacity
                      className="items-center justify-center p-6 border-2 border-gray-300 border-dashed rounded-xl bg-gray-50"
                      onPress={() => pickImage('bankProofImage')}
                    >
                      {formData.bankProofImage ? (
                        <View className="items-center">
                          <Image source={{ uri: formData.bankProofImage }} className="w-20 h-20 mb-2 rounded-lg" />
                          <Text className="text-sm text-orange-400">Change Image</Text>
                        </View>
                      ) : (
                        <>
                          <FontAwesome name="bank" size={28} color="gray" />
                          <Text className="mt-2 text-sm text-gray-500">Tap to upload proof</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Affiliate Section */}
              {selectedRole === "Affiliate" && (
                <View className="p-5 mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
                  <Text className="mb-4 text-lg font-semibold text-gray-900">Affiliate Information</Text>
                  
                  {/* Website URL */}
                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-medium text-gray-700">Website / Social Media URL</Text>
                    <View className="flex-row items-center p-4 bg-white border border-gray-300 rounded-xl">
                      <Ionicons name="globe-outline" size={20} color="#9CA3AF" />
                      <TextInput
                        className="flex-1 ml-3 text-base"
                        placeholder="https://example.com"
                        value={formData.websiteUrl}
                        onChangeText={(t) => setFormData({ ...formData, websiteUrl: t })}
                      />
                    </View>
                  </View>

                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-medium text-gray-700">Affiliate Type *</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false} 
                      className="mb-3"
                      contentContainerStyle={{ paddingRight: 20 }}
                    >
                      {affiliateTypes.map((type) => (
                        <TouchableOpacity
                          key={type}
                          onPress={() => setFormData({ ...formData, affiliateType: type })}
                          className={`px-4 py-3 mr-3 rounded-xl flex-row items-center ${
                            formData.affiliateType === type 
                              ? "bg-orange-400" 
                              : "bg-gray-100 border border-gray-200"
                          }`}
                        >
                          <Ionicons 
                            name={
                              type.includes('Instagram') ? 'logo-instagram' :
                              type.includes('YouTube') ? 'logo-youtube' :
                              type.includes('TikTok') ? 'musical-notes-outline' :
                              type.includes('Blogger') ? 'document-text-outline' :
                              type.includes('Podcaster') ? 'mic-outline' :
                              type.includes('Facebook') ? 'logo-facebook' :
                              'mail-outline'
                            } 
                            size={16} 
                            color={formData.affiliateType === type ? "white" : "#6B7280"} 
                          />
                          <Text className={`text-sm ml-2 ${formData.affiliateType === type ? "text-white" : "text-gray-800"}`}>
                            {type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View className="flex-row items-center p-4 bg-orange-50 rounded-xl">
                    <TouchableOpacity
                      onPress={() => setFormData({ ...formData, affiliateAgree: !formData.affiliateAgree })}
                      className={`w-6 h-6 mr-3 rounded border ${
                        formData.affiliateAgree ? "bg-orange-400 border-orange-400" : "border-gray-400"
                      }`}
                    >
                      {formData.affiliateAgree && (
                        <FontAwesome name="check" size={12} color="white" style={{ alignSelf: 'center', marginTop: 2 }} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowConditions({ role: "Affiliate", visible: true })}>
                      <Text className="text-sm">
                        I agree to the{' '}
                        <Text className="font-semibold text-orange-400">Affiliate Terms & Conditions</Text>
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Investor Section */}
              {selectedRole === "Investor" && (
                <View className="p-5 mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
                  <Text className="mb-4 text-lg font-semibold text-gray-900">Investor Information</Text>
                  
                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-medium text-gray-700">Bank Proof</Text>
                    <TouchableOpacity
                      className="items-center justify-center p-6 border-2 border-gray-300 border-dashed rounded-xl bg-gray-50"
                      onPress={() => pickImage('bankProofImage')}
                    >
                      {formData.bankProofImage ? (
                        <View className="items-center">
                          <Image source={{ uri: formData.bankProofImage }} className="w-20 h-20 mb-2 rounded-lg" />
                          <Text className="text-sm text-orange-400">Change Image</Text>
                        </View>
                      ) : (
                        <>
                          <FontAwesome name="bank" size={28} color="gray" />
                          <Text className="mt-2 text-sm text-gray-500">Tap to upload bank proof</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row items-center p-4 bg-orange-50 rounded-xl">
                    <TouchableOpacity
                      onPress={() => setFormData({ ...formData, investorAgree: !formData.investorAgree })}
                      className={`w-6 h-6 mr-3 rounded border ${
                        formData.investorAgree ? "bg-orange-400 border-orange-400" : "border-gray-400"
                      }`}
                    >
                      {formData.investorAgree && (
                        <FontAwesome name="check" size={12} color="white" style={{ alignSelf: 'center', marginTop: 2 }} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowConditions({ role: "Investor", visible: true })}>
                      <Text className="text-sm">
                        I agree to the{' '}
                        <Text className="font-semibold text-orange-400">Investor Terms & Conditions</Text>
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Customer Section */}
              {selectedRole === "Customer" && (
                <View className="p-5 mb-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
                  <View className="flex-row items-center mb-4">
                    <Ionicons name="checkmark-circle-outline" size={24} color="#10B981" />
                    <Text className="ml-3 text-lg font-semibold text-gray-900">Customer Information</Text>
                  </View>
                  <Text className="text-gray-600">
                    No additional information required for customer registration. You can start shopping right away!
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Navigation Buttons */}
          {!showSuccess ? (
            <View className="flex-row justify-between mt-4">
              <TouchableOpacity
                className="flex-row items-center justify-center px-6 py-4 bg-gray-200 rounded-xl"
                onPress={handlePrevStep}
              >
                <Ionicons name="arrow-back" size={20} color="#6B7280" />
                <Text className="ml-2 text-base font-medium text-gray-700">
                  {currentStep === 1 ? 'Cancel' : 'Back'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center justify-center px-6 py-4 bg-orange-400 rounded-xl"
                onPress={currentStep < 3 ? handleNextStep : handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text className="mr-2 text-base font-medium text-white">
                      {currentStep < 3 ? 'Continue' : 'Complete Registration'}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View className="items-center justify-center p-5 mt-4 bg-green-50 rounded-2xl">
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              <Text className="my-3 text-xl font-bold text-green-800">Successfully Registered!</Text>
              <Text className="mb-4 text-center text-gray-600">
                Your {selectedRole?.toLowerCase()} account has been created successfully.
              </Text>
              <TouchableOpacity 
                className="flex-row items-center justify-center w-full px-6 py-4 bg-green-500 rounded-xl"
                onPress={() => router.push('/login')}
              >
                <Text className="mr-2 text-base font-medium text-white">Continue to Login</Text>
                <MaterialIcons name="arrow-forward" size={20} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal for Terms & Conditions */}
      <Modal visible={showConditions.visible} transparent animationType="slide">
        <View className="justify-center flex-1 px-6 bg-black/60">
          <View className="p-6 bg-white rounded-2xl">
            <View className="flex-row items-center mb-4">
              <Ionicons name="document-text-outline" size={24} color="#F97316" />
              <Text className="ml-3 text-xl font-bold">{showConditions.role} Terms & Conditions</Text>
            </View>
            <ScrollView className="mb-6 max-h-60">
              <Text className="text-gray-700">
                {showConditions.role === "Affiliate"
                  ? "Affiliate terms: You must follow brand guidelines, disclose partnerships, maintain professional standards, not engage in spammy practices, and comply with all applicable advertising laws and regulations. Commission rates and payment terms will be provided separately upon approval."
                  : "Investor terms: You acknowledge investment risks, agree to provide truthful financial information, understand that investments may lose value, comply with all financial regulations, and confirm you meet minimum investment requirements. All investment decisions are at your own risk."}
              </Text>
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowConditions({ role: null, visible: false })}
              className="flex-row items-center justify-center p-4 bg-orange-400 rounded-xl"
            >
              <Ionicons name="close-outline" size={20} color="white" />
              <Text className="ml-2 text-base font-medium text-white">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}