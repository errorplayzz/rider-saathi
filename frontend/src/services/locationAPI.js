import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Location API service for real-time rider tracking
 */
export const locationAPI = {
  /**
   * Update user's current location
   * @param {Object} locationData - Location data
   * @param {number} locationData.latitude - Latitude
   * @param {number} locationData.longitude - Longitude
   * @param {number} [locationData.heading] - Heading in degrees (0-360)
   * @param {number} [locationData.speed] - Speed in km/h
   * @param {number} [locationData.accuracy] - GPS accuracy in meters
   * @returns {Promise} API response
   */
  updateLocation: async (locationData) => {
    const response = await api.post('/location/update', locationData);
    return response.data;
  },

  /**
   * Get nearby riders with friend/stranger filtering
   * Server applies 5km/15km radius rules automatically
   * @returns {Promise} Object with riders array and stats
   */
  getNearbyRiders: async () => {
    const response = await api.get('/location/nearby');
    return response.data;
  },

  /**
   * Get specific rider's location (if visible)
   * @param {string} riderId - User ID of the rider
   * @returns {Promise} Rider location data
   */
  getRiderLocation: async (riderId) => {
    const response = await api.get(`/location/rider/${riderId}`);
    return response.data;
  },

  /**
   * Update visibility settings
   * @param {Object} settings - Visibility settings
   * @param {boolean} [settings.visibleToFriends] - Visible to friends
   * @param {boolean} [settings.visibleToNearby] - Visible to nearby strangers
   * @param {boolean} [settings.emergencyMode] - Emergency mode (overrides other settings)
   * @returns {Promise} Updated settings
   */
  updateVisibility: async (settings) => {
    const response = await api.put('/location/visibility', settings);
    return response.data;
  },

  /**
   * Stop sharing location
   * @returns {Promise} API response
   */
  stopSharing: async () => {
    const response = await api.delete('/location');
    return response.data;
  },

  /**
   * Get own location sharing status
   * @returns {Promise} Location sharing status
   */
  getLocationStatus: async () => {
    const response = await api.get('/location/status');
    return response.data;
  },
};

export default locationAPI;
