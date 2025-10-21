import React, { useState } from 'react';
import { 
  View, Text, TouchableOpacity, Modal, 
  TextInput, Alert, ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../../api';

const ReviewModal = ({ visible, onClose, productId, onReviewSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const ratingLabels = {
    1: 'Poor - Very dissatisfied',
    2: 'Fair - Somewhat dissatisfied', 
    3: 'Good - Satisfied',
    4: 'Very Good - Very satisfied',
    5: 'Excellent - Extremely satisfied'
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating to continue');
      return;
    }

    console.log('=== SUBMITTING REVIEW ===');
    console.log('Product ID:', productId);
    console.log('Rating:', rating);
    console.log('Comment:', comment.trim());
    console.log('API Base URL:', API.defaults?.baseURL);

    setSubmitting(true);
    try {
      // Test if we can reach the API
      console.log('Making API call to /reviews...');
      
      const reviewData = {
        productId: parseInt(productId), // Ensure it's a number
        rating: parseInt(rating),       // Ensure it's a number
        comment: comment.trim()
      };
      
      console.log('Sending review data:', reviewData);
      
      const response = await API.post('/reviews', reviewData);
      
      console.log('✅ Review submission SUCCESS!');
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      
      Alert.alert(
        'Success!', 
        'Thank you! Your review has been submitted successfully.',
        [{ text: 'OK', onPress: () => {
          setRating(0);
          setComment('');
          onClose();
          if (onReviewSubmitted) onReviewSubmitted();
        }}]
      );
    } catch (error) {
      console.error('❌ REVIEW SUBMISSION ERROR:');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      
      let errorMessage = 'Failed to submit review. Please try again.';
      
      if (error.response?.status === 401) {
        errorMessage = 'Please login to submit a review.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || 'Invalid review data.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View className="mb-4">
        <View className="flex-row justify-center mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              className="p-2 mx-1"
            >
              <Ionicons
                name={star <= rating ? "star" : "star-outline"}
                size={36}
                color={star <= rating ? "#FCD34D" : "#D1D5DB"}
              />
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 && (
          <Text className="mt-2 text-sm text-center text-gray-600">
            {ratingLabels[rating]}
          </Text>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="items-center justify-end flex-1 bg-black/50">
        <View className="w-full max-h-[80%] p-6 bg-white rounded-t-3xl">
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-2xl font-bold text-gray-900">Rate & Review</Text>
              <Text className="text-sm text-gray-500">Share your experience</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2">
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="mb-4 text-lg font-medium text-center text-gray-800">
              How would you rate this product?
            </Text>
            {renderStars()}

            <View className="mb-6">
              <Text className="mb-3 text-lg font-medium text-gray-800">
                Tell others about your experience
              </Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="What did you like or dislike? How was the quality? Any tips for other buyers?"
                multiline
                numberOfLines={5}
                className="p-4 text-gray-900 border border-gray-300 rounded-xl bg-gray-50"
                textAlignVertical="top"
                maxLength={500}
              />
              <Text className="mt-2 text-xs text-right text-gray-500">
                {comment.length}/500 characters
              </Text>
            </View>
          </ScrollView>

          <View className="flex-row pt-4 space-x-3 border-t border-gray-100">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 py-4 bg-gray-100 rounded-xl"
            >
              <Text className="font-semibold text-center text-gray-700">Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || rating === 0}
              className={`flex-1 py-4 rounded-xl ${
                submitting || rating === 0 ? 'bg-gray-300' : 'bg-purple-600'
              }`}
            >
              <Text className="font-semibold text-center text-white">
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ReviewItem = ({ review }) => {
  const renderStars = (rating) => {
    return (
      <View className="flex-row">
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={16}
            color={star <= rating ? "#FCD34D" : "#D1D5DB"}
          />
        ))}
      </View>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <View className="p-4 mb-3 bg-white border border-gray-100 shadow-sm rounded-xl">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <View className="items-center justify-center w-8 h-8 mr-2 bg-purple-100 rounded-full">
              <Text className="text-sm font-semibold text-purple-600">
                {review.user_name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <Text className="font-semibold text-gray-900">{review.user_name || 'Anonymous'}</Text>
          </View>
          <View className="flex-row items-center">
            {renderStars(review.rating)}
            <Text className="ml-2 text-sm text-gray-500">
              {formatDate(review.created_at)}
            </Text>
          </View>
        </View>
      </View>
      
      {review.comment && (
        <Text className="leading-5 text-gray-700">{review.comment}</Text>
      )}
    </View>
  );
};

const RatingStats = ({ ratingStats = {}, averageRating = 0, reviewCount = 0 }) => {
  const total = Object.values(ratingStats || {}).reduce((sum, count) => sum + count, 0);

  return (
    <View className="p-5 mb-4 bg-white border border-gray-100 shadow-sm rounded-xl">
      {/* Overall Rating */}
      <View className="flex-row items-center justify-center pb-4 mb-5 border-b border-gray-100">
        <View className="items-center mr-6">
          <Text className="mb-1 text-4xl font-bold text-gray-900">
            {parseFloat(averageRating).toFixed(1)}
          </Text>
          <View className="flex-row mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= Math.round(averageRating) ? "star" : "star-outline"}
                size={20}
                color={star <= Math.round(averageRating) ? "#FCD34D" : "#D1D5DB"}
              />
            ))}
          </View>
          <Text className="text-sm text-gray-600">Based on {reviewCount} reviews</Text>
        </View>
        
        {/* Rating Breakdown */}
        <View className="flex-1">
          {[5, 4, 3, 2, 1].map((rating) => (
            <View key={rating} className="flex-row items-center mb-2">
              <Text className="w-3 text-sm font-medium text-gray-600">{rating}</Text>
              <Ionicons name="star" size={12} color="#FCD34D" style={{ marginHorizontal: 6 }} />
              <View className="flex-1 h-2 mx-2 overflow-hidden bg-gray-200 rounded-full">
                <View
                  className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500"
                  style={{
                    width: total > 0 ? `${(ratingStats[rating] / total) * 100}%` : '0%'
                  }}
                />
              </View>
              <Text className="w-6 text-sm text-right text-gray-600">{ratingStats[rating] || 0}</Text>
            </View>
          ))}
        </View>
      </View>
      
      {/* Rating Summary */}
      {total > 0 && (
        <View className="flex-row justify-around">
          <View className="items-center">
            <Text className="text-lg font-bold text-green-600">
              {Math.round(((ratingStats[5] || 0) + (ratingStats[4] || 0)) / total * 100) || 0}%
            </Text>
            <Text className="text-xs text-gray-500">Positive</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-yellow-600">
              {Math.round((ratingStats[3] || 0) / total * 100) || 0}%
            </Text>
            <Text className="text-xs text-gray-500">Neutral</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-red-600">
              {Math.round(((ratingStats[2] || 0) + (ratingStats[1] || 0)) / total * 100) || 0}%
            </Text>
            <Text className="text-xs text-gray-500">Negative</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export { ReviewModal, ReviewItem, RatingStats };