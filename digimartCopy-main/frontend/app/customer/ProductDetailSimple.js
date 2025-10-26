import React, { useEffect, useState } from 'react';
import { 
  View, Text, Image, TouchableOpacity, 
  ScrollView, SafeAreaView, Dimensions, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../../api';
import { ReviewModal, ReviewItem, RatingStats } from './ReviewComponents';
import * as Clipboard from 'expo-clipboard';
import { api, API_BASE } from '../../config/api';

// eslint-disable-next-line no-unused-vars
const { width } = Dimensions.get('window');

export default function ProductDetailSimple() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [ratingStats, setRatingStats] = useState({});
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState('');

  useEffect(() => {
    // Capture affiliate code and record click when accessed via ?aff=
    const maybeTrackAffiliate = async () => {
      try {
        const aff = params?.aff;
        const pid = params?.productId;
        if (aff && pid) {
          await AsyncStorage.setItem('affiliate_code', String(aff));
          await api.get(`/api/track/click/${encodeURIComponent(pid)}`, { params: { ref: aff } });
        }
      } catch (e) {}
    };
    maybeTrackAffiliate();
  }, [params?.aff, params?.productId]);
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        console.log('Fetching product:', params.productId);
        const res = await API.get(`/products/${params.productId}`);
        console.log('Product response:', res.data);
        
        const data = res.data.product;

        if (!data) {
          Alert.alert('Error', 'Product not found');
          return;
        }

        setProduct({
          id: data.id,
          name: data.productName,
          price: Number(data.price),
          category: data.category,
          rating: data.average_rating || 0,
          image: data.images && data.images.length > 0 ? `http://192.168.43.219:5000${data.images[0].path}` : 'https://via.placeholder.com/300x300',
          description: data.description,
          stock: Number(data.stockQty),
          sellerName: data.sellerName,
          reviewCount: data.review_count || 0
        });
        
        console.log('Product set successfully');

        // Fetch reviews and rating stats (non-blocking, after product loads)
        setTimeout(async () => {
          try {
            await fetchReviews(params.productId);
          } catch (error) {
            console.log('Reviews not available:', error.message);
          }
          
          try {
            await checkReviewEligibility(params.productId);
          } catch (error) {
            console.log('Review eligibility check failed:', error.message);
          }

          try {
            await checkFavoriteStatus(params.productId);
          } catch (error) {
            console.log('Favorite status check failed:', error.message);
          }
        }, 500);
      } catch (error) {
        console.error('Error fetching product:', error);
        Alert.alert('Error', `Failed to fetch product: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params.productId]);

  useEffect(() => {
    const fetchAffiliateCode = async () => {
      try {
        const res = await api.get('/api/affiliate/my-code');
        const code = res?.data?.affiliate_code;
        if (code) setAffiliateCode(code);
      } catch (e) {
        setAffiliateCode('');
      }
    };
    fetchAffiliateCode();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="items-center justify-center flex-1 bg-white">
        <Text className="text-lg text-gray-700">Loading product...</Text>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView className="items-center justify-center flex-1 bg-white">
        <Text className="text-lg text-red-600">Product not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="px-4 py-2 mt-4 bg-purple-600 rounded-lg">
          <Text className="text-white">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const incrementQuantity = () => {
    if (quantity < product.stock) setQuantity(quantity + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const fetchReviews = async (productId) => {
    try {
      setReviewsLoading(true);
      console.log('Fetching reviews for product:', productId);
      
      const response = await API.get(`/reviews/product/${productId}`);
      console.log('Review response:', response.data);
      
      const data = response.data.data || response.data;
      
      console.log('Rating stats received:', data.ratingStats);
      console.log('Average rating received:', data.averageRating);
      console.log('Total reviews received:', data.totalReviews);
      
      setReviews(data.reviews || []);
      setRatingStats(data.ratingStats || {});
      setAverageRating(data.averageRating || 0);
      setReviewCount(data.totalReviews || 0);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      console.error('Error details:', error.response?.data);
      // Set default values if reviews fetch fails
      setReviews([]);
      setRatingStats({});
      setAverageRating(0);
      setReviewCount(0);
    } finally {
      setReviewsLoading(false);
    }
  };

  const checkReviewEligibility = async (productId) => {
    try {
      // Check if user is logged in using the same method as the API interceptor
      const { getToken } = await import('../../api');
      const token = await getToken();
      if (!token) {
        console.log('No token found, user not logged in');
        setCanReview(false);
        return;
      }

      const response = await API.get(`/reviews/can-review/${productId}`);
      setCanReview(response.data.data.canReview);
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      // Don't block the page if review eligibility check fails
      setCanReview(false);
    }
  };

  const checkFavoriteStatus = async (productId) => {
    try {
      const { getToken } = await import('../../api');
      const token = await getToken();
      if (!token) {
        setIsFavorite(false);
        return;
      }

      const response = await API.get(`/products/${productId}/favorite/check`);
      setIsFavorite(response.data.isFavorite);
    } catch (error) {
      console.log('Error checking favorite status:', error);
      setIsFavorite(false);
    }
  };

  const toggleFavorite = async () => {
    try {
      const { getToken } = await import('../../api');
      const token = await getToken();
      if (!token) {
        Alert.alert('Login Required', 'Please login to add favorites');
        return;
      }

      setFavoriteLoading(true);
      
      if (isFavorite) {
        await API.delete(`/products/${product.id}/favorite`);
        setIsFavorite(false);
      } else {
        await API.post(`/products/${product.id}/favorite`);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorites');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleReviewSubmitted = () => {
    fetchReviews(params.productId);
    checkReviewEligibility(params.productId);
  };

  const addToCart = async () => {
    // Validate quantity
    if (quantity <= 0) {
      Alert.alert('Invalid Quantity', 'Please select a valid quantity');
      return;
    }

    if (quantity > product.stock) {
      Alert.alert('Insufficient Stock', `Only ${product.stock} items available in stock`);
      return;
    }

    try {
      const existingCart = await AsyncStorage.getItem('cart');
      let cartItems = existingCart ? JSON.parse(existingCart) : [];

      const existingItemIndex = cartItems.findIndex(item => item.id === product.id);
      if (existingItemIndex > -1) {
        const newTotalQuantity = cartItems[existingItemIndex].quantity + quantity;
        if (newTotalQuantity > product.stock) {
          Alert.alert('Insufficient Stock', `Only ${product.stock} items available in stock. You already have ${cartItems[existingItemIndex].quantity} in your cart.`);
          return;
        }
        cartItems[existingItemIndex].quantity = newTotalQuantity;
      } else {
        cartItems.push({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity
        });
      }

      await AsyncStorage.setItem('cart', JSON.stringify(cartItems));
      Alert.alert('Success', 'Product added to cart!');
      router.push('/customer/cart');
    } catch (error) {
      Alert.alert('Error', 'Failed to add product to cart');
      console.error('Error adding to cart:', error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Product Details (Simple)</Text>
        <TouchableOpacity 
          onPress={toggleFavorite} 
          disabled={favoriteLoading}
          className="p-2"
        >
          <Ionicons 
            name={favoriteLoading ? "heart-half" : (isFavorite ? "heart" : "heart-outline")} 
            size={24} 
            color={isFavorite ? "#EF4444" : "#000"} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View className="items-center justify-center p-6 bg-gray-100">
          <Image 
            source={{ uri: product.image }} 
            className="rounded-lg w-80 h-80" 
            resizeMode="contain"
          />
        </View>

        {/* Product Info */}
        <View className="px-5 py-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-2xl font-bold text-gray-900">{product.name}</Text>
            <Text className="text-lg font-bold text-purple-600">Rs. {product.price}.00</Text>
          </View>

          {!!affiliateCode && (
            <TouchableOpacity
              onPress={async () => {
                const link = `${API_BASE}/p/${product.id}?aff=${affiliateCode}`;
                await Clipboard.setStringAsync(link);
                Alert.alert('Copied', 'Affiliate link copied to clipboard');
              }}
              className="self-start px-3 py-2 mt-1 mb-2 bg-orange-100 rounded-lg"
            >
              <Text className="text-orange-700">Copy Affiliate Link</Text>
            </TouchableOpacity>
          )}

          <View className="flex-row items-center mb-4">
            <Ionicons name="star" size={16} color="#FCD34D" />
            <Text className="ml-1 text-sm text-gray-700">
              {averageRating > 0 ? parseFloat(averageRating).toFixed(1) : 'No ratings'}
            </Text>
            <Text className="ml-1 text-sm text-gray-500">
              ({reviewCount} reviews)
            </Text>
            <Text className="ml-2 text-sm text-gray-500">• {product.category}</Text>
          </View>

          {product.sellerName && (
            <View className="flex-row items-center mb-4">
              <Ionicons name="storefront" size={16} color="#8B5CF6" />
              <Text className="ml-1 text-sm text-gray-700">Sold by {product.sellerName}</Text>
            </View>
          )}

          <View className="flex-row items-center mb-6">
            <Ionicons 
              name={product.stock > 0 ? "checkmark-circle" : "close-circle"} 
              size={20} 
              color={product.stock > 0 ? "#10B981" : "#EF4444"} 
            />
            <Text className={`ml-2 text-sm ${product.stock > 0 ? "text-green-600" : "text-red-600"}`}>
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </Text>
          </View>

          {/* Description */}
          <View className="mb-6">
            <Text className="mb-2 text-lg font-semibold text-gray-900">Description</Text>
            <Text className="text-gray-600">{product.description}</Text>
          </View>

          {/* Quantity Selector */}
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-lg font-semibold text-gray-900">Quantity</Text>
            <View className="flex-row items-center border border-gray-300 rounded-lg">
              <TouchableOpacity 
                onPress={decrementQuantity}
                className="px-4 py-2"
                disabled={quantity <= 1}
              >
                <Text className={`text-lg ${quantity <= 1 ? "text-gray-300" : "text-gray-700"}`}>-</Text>
              </TouchableOpacity>
              <Text className="px-4 py-2 text-lg font-semibold text-gray-900">{quantity}</Text>
              <TouchableOpacity 
                onPress={incrementQuantity}
                className="px-4 py-2"
                disabled={quantity >= product.stock}
              >
                <Text className={`text-lg ${quantity >= product.stock ? "text-gray-300" : "text-gray-700"}`}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Add to Cart Button */}
          <TouchableOpacity 
            onPress={addToCart}
            disabled={product.stock <= 0}
            className={`items-center py-4 rounded-lg mb-6 ${product.stock <= 0 ? "bg-gray-300" : "bg-purple-600"}`}
          >
            <Text className="text-lg font-semibold text-white">
              {product.stock <= 0 ? 'Out of Stock' : `Add to Cart - Rs. ${product.price * quantity}.00`}
            </Text>
          </TouchableOpacity>

          {/* Reviews & Rating Section */}
          <View className="pt-6 mb-6 border-t border-gray-200">
            <View className="flex-row items-center justify-between mb-6">
              <View>
                <Text className="text-xl font-bold text-gray-900">Reviews & Ratings</Text>
                <Text className="mt-1 text-sm text-gray-500">
                  {reviewCount > 0 ? `${reviewCount} customer reviews` : 'Be the first to review'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowReviewModal(true)}
                className={`px-4 py-2 rounded-lg ${canReview ? 'bg-purple-600' : 'bg-gray-300'}`}
                disabled={!canReview}
              >
                <Text className={`font-medium ${canReview ? 'text-white' : 'text-gray-500'}`}>
                  {canReview ? 'Write Review' : 'Purchase to Review'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Overall Rating Summary */}
            {reviewCount > 0 ? (
              <RatingStats 
                ratingStats={ratingStats}
                averageRating={averageRating}
                reviewCount={reviewCount}
              />
            ) : (
              <View className="p-6 mb-4 bg-purple-50 rounded-xl">
                <View className="items-center">
                  <Ionicons name="star-outline" size={48} color="#8B5CF6" />
                  <Text className="mt-2 text-lg font-semibold text-gray-900">No Reviews Yet</Text>
                  <Text className="mt-1 text-center text-gray-600">
                    Be the first to share your experience with this product
                  </Text>
                  {canReview && (
                    <TouchableOpacity
                      onPress={() => setShowReviewModal(true)}
                      className="px-6 py-2 mt-4 bg-purple-600 rounded-full"
                    >
                      <Text className="font-medium text-white">Write First Review</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Customer Reviews */}
            <View className="mb-4">
              <Text className="mb-3 text-lg font-semibold text-gray-900">
                Customer Reviews
              </Text>
              
              {reviewsLoading ? (
                <View className="items-center py-8">
                  <Text className="text-gray-500">Loading reviews...</Text>
                </View>
              ) : reviews.length > 0 ? (
                <View>
                  {reviews.slice(0, 5).map((review) => (
                    <ReviewItem key={review.id} review={review} />
                  ))}
                  {reviews.length > 5 && (
                    <TouchableOpacity className="p-3 mt-4 border border-purple-200 rounded-lg bg-purple-50">
                      <Text className="font-medium text-center text-purple-600">
                        View all {reviewCount} reviews
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View className="p-4 border-2 border-gray-200 border-dashed rounded-lg bg-gray-50">
                  <Text className="text-center text-gray-500">
                    No customer reviews available yet
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Review Modal */}
      <ReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        productId={product?.id}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </SafeAreaView>
  );
}