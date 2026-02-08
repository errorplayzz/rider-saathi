import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
import { motion, AnimatePresence, useSpring, useAnimation } from 'framer-motion'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useNetworkStatus, useNotifications } from '../hooks/useEnhancedFeatures'
import { 
  MagnifyingGlassIcon, 
  XMarkIcon, 
  ExclamationTriangleIcon,
  MapPinIcon,
  UsersIcon,
  SignalIcon,
  ClockIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Enhanced UI animations and transitions
const springConfig = { 
  type: "spring", 
  stiffness: 300, 
  damping: 30,
  mass: 0.8
}

const slideIn = {
  hidden: { x: -100, opacity: 0, scale: 0.8 },
  visible: { 
    x: 0, 
    opacity: 1, 
    scale: 1,
    transition: springConfig
  },
  exit: { 
    x: -100, 
    opacity: 0, 
    scale: 0.8,
    transition: { duration: 0.2 }
  }
}

const bounceIn = {
  hidden: { scale: 0, rotate: -180 },
  visible: { 
    scale: 1, 
    rotate: 0,
    transition: { 
      type: "bounce", 
      stiffness: 400,
      damping: 15
    }
  }
}

const pulseAnimation = {
  scale: [1, 1.1, 1],
  transition: {
    duration: 2,
    ease: "easeInOut",
    repeat: Infinity
  }
}

// Enhanced glassmorphism styles
const glassPanel = "bg-white/10 backdrop-blur-md border border-white/20 shadow-xl"
const glassPanelDark = "bg-black/20 backdrop-blur-md border border-white/10 shadow-2xl"
const textPrimary = "text-white"
const textSecondary = "text-white/70"
const buttonActive = "bg-blue-500/80 text-white border border-blue-400/50"
const buttonInactive = "bg-white/10 text-white/80 border border-white/20 hover:bg-white/20"
const neonGlow = "drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]"
const emerGlow = "drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]"
const createCustomIcon = (color, size = [25, 41]) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: size,
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })
}

// Icon definitions
const icons = {
  user: createCustomIcon('blue'),
  friend: createCustomIcon('blue'),
  stranger: createCustomIcon('gold'),
  emergency: createCustomIcon('red', [35, 51]),
  fuel: createCustomIcon('green'),
  food: createCustomIcon('orange'),
  hotel: createCustomIcon('violet')
}

// Map event handler component
const MapEventHandler = ({ onMapClick, onLocationUpdate }) => {
  const map = useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e.latlng)
      }
    },
    locationfound: (e) => {
      if (onLocationUpdate) {
        onLocationUpdate({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          accuracy: e.accuracy
        })
      }
    }
  })

  return null
}

// Custom hook for geolocation tracking
const useGeolocation = () => {
  const [location, setLocation] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [error, setError] = useState(null)
  const watchIdRef = useRef(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 5000
    }

    const success = (position) => {
      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }
      setLocation(newLocation)
      setAccuracy(position.coords.accuracy)
      setError(null)
    }

    const errorCallback = (error) => {
      setError(error.message)
      console.warn('Geolocation error:', error)
    }

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(success, errorCallback, options)

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return { location, accuracy, error }
}

// API utility functions
const RAW_API_BASE_URL =
  import.meta.env?.VITE_API_URL ||
  import.meta.env?.VITE_BACKEND_URL ||
  'http://localhost:5001'
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, '').replace(/\/api$/, '')

