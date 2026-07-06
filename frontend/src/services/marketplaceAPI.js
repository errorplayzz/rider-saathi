import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const marketplaceAPI = {
  getOverview: async () => {
    const { data } = await api.get('/marketplace/overview')
    return data
  },

  getListings: async (params = {}) => {
    const { data } = await api.get('/marketplace/listings', { params })
    return data
  },

  createListing: async (payload) => {
    const { data } = await api.post('/marketplace/listings', payload)
    return data
  },

  getMyListings: async () => {
    const { data } = await api.get('/marketplace/listings/mine')
    return data
  },

  updateListing: async (listingId, payload) => {
    const { data } = await api.put(`/marketplace/listings/${listingId}`, payload)
    return data
  },

  deleteListing: async (listingId) => {
    const { data } = await api.delete(`/marketplace/listings/${listingId}`)
    return data
  },

  placeOrder: async (payload) => {
    const { data } = await api.post('/marketplace/orders', payload)
    return data
  },

  getMyOrders: async () => {
    const { data } = await api.get('/marketplace/orders/mine')
    return data
  },

  getSellerOrders: async () => {
    const { data } = await api.get('/marketplace/orders/seller')
    return data
  },

  updateOrderStatus: async (orderId, status) => {
    const { data } = await api.put(`/marketplace/orders/${orderId}/status`, { status })
    return data
  },

  createServiceRequest: async (payload) => {
    const { data } = await api.post('/marketplace/service-requests', payload)
    return data
  },

  getMyServiceRequests: async () => {
    const { data } = await api.get('/marketplace/service-requests/mine')
    return data
  },

  acceptServiceRequest: async (requestId) => {
    const { data } = await api.post(`/marketplace/service-requests/${requestId}/accept`)
    return data
  },

  createRiderHelpRequest: async (payload) => {
    const { data } = await api.post('/marketplace/rider-help', payload)
    return data
  },

  getNearbyRiderHelpRequests: async () => {
    const { data } = await api.get('/marketplace/rider-help/nearby')
    return data
  },

  acceptRiderHelpRequest: async (requestId) => {
    const { data } = await api.post(`/marketplace/rider-help/${requestId}/accept`)
    return data
  },

  resolveRiderHelpRequest: async (requestId) => {
    const { data } = await api.post(`/marketplace/rider-help/${requestId}/resolve`)
    return data
  },

  getRewards: async () => {
    const { data } = await api.get('/marketplace/rewards')
    return data
  },

  registerSeller: async (payload) => {
    const { data } = await api.post('/marketplace/seller/register', payload)
    return data
  }
}

export default marketplaceAPI
