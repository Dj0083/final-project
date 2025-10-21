import "./global.css";
import { AuthProvider } from "../context/AuthContext";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="sellerCenter" options={{ headerShown: false }} />
          <Stack.Screen
            name="/customer/customerDashboard"
            options={{
              headerShown: false,
              title: "Customer Dashboard",
            }}
          />
          <Stack.Screen name="adminDashboard" options={{ headerShown: false }} />
          <Stack.Screen name="investorDashboard" options={{ headerShown: false }} />
          <Stack.Screen name="affiliateDashboard" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