// Distance calculation utility (Haversine formula)
const calculateDistance = (pos1, pos2) => {
  const R = 6371000 // Earth's radius in meters
  const dLat = ((pos2.lat - pos1.lat) * Math.PI) / 180
  const dLng = ((pos2.lng - pos1.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((pos1.lat * Math.PI) / 180) *
      Math.cos((pos2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance in meters
}

// Main Enhanced Map Component with Advanced Error Handling & Performance Optimization
const EnhancedMap = memo(() => {
  useEffect(() => {
    console.log('🗺️ EnhancedMap: Initializing premium rider tracking system')
  }, [])

  // Core state with error handling
  const [mapReady, setMapReady] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [errors, setErrors] = useState({})
  const [retryAttempts, setRetryAttempts] = useState({})
  const [loadingStates, setLoadingStates] = useState({})
  
  // Rider tracking state
  const [nearbyRiders, setNearbyRiders] = useState([])
  const [friends, setFriends] = useState([])
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(true)
  
  // Emergency system state
  const [emergencyAlerts, setEmergencyAlerts] = useState([])
  const [showEmergencyPanel, setShowEmergencyPanel] = useState(false)
  const [isCreatingEmergency, setIsCreatingEmergency] = useState(false)
  
  // Navigation and routing state
  const [routeCoordinates, setRouteCoordinates] = useState([])
  const [routeInstructions, setRouteInstructions] = useState([])
  const [isNavigating, setIsNavigating] = useState(false)
  const [destination, setDestination] = useState(null)
  const [routeInfo, setRouteInfo] = useState(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  
  // Search and POI state with optimization
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [nearbyPOIs, setNearbyPOIs] = useState([])
  const [selectedPOICategory, setSelectedPOICategory] = useState('fuel')
  
  // UI state with animations
  const [showControls, setShowControls] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [mapInteractionMode, setMapInteractionMode] = useState('normal') // normal, emergency, navigation

  // Animation controls
  const controls = useAnimation()
  const controlPanelControls = useAnimation()
  
  // Hooks with memoization
  const { location: userLocation, accuracy, error: locationError } = useGeolocation()
  const { socket } = useSocket()
  const { user, profile, session } = useAuth()
  const { isDark } = useTheme()
  const { isOnline } = useNetworkStatus()
  const { showNotification, vibrateDevice } = useNotifications()

  const formatDistance = (meters) => {
    if (!Number.isFinite(meters)) return '--'
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
  }

  const formatDuration = (seconds) => {
    if (!Number.isFinite(seconds)) return '--'
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.round((seconds % 3600) / 60)
      return `${hours} h ${minutes} min`
    }
    return `${Math.round(seconds / 60)} min`
  }
  
  // Optimized refs
  const mapRef = useRef(null)
  const lastLocationUpdateRef = useRef(null)
  const searchTimeoutRef = useRef(null)
  const lastEmergencyFetchRef = useRef({ lat: null, lng: null, ts: 0 })
  const lastPoiFetchRef = useRef({ lat: null, lng: null, ts: 0, category: null })
  
  // API utility function with auth
  const apiCall = useCallback(async (endpoint, options = {}) => {
    try {
      // Get auth token from session or localStorage
      const token = session?.access_token || localStorage.getItem('token')
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers
        },
        ...options
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error)
      throw error
    }
  }, [session])
  const retryTimeoutRefs = useRef({})

  // Error handling with retry mechanisms
  const handleErrorWithRetry = useCallback(async (operation, operationName, maxRetries = 3) => {
    const currentRetries = retryAttempts[operationName] || 0
    
    try {
      setLoadingStates(prev => ({ ...prev, [operationName]: true }))
      setErrors(prev => ({ ...prev, [operationName]: null }))
      
      const result = await operation()
      
      // Reset retry count on success
      setRetryAttempts(prev => ({ ...prev, [operationName]: 0 }))
      setLoadingStates(prev => ({ ...prev, [operationName]: false }))
      
      return result
    } catch (error) {
      console.error(`❌ ${operationName} failed:`, error)
      
      if (currentRetries < maxRetries && isOnline) {
        const nextRetryIn = Math.pow(2, currentRetries) * 1000 // Exponential backoff
        
        showNotification({
          type: 'warning',
          title: `${operationName} Failed`,
          message: `Retrying in ${nextRetryIn/1000}s... (${currentRetries + 1}/${maxRetries})`,
          duration: nextRetryIn
        })
        
        setRetryAttempts(prev => ({ ...prev, [operationName]: currentRetries + 1 }))
        
        // Clear existing timeout
        if (retryTimeoutRefs.current[operationName]) {
          clearTimeout(retryTimeoutRefs.current[operationName])
        }
        
        retryTimeoutRefs.current[operationName] = setTimeout(() => {
          handleErrorWithRetry(operation, operationName, maxRetries)
        }, nextRetryIn)
      } else {
        setErrors(prev => ({ 
          ...prev, 
          [operationName]: {
            message: error.message,
            timestamp: Date.now(),
            retries: currentRetries
          }
        }))
        setLoadingStates(prev => ({ ...prev, [operationName]: false }))
        
        showNotification({
          type: 'error',
          title: `${operationName} Failed`,
          message: isOnline ? `Max retries exceeded: ${error.message}` : 'Check your connection',
          duration: 5000
        })
        
        vibrateDevice('error')
      }
      
      throw error
    }
  }, [retryAttempts, isOnline, showNotification, vibrateDevice])

  // Memoized loading indicator component
  const LoadingOverlay = useMemo(() => {
    if (!isLoading && !Object.values(loadingStates).some(Boolean)) return null
    
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[2000] flex items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
      >
        <div className={`${glassPanel} p-6 rounded-xl text-center`}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full mx-auto mb-4"
          />
          <p className="text-gray-700 font-medium">
            {Object.entries(loadingStates).find(([k, v]) => v)?.[0] || 'Loading map...'}
          </p>
        </div>
      </motion.div>
    )
  }, [isLoading, loadingStates])

  // Error recovery component
  const ErrorRecoveryPanel = useMemo(() => {
    const activeErrors = Object.entries(errors).filter(([k, v]) => v)
    if (activeErrors.length === 0) return null
    
    return (
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-4 right-4 z-[1500] max-w-sm"
      >
        <div className={`${glassPanel} p-4 rounded-lg border-l-4 border-red-500`}>
          <div className="flex items-start justify-between">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">Connection Issues</h3>
                <div className="mt-2 text-xs text-gray-600 space-y-1">
                  {activeErrors.slice(0, 2).map(([operation, error]) => (
                    <div key={operation}>
                      <span className="font-medium">{operation}:</span> {error.message}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setErrors({})}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          {!isOnline && (
            <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-700">
              📡 You're offline. Some features may be limited.
            </div>
          )}
        </div>
      </motion.div>
    )
  }, [errors, isOnline])

  // Default map center (Delhi, India)
  const DEFAULT_CENTER = [28.6139, 77.2090]
  const mapCenter = userLocation ? [userLocation.lat, userLocation.lng] : DEFAULT_CENTER
  const mapZoom = userLocation ? 15 : 10

  // Socket.io event handlers for real-time communication
  useEffect(() => {
    if (!socket || !user) return

    // Join user-specific room for location updates
    socket.emit('join-user-room', user.id)

    // Listen for nearby riders updates
    socket.on('riders-nearby', (riders) => {
      console.log('🚴‍♂️ Received nearby riders update:', riders.length)
      setNearbyRiders(riders)
    })

    // Listen for emergency alerts
    socket.on('emergency-alert', (alert) => {
      console.log('🚨 Emergency alert received:', alert)
      setEmergencyAlerts(prev => [...prev, alert])
    })

    // Listen for emergency updates
    socket.on('emergency-update', (updatedAlert) => {
      console.log('🔄 Emergency update received:', updatedAlert)
      setEmergencyAlerts(prev => 
        prev.map(alert => alert.id === updatedAlert.id ? updatedAlert : alert)
      )
    })

    return () => {
      socket.off('riders-nearby')
      socket.off('emergency-alert')
      socket.off('emergency-update')
    }
  }, [socket, user])

  // Update user location to backend and other riders
  useEffect(() => {
    if (!userLocation || !socket || !user || !locationSharingEnabled) return

    // Throttle location updates (every 5 seconds)
    const now = Date.now()
    if (lastLocationUpdateRef.current && now - lastLocationUpdateRef.current < 5000) {
      return
    }

    lastLocationUpdateRef.current = now

    // Emit location update to backend
    socket.emit('location-update', {
      userId: user.id,
      location: userLocation,
      accuracy: accuracy,
      timestamp: now
    })

    console.log('📍 Location updated to backend:', userLocation)
  }, [userLocation, socket, user, accuracy, locationSharingEnabled])

  // Fetch emergency alerts on map load with error handling
  useEffect(() => {
    if (!userLocation) return

    const now = Date.now()
    const last = lastEmergencyFetchRef.current
    if (last.lat !== null && last.lng !== null) {
      const distance = calculateDistance(
        { lat: userLocation.lat, lng: userLocation.lng },
        { lat: last.lat, lng: last.lng }
      )
      if (distance < 200 && now - last.ts < 30000) {
        return
      }
    }

    lastEmergencyFetchRef.current = {
      lat: userLocation.lat,
      lng: userLocation.lng,
      ts: now
    }

    const fetchEmergencyAlerts = async () => {
      try {
        // Backend expects GET with query parameters
        const params = new URLSearchParams({
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          radius: 10000 // 10km radius
        })
        const response = await apiCall(`/api/emergency/nearby?${params}`)
        const rawAlerts = Array.isArray(response)
          ? response
          : Array.isArray(response?.alerts)
            ? response.alerts
            : []
        const normalizedAlerts = rawAlerts
          .map(alert => {
            const coordinates = alert.location?.coordinates
            const lat = alert.location?.lat ?? (Array.isArray(coordinates) ? coordinates[1] : undefined)
            const lng = alert.location?.lng ?? (Array.isArray(coordinates) ? coordinates[0] : undefined)

            return {
              ...alert,
              location: { lat, lng },
              message: alert.message || alert.description,
              createdAt: alert.createdAt || alert.created_at
            }
          })
          .filter(alert => Number.isFinite(alert.location?.lat) && Number.isFinite(alert.location?.lng))

        setEmergencyAlerts(normalizedAlerts)
        console.log('✅ Emergency alerts loaded:', normalizedAlerts.length)
      } catch (error) {
        console.log('⚠️ Backend not available, using offline mode for emergency alerts')
        setEmergencyAlerts([])
      }
    }

    fetchEmergencyAlerts()
  }, [userLocation?.lat, userLocation?.lng]) // Only re-run if location actually changes

  // Search functionality using Nominatim with debouncing and error handling
  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    // Clear existing search timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Debounce search by 300ms
    searchTimeoutRef.current = setTimeout(async () => {
      const searchOperation = async () => {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
        )
        
        if (!response.ok) {
          throw new Error(`Search service unavailable (${response.status})`)
        }
        
        const results = await response.json()
        
        return results.map(item => ({
          id: item.place_id,
          name: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          type: item.type,
          address: item.address,
          importance: item.importance || 0
        })).sort((a, b) => b.importance - a.importance) // Sort by importance
      }

      try {
        const formattedResults = await handleErrorWithRetry(
          searchOperation, 
          'location search',
          2
        )
        setSearchResults(formattedResults)
        setShowSearchResults(true)
        
        showNotification({
          type: 'success',
          title: 'Search Complete',
          message: `Found ${formattedResults.length} locations`,
          duration: 2000
        })
      } catch (error) {
        console.error('❌ Search failed completely:', error)
        setSearchResults([])
        setShowSearchResults(false)
      }
    }, 300)
  }, [handleErrorWithRetry, showNotification])

  // Optimized POI search with caching
  const poiCache = useRef(new Map())
  
  const searchNearbyPOIs = useCallback(async (category, location) => {
    if (!location) return

    const cacheKey = `${category}-${location.lat.toFixed(3)}-${location.lng.toFixed(3)}`
    
    // Check cache first (valid for 5 minutes)
    const cached = poiCache.current.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < 300000) {
      setNearbyPOIs(cached.data)
      return
    }

    const poiOperation = async () => {
      const bbox = {
        south: location.lat - 0.01,
        north: location.lat + 0.01,
        west: location.lng - 0.01,
        east: location.lng + 0.01
      }

      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["amenity"="${category}"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
          way["amenity"="${category}"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
          relation["amenity"="${category}"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        );
        out geom;
      `

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: overpassQuery
      })

      if (!response.ok) {
        throw new Error(`POI service error (${response.status})`)
      }

      const data = await response.json()

      if (!data.elements) {
        throw new Error('Invalid POI data received')
      }

      return data.elements.map(element => {
        const lat = element.lat || (element.center ? element.center.lat : null)
        const lng = element.lon || (element.center ? element.center.lon : null)
        
        if (!lat || !lng) return null
        
        return {
          id: element.id,
          name: element.tags?.name || 'Unnamed Location',
          lat,
          lng,
          type: element.tags?.amenity || category,
          brand: element.tags?.brand,
          opening_hours: element.tags?.opening_hours,
          phone: element.tags?.phone,
          website: element.tags?.website,
          distance: calculateDistance(location, { lat, lng })
        }
      }).filter(Boolean).sort((a, b) => a.distance - b.distance).slice(0, 20)
    }

    try {
      const pois = await handleErrorWithRetry(
        poiOperation, 
        `${category} search`,
        2
      )
      
      // Cache the results
      poiCache.current.set(cacheKey, {
        data: pois,
        timestamp: Date.now()
      })
      
      setNearbyPOIs(pois)
      
      showNotification({
        type: 'info',
        title: 'POIs Updated',
        message: `Found ${pois.length} nearby ${category}s`,
        duration: 2000
      })
    } catch (error) {
      console.error(`❌ POI search failed for ${category}:`, error)
      setNearbyPOIs([])
    }
  }, [handleErrorWithRetry, showNotification])

  // Enhanced route calculation with traffic awareness
  const calculateRoute = useCallback(async (start, end) => {
    if (!start || !end) return

    const routeOperation = async () => {
      // Use OSRM for free routing
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?steps=true&alternatives=false&geometries=geojson&overview=full`
      )

      if (!response.ok) {
        throw new Error(`Routing service error (${response.status})`)
      }

      const data = await response.json()

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error('No route found between these points')
      }

      const route = data.routes[0]
      
      return {
        coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        instructions: route.legs[0]?.steps?.map((step, index) => {
          const roadName = step.name ? ` onto ${step.name}` : ''
          const modifier = step.maneuver?.modifier ? ` ${step.maneuver.modifier}` : ''
          const instruction =
            step.maneuver?.instruction ||
            `${step.maneuver?.type || 'Continue'}${modifier}${roadName}`

          return {
            id: index,
            instruction,
            distance: step.distance,
            duration: step.duration,
            type: step.maneuver?.type,
            location: step.maneuver?.location
              ? { lat: step.maneuver.location[1], lng: step.maneuver.location[0] }
              : null
          }
        }) || [],
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry
      }
    }

    try {
      setIsLoading(true)
      const routeData = await handleErrorWithRetry(
        routeOperation, 
        'route calculation',
        3
      )
      
      setRouteCoordinates(routeData.coordinates)
      setRouteInstructions(routeData.instructions)
      setCurrentStepIndex(0)
      setRouteInfo({
        distanceMeters: routeData.distance,
        durationSeconds: routeData.duration,
        estimatedFuel: ((routeData.distance / 1000) * 0.05).toFixed(1) // Rough estimate
      })
      setIsNavigating(true)
      setDestination(end)
      
      showNotification({
        type: 'success',
        title: 'Route Calculated',
        message: `${routeData.distance/1000} km • ${Math.round(routeData.duration/60)} min`,
        duration: 4000
      })
      
      vibrateDevice('success')
    } catch (error) {
      console.error('❌ Route calculation failed:', error)
      showNotification({
        type: 'error',
        title: 'Route Failed',
        message: 'Could not calculate route between points',
        duration: 4000
      })
    } finally {
      setIsLoading(false)
    }
  }, [handleErrorWithRetry, showNotification, vibrateDevice])

  useEffect(() => {
    if (!userLocation || routeInstructions.length === 0) return

    let closestIndex = -1
    let closestDistance = Infinity

    routeInstructions.forEach((step, index) => {
      if (!step.location) return
      const distance = calculateDistance(userLocation, step.location)
      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = index
      }
    })

    if (closestIndex !== -1 && closestIndex !== currentStepIndex) {
      setCurrentStepIndex(closestIndex)
    }
  }, [userLocation?.lat, userLocation?.lng, routeInstructions, currentStepIndex])

  // Memory management for cache cleanup
  useEffect(() => {
    const cleanup = () => {
      // Clear old cache entries (older than 30 minutes)
      const cutoff = Date.now() - 1800000
      for (const [key, value] of poiCache.current.entries()) {
        if (value.timestamp < cutoff) {
          poiCache.current.delete(key)
        }
      }
    }

    const interval = setInterval(cleanup, 300000) // Clean every 5 minutes
    return () => clearInterval(interval)
  }, [])

  // Optimized POI fetching with better error handling
  const fetchNearbyPOIs = useCallback(async (category = 'fuel') => {
    if (!userLocation) return

    // Prevent multiple simultaneous calls
    if (isLoading) return
  
    console.log(`🔍 Fetching ${category} POIs...`)
    setIsLoading(true)
    
    try {
      const overpassQuery = generateOverpassQuery(userLocation, category)
      
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
        signal: controller.signal,
        headers: {
          'Content-Type': 'text/plain'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`)
      }
      
      const data = await response.json()
      const pois = data.elements
        ?.filter(element => element.lat && element.lon)
        .map(element => ({
          id: element.id,
          name: element.tags?.name || `${category} station`,
          lat: element.lat,
          lng: element.lon,
          category: category,
          tags: element.tags || {}
        })) || []

      setNearbyPOIs(pois)
      console.log(`✅ Found ${pois.length} nearby ${category} POIs`)
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('⚠️ POI request timed out, using cached/default data')
      } else {
        console.log('⚠️ External POI service unavailable, using offline mode')
      }
      // Set empty array instead of keeping old data
      setNearbyPOIs([])
    } finally {
      setIsLoading(false)
    }
  }, [userLocation?.lat, userLocation?.lng])  // Only depend on actual location values

  const handlePOICategorySelect = useCallback((category) => {
    setSelectedPOICategory(category)
    fetchNearbyPOIs(category)
  }, [fetchNearbyPOIs])

  // Generate Overpass API query for different POI categories
  const generateOverpassQuery = (location, category) => {
    const radius = 5000 // 5km radius
    const { lat, lng } = location

    const queries = {
      fuel: `[amenity=fuel]`,
      food: `[amenity~"restaurant|fast_food|cafe"]`,
      hotel: `[tourism~"hotel|guest_house"]`,
      atm: `[amenity=atm]`,
      hospital: `[amenity=hospital]`
    }

    return `
      [out:json][timeout:25];
      (
        node${queries[category] || queries.fuel}(around:${radius},${lat},${lng});
      );
      out center;
    `
  }

  // Enhanced Emergency alert creation with offline support
  const createEmergencyAlert = useCallback(async (type = 'general', message = '') => {
    if (!userLocation || !user) {
      showNotification({
        type: 'error',
        title: 'Cannot Send Alert',
        message: 'Location or user information not available',
        duration: 4000
      })
      return
    }

    setIsCreatingEmergency(true)
    setMapInteractionMode('emergency')
    
    // Immediate visual feedback
    vibrateDevice('emergency')
    controls.start({
      scale: [1, 1.05, 1],
      transition: { duration: 0.3 }
    })

    const emergencyOperation = async () => {
      const alert = await apiCall('/api/emergency/alert', {
        method: 'POST',
        body: JSON.stringify({
          type: type,
          severity: type === 'medical' || type === 'fire' ? 'high' : 'medium',
          location: {
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            address: `${userLocation.lat}, ${userLocation.lng}`
          },
          description: message || `${type} emergency alert`
        })
      })

      // Emit to all nearby riders via socket
      if (socket && socket.connected) {
        socket.emit('emergency-alert', alert)
        console.log('📡 Emergency alert broadcasted via socket')
      }

      return alert
    }

    try {
      const alert = await handleErrorWithRetry(
        emergencyOperation, 
        'emergency alert', 
        3
      )

      setEmergencyAlerts(prev => [...prev, alert])
      setShowEmergencyPanel(false)
      setMapInteractionMode('normal')

      // Success feedback with enhanced animations
      showNotification({
        type: 'success',
        title: '🚨 Emergency Alert Sent',
        message: `${type.toUpperCase()} alert broadcasted to nearby riders`,
        duration: 6000,
        priority: 'high'
      })
      
      vibrateDevice('success')
      
      console.log('🚨 Emergency alert created and broadcasted:', alert)
    } catch (error) {
      setMapInteractionMode('normal')
      console.log('⚠️ Backend unavailable, creating local emergency alert')
      
      // Create local alert for offline mode
      const localAlert = {
        id: Date.now(),
        userId: user.id,
        username: user.name || profile?.name || 'Anonymous',
        type: type,
        message: message,
        location: userLocation,
        timestamp: Date.now(),
        severity: type === 'medical' ? 'critical' : type === 'accident' ? 'high' : 'normal',
        local: true
      }
      
      setEmergencyAlerts(prev => [...prev, localAlert])
      setShowEmergencyPanel(false)
      
      showNotification({
        type: 'warning',
        title: '🚨 Emergency Alert (Offline)',
        message: `${type.toUpperCase()} alert created locally. Will sync when online.`,
        duration: 6000,
        priority: 'high'
      })
      
      vibrateDevice('success')
    } finally {
      setIsCreatingEmergency(false)
    }
  }, [userLocation, user, profile, socket, handleErrorWithRetry, showNotification, vibrateDevice, controls])

  // Handle map click for route planning
  const handleMapClick = useCallback((latlng) => {
    if (!userLocation) return

    if (!destination) {
      setDestination(latlng)
      calculateRoute(userLocation, latlng)
    } else {
      // Clear existing route
      setDestination(null)
      setRouteCoordinates([])
      setRouteInstructions([])
      setRouteInfo(null)
      setCurrentStepIndex(0)
    }
  }, [userLocation, destination, calculateRoute])

  // Optimized POI loading with dependency optimization
  useEffect(() => {
    if (userLocation?.lat && userLocation?.lng) {
      const now = Date.now()
      const last = lastPoiFetchRef.current
      if (last.lat !== null && last.lng !== null && last.category === selectedPOICategory) {
        const distance = calculateDistance(
          { lat: userLocation.lat, lng: userLocation.lng },
          { lat: last.lat, lng: last.lng }
        )
        if (distance < 500 && now - last.ts < 120000) {
          return
        }
      }

      lastPoiFetchRef.current = {
        lat: userLocation.lat,
        lng: userLocation.lng,
        ts: now,
        category: selectedPOICategory
      }

      // Debounce POI fetching
      const timeoutId = setTimeout(() => {
        fetchNearbyPOIs(selectedPOICategory)
      }, 1000) // Wait 1 second before fetching
      
      return () => clearTimeout(timeoutId)
    }
  }, [userLocation?.lat, userLocation?.lng, selectedPOICategory, fetchNearbyPOIs])

  // Show loading screen while waiting for location
  if (!userLocation && !locationError) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-4"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="text-cyan-400 text-lg">Getting your location...</p>
          <p className="text-gray-400 text-sm">Please allow location access for the best experience</p>
        </motion.div>
      </div>
    )
  }

  console.log('🗺️ EnhancedMap: Rendering with location coordinates')

  return (
  <motion.div
    className="w-full relative overflow-hidden"
    style={{
      height: 'calc(100vh - 80px)', // Account for 80px navbar height
      marginTop: '80px', // Push content below fixed navbar
      background: isDark
        ? 'linear-gradient(135deg, #1e293b, #0f172a)'
        : 'linear-gradient(135deg, #f8fafc, #e2e8f0)'
    }}
    animate={controls}
  >
    {/* Enhanced Loading Overlay */}
    <AnimatePresence>
      {LoadingOverlay}
    </AnimatePresence>

    {/* Enhanced Error Recovery Panel - Disabled */}
    <AnimatePresence>
      {/* {ErrorRecoveryPanel} - Hidden per user request */}
    </AnimatePresence>

    {/* Network Status Indicator */}
    {!isOnline && (
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="absolute top-0 left-0 right-0 z-[2000] bg-orange-500 text-white text-center py-2 text-sm font-medium"
      >
        📡 You're offline - Some features may not work
      </motion.div>
    )}

    {/* Map Container with enhanced animations */}
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={`h-full w-full ${mapInteractionMode === 'emergency' ? 'ring-4 ring-red-500 ring-opacity-50' : ''}`}
    >
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          className="h-full w-full"
          ref={mapRef}
          zoomControl={false}
        >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <MapEventHandler 
          onMapClick={handleMapClick}
          onLocationUpdate={() => setMapReady(true)}
        />

        {/* User location marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={icons.user}>
            <Popup>
              <div className="text-center">
                <strong>📍 Your Location</strong><br />
                Accuracy: ±{Math.round(accuracy || 0)}m<br />
                <small>Lat: {userLocation.lat.toFixed(6)}<br />Lng: {userLocation.lng.toFixed(6)}</small>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Nearby riders markers */}
        {nearbyRiders.map(rider => (
          <Marker
            key={rider.id}
            position={[rider.location.lat, rider.location.lng]}
            icon={rider.isFriend ? icons.friend : icons.stranger}
          >
            <Popup>
              <div className="text-center">
                <strong>🚴‍♂️ {rider.name}</strong><br />
                <span className={rider.isFriend ? 'text-blue-600' : 'text-yellow-600'}>
                  {rider.isFriend ? 'Friend' : 'Nearby Rider'}
                </span><br />
                <small>Distance: {rider.distance?.toFixed(0)}m</small>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Emergency alerts markers */}
        {emergencyAlerts.map(alert => (
          <Marker
            key={alert.id}
            position={[alert.location.lat, alert.location.lng]}
            icon={icons.emergency}
          >
            <Popup>
              <div className="text-center space-y-2">
                <strong className="text-red-600">🚨 Emergency Alert</strong><br />
                <p className="font-semibold">{alert.type}</p>
                {alert.message && <p className="text-sm">{alert.message}</p>}
                <small className="text-gray-600">
                  {alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString() : 'Just now'}
                </small>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* POI markers */}
        {nearbyPOIs.map(poi => (
          <Marker
            key={poi.id}
            position={[poi.lat, poi.lng]}
            icon={icons[poi.category] || icons.fuel}
          >
            <Popup>
              <div className="text-center">
                <strong>{poi.name}</strong><br />
                <span className="capitalize text-sm text-gray-600">{poi.category}</span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Destination marker */}
        {destination && (
          <Marker position={[destination.lat, destination.lng]}>
            <Popup>
              <div className="text-center">
                <strong>🎯 Destination</strong><br />
                Click map again to clear route
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline 
            positions={routeCoordinates} 
            color="#3b82f6" 
            weight={4}
            opacity={0.7}
          />
        )}
      </MapContainer>

      {/* Control Panels and UI */}
      <AnimatePresence>
        {showControls && (
          <>
            {/* Search Panel */}
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className={`absolute top-4 left-4 z-[1000] ${isDark ? glassPanelDark : glassPanel} rounded-xl p-4 min-w-[300px]`}
            >
              <div className="relative">
                <MagnifyingGlassIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${textSecondary}`} />
                <input
                  type="text"
                  placeholder="Search places..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    handleSearch(e.target.value)
                  }}
                  className={`w-full pl-10 pr-4 py-2 ${isDark ? 'bg-black/30 border-white/20 text-white placeholder-white/50' : 'bg-white/20 border-white/30 text-white placeholder-white/70'} border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm`}
                />
              </div>

              {/* Search Results */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto">
                  {searchResults.map(result => (
                    <div
                      key={result.id}
                      onClick={() => {
                        setDestination({ lat: result.lat, lng: result.lng })
                        calculateRoute(userLocation, { lat: result.lat, lng: result.lng })
                        setShowSearchResults(false)
                        setSearchQuery('')
                      }}
                      className={`p-2 cursor-pointer rounded text-sm transition-colors ${buttonInactive} hover:${buttonActive.replace('bg-blue-500/80', 'bg-blue-500/60')} mt-1`}
                    >
                      <div className={`font-medium truncate ${textPrimary}`}>{result.name.split(',')[0]}</div>
                      <div className={`${textSecondary} text-xs truncate`}>{result.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* POI Category Selector */}
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className={`absolute top-4 right-4 z-[1000] ${isDark ? glassPanelDark : glassPanel} rounded-xl p-3`}
            >
              <div className="flex flex-col space-y-2">
                <h3 className={`text-sm font-semibold text-center ${textPrimary}`}>Find Places</h3>
                {[
                  { key: 'fuel', icon: '⛽', label: 'Fuel' },
                  { key: 'food', icon: '🍽️', label: 'Food' },
                  { key: 'hotel', icon: '🏨', label: 'Hotels' },
                  { key: 'atm', icon: '🏧', label: 'ATM' },
                  { key: 'hospital', icon: '🏥', label: 'Medical' }
                ].map(poi => (
                  <button
                    key={poi.key}
                    onClick={() => handlePOICategorySelect(poi.key)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                      selectedPOICategory === poi.key 
                        ? buttonActive 
                        : buttonInactive
                    }`}
                  >
                    <span className="text-lg">{poi.icon}</span>
                    <span className="font-medium">{poi.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Emergency Button - Hidden per user request */}
            {false && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={() => setShowEmergencyPanel(true)}
              className="absolute bottom-24 right-4 z-[1000] bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-lg"
            >
              <ExclamationTriangleIcon className="h-8 w-8" />
            </motion.button>
            )}

            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className={`absolute bottom-4 left-4 z-[1000] ${isDark ? glassPanelDark : glassPanel} rounded-xl p-3`}
            >
              <div className={`flex items-center space-x-2 text-sm`}>
                <UsersIcon className="h-5 w-5 text-blue-400" />
                <span className={`font-medium ${textPrimary}`}>{nearbyRiders.length} riders nearby</span>
              </div>
              {/* Emergency alerts counter hidden per user request */}
            </motion.div>

            {/* Route Info */}
            {routeInfo && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-blue-500 text-white rounded-xl shadow-lg p-3"
              >
                <div className="text-center">
                  <div className="font-bold">{formatDistance(routeInfo.distanceMeters)}</div>
                  <div className="text-sm opacity-90">{formatDuration(routeInfo.durationSeconds)}</div>
                </div>
              </motion.div>
            )}

            {routeInstructions.length > 0 && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className={`absolute bottom-20 right-4 z-[1000] ${isDark ? glassPanelDark : glassPanel} rounded-xl p-3 w-72 max-h-72 overflow-hidden`}
              >
                <div className={`text-sm font-semibold mb-2 ${textPrimary}`}>Route Steps</div>
                <div className="text-xs mb-2 text-blue-400">
                  Next: {routeInstructions[currentStepIndex]?.instruction || 'Continue'}
                </div>
                <div className="space-y-2 overflow-y-auto max-h-48 pr-1">
                  {routeInstructions.map((step, index) => (
                    <div
                      key={step.id}
                      className={`rounded-md p-2 text-xs ${
                        index === currentStepIndex
                          ? 'bg-blue-500/20 border border-blue-400/40'
                          : 'bg-black/10'
                      }`}
                    >
                      <div className={`font-medium ${textPrimary}`}>{step.instruction}</div>
                      <div className={`${textSecondary}`}>
                        {formatDistance(step.distance)} • {formatDuration(step.duration)}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] bg-black/50 text-white px-4 py-2 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Loading...</span>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Emergency Alert Panel */}
      <AnimatePresence>
        {showEmergencyPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${isDark ? glassPanelDark : glassPanel} rounded-xl p-6 max-w-sm w-full`}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-xl font-bold text-red-400 ${textPrimary}`}>🚨 Emergency Alert</h2>
                <button
                  onClick={() => setShowEmergencyPanel(false)}
                  className={`${textSecondary} hover:${textPrimary} transition-colors`}
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <p className={`${textSecondary}`}>
                  This will send an emergency alert to all nearby riders and emergency services.
                </p>

                <div className="space-y-2">
                  {[
                    { type: 'accident', label: '🚗 Accident', color: 'bg-red-500' },
                    { type: 'breakdown', label: '🔧 Breakdown', color: 'bg-yellow-500' },
                    { type: 'medical', label: '🏥 Medical Emergency', color: 'bg-red-600' },
                    { type: 'general', label: '⚠️ General Help', color: 'bg-blue-500' }
                  ].map(emergency => (
                    <button
                      key={emergency.type}
                      onClick={() => createEmergencyAlert(emergency.type)}
                      disabled={isCreatingEmergency}
                      className={`w-full text-left p-3 rounded-lg text-white font-medium ${emergency.color} hover:opacity-90 transition-opacity disabled:opacity-50`}
                    >
                      {emergency.label}
                    </button>
                  ))}
                </div>

                {isCreatingEmergency && (
                  <div className="text-center py-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-400 mx-auto"></div>
                    <p className={`text-sm ${textSecondary} mt-2`}>Sending alert...</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Controls Toggle with animations */}
      <motion.button
        onClick={() => {
          setShowControls(!showControls)
          controlPanelControls.start({
            scale: [1, 1.1, 1],
            transition: { duration: 0.2 }
          })
          vibrateDevice('light')
        }}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        animate={controlPanelControls}
        className={`${glassPanel} absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg border border-white/20`}
      >
        {showControls ? (
          <span className="flex items-center gap-2">
            <EyeSlashIcon className="h-4 w-4" />
            Hide
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <EyeIcon className="h-4 w-4" />
            Show
          </span>
        )} Controls
      </motion.button>
      </motion.div>
    </motion.div>
  )
})

export default EnhancedMap