// API helper for fetching live statistics
const RAW_API_BASE_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:5001'
const API_BASE_URL = RAW_API_BASE_URL.endsWith('/api')
  ? RAW_API_BASE_URL.slice(0, -4)
  : RAW_API_BASE_URL

export const getLiveNetworkStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stats/live-network`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch live network stats')
    }
    
    const data = await response.json()
    
    if (data.success) {
      return data.statistics
    }
    
    throw new Error(data.message || 'Failed to fetch stats')
  } catch (error) {
    console.error('Error fetching live network stats:', error)
    // Return default values on error
    return {
      ridersOnline: 0,
      emergenciesHandled: 0,
      avgResponseTime: '0',
      helpersNearby: 0,
      activeRides: 0,
      activeEmergencies: 0
    }
  }
}

export const getDashboardStats = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stats/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard stats')
    }
    
    const data = await response.json()
    
    if (data.success) {
      return data
    }
    
    throw new Error(data.message || 'Failed to fetch stats')
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return null
  }
}
