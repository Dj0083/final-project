
import React, { useState } from "react";
import { 
  View, Text, TouchableOpacity, 
  SafeAreaView, FlatList,
  Image, Dimensions, TextInput, Pressable
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// eslint-disable-next-line no-unused-vars
const { width } = Dimensions.get('window');

export default function Category() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const categoryName = params.category || "All Products";
  
  const [favorites, setFavorites] = useState(new Set());
  const [sortOption, setSortOption] = useState("popular");
  const [filterVisible, setFilterVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sample products
  const allProducts = [
    {
      id: "1",
      name: "Ceylon Black Tea",
      price: "Rs. 1,200",
      category: "Tea",
      rating: 4.8,
      reviews: 124,
      image: "https://via.placeholder.com/250x250",
      description: "Premium quality black tea from the highlands of Sri Lanka"
    },
    {
      id: "2",
      name: "Handwoven Sarong",
      price: "Rs. 2,500",
      category: "Handloom",
      rating: 4.5,
      reviews: 89,
      image: "https://via.placeholder.com/250x250",
      description: "Traditional handwoven sarong with intricate patterns"
    },
    {
      id: "3",
      name: "Traditional Pottery",
      price: "Rs. 3,800",
      category: "Ceramics",
      rating: 4.7,
      reviews: 67,
      image: "https://via.placeholder.com/250x250",
      description: "Handcrafted clay pottery with traditional designs"
    },
    {
      id: "4",
      name: "Silver Elephant Pendant",
      price: "Rs. 4,500",
      category: "Jewelry",
      rating: 4.9,
      reviews: 156,
      image: "https://via.placeholder.com/250x250",
      description: "Exquisite silver jewelry featuring traditional motifs"
    },
  ];

  // Filtering & searching
  const filteredProducts = allProducts.filter(product => {
    const matchesCategory = categoryName === "All Products" || product.category === categoryName;
    const matchesSearch = searchQuery === "" || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Sorting
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch(sortOption) {
      case "price-low":
        return parseFloat(a.price.replace(/[^0-9.]/g, '')) - parseFloat(b.price.replace(/[^0-9.]/g, ''));
      case "price-high":
        return parseFloat(b.price.replace(/[^0-9.]/g, '')) - parseFloat(a.price.replace(/[^0-9.]/g, ''));
      case "rating":
        return b.rating - a.rating;
      case "popular":
      default:
        return b.reviews - a.reviews;
    }
  });

  const toggleFavorite = (id) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    setFavorites(newFavorites);
  };

  const renderProductItem = ({ item }) => (
    <Pressable 
      className="flex-1 m-2 overflow-hidden bg-white shadow-md rounded-xl"
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      onPress={() => router.push({
        pathname: "/product/[id]",
        params: { id: item.id }
      })}
    >
      <View className="relative">
        <Image source={{ uri: item.image }} className="w-full h-40" />
        <TouchableOpacity 
          onPress={() => toggleFavorite(item.id)}
          className="absolute items-center justify-center bg-white rounded-full shadow-md w-9 h-9 top-2 right-2"
        >
          <Ionicons 
            name={favorites.has(item.id) ? "heart" : "heart-outline"} 
            size={20} 
            color={favorites.has(item.id) ? "#EF4444" : "#9CA3AF"} 
          />
        </TouchableOpacity>
      </View>
      <View className="p-3">
        <Text className="mb-1 text-sm font-semibold text-gray-900" numberOfLines={1}>{item.name}</Text>
        <Text className="mb-2 text-xs text-gray-600" numberOfLines={2}>{item.description}</Text>
        <View className="flex-row items-center mb-2">
          <Ionicons name="star" size={14} color="#FACC15" />
          <Text className="ml-1 text-xs font-semibold text-gray-900">{item.rating}</Text>
          <Text className="ml-1 text-xs text-gray-500">({item.reviews})</Text>
        </View>
        <Text className="text-base font-bold text-purple-600">{item.price}</Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Improved Header with Purple Background */}
      <View className="px-4 pt-4 pb-4 bg-purple-600 shadow-md">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 bg-purple-500 rounded-full">
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">{categoryName}</Text>
          <TouchableOpacity onPress={() => router.push("/customer/cart")} className="relative p-2 bg-purple-500 rounded-full">
            <Ionicons name="cart-outline" size={20} color="white" />
            <View className="absolute items-center justify-center w-5 h-5 bg-red-500 rounded-full -top-1 -right-1">
              <Text className="text-xs font-bold text-white">3</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Search + Filter */}
        <View className="flex-row gap-3">
          <View className="flex-row items-center flex-1 px-4 py-3 bg-white shadow-sm rounded-xl">
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              placeholder="Search products..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 ml-3 text-gray-700"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity 
            className="items-center justify-center w-12 bg-white shadow-sm rounded-xl"
            onPress={() => setFilterVisible(!filterVisible)}
          >
            <Feather name="filter" size={18} color="#4B5563" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Options */}
      {filterVisible && (
        <View className="p-4 bg-white border-b border-gray-200 shadow-sm">
          <Text className="mb-3 text-base font-semibold text-gray-900">Sort by</Text>
          <View className="flex-row flex-wrap gap-2">
            {[
              { id: "popular", label: "Popular" },
              { id: "rating", label: "Rating" },
              { id: "price-low", label: "Price: Low to High" },
              { id: "price-high", label: "Price: High to Low" }
            ].map(option => (
              <TouchableOpacity
                key={option.id}
                className={`px-4 py-2 rounded-full border ${
                  sortOption === option.id 
                    ? "bg-purple-100 border-purple-600" 
                    : "bg-gray-100 border-gray-200"
                }`}
                onPress={() => setSortOption(option.id)}
              >
                <Text className={`text-sm ${
                  sortOption === option.id ? "text-purple-600 font-semibold" : "text-gray-600"
                }`}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Results Count */}
      <View className="px-4 py-3 bg-white border-b border-gray-200">
        <Text className="text-sm text-gray-600">
          {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Product Grid */}
      {sortedProducts.length > 0 ? (
        <FlatList
          data={sortedProducts}
          renderItem={renderProductItem}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerClassName="p-4 pb-24"
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
        />
      ) : (
        <View className="items-center justify-center flex-1 p-8">
          <Ionicons name="search-outline" size={64} color="#D1D5DB" />
          <Text className="mt-4 mb-2 text-lg font-semibold text-gray-900">No products found</Text>
          <Text className="text-sm text-center text-gray-600">
            Try adjusting your search or filter criteria
          </Text>
        </View>
      )}

      {/* Bottom Navigation */}
      <View className="absolute bottom-0 left-0 right-0 flex-row justify-around py-4 bg-white border-t border-gray-200 shadow-lg">
        <TouchableOpacity 
          className="items-center"
          onPress={() => router.push("/customer/customerDashboard")}
        >
          <Ionicons name="home-outline" size={24} color="#9CA3AF" />
          <Text className="mt-1 text-xs text-gray-500">Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="items-center"
          onPress={() => router.push("/customer/Cateory")}
        >
          <Ionicons name="grid" size={24} color="#8B5CF6" />
          <Text className="mt-1 text-xs font-semibold text-purple-600">Category</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="items-center"
          onPress={() => router.push("/customer/cart")}
        >
          <Ionicons name="cart-outline" size={24} color="#9CA3AF" />
          <Text className="mt-1 text-xs text-gray-500">Cart</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="items-center"
          onPress={() => router.push("/customer/orders")}
        >
          <Ionicons name="receipt-outline" size={24} color="#9CA3AF" />
          <Text className="mt-1 text-xs text-gray-500">Orders</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="items-center"
          onPress={() => router.push("/customer/profile")}
        >
          <Ionicons name="person-outline" size={24} color="#9CA3AF" />
          <Text className="mt-1 text-xs text-gray-500">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}