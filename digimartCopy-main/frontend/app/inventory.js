import { View, Text, Image, Pressable, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl, Modal, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import API from "../api";
import { useAuth } from "../context/AuthContext";
import { buildImageUrl } from "../config/urls";

export default function Inventory() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("Active");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State for product data from API - NO DUMMY DATA
  const [data, setData] = useState({
    Active: [],
    "Out of Stock": [],
    Violation: [],
  });

  // State for edit modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editType, setEditType] = useState(''); // 'price' or 'stock'
  const [editingItem, setEditingItem] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Refresh function for pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSellerProducts();
    setRefreshing(false);
  };

  // Fetch seller's products from the API - REAL DATABASE DATA ONLY
  const fetchSellerProducts = async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔄 FETCHING INVENTORY FOR SELLER');
      console.log('═══════════════════════════════════════════════════════');
      console.log('👤 Current User:', JSON.stringify(user, null, 2));
      console.log('📋 User ID:', user?.id);
      console.log('📋 User Name:', user?.name);
      console.log('📋 User Role:', user?.role);
      console.log('🔒 SECURITY: Only this seller\'s products will be shown');
      console.log('═══════════════════════════════════════════════════════');
      
      // SECURITY: Only allow sellers to access inventory
      if (!user) {
        console.log('🚫 ACCESS DENIED: No user found');
        Alert.alert('Authentication Required', 'Please log in to access inventory management.');
        setLoading(false);
        return;
      }

      if (user.role !== 'seller') {
        console.log('🚫 ACCESS DENIED: User is not a seller, role:', user?.role);
        Alert.alert('Access Denied', 'Only sellers can access inventory management.');
        setLoading(false);
        return;
      }

      // Call authenticated inventory endpoint
      // Backend SQL: SELECT * FROM products WHERE seller_id = ? AND status != 'deleted'
      console.log('📦 Calling authenticated inventory endpoint: /products/inventory');
      console.log('🔑 JWT token will identify seller automatically');
      const response = await API.get('/products/inventory');
      const categorizedProducts = response.data;
      
      console.log('✅ Backend response received');
      console.log('📊 Response structure:', Object.keys(categorizedProducts));
      
      // Backend returns pre-categorized data filtered by seller_id
      const totalProducts = (categorizedProducts.Active?.length || 0) + 
                           (categorizedProducts['Out of Stock']?.length || 0) + 
                           (categorizedProducts.Violation?.length || 0);
      
      console.log('✅ Pre-categorized data from backend');
      console.log('📊 INVENTORY SUMMARY FOR SELLER:', user?.name, '(ID:', user?.id + ')');
      console.log('   ✅ Active Products:', categorizedProducts.Active?.length || 0);
      console.log('   📦 Out of Stock:', categorizedProducts['Out of Stock']?.length || 0);
      console.log('   ⚠️  Violations:', categorizedProducts.Violation?.length || 0);
      console.log('   📊 TOTAL PRODUCTS:', totalProducts);
      
      console.log('═══════════════════════════════════════════════════════');
      console.log('✅ INVENTORY LOADED - ALL PRODUCTS FILTERED BY BACKEND');
      console.log('🔒 Seller:', user?.name, '| Seller ID:', user?.id);
      console.log('═══════════════════════════════════════════════════════');
      
      setData({
        Active: (categorizedProducts.Active || []).map(formatProductForDisplay),
        "Out of Stock": (categorizedProducts['Out of Stock'] || []).map(formatProductForDisplay),
        Violation: (categorizedProducts.Violation || []).map(formatProductForDisplay),
      });
      
    } catch (error) {
      console.error('❌ Error fetching seller products:', error);
      console.error('Error details:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      
      Alert.alert(
        'Error Loading Inventory',
        'Failed to load your inventory. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: fetchSellerProducts },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      
      // Set empty data on error
      setData({
        Active: [],
        "Out of Stock": [],
        Violation: [],
      });
      
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get product image URL
  const getProductImageUrl = (product) => {
    // Priority 1: Try direct image URL
    if (product.image && product.image.startsWith('http')) {
      return product.image;
    }
    
    // Priority 2: Try imageUrl field
    if (product.imageUrl && product.imageUrl.startsWith('http')) {
      return product.imageUrl;
    }
    
    // Priority 3: Try images array
    if (product.images) {
      let imgs = product.images;
      
      // Handle string JSON
      if (typeof imgs === 'string') {
        try {
          imgs = JSON.parse(imgs);
        } catch (err) {
          console.log('Failed to parse images JSON:', err.message);
          return null;
        }
      }
      
      // Handle array
      if (Array.isArray(imgs) && imgs.length > 0) {
        const firstImage = imgs[0];
        if (firstImage) {
          if (typeof firstImage === 'string') {
            return buildImageUrl(firstImage);
          } else if (firstImage.path) {
            return buildImageUrl(firstImage.path);
          } else if (firstImage.url) {
            return firstImage.url;
          }
        }
      }
    }
    
    // Priority 4: Construct from relative paths
    if (product.image) {
      return buildImageUrl(product.image);
    }
    
    if (product.imageUrl) {
      return buildImageUrl(product.imageUrl);
    }
    
    return null; // No valid image found
  };

  // Helper function to format product for display
  const formatProductForDisplay = (product) => ({
    id: product.id,
    name: product.name || product.productName || 'Unknown Product',
    price: product.price || 0,
    stock: product.stock || product.stockQty || 0,
    category: product.category || 'N/A',
    image: getProductImageUrl(product),
    description: product.description || '',
    violation: product.violation || product.violationReason || null,
    originalId: product.id, // Keep original ID for API calls
  });

  // useEffect to fetch data when component mounts
  useEffect(() => {
    if (user) {
      console.log('🔵 User detected, fetching products for user:', user);
      fetchSellerProducts();
    } else {
      console.log('⚠️ No user found, cannot fetch products');
      setLoading(false);
    }
  }, [user]);

  // Handle edit price action
  const handleEditPrice = (item) => {
    setEditingItem(item);
    setEditType('price');
    setEditValue(item.price.toString());
    setEditModalVisible(true);
  };

  const handleEditPriceSubmit = async () => {
    const price = parseFloat(editValue);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price greater than 0');
      return;
    }
    
    try {
      console.log('🔄 Updating price for product:', editingItem.originalId || editingItem.id);
      
      const response = await API.put(`/products/${editingItem.originalId || editingItem.id}`, {
        price: price
      });
      
      console.log('✅ Price update successful:', response.data);
      setEditModalVisible(false);
      Alert.alert('Success', `Price updated to LKR ${price}`);
      
      // Refresh inventory to get latest data
      await fetchSellerProducts();
      
    } catch (error) {
      console.error('❌ Error updating price:', error);
      Alert.alert('Update Failed', 'Failed to update price. Please try again.');
    }
  };

  // Handle edit stock action - ADD to existing stock
  const handleEditStock = (item) => {
    setEditingItem(item);
    setEditType('stock');
    setEditValue('0'); // Start with 0 to add to existing
    setEditModalVisible(true);
  };

  const handleEditStockSubmit = async () => {
    const addQuantity = parseInt(editValue);
    if (isNaN(addQuantity) || addQuantity < 0) {
      Alert.alert('Invalid Stock', 'Please enter a valid quantity to add (0 or greater)');
      return;
    }
    
    try {
      console.log('🔄 Adding stock for product:', editingItem.originalId || editingItem.id);
      console.log('   Current stock:', editingItem.stock);
      console.log('   Adding:', addQuantity);
      
      // Calculate new total stock = existing + new quantity
      const newTotalStock = editingItem.stock + addQuantity;
      console.log('   New total stock:', newTotalStock);
      
      const response = await API.put(`/products/${editingItem.originalId || editingItem.id}`, {
        stockQty: newTotalStock
      });
      
      console.log('✅ Stock update successful:', response.data);
      setEditModalVisible(false);
      Alert.alert('Success', `Added ${addQuantity} units. Total stock: ${newTotalStock} units`);
      
      // Refresh inventory to get latest data and correct categorization
      await fetchSellerProducts();
      
    } catch (error) {
      console.error('❌ Error updating stock:', error);
      Alert.alert('Update Failed', 'Failed to update stock. Please try again.');
    }
  };

  // Handle restock action
  const handleRestock = (item) => {
    setEditingItem(item);
    setEditType('restock');
    setEditValue('10'); // Default value
    setEditModalVisible(true);
  };

  const handleRestockSubmit = async () => {
    const stock = parseInt(editValue);
    if (isNaN(stock) || stock <= 0) {
      Alert.alert('Invalid Stock', 'Please enter a valid stock quantity greater than 0');
      return;
    }
    
    try {
      console.log('🔄 Restocking product:', editingItem.originalId || editingItem.id);
      
      const response = await API.put(`/products/${editingItem.originalId || editingItem.id}`, {
        stockQty: stock
      });
      
      console.log('✅ Restock successful:', response.data);
      setEditModalVisible(false);
      Alert.alert('Restocked', `${editingItem.name} is now available with ${stock} units in stock.`);
      
      // Refresh inventory and switch to Active tab
      await fetchSellerProducts();
      setActiveTab("Active");
      
    } catch (error) {
      console.error('❌ Error restocking product:', error);
      Alert.alert('Restock Failed', 'Failed to restock product. Please try again.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-orange-400">
      {/* Header */}
      <View className="px-5 py-4 bg-orange-400 shadow-md rounded-b-3xl">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.push("/sellerCenter")}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </Pressable>
          <Text className="absolute left-0 right-0 text-xl font-bold text-center text-white">
            Inventory
          </Text>
          <Pressable onPress={fetchSellerProducts}>
            <Ionicons name="refresh" size={28} color="white" />
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row justify-around p-2 bg-orange-400">
        {["Active", "Out of Stock", "Violation"].map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)}>
            <Text
              className={`px-4 py-1 rounded-full font-semibold ${
                activeTab === tab
                  ? "bg-yellow-300 text-white"
                  : "text-gray-700 bg-orange-200"
              }`}
            >
              {tab} ({data[tab]?.length || 0})
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 bg-pink-50 rounded-t-3xl"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#f97316']}
            tintColor="#f97316"
          />
        }
      >
        {loading && !refreshing && (
          <View className="items-center justify-center py-8">
            <ActivityIndicator size="large" color="#f97316" />
            <Text className="mt-2 text-gray-600">Loading your inventory...</Text>
          </View>
        )}

        {!loading && data[activeTab].length === 0 && (
          <View className="items-center justify-center py-8">
            <Ionicons 
              name={activeTab === "Active" ? "storefront-outline" : 
                    activeTab === "Out of Stock" ? "alert-circle-outline" : 
                    "warning-outline"} 
              size={64} 
              color="#9CA3AF" 
            />
            <Text className="mt-4 text-lg font-semibold text-gray-600">
              {activeTab === "Active" ? "No Active Products" :
               activeTab === "Out of Stock" ? "No Out of Stock Products" :
               "No Violations"}
            </Text>
            <Text className="mt-2 text-center text-gray-500">
              {activeTab === "Active" ? 
                "You haven't added any products yet.\nStart selling by adding your first product!" : 
                activeTab === "Out of Stock" ?
                "All your products are in stock!" :
                "Great! No policy violations found."}
            </Text>
            
            {activeTab === "Active" && (
              <TouchableOpacity 
                onPress={() => router.push("/add-product")}
                className="px-6 py-3 mt-4 bg-orange-500 rounded-full"
              >
                <Text className="font-semibold text-white">Add Your First Product</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {data[activeTab].map((item) => (
          <View
            key={item.id}
            className="p-4 mb-4 bg-white shadow-lg rounded-2xl"
          >
            <Image
              source={{ uri: item.image }}
              className="w-full mb-3 h-44 rounded-xl"
              resizeMode="cover"
            />
            <Text className="text-sm font-bold">{item.name}</Text>
            <Text className="text-sm">Product ID: {item.id}</Text>
            <Text className="text-sm">LKR: {item.price}</Text>
            <Text className="mb-3 text-sm">Stock: {item.stock}</Text>

            {activeTab === "Violation" && (
              <Text className="mb-2 text-xs font-semibold text-red-500">
                🚨 {item.violation}
              </Text>
            )}

            {activeTab === "Active" && (
              <View className="flex-row justify-between mt-2">
                <Pressable 
                  onPress={() => handleEditPrice(item)}
                  className="items-center flex-1 px-4 py-2 mr-2 bg-red-500 rounded-2xl"
                >
                  <Text className="font-semibold text-white">Edit Price</Text>
                </Pressable>
                <Pressable 
                  onPress={() => handleEditStock(item)}
                  className="items-center flex-1 px-4 py-2 ml-2 bg-blue-500 rounded-2xl"
                >
                  <Text className="font-semibold text-white">Add Stock</Text>
                </Pressable>
              </View>
            )}

            {activeTab === "Out of Stock" && (
              <View className="flex-row justify-center mt-2">
                <Pressable
                  onPress={() => handleRestock(item)}
                  className="items-center flex-1 px-4 py-2 bg-green-500 rounded-2xl"
                >
                  <Text className="font-semibold text-white">Restock</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Edit Modal - Works on both iOS and Android */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View className="items-center justify-center flex-1 bg-black/50">
          <View className="w-4/5 max-w-md p-6 bg-white rounded-lg">
            <Text className="mb-4 text-lg font-bold">
              {editType === 'price' ? 'Edit Price' : editType === 'stock' ? 'Add Stock' : 'Restock Product'}
            </Text>
            
            {editingItem && (
              <>
                <Text className="mb-2 text-gray-600">
                  {editType === 'price' 
                    ? `Enter new price for ${editingItem.name}:` 
                    : editType === 'stock'
                    ? `Add quantity to ${editingItem.name}:`
                    : `Enter stock quantity for ${editingItem.name}:`
                  }
                </Text>
                
                {editType === 'stock' && (
                  <View className="p-3 mb-3 rounded-lg bg-blue-50">
                    <Text className="text-sm text-gray-700">
                      Current stock: <Text className="font-bold">{editingItem.stock} units</Text>
                    </Text>
                    <Text className="mt-1 text-xs text-gray-500">
                      Enter quantity to add (e.g., 10 will make total: {editingItem.stock + (parseInt(editValue) || 0)} units)
                    </Text>
                  </View>
                )}
              </>
            )}

            <TextInput
              className="px-4 py-3 mb-6 border border-gray-300 rounded-lg"
              value={editValue}
              onChangeText={setEditValue}
              keyboardType="numeric"
              placeholder={editType === 'price' ? 'Enter price' : editType === 'stock' ? 'Enter quantity to add' : 'Enter stock quantity'}
              autoFocus={true}
            />

            <View className="flex-row justify-end gap-3">
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                className="px-6 py-3 bg-gray-200 rounded-lg"
              >
                <Text className="font-semibold text-gray-700">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={editType === 'price' ? handleEditPriceSubmit : editType === 'stock' ? handleEditStockSubmit : handleRestockSubmit}
                className={`px-6 py-3 rounded-lg ${editType === 'restock' ? 'bg-green-500' : 'bg-blue-500'}`}
              >
                <Text className="font-semibold text-white">
                  {editType === 'restock' ? 'Restock' : editType === 'stock' ? 'Add Stock' : 'Update'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
