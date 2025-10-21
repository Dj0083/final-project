import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Pressable,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import API from '../api';
import { useAuth } from '../context/AuthContext';

export default function AddProduct() {
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Handicraft');
  const [price, setPrice] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [image, setImage] = useState(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();

  const categories = ['Tea', 'Handloom', 'Ceramics', 'Jewelry', 'Spices', 'Handicraft'];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your photos to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!productName.trim() || !description.trim() || !price.trim() || !stockQty.trim() || !image) {
      Alert.alert('Missing Information', 'Please fill in all required fields and select an image');
      return;
    }

    // Validate price and stock quantity
    const priceValue = parseFloat(price);
    const stockValue = parseInt(stockQty);

    if (isNaN(priceValue) || priceValue <= 0) {
      Alert.alert('Invalid Price', 'Price must be a valid number greater than 0');
      return;
    }

    if (isNaN(stockValue) || stockValue < 5) {
      Alert.alert('Invalid Stock Quantity', 'Stock quantity must be at least 5');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('productName', productName);
      data.append('description', description);
      data.append('category', category);
      data.append('price', parseFloat(price));
      data.append('stockQty', parseInt(stockQty));

      // For single image upload - use 'image' as field name to match backend
      const filename = image.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      data.append('image', {
        uri: image,
        name: filename,
        type
      });

      // eslint-disable-next-line no-unused-vars
      const response = await API.post('/products/add-product', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`,
        },
      });

      Alert.alert('Success', 'Product added successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error('Add product error:', err.response?.data || err.message);
      Alert.alert('Error', err.response?.data?.error || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Continue Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-orange-400">
      {/* Header */}
      <View className="px-5 py-4 bg-orange-400 shadow-md rounded-b-3xl">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={handleCancel}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </Pressable>
          <Text className="absolute left-0 right-0 text-xl font-bold text-center text-white">
            Add Product
          </Text>
          <View style={{ width: 28 }} />
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 bg-white">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 20 }}>
          
          {/* Image Upload */}
          <View className="p-4 mx-5 mb-4 bg-white shadow rounded-2xl">
            <Text className="mb-3 text-base font-semibold text-gray-900">Product Image *</Text>
            <TouchableOpacity
              className="items-center justify-center p-8 mb-4 border-2 border-gray-300 border-dashed rounded-xl"
              onPress={pickImage}
            >
              <View className="items-center justify-center w-16 h-16 mb-2 bg-gray-200 rounded-full">
                <Ionicons name="camera" size={32} color="#666" />
              </View>
              <Text className="text-sm font-medium text-gray-600">
                {image ? 'Image Selected' : 'Tap to Upload Image'}
              </Text>
            </TouchableOpacity>
            {image && (
              <Image source={{ uri: image }} className="self-center w-32 h-32 rounded-lg" resizeMode="cover" />
            )}
          </View>

          {/* Product Name */}
          <View className="p-4 mx-5 mb-4 bg-white shadow rounded-2xl">
            <Text className="mb-3 text-base font-semibold text-gray-900">Product Name *</Text>
            <TextInput
              className="p-4 text-gray-900 border border-gray-200 bg-gray-50 rounded-xl"
              placeholder="Enter product name"
              value={productName}
              onChangeText={setProductName}
            />
          </View>

          {/* Description */}
          <View className="p-4 mx-5 mb-4 bg-white shadow rounded-2xl">
            <Text className="mb-3 text-base font-semibold text-gray-900">Description *</Text>
            <TextInput
              className="h-24 p-4 text-gray-900 border border-gray-200 bg-gray-50 rounded-xl"
              placeholder="Enter product description"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Category */}
          <View className="p-4 mx-5 mb-4 bg-white shadow rounded-2xl">
            <Text className="mb-3 text-base font-semibold text-gray-900">Category *</Text>
            <TouchableOpacity
              className="flex-row items-center justify-between p-4 border border-gray-200 bg-gray-50 rounded-xl"
              onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              <Text className="text-gray-900">{category}</Text>
              <Ionicons name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
            </TouchableOpacity>

            {showCategoryDropdown && (
              <View className="mt-2 overflow-hidden bg-white border border-gray-200 rounded-xl">
                {categories.map((cat, index) => (
                  <TouchableOpacity
                    key={index}
                    className={`p-4 ${index !== categories.length - 1 ? 'border-b border-gray-200' : ''}`}
                    onPress={() => {
                      setCategory(cat);
                      setShowCategoryDropdown(false);
                    }}
                  >
                    <Text className="text-gray-900">{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Price */}
          <View className="p-4 mx-5 mb-4 bg-white shadow rounded-2xl">
            <Text className="mb-3 text-base font-semibold text-gray-900">Price (LKR) *</Text>
            <TextInput
              className="p-4 text-gray-900 border border-gray-200 bg-gray-50 rounded-xl"
              placeholder="Enter price (minimum Rs. 1.00)"
              value={price}
              onChangeText={(text) => {
                // Allow only positive numbers with decimal
                const numericValue = text.replace(/[^0-9.]/g, '');
                // Prevent multiple decimal points
                const parts = numericValue.split('.');
                if (parts.length > 2) {
                  return;
                }
                // Limit decimal places to 2
                if (parts[1] && parts[1].length > 2) {
                  return;
                }
                setPrice(numericValue);
              }}
              keyboardType="decimal-pad"
            />
            {price && parseFloat(price) <= 0 && (
              <Text className="mt-2 text-sm text-red-500">
                Price must be greater than Rs. 0.00
              </Text>
            )}
          </View>

          {/* Stock Quantity */}
          <View className="p-4 mx-5 mb-6 bg-white shadow rounded-2xl">
            <Text className="mb-3 text-base font-semibold text-gray-900">Stock Quantity *</Text>
            <TextInput
              className="p-4 text-gray-900 border border-gray-200 bg-gray-50 rounded-xl"
              placeholder="Enter quantity (minimum 5)"
              value={stockQty}
              onChangeText={(text) => {
                // Allow only positive integers
                const numericValue = text.replace(/[^0-9]/g, '');
                setStockQty(numericValue);
              }}
              keyboardType="numeric"
            />
            {stockQty && parseInt(stockQty) < 5 && parseInt(stockQty) > 0 && (
              <Text className="mt-2 text-sm text-red-500">
                Stock quantity must be at least 5 items
              </Text>
            )}
            {stockQty && parseInt(stockQty) === 0 && (
              <Text className="mt-2 text-sm text-red-500">
                Stock quantity must be greater than 0
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View className="flex-row justify-between mx-5">
            <TouchableOpacity 
              className="flex-1 p-4 mr-2 bg-gray-200 rounded-xl" 
              onPress={handleCancel}
              disabled={loading}
            >
              <Text className="text-base font-medium text-center text-gray-700">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="flex-1 p-4 ml-2 bg-orange-500 rounded-xl" 
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-base font-medium text-center text-white">Save Product</Text>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}