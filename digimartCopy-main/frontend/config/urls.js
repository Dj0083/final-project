// Centralized URL configuration
// Import BASE_URL from api.js to ensure consistency
import { BASE_URL } from '../api';

// Get the base URL without /api suffix for image URLs
export const getImageBaseUrl = () => {
  return BASE_URL.replace(/\/api\/?$/, '');
};

// Build full image URL from relative path
export const buildImageUrl = (imagePath) => {
  if (!imagePath) return 'https://via.placeholder.com/300x300';
  
  // If already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  const baseUrl = getImageBaseUrl();
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  
  return `${baseUrl}${path}`;
};

// Export current backend URL (for display purposes)
export const getCurrentBackendUrl = () => BASE_URL;

// Export just the host:port for images
export const IMAGE_BASE_URL = getImageBaseUrl();

export default {
  BASE_URL,
  IMAGE_BASE_URL,
  buildImageUrl,
  getImageBaseUrl,
  getCurrentBackendUrl
};
