import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    console.log('Index screen loaded!');

    // Auto navigate to login after 2 seconds
    const timer = setTimeout(() => {
      console.log('Navigating to login...');
      router.push("/login");
    }, 2000);

    // Clean up timer
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Empowering</Text>
        <Text style={styles.subtitle}>Village Entrepreneurs</Text>
      </View>
      
      {/* Get Started Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={() => {
            console.log('Navigating to login');
            router.push("/login");
          }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
        
        {/* Skip to Login */}
        <TouchableOpacity onPress={() => router.push("/login")}>
          <Text style={styles.skipText}>
            Skip to Login
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fb923c',
    paddingHorizontal: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 24,
    color: 'white',
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fb923c',
  },
  skipText: {
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
