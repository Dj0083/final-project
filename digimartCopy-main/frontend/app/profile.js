import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";

export default function Profile() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-orange-400">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4">
        <Pressable onPress={() => router.push("/sellerCenter")}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </Pressable>
        <Text className="text-xl font-bold text-white">My Profile</Text>
        <Pressable onPress={() => console.log("Logout")}>
          <Ionicons name="log-out-outline" size={28} color="white" />
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 p-4 bg-pink-50 rounded-t-3xl">
        {/* Profile Card */}
        <View className="items-center p-4 mb-6 bg-white shadow rounded-2xl">
          <Image
            source={{ uri: "https://randomuser.me/api/portraits/women/44.jpg" }}
            className="w-20 h-20 rounded-full"
          />
          <Text className="mt-3 text-lg font-bold">Sayu Store</Text>
          <Text className="text-gray-600">Seller ID: 12345</Text>

          {/* View My Details */}
          <Pressable
            onPress={() => router.push("/viewMyDetails")}
            className="flex-row items-center px-5 py-2 mt-3 bg-orange-400 rounded-full shadow"
          >
            <Ionicons name="person-outline" size={20} color="white" />
            <Text className="ml-2 font-semibold text-white">View My Details</Text>
          </Pressable>
        </View>

        {/* Buttons Row */}
        <View className="flex-row mb-3">
          <Pressable
            onPress={() => router.push("/shopHomepage")}
            className="flex-row items-center justify-center flex-1 p-4 mr-2 bg-white shadow rounded-xl"
          >
            <Ionicons name="home-outline" size={22} color="black" />
            <Text className="ml-2 text-base font-medium">Shop Homepage</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/shareShop")}
            className="flex-row items-center justify-center flex-1 p-4 bg-white shadow rounded-xl"
          >
            <Ionicons name="share-social-outline" size={22} color="black" />
            <Text className="ml-2 text-base font-medium">Share Shop</Text>
          </Pressable>
        </View>

        {/* Account Setting */}
        <Pressable
          onPress={() => router.push("/accountSetting")}
          className="flex-row items-center justify-between p-4 mb-3 bg-white shadow rounded-xl"
        >
          <View className="flex-row items-center">
            <Ionicons name="settings-outline" size={22} color="black" />
            <Text className="ml-2 text-base font-medium">Account Setting</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="gray" />
        </Pressable>

        {/* Business Upgrades */}
        <View className="p-4 mb-3 bg-white shadow rounded-xl">
          <Text className="mb-3 text-base font-bold">Business Upgrades</Text>

          <Pressable
            onPress={() => router.push("/affiliateConnection")}
            className="flex-row items-center p-3 mb-2 bg-gray-100 rounded-lg"
          >
            <MaterialCommunityIcons name="account-multiple" size={20} color="black" />
            <Text className="ml-2 text-base">Affiliate Connection</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/investorConnection")}
            className="flex-row items-center p-3 bg-gray-100 rounded-lg"
          >
            <FontAwesome5 name="handshake" size={18} color="black" />
            <Text className="ml-2 text-base">Investor Connection</Text>
          </Pressable>
        </View>

        {/* Chat Support */}
        <Pressable className="flex-row items-center justify-center p-4 mb-3 bg-gray-200 rounded-xl">
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="black" />
          <Text className="ml-2 text-base font-medium">Chat with us</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
