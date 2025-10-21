import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Central API base configuration for the app
// Prefer Expo public env; fallback to common localhost
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://192.168.43.219:5000';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Attach Authorization header automatically from SecureStore token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // no-op; leave request without auth header
    }
    return config;
  },
  (error) => Promise.reject(error)
);
