import React, { useEffect, useState, useRef } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, 
  ScrollView, SafeAreaView, Dimensions, Image, Platform, Alert,
  ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from "../../api";
import { API_BASE } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
// eslint-disable-next-line no-unused-vars
const { width, height } = Dimensions.get('window');

export default function Marketplace() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeCategory, setActiveCategory] = useState("All");
  const [favorites, setFavorites] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // 10 items per page (5 rows x 2 columns)
  
  // Scroll to top when page changes
  const scrollViewRef = useRef(null);
  
  // Search debouncing
  const searchTimeoutRef = useRef(null);
  
  const changePage = (newPage) => {
    setCurrentPage(newPage);
    // Scroll to top of products section
    scrollViewRef.current?.scrollTo({ y: 300, animated: true });
  };

  const toggleFavorite = async (productId) => {
    console.log('Toggle favorite called for product:', productId);
    console.log('Current user:', user ? { id: user.id, hasToken: !!user.token } : 'No user');
    
    if (!user || !user.token) {
      console.log('No user or token, showing login alert');
      Alert.alert(
        'Login Required', 
        'Please login to add products to favorites',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    const isCurrentlyFavorite = favorites.has(productId);
    console.log('Is currently favorite:', isCurrentlyFavorite);
    
    // Store original state for potential revert
    const originalFavorites = new Set(favorites);

    try {
      // Update UI immediately for better user experience
      const newFavorites = new Set(favorites);
      if (isCurrentlyFavorite) {
        newFavorites.delete(productId);
      } else {
        newFavorites.add(productId);
      }
      setFavorites(newFavorites);
      console.log('Updated favorites UI:', Array.from(newFavorites));
      
      if (isCurrentlyFavorite) {
        console.log('Removing from favorites via API');
        // Remove from favorites
        await API.delete(`/products/${productId}/favorite`);
        console.log('Successfully removed from favorites');
      } else {
        console.log('Adding to favorites via API');
        // Add to favorites
        await API.post(`/products/${productId}/favorite`);
        console.log('Successfully added to favorites');
      }
    } catch (error) {
      console.error('Toggle favorite error:', error.response?.data || error.message);
      console.error('Error status:', error.response?.status);
      
      // Revert the UI change if API call failed - restore original state
      setFavorites(originalFavorites);
      
      // Handle authentication errors
      if (error.response?.status === 401) {
        Alert.alert(
          'Authentication Error', 
          'Please login again to continue',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Login', onPress: () => router.push('/login') }
          ]
        );
      } else {
        Alert.alert('Error', `Failed to update favorites: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  const categories = [
    { id: "all", name: "All" },
    { id: "1", name: "Tea" },
    { id: "2", name: "Handloom" },
    { id: "3", name: "Ceramics" },
    { id: "4", name: "Jewelry" },
    { id: "5", name: "Spices" },
    { id: "6", name: "Handicraft" },
  ];

  // Fetch products from backend
  const fetchProducts = async (searchTerm = '', category = '') => {
    try {
      setLoading(true);
      let url = '/products';
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (category && category !== 'All') params.append('category', category);
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await API.get(url);
      const products = res.data.products || [];
      
      // Debug: Log first few products to check image URLs
      console.log('📸 Products received with image data:');
      console.log('📊 Total products received:', products.length);
      products.slice(0, 5).forEach((product, index) => {
        console.log(`\n🔍 Product ${index + 1}: ${product.productName}`);
        console.log(`  📝 ID: ${product.id}`);
        console.log(`  🖼️ imageUrl: "${product.imageUrl}"`);
        console.log(`  🗂️ images field: ${JSON.stringify(product.images)}`);
        console.log(`  💰 Price: ${product.price}`);
        console.log(`  📦 Stock: ${product.stockQty}`);
        console.log(`  🏷️ Category: ${product.category}`);
      });
      
      setAllProducts(products);
    } catch (err) {
      console.error("Error fetching products:", err.response?.data || err.message);
      Alert.alert("Error", "Failed to load products");
      setAllProducts([]);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  // Function to fetch cart items
  const fetchCartItems = async () => {
    try {
      const existingCart = await AsyncStorage.getItem('cart');
      const cartData = existingCart ? JSON.parse(existingCart) : [];
      setCartItems(cartData);
    } catch (error) {
      console.error('Error fetching cart items:', error);
      setCartItems([]);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCartItems();
    
    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Refresh cart data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchCartItems();
    }, [])
  );

  useEffect(() => {
    if (!authLoading && user) {
      console.log('AuthContext user changed, fetching favorites:', user);
      fetchUserFavorites();
    }
  }, [user, authLoading]);

  // Fetch user's favorite products to show correct heart states
  const fetchUserFavorites = async () => {
    if (!user) {
      console.log('No user found for favorites');
      return;
    }
    
    try {
      console.log('Fetching favorites for user:', user);
      const response = await API.get('/products/user/favorites');
      console.log('Favorites response:', response.data);
      
      if (response.data && response.data.favorites) {
        const favoriteIds = new Set(response.data.favorites.map(product => product.id));
        setFavorites(favoriteIds);
        console.log('Set favorites IDs:', Array.from(favoriteIds));
      } else {
        console.log('No favorites data received');
        setFavorites(new Set());
      }
    } catch (error) {
      console.error('Error fetching favorites:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        console.log('Authentication failed, user might need to login again');
      }
    }
  };

  // Enhanced search with debouncing and immediate local filtering
  const handleSearch = (text) => {
    setSearchQuery(text);
    setCurrentPage(1); // Reset to first page
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // If search is empty, fetch all products
    if (text.length === 0) {
      setSearchLoading(false);
      fetchProducts('', activeCategory);
      return;
    }
    
    // Show loading state for search
    setSearchLoading(true);
    
    // Debounce API call for longer searches, but allow immediate local filtering
    if (text.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchProducts(text, activeCategory);
      }, 500); // 500ms debounce
    } else {
      // For short searches, just turn off loading after a brief moment
      setTimeout(() => {
        setSearchLoading(false);
      }, 200);
    }
  };

  // Handle category change
  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setCurrentPage(1); // Reset to first page
    fetchProducts(searchQuery, category);
  };

  // Enhanced filtering prioritizing product names
  const filteredProducts = React.useMemo(() => {
    let products = [...allProducts];
    
    // Apply search filter if there's a search query
    if (searchQuery && searchQuery.trim().length > 0) {
      const searchLower = searchQuery.toLowerCase().trim();
      products = products.filter(product => {
        // Primary search: Product name (most important)
        const nameMatch = product.productName?.toLowerCase().includes(searchLower);
        // Secondary search: Description for more context
        const descMatch = product.description?.toLowerCase().includes(searchLower);
        
        return nameMatch || descMatch;
      });
      
      // Sort results to prioritize exact product name matches
      products.sort((a, b) => {
        const aNameMatch = a.productName?.toLowerCase().includes(searchLower);
        const bNameMatch = b.productName?.toLowerCase().includes(searchLower);
        const aExactMatch = a.productName?.toLowerCase().startsWith(searchLower);
        const bExactMatch = b.productName?.toLowerCase().startsWith(searchLower);
        
        // Prioritize exact matches at the beginning of product name
        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;
        // Then prioritize any product name matches over description matches
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        
        return 0;
      });
    }
    
    // Apply category filter if not "All"
    if (activeCategory !== "All") {
      products = products.filter(product => 
        product.category?.toLowerCase() === activeCategory.toLowerCase()
      );
    }
    
    return products;
  }, [allProducts, searchQuery, activeCategory]);

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);



  const resolveImageUrl = (item) => {
    // Prefer item.imageUrl
    const prefer = item.imageUrl || item.image_url;
    const toAbs = (u) => {
      if (!u) return null;
      const s = String(u);
      if (/^https?:\/\//i.test(s)) {
        try {
          const absBase = API_BASE.replace(/\/$/, '');
          const baseUrl = new URL(absBase);
          const orig = new URL(s);
          // Rewrite to API_BASE origin, keep path and search
          return `${baseUrl.origin}${orig.pathname}${orig.search}`;
        } catch {
          return s;
        }
      }
      if (s.startsWith('/')) return `${API_BASE}${s}`;
      return `${API_BASE}/${s}`;
    };
    if (prefer) {
      const abs = toAbs(prefer);
      if (abs) return abs;
    }
    // Fallback to images array
    let imgs = item.images;
    try { if (typeof imgs === 'string') imgs = JSON.parse(imgs); } catch {}
    if (Array.isArray(imgs) && imgs.length > 0) {
      const first = imgs[0];
      const candidate = typeof first === 'string' ? first : (first.url || first.path || first.file_path || '');
      const abs = toAbs(candidate);
      if (abs) return abs;
    }
    return 'https://via.placeholder.com/300x300?text=No+Image';
  };

  // Product Card
  const renderProductItem = (item) => (
    <TouchableOpacity 
      key={item.id}
      className="w-[48%] mb-4 overflow-hidden bg-white shadow-lg rounded-2xl"
      onPress={() => router.push({
        pathname: "/customer/ProductDetail",
        params: { productId: item.id }
      })}
    >
      <View className="relative">
        <Image
          source={{ uri: resolveImageUrl(item) }} 
          className="w-full h-32 rounded-t-2xl" 
          defaultSource={{ uri: 'https://via.placeholder.com/150' }}
          resizeMode="cover"
          onError={(e) => {
            console.log('❌ Image load FAILED for product:', item.productName);
            console.log('   Attempted URL:', resolveImageUrl(item));
            console.log('   Error details:', e.nativeEvent);
          }}
          onLoad={() => {
            console.log('✅ Image loaded SUCCESSFULLY for product:', item.productName);
          }}
        />
        <TouchableOpacity 
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite(item.id);
          }}
          className="absolute items-center justify-center w-8 h-8 bg-white rounded-full shadow-md top-2 right-2"
        >
          <Ionicons 
            name={favorites.has(item.id) ? "heart" : "heart-outline"} 
            size={20} 
            color={favorites.has(item.id) ? "#EF4444" : "#9CA3AF"} 
          />
        </TouchableOpacity>
        {/* Cart indicator badge if item is in cart */}
        {(() => {
          const cartItem = cartItems.find(cartItem => cartItem.id === item.id);
          const inCartQuantity = cartItem ? cartItem.quantity : 0;
          return inCartQuantity > 0 && (
            <View className="absolute top-2 left-2 px-2 py-1 bg-blue-500 rounded-full min-w-[24px] items-center">
              <Text className="text-xs font-bold text-white">{inCartQuantity}</Text>
            </View>
          );
        })()}
      </View>
      <View className="p-3">
        <Text className="mb-1 text-sm font-semibold text-gray-900" numberOfLines={1}>
          {item.productName}
        </Text>
        <View className="flex-row items-center mb-2">
          <Ionicons name="star" size={14} color="#FCD34D" />
          <Text className="ml-1 text-xs text-gray-700">
            {item.average_rating > 0 ? parseFloat(item.average_rating).toFixed(1) : 'New'}
          </Text>
          <Text className="ml-1 text-xs text-gray-500">
            ({item.review_count || 0})
          </Text>
          <Text className="ml-2 text-xs text-gray-500">• {item.category}</Text>
        </View>
        <Text className="text-base font-bold text-purple-600">Rs. {item.price}</Text>
        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-xs text-gray-500">By {item.sellerName}</Text>
          <View className="flex-row items-center">
            {(() => {
              // Calculate cart-aware stock information
              const cartItem = cartItems.find(cartItem => cartItem.id === item.id);
              const inCartQuantity = cartItem ? cartItem.quantity : 0;
              const availableStock = Math.max(0, item.stockQty - inCartQuantity);
              
              // Determine stock status and display
              const isOutOfStock = item.stockQty === 0;
              const hasItemsInCart = inCartQuantity > 0;
              const isAvailableAfterCart = availableStock > 0;
              
              let stockText = '';
              let stockColor = '';
              let iconName = '';
              let iconColor = '';
              
              if (isOutOfStock) {
                stockText = 'Out of Stock';
                stockColor = 'text-red-600';
                iconName = 'close-circle';
                iconColor = '#EF4444';
              } else if (hasItemsInCart) {
                if (isAvailableAfterCart) {
                  stockText = `Available: ${availableStock} (${inCartQuantity} in cart)`;
                  stockColor = 'text-blue-600';
                  iconName = 'information-circle';
                  iconColor = '#3B82F6';
                } else {
                  stockText = `${inCartQuantity} in cart (sold out)`;
                  stockColor = 'text-orange-600';
                  iconName = 'warning';
                  iconColor = '#F59E0B';
                }
              } else {
                stockText = `Stock: ${item.stockQty}`;
                stockColor = 'text-green-600';
                iconName = 'checkmark-circle';
                iconColor = '#10B981';
              }

              return (
                <>
                  <Ionicons 
                    name={iconName} 
                    size={12} 
                    color={iconColor} 
                  />
                  <Text className={`ml-1 text-xs font-medium ${stockColor}`} numberOfLines={1}>
                    {stockText}
                  </Text>
                </>
              );
            })()}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <StatusBar style="light" />

      {/* Header with search */}
      <View className="bg-purple-600 shadow-md rounded-b-3xl">
        <View className="px-5 pt-6 pb-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-white">Sri Lankan Marketplace</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity 
                onPress={() => router.push("/customer/cart")}
                className="p-2 bg-white rounded-full shadow"
              >
                <Ionicons name="cart-outline" size={22} color="#8B5CF6" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => router.push("/customer/profile")}
                className="p-2 bg-white rounded-full shadow"
              >
                <Ionicons name="person-outline" size={22} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center px-4 py-3 mt-5 bg-white rounded-full shadow-md">
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Search by product name (e.g., shoes, tea, jewelry)..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-2 text-base text-gray-700"
              value={searchQuery}
              onChangeText={handleSearch}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => handleSearch('')}
                className="p-1 ml-2"
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
            {(loading || searchLoading) && (
              <ActivityIndicator size="small" color="#8B5CF6" />
            )}
          </View>
        </View>
      </View>

      {/* Scroll Content */}
      <ScrollView 
        ref={scrollViewRef}
        className="flex-1 bg-gray-100" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 90 : 80 }}
      >
        {/* Categories with All tab */}
        <View className="px-4 pt-6">
          <Text className="mb-3 text-lg font-bold text-gray-900">Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {categories.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleCategoryChange(item.name)}
                className={`px-5 py-2 mr-3 rounded-full ${
                  activeCategory === item.name ? "bg-purple-600" : "bg-gray-200"
                }`}
              >
                <Text className={`text-sm ${
                  activeCategory === item.name ? "text-white" : "text-gray-700"
                }`}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* All Products Section */}
        <View className="px-4 mt-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-gray-900">
              {searchQuery ? 
                `Search Results${activeCategory !== "All" ? ` in ${activeCategory}` : ""}` :
                activeCategory === "All" ? "All Products" : activeCategory + " Products"
              }
            </Text>
            <Text className="text-sm text-gray-600">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
              {searchQuery && ` found`}
            </Text>
          </View>
          
          {/* Search Query Display */}
          {searchQuery && (
            <View className="flex-row items-center p-3 mb-4 rounded-lg bg-purple-50">
              <Ionicons name="search" size={16} color="#8B5CF6" />
              <Text className="ml-2 text-sm text-purple-700">
                Searching products for: "<Text className="font-medium">{searchQuery}</Text>"
              </Text>
              <TouchableOpacity 
                onPress={() => handleSearch('')}
                className="ml-auto"
              >
                <Text className="text-xs text-purple-600 underline">Clear</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {loading ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text className="mt-4 text-gray-600">Loading products...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View className="items-center justify-center py-20">
              <Ionicons name="search-outline" size={64} color="#9CA3AF" />
              <Text className="mt-4 text-lg font-semibold text-gray-600">
                {searchQuery ? "No results found" : "No products found"}
              </Text>
              <Text className="mt-2 text-center text-gray-500">
                {searchQuery ? (
                  <>
                    No products match "<Text className="font-medium">{searchQuery}</Text>"
                    {activeCategory !== "All" && ` in ${activeCategory} category`}
                  </>
                ) : (
                  "No products available in this category"
                )}
              </Text>
              {searchQuery && (
                <View className="mt-4 space-y-2">
                  <TouchableOpacity
                    onPress={() => handleSearch('')}
                    className="px-4 py-2 bg-purple-100 rounded-full"
                  >
                    <Text className="font-medium text-purple-600">Clear Search</Text>
                  </TouchableOpacity>
                  {activeCategory !== "All" && (
                    <TouchableOpacity
                      onPress={() => {
                        setActiveCategory("All");
                        setCurrentPage(1);
                        fetchProducts(searchQuery, "All");
                      }}
                      className="px-4 py-2 border border-purple-200 rounded-full"
                    >
                      <Text className="text-purple-600">Search in All Categories</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ) : (
            <>
              {/* Products Grid - Two Columns */}
              <View className="flex-row flex-wrap justify-between">
                {currentProducts.map((item) => renderProductItem(item))}
              </View>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <View className="flex-row items-center justify-center mt-6 mb-4">
                  <TouchableOpacity
                    onPress={() => changePage(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className={`p-3 rounded-lg mr-2 ${
                      currentPage === 1 ? 'bg-gray-200' : 'bg-purple-600'
                    }`}
                  >
                    <Ionicons 
                      name="chevron-back" 
                      size={20} 
                      color={currentPage === 1 ? '#9CA3AF' : 'white'} 
                    />
                  </TouchableOpacity>

                  <View className="flex-row items-center mx-4">
                    <Text className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => changePage(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`p-3 rounded-lg ml-2 ${
                      currentPage === totalPages ? 'bg-gray-200' : 'bg-purple-600'
                    }`}
                  >
                    <Ionicons 
                      name="chevron-forward" 
                      size={20} 
                      color={currentPage === totalPages ? '#9CA3AF' : 'white'} 
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Page Info */}
              <View className="items-center mt-2 mb-4">
                <Text className="text-xs text-gray-500">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom Nav */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
        <View className="flex-row justify-around py-3">
          <TouchableOpacity onPress={() => router.push("/customer/customerDashboard")} className="items-center">
            <Ionicons name="home" size={24} color="#8B5CF6" />
            <Text className="mt-1 text-xs font-semibold text-purple-600">Home</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/customer/cart")} className="items-center">
            <Ionicons name="cart-outline" size={24} color="#9CA3AF" />
            <Text className="mt-1 text-xs text-gray-500">Cart</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/customer/orders")} className="items-center">
            <Ionicons name="receipt-outline" size={24} color="#9CA3AF" />
            <Text className="mt-1 text-xs text-gray-500">Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/customer/profile")} className="items-center">
            <Ionicons name="person-outline" size={24} color="#9CA3AF" />
            <Text className="mt-1 text-xs text-gray-500">Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}