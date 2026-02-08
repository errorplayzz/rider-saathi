import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle, Polyline } from 'react-leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import {
  getActiveEmergencyAlerts,
  createEmergencyAlert,
  respondToEmergency
} from '../lib/supabaseHelpers'
import locationAPI from '../services/locationAPI'

// Fix default marker icon URLs used by React Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom colored marker icons for different map points
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Friend rider icon (cyan/blue)
const friendRiderIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Stranger rider icon (amber/yellow)
const strangerRiderIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const emergencyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const fuelIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Component to forward map events (click, locationfound) to the parent
const MapEventHandler = ({ onLocationUpdate, onMapClick }) => {
  const map = useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e.latlng)
      }
    },
    locationfound: (e) => {
      if (onLocationUpdate) {
        onLocationUpdate(e.latlng)
      }
    }
  })

  return null
}

const Map = () => {
  console.log('🗺️ MAP COMPONENT STARTING TO LOAD')
  console.log('🗺️ MAP: Current URL:', window.location.pathname)
  
  try {
  const [userLocation, setUserLocation] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [nearbyPOIs, setNearbyPOIs] = useState([])
  const [emergencyAlerts, setEmergencyAlerts] = useState([])
  const [selectedPOIType, setSelectedPOIType] = useState('fuel')
  const [isLoading, setIsLoading] = useState(false)
  const [weather, setWeather] = useState(null)
  const [routeData, setRouteData] = useState(null)
  const [destination, setDestination] = useState(null)
  const [showControls, setShowControls] = useState(true)
  const [otherRiders, setOtherRiders] = useState({})
  
  // Real-time rider tracking states
  const [nearbyRiders, setNearbyRiders] = useState([])
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(true)
  const [visibilitySettings, setVisibilitySettings] = useState({
    visibleToFriends: true,
    visibleToNearby: true,
    emergencyMode: false
  })
  
  // New states for search and routing
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [routeCoordinates, setRouteCoordinates] = useState([])
  const [routeInstructions, setRouteInstructions] = useState([])
  const [showRoutePanel, setShowRoutePanel] = useState(false)
  
  // Real-time navigation states
  const [isNavigating, setIsNavigating] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [remainingDistance, setRemainingDistance] = useState(0)
  const [remainingTime, setRemainingTime] = useState(0)
  const [nextInstruction, setNextInstruction] = useState(null)
  const [distanceToNextTurn, setDistanceToNextTurn] = useState(0)

  const { socket, updateLocation } = useSocket()
  const { user, profile } = useAuth()
  const { theme, isDark } = useTheme()
  
  console.log('🗺️ MAP AUTH STATE:', { user: !!user, profile: !!profile, userId: user?.id })
  
  // Track component lifecycle
  useEffect(() => {
    console.log('🗺️ MAP: Component mounted successfully!')
    console.log('🗺️ MAP: Component URL on mount:', window.location.pathname)
    
    return () => {
      console.log('🗺️ MAP: Component being unmounted!')
      console.log('🗺️ MAP: URL during unmount:', window.location.pathname)
    }
  }, [])
  
  // Early validation to prevent Map crashes
  if (!user) {
    console.log('🚨 MAP: No user found, ProtectedRoute should have caught this!')
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Authentication required for Map</p>
      </div>
    )
  }
  
  const mapRef = useRef()
  const watchIdRef = useRef(null)
  const lastSentRef = useRef(0)
  const lastPosRef = useRef(null)

  // Helper: compute haversine distance in meters between two coordinates
  const haversineDistance = (a, b) => {
    if (!a || !b) return Infinity
    const toRad = (v) => (v * Math.PI) / 180
    const R = 6371000 // meters
    const dLat = toRad(b.lat - a.lat)
    const dLon = toRad(b.lng - a.lng)
    const lat1 = toRad(a.lat)
    const lat2 = toRad(b.lat)

    const sinDLat = Math.sin(dLat / 2)
    const sinDLon = Math.sin(dLon / 2)
    const aHarv = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon
    const c = 2 * Math.atan2(Math.sqrt(aHarv), Math.sqrt(1 - aHarv))
    return R * c
  }

  // Get the user's current location and watch for updates; apply smoothing for a stable position
  useEffect(() => {

    if (!navigator.geolocation) return

    let initialFix = false

    const success = (position) => {
      const raw = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      }

      // Simple exponential moving average smoothing (keeps location stable)
      setUserLocation((prev) => {
        if (!prev) return { lat: raw.lat, lng: raw.lng }
        const alpha = 0.45 // smoothing factor: 0-1, higher = more reactive
        return {
          lat: prev.lat * (1 - alpha) + raw.lat * alpha,
          lng: prev.lng * (1 - alpha) + raw.lng * alpha
        }
      })

      setAccuracy(raw.accuracy)

      // Throttle updates to backend: send when moved more than 10m or at least every 5s
      const now = Date.now()
      const lastPos = lastPosRef.current
      const moved = lastPos ? haversineDistance(lastPos, raw) : Infinity
      if (moved > 10 || now - lastSentRef.current > 5000 || !lastPos) {
        // Send to backend using Socket.IO for real-time updates
        if (socket && locationSharingEnabled) {
          socket.emit('location:update', {
            latitude: raw.lat,
            longitude: raw.lng,
            heading: position.coords.heading || 0,
            speed: position.coords.speed ? (position.coords.speed * 3.6) : 0, // m/s to km/h
            accuracy: raw.accuracy
          })
        }
        
        // Also update via REST API for persistence
        updateLocation({ latitude: raw.lat, longitude: raw.lng, accuracy: raw.accuracy })
        
        lastPosRef.current = raw
        lastSentRef.current = now
      }

      // On first good fix, fetch nearby data
      if (!initialFix) {
        initialFix = true
        fetchWeather(raw.lat, raw.lng)
        fetchNearbyPOIs(raw.lat, raw.lng, selectedPOIType)
        fetchNearbyEmergencies(raw.lat, raw.lng)
        // Fetch nearby riders
        fetchNearbyRiders()
      }
    }

    const error = (err) => {
      console.error('Geolocation watch error:', err)
      if (!userLocation) setUserLocation({ lat: 28.6139, lng: 77.2090 })
    }

    const id = navigator.geolocation.watchPosition(success, error, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    })

    watchIdRef.current = id

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
    // Intentionally disable the exhaustive-deps rule for this effect to avoid repeated subscriptions
  }, [])

  // Fetch nearby riders periodically
  useEffect(() => {
    if (!userLocation || !locationSharingEnabled) return

    // Initial fetch
    fetchNearbyRiders()

    // Refresh every 30 seconds (backend does the filtering)
    const interval = setInterval(fetchNearbyRiders, 30000)

    return () => clearInterval(interval)
  }, [userLocation, locationSharingEnabled])

  // Real-time navigation tracking
  useEffect(() => {
    if (!isNavigating || !userLocation || !routeCoordinates || routeCoordinates.length === 0) return
    if (!routeInstructions || routeInstructions.length === 0) return

    // Calculate distance from current location to all route points
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3 // Earth radius in meters
      const φ1 = lat1 * Math.PI / 180
      const φ2 = lat2 * Math.PI / 180
      const Δφ = (lat2 - lat1) * Math.PI / 180
      const Δλ = (lon2 - lon1) * Math.PI / 180

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

      return R * c // Distance in meters
    }

    // Find the closest point on the route (routeCoordinates is array of [lat, lng])
    let closestIndex = 0
    let minDistance = Infinity
    
    routeCoordinates.forEach((coord, index) => {
      const dist = calculateDistance(userLocation.lat, userLocation.lng, coord[0], coord[1])
      if (dist < minDistance) {
        minDistance = dist
        closestIndex = index
      }
    })

    // Check if user went off route (more than 50 meters from route)
    if (minDistance > 50) {
      console.log('User went off route, recalculating...')
      // You could trigger route recalculation here
    }

    // Find current step based on closest route point
    let stepIndex = 0
    for (let i = 0; i < routeInstructions.length - 1; i++) {
      const stepCoordIndex = routeInstructions[i].index || 0
      if (closestIndex >= stepCoordIndex) {
        stepIndex = i
      }
    }

    setCurrentStepIndex(stepIndex)

    // Calculate remaining distance from current position to destination
    let remaining = 0
    for (let i = closestIndex; i < routeCoordinates.length - 1; i++) {
      remaining += calculateDistance(
        routeCoordinates[i][0],
        routeCoordinates[i][1],
        routeCoordinates[i + 1][0],
        routeCoordinates[i + 1][1]
      )
    }

    setRemainingDistance(Math.round(remaining))

    // Calculate distance to next turn
    if (stepIndex < routeInstructions.length - 1) {
      const nextStep = routeInstructions[stepIndex + 1]
      const nextStepIndex = Math.min(nextStep.index || closestIndex + 10, routeCoordinates.length - 1)
      const nextStepCoord = routeCoordinates[nextStepIndex]
      
      const distToTurn = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        nextStepCoord[0],
        nextStepCoord[1]
      )
      setDistanceToNextTurn(Math.round(distToTurn))
      setNextInstruction(nextStep.instruction)

      // Estimate remaining time (assuming average speed of 30 km/h for bike)
      const avgSpeed = 30 * 1000 / 60 // meters per minute
      setRemainingTime(Math.round(remaining / avgSpeed))

      // Voice guidance for turns (you can add audio synthesis here)
      if (distToTurn < 100 && distToTurn > 50) {
        console.log(`In 100 meters, ${nextStep.instruction}`)
      } else if (distToTurn < 50) {
        console.log(`In 50 meters, ${nextStep.instruction}`)
      }
    } else {
      // Last step - just show remaining distance to destination
      setNextInstruction('Continue to destination')
      const avgSpeed = 30 * 1000 / 60
      setRemainingTime(Math.round(remaining / avgSpeed))
      setDistanceToNextTurn(Math.round(remaining))
    }

    // Check if arrived at destination
    if (routeCoordinates.length > 0) {
      const destination = routeCoordinates[routeCoordinates.length - 1]
      const distToDestination = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        destination[0],
        destination[1]
      )
      
      if (distToDestination < 20) {
        console.log('Arrived at destination!')
        setIsNavigating(false)
        setNextInstruction('You have arrived at your destination')
      }
    }

  }, [userLocation, isNavigating, routeCoordinates, routeInstructions])

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket) return
    
    socket.on('emergency-alert', (alertData) => {
      setEmergencyAlerts(prev => [...prev, alertData])
    })

    // ═══════════════════════════════════════════════════════════════
    // REAL-TIME RIDER PROXIMITY TRACKING
    // ═══════════════════════════════════════════════════════════════

    // Join map tracking room
    socket.emit('map:join')

    // Handle incoming nearby riders data
    const handleRidersNearby = (data) => {
      if (data.riders) {
        setNearbyRiders(data.riders)
      }
    }

    // Handle rider location updates
    const handleRiderLocationUpdate = (data) => {
      setNearbyRiders(prev => {
        const existingIndex = prev.findIndex(r => r.userId === data.userId)
        if (existingIndex >= 0) {
          // Update existing rider with smooth transition
          const updated = [...prev]
          updated[existingIndex] = {
            ...updated[existingIndex],
            location: data.location,
            heading: data.heading,
            speed: data.speed,
            status: data.status,
            distance: data.distance
          }
          return updated
        }
        return prev
      })
    }

    // Handle rider entering visibility radius
    const handleRiderEnter = (data) => {
      if (data.rider) {
        setNearbyRiders(prev => {
          // Check if rider already exists
          const exists = prev.some(r => r.userId === data.rider.userId)
          if (!exists) {
            return [...prev, data.rider]
          }
          return prev
        })
      }
    }

    // Handle rider exiting visibility radius
    const handleRiderExit = (data) => {
      if (data.userId) {
        setNearbyRiders(prev => prev.filter(r => r.userId !== data.userId))
      }
    }

    // Register socket listeners
    socket.on('riders:nearby', handleRidersNearby)
    socket.on('rider:location:update', handleRiderLocationUpdate)
    socket.on('rider:enter', handleRiderEnter)
    socket.on('rider:exit', handleRiderExit)

    // ═══════════════════════════════════════════════════════════════
    // END REAL-TIME RIDER TRACKING
    // ═══════════════════════════════════════════════════════════════

    const handleRideStart = (payload) => {
      const p = payload
      const id = p?.ride?.id || p?.user?.id
      if (!id) return
      setOtherRiders(prev => ({
        ...prev,
        [p.user.id]: {
          user: p.user,
          ride: p.ride,
          location: p.location,
          shareLocation: p.shareLocation ?? true,
          lastSeen: Date.now()
        }
      }))
    }

    const handleLocationUpdate = (payload) => {
      const pd = payload
      const uid = pd?.userId || pd?.user?.id
      if (!uid) return
      setOtherRiders(prev => {
        if (!prev[uid]) return prev
        return {
          ...prev,
          [uid]: {
            ...prev[uid],
            location: pd.location || prev[uid].location,
            lastSeen: Date.now()
          }
        }
      })
    }

    const handleRideEnd = (payload) => {
      const uid = payload?.userId
      if (!uid) return
      setOtherRiders(prev => {
        const copy = { ...prev }
        delete copy[uid]
        return copy
      })
    }

    const handleShareChange = (payload) => {
      const uid = payload?.userId
      if (!uid) return
      setOtherRiders(prev => {
        const copy = { ...prev }
        if (copy[uid]) {
          if (payload.shareLocation === false) {
            delete copy[uid]
          } else {
            copy[uid].shareLocation = !!payload.shareLocation
          }
        }
        return copy
      })
    }

    socket.on('ride-start', handleRideStart)
    socket.on('location-update', handleLocationUpdate)
    socket.on('ride-end', handleRideEnd)
    socket.on('share-change', handleShareChange)

    return () => {
      // Cleanup real-time rider tracking
      socket.emit('map:leave')
      socket.off('riders:nearby', handleRidersNearby)
      socket.off('rider:location:update', handleRiderLocationUpdate)
      socket.off('rider:enter', handleRiderEnter)
      socket.off('rider:exit', handleRiderExit)
      
      // Cleanup old events
      socket.off('emergency-alert')
      socket.off('location-update')
      socket.off('ride-start')
      socket.off('ride-end')
      socket.off('share-change')
    }
  }, [socket])

  // ═══════════════════════════════════════════════════════════════
  // REAL-TIME RIDER TRACKING FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Fetch nearby riders from backend
   * Backend applies 5km/15km radius filtering automatically
   */
  const fetchNearbyRiders = async () => {
    if (!locationSharingEnabled) return

    try {
      const response = await locationAPI.getNearbyRiders()
      if (response.success && response.data) {
        setNearbyRiders(response.data.riders || [])
      }
    } catch (error) {
      console.error('Failed to fetch nearby riders:', error)
    }
  }

  /**
   * Toggle location sharing on/off
   */
  const toggleLocationSharing = async (enabled) => {
    try {
      if (enabled) {
        // Enable sharing - update location
        if (userLocation) {
          await locationAPI.updateLocation({
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            accuracy: accuracy || 10
          })
        }
        setLocationSharingEnabled(true)
      } else {
        // Disable sharing - stop location updates
        await locationAPI.stopSharing()
        setLocationSharingEnabled(false)
        setNearbyRiders([]) // Clear nearby riders
      }
    } catch (error) {
      console.error('Failed to toggle location sharing:', error)
    }
  }

  /**
   * Update visibility settings
   */
  const updateVisibilitySettings = async (settings) => {
    try {
      const response = await locationAPI.updateVisibility(settings)
      if (response.success) {
        setVisibilitySettings(response.data.visibility)
      }
    } catch (error) {
      console.error('Failed to update visibility settings:', error)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // END REAL-TIME RIDER TRACKING FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  const fetchWeather = async (lat, lng) => {
    try {
      // Prefer fetching weather from the backend first (it may aggregate or cache results)
      const API_BASE = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:5001'
      const token = (typeof session !== 'undefined' && session?.access_token) ? session.access_token : 'demo-token'

      const url = `${API_BASE.replace(/\/$/, '')}/api/weather/current?latitude=${lat}&longitude=${lng}`

      try {
        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })

        if (res.ok) {
          const body = await res.json()
          if (body && body.success && body.weather) {
            setWeather(body.weather)
            return
          }
        }
        throw new Error(`Backend weather API returned ${res.status}`)
      } catch (backendError) {
        console.log('Backend weather API failed, trying direct OpenWeather API...', backendError)

        // If backend fails, fall back to public weather APIs directly
        const weatherApiKey = import.meta.env.VITE_OPENWEATHER_API_KEY

        // Try OpenMeteo first — generally accurate and free to use
        try {
          const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`
          console.log(`🌐 Trying OpenMeteo API (most accurate free API)...`)

          const meteoRes = await fetch(openMeteoUrl)
          if (meteoRes.ok) {
            const meteoData = await meteoRes.json()
            console.log('📦 OpenMeteo response:', meteoData)

            const weatherData = {
              location: {
                name: 'Current Location',
                country: 'IN',
                coordinates: { latitude: lat, longitude: lng }
              },
              current: {
                temperature: Math.round(meteoData.current_weather.temperature),
                feelsLike: Math.round(meteoData.current_weather.temperature - 2),
                humidity: meteoData.hourly.relative_humidity_2m[0] || 50,
                pressure: 1013,
                visibility: 10,
                windSpeed: meteoData.current_weather.windspeed,
                windDirection: meteoData.current_weather.winddirection,
                description: meteoData.current_weather.weathercode === 0 ? 'clear sky' :
                  meteoData.current_weather.weathercode <= 3 ? 'partly cloudy' : 'cloudy',
                main: meteoData.current_weather.weathercode === 0 ? 'Clear' : 'Clouds',
                icon: meteoData.current_weather.is_day ? '01d' : '01n'
              },
              rideConditions: {
                isGoodForRiding: meteoData.current_weather.weathercode <= 3 && meteoData.current_weather.windspeed < 15,
                warnings: meteoData.current_weather.windspeed > 15 ? ['Strong winds'] : [],
                recommendation: meteoData.current_weather.is_day ? 'Good for riding' : 'Night riding - use proper lighting'
              }
            }

            console.log('✅ Using OpenMeteo weather data (most accurate):', weatherData)
            setWeather(weatherData)
            return
          }
        } catch (meteoError) {
          console.log('⚠️ OpenMeteo failed, trying OpenWeather...', meteoError)
        }

        // Fall back to OpenWeather if earlier services fail or keys are missing
        if (weatherApiKey && weatherApiKey !== 'demo-api-key-replace-with-real-key') {
          try {
            const directUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${weatherApiKey}&units=metric`

            const directRes = await fetch(directUrl)
            if (directRes.ok) {
              const directData = await directRes.json()

              // Transform the data to match our expected format
              const weatherData = {
                location: {
                  name: directData.name,
                  country: directData.sys.country,
                  coordinates: { latitude: lat, longitude: lng }
                },
                current: {
                  temperature: Math.round(directData.main.temp),
                  feelsLike: Math.round(directData.main.feels_like),
                  humidity: directData.main.humidity,
                  pressure: directData.main.pressure,
                  visibility: directData.visibility / 1000,
                  windSpeed: directData.wind.speed,
                  windDirection: directData.wind.deg,
                  description: directData.weather[0].description,
                  main: directData.weather[0].main,
                  icon: directData.weather[0].icon
                },
                rideConditions: {
                  isGoodForRiding: !['rain', 'storm', 'snow'].some(condition =>
                    directData.weather[0].main.toLowerCase().includes(condition)
                  ) && directData.wind.speed <= 15 && directData.main.temp > 0 && directData.main.temp < 40,
                  warnings: [],
                  recommendation: 'Check weather conditions'
                }
              }

              setWeather(weatherData)
              return
            }
          } catch (directError) {
            console.error('Direct OpenWeather API failed:', directError)
          }
        }

        // Final fallback: use a safe default weather object
        setWeather({
          current: {
            temperature: 22,
            description: 'clear sky',
            humidity: 65,
            windSpeed: 2.5
          },
          rideConditions: {
            isGoodForRiding: true,
            warnings: [],
            recommendation: 'Good for riding'
          },
          location: {
            name: 'Current Location',
            country: 'IN'
          }
        })
      }
    } catch (error) {
      console.error('Weather fetch error:', error)
      // Set conservative fallback weather data
      setWeather({
        current: {
          temperature: 22,
          description: 'clear sky'
        },
        rideConditions: {
          isGoodForRiding: true,
          warnings: []
        }
      })
    }
  }

  const fetchNearbyPOIs = async (lat, lng, type) => {
    setIsLoading(true)
    try {
      // POI data should be fetched from a places provider (Google Places, Overpass, etc.)
      console.log('POI placeholder - integrate a places provider here')
      setNearbyPOIs([])
    } catch (error) {
      console.error('POI fetch error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchNearbyEmergencies = async (lat, lng) => {
    try {
      const alerts = await getActiveEmergencyAlerts(lng, lat, 10000)
      setEmergencyAlerts(alerts || [])
    } catch (error) {
      console.error('Emergency fetch error:', error)
    }
  }

  const calculateRoute = async (start, end) => {
    try {
      if (!start || !end) return

      // Use OSRM for route calculation
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`
      
      const response = await fetch(osrmUrl)
      const data = await response.json()

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        
        // Convert coordinates to Leaflet format [lat, lng]
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]])
        
        setRouteCoordinates(coordinates)
        setRouteData({
          distance: route.distance,
          duration: route.duration,
          geometry: coordinates
        })

        // Extract turn-by-turn instructions with coordinate indices
        const instructions = []
        let coordIndex = 0
        route.legs.forEach(leg => {
          leg.steps.forEach(step => {
            instructions.push({
              instruction: step.maneuver.type,
              distance: step.distance,
              duration: step.duration,
              name: step.name || 'Unnamed road',
              index: coordIndex,
              location: step.maneuver.location
            })
            // Estimate coordinate index for this step
            coordIndex += Math.floor(step.distance / 10) // Rough estimate
          })
        })
        setRouteInstructions(instructions)
        setShowRoutePanel(true)
        setIsNavigating(false) // Reset navigation state when new route calculated
      }
    } catch (error) {
      console.error('Route calculation error:', error)
      alert('Failed to calculate route. Please try again.')
    }
  }

  // Search location using Nominatim API
  const searchLocation = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([])
      return
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in`
      )
      const data = await response.json()
      setSearchResults(data)
      setShowSearchResults(true)
    } catch (error) {
      console.error('Search error:', error)
    }
  }

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchLocation(searchQuery)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const selectSearchResult = (result) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    
    setDestination({ lat, lng, name: result.display_name })
    setSearchQuery('')
    setShowSearchResults(false)
    
    if (userLocation) {
      calculateRoute(userLocation, { lat, lng })
    }

    // Fly to the selected location
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 15)
    }
  }

  const handleMapClick = (latlng) => {
    setDestination(latlng)
    if (userLocation) {
      calculateRoute(userLocation, latlng)
    }
  }

  const handlePOITypeChange = (type) => {
    setSelectedPOIType(type)
    if (userLocation) {
      fetchNearbyPOIs(userLocation.lat, userLocation.lng, type)
    }
  }

  const sendEmergencyAlert = async (type) => {
    if (!userLocation) {
      alert('Location not available')
      return
    }

    try {
      await createEmergencyAlert({
        user_id: user.id,
        alert_type: type,
        severity: 'high',
        location: {
          type: 'Point',
          coordinates: [userLocation.lng, userLocation.lat]
        },
        description: `Emergency alert sent from map`
      })

      alert('Emergency alert sent successfully!')
      // Refresh emergency alerts
      fetchNearbyEmergencies(userLocation.lat, userLocation.lng)
    } catch (error) {
      console.error('Emergency alert error:', error)
      alert('Failed to send emergency alert')
    }
  }

  if (!userLocation) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ink text-alabaster">
        <div className="text-center">
          <div className="loading-dots mb-4">
            <div></div>
            <div></div>
            <div></div>
          </div>
          <p className="text-dusty">Getting your location...</p>
        </div>
      </div>
    )
  }

  return (
    // Reserve space for the fixed navbar (h-16) so the map doesn't sit under it
    <div className="relative bg-ink" style={{ height: 'calc(100vh - 4rem)', marginTop: '4rem' }}>
      {/* Search Bar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1002] w-full max-w-md px-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search location..."
            className="w-full px-4 py-3 pl-12 pr-10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none"
          />
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                setShowSearchResults(false)
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
            >
              <XMarkIcon className="w-5 h-5 text-slate-400" />
            </button>
          )}
          
          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-900 rounded-xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 max-h-96 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => selectSearchResult(result)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors first:rounded-t-xl last:rounded-b-xl"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{result.display_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {result.type} • {result.class}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="map-shell"
        whenCreated={(mapInstance) => { mapRef.current = mapInstance }}
      >
        <TileLayer
          key={theme}
          url={isDark
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          }
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        <MapEventHandler onMapClick={handleMapClick} />

        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{
              color: '#06b6d4',
              weight: 4,
              opacity: 0.7
            }}
          />
        )}

        {/* User location marker */}
        <Circle
          center={[userLocation.lat, userLocation.lng]}
          radius={Math.min(accuracy || 40, 80)}
          pathOptions={{
            color: isDark ? 'rgba(148, 163, 184, 0.55)' : 'rgba(71, 85, 105, 0.35)',
            fillColor: isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(71, 85, 105, 0.12)',
            fillOpacity: 0.6,
            weight: 1
          }}
        />
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>
            <div className="text-center">
              <h3 className="font-semibold text-alabaster">Your Location</h3>
              <p className="text-sm text-dusty">
                {user?.name || 'Unknown User'}
              </p>
              {weather && (
                <div className="mt-2 p-2 bg-ink/70 rounded-lg ring-1 ring-dusty/10">
                  <p className="text-xs text-dusty">
                    {weather.current.temperature}°C - {weather.current.description}
                  </p>
                  <p className="text-xs text-dusty/80">
                    Wind: {weather.current.windSpeed} m/s
                  </p>
                </div>
              )}
            </div>
          </Popup>
        </Marker>

        {/* Destination marker */}
        {destination && (
          <Marker position={[destination.lat, destination.lng]}>
            <Popup>
              <div className="text-center max-w-xs">
                <h3 className="font-semibold text-slate-900 dark:text-white">Destination</h3>
                {destination.name && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{destination.name}</p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
                </p>
                {routeData && (
                  <div className="mt-2 p-2 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg">
                    <p className="text-xs text-cyan-700 dark:text-cyan-300">
                      📍 {(routeData.distance / 1000).toFixed(1)} km
                    </p>
                    <p className="text-xs text-cyan-700 dark:text-cyan-300">
                      ⏱️ {Math.round(routeData.duration / 60)} min
                    </p>
                  </div>
                )}
                <button
                  onClick={() => {
                    setDestination(null)
                    setRouteData(null)
                    setRouteCoordinates([])
                    setShowRoutePanel(false)
                  }}
                  className="mt-2 px-3 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  Clear
                </button>
              </div>
            </Popup>
          </Marker>
        )}

        {/* POI markers */}
        {nearbyPOIs.map((poi) => (
          <Marker
            key={poi.id}
            position={[poi.coordinates[1], poi.coordinates[0]]}
            icon={fuelIcon}
          >
            <Popup>
              <div className="text-center max-w-xs">
                <h3 className="font-semibold text-alabaster">{poi.name}</h3>
                <p className="text-sm text-dusty">{poi.address}</p>
                <p className="text-xs text-dusty/80">
                  Distance: {Math.round(poi.distance)} m
                </p>
                {poi.phone && (
                  <p className="text-xs text-dusty">📞 {poi.phone}</p>
                )}
                {poi.openingHours && (
                  <p className="text-xs text-dusty/80">🕒 {poi.openingHours}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Emergency alert markers */}
        {emergencyAlerts.filter(alert => alert.location && alert.location.coordinates && alert.location.coordinates.length >= 2).map((alert) => (
          <Marker
            key={alert.id}
            position={[alert.location.coordinates[1], alert.location.coordinates[0]]}
            icon={emergencyIcon}
          >
            <Popup>
              <div className="text-center max-w-xs">
                <h3 className="font-semibold text-red-400">🚨 {alert.type.toUpperCase()}</h3>
                <p className="text-sm text-dusty">{alert.description}</p>
                <p className="text-xs text-dusty/80">
                  Distance: {alert.distance ? Math.round(alert.distance) : 'N/A'} m
                </p>
                <p className="text-xs text-dusty/80">
                  Reported: {new Date(alert.createdAt).toLocaleTimeString()}
                </p>
                <button
                  onClick={async () => {
                    // Handle emergency response
                    if (confirm('Respond to this emergency?')) {
                      try {
                        await respondToEmergency(alert.id, user.id, {
                          message: 'On my way to help',
                          estimated_arrival_minutes: 10
                        })
                        alert('Response sent!')
                      } catch (error) {
                        console.error('Response error:', error)
                        alert('Failed to send response')
                      }
                    }
                  }}
                  className="mt-2 px-3 py-1 text-xs rounded-lg bg-red-500/15 text-red-300 ring-1 ring-red-500/30 hover:bg-red-500/25 transition-colors"
                >
                  Respond
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Other riders markers (active rides) */}
        {/** We'll render markers for otherRiders stored via ride-start events **/}
        {/** Build array from local window-dispatched state: read from window.__otherRiders if present **/}
        {Object.values(otherRiders).map((r) => {
          if (!r || !r.location || !r.shareLocation) return null
          const lat = r.location.lat || r.location.latitude
          const lng = r.location.lng || r.location.longitude
          if (!lat || !lng) return null
          const dist = haversineDistance({ lat: userLocation.lat, lng: userLocation.lng }, { lat, lng })
          return (
            <Marker key={`rider-${r.user.id}`} position={[lat, lng]} icon={userIcon}>
              <Popup>
                <div className="text-center max-w-xs">
                  {dist <= 1000 ? (
                    <>
                      <h3 className="font-semibold text-alabaster">{r.user.name}</h3>
                      <p className="text-sm text-dusty">{r.user.bike || 'Bike'}</p>
                      <p className="text-xs text-dusty/80">{Math.round(dist)} m away</p>
                      <div className="mt-2 text-xs text-dusty">
                        <p>Nearby — within 1 km</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="font-semibold text-alabaster">Rider nearby</h3>
                      <p className="text-xs text-dusty/80">{Math.round(dist)} m away</p>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* REAL-TIME NEARBY RIDERS - Friend vs Stranger Visibility */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {nearbyRiders.map((rider) => {
          if (!rider.location) return null
          
          const riderIcon = rider.isFriend ? friendRiderIcon : strangerRiderIcon
          const statusEmoji = rider.status === 'moving' ? '🏍️' : rider.status === 'stopped' ? '⏸️' : '⏹️'
          
          return (
            <Marker
              key={`nearby-rider-${rider.userId}`}
              position={[rider.location.lat, rider.location.lng]}
              icon={riderIcon}
            >
              <Popup className="rider-popup">
                <div className="text-center max-w-xs">
                  {rider.isFriend ? (
                    // Friend: Full information
                    <>
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <h3 className="font-semibold text-alabaster">{rider.name}</h3>
                        <span className="text-lg">{statusEmoji}</span>
                      </div>
                      {rider.bike?.model && (
                        <p className="text-sm text-dusty">{rider.bike.model}</p>
                      )}
                      <div className="mt-2 space-y-1 text-xs text-dusty">
                        <p className="font-medium text-cyan-400">
                          📍 {rider.distanceText} {rider.direction}
                        </p>
                        {rider.speed > 0 && (
                          <p>Speed: {Math.round(rider.speed)} km/h</p>
                        )}
                        <p className="text-cyan-300/70">✓ Friend</p>
                      </div>
                    </>
                  ) : (
                    // Stranger: Limited information
                    <>
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <h3 className="font-semibold text-alabaster">{rider.name}</h3>
                        <span className="text-lg">{statusEmoji}</span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-dusty">
                        <p className="font-medium text-amber-400">
                          📍 {rider.distanceText} {rider.direction}
                        </p>
                        <p className="text-amber-300/70">👤 Nearby Rider</p>
                      </div>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* END REAL-TIME NEARBY RIDERS */}
        {/* ═══════════════════════════════════════════════════════════════ */}

        {/* If current user has turned off location sharing, show a small corner summary visible only to them */}
        {profile?.preferences && profile.preferences.shareLocation === false && (
          <div className="absolute top-24 right-4 z-[1002]">
            <div className="bg-dusk p-3 rounded-xl text-sm max-w-xs shadow-card ring-1 ring-dusty/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center text-alabaster ring-1 ring-dusty/20">
                  {(profile?.name || user?.user_metadata?.name || 'U').charAt(0).toUpperCase()
                  }</div>
                <div>
                  <div className="font-semibold text-alabaster">You (hidden)</div>
                  <div className="text-xs text-dusty">{profile?.bike_model || 'Bike'}</div>
                </div>
              </div>
              <p className="text-xs text-dusty mt-2">Location sharing is OFF — only you can see your marker.</p>
            </div>
          </div>
        )}
      </MapContainer>

      {/* Toggle Button */}
      <button
        onClick={() => setShowControls(!showControls)}
        className="absolute top-4 left-4 z-[1001] bg-dusk text-dusty p-3 rounded-full shadow-card ring-1 ring-dusty/20 hover:text-alabaster transition-all"
        title={showControls ? "Hide Controls" : "Show Controls"}
      >
        {showControls ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Control Panel */}
      {showControls && (
        <div className="absolute top-20 left-4 z-[1000]">
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            className="bg-dusk rounded-2xl p-4 space-y-4 max-w-xs shadow-card ring-1 ring-dusty/20"
          >
            {/* Weather Info */}
            {weather && (
              <div className="text-center">
                <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-dusty mb-2">Weather</h3>
                <div className="flex items-center justify-between text-xs text-dusty">
                  <span>{weather.current.temperature}°C</span>
                  <span className="capitalize">{weather.current.description}</span>
                </div>
                {!weather.rideConditions.isGoodForRiding && (
                  <p className="text-xs text-red-400 mt-1">
                    ⚠️ Poor riding conditions
                  </p>
                )}
              </div>
            )}

            {/* POI Filter */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-dusty mb-2">Find Nearby</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: 'fuel', label: '⛽ Fuel', icon: '⛽' },
                  { type: 'repair', label: '🔧 Repair', icon: '🔧' },
                  { type: 'medical', label: '🏥 Medical', icon: '🏥' },
                  { type: 'food', label: '🍕 Food', icon: '🍕' }
                ].map(({ type, label, icon }) => (
                  <button
                    key={type}
                    onClick={() => handlePOITypeChange(type)}
                    className={`p-2 rounded-lg text-xs transition-all ${selectedPOIType === type
                        ? 'bg-accent/80 text-ink shadow-button'
                        : 'bg-ink/60 text-dusty hover:bg-ink/80 ring-1 ring-dusty/10'
                      }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              {isLoading && (
                <div className="loading-dots mt-2">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* RIDER TRACKING CONTROLS */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-dusty mb-2">
                🏍️ Nearby Riders
              </h3>
              
              {/* Location Sharing Toggle */}
              <div className="mb-3 p-2 rounded-lg bg-ink/40 ring-1 ring-dusty/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-dusty">Location Sharing</span>
                  <button
                    onClick={() => toggleLocationSharing(!locationSharingEnabled)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      locationSharingEnabled ? 'bg-accent' : 'bg-ink'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        locationSharingEnabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                {locationSharingEnabled && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-dusty/70">Visible to friends</span>
                      <button
                        onClick={() => updateVisibilitySettings({
                          ...visibilitySettings,
                          visibleToFriends: !visibilitySettings.visibleToFriends
                        })}
                        className={`text-xs px-2 py-0.5 rounded ${
                          visibilitySettings.visibleToFriends 
                            ? 'text-cyan-400 bg-cyan-400/10' 
                            : 'text-dusty/50 bg-ink/30'
                        }`}
                      >
                        {visibilitySettings.visibleToFriends ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-dusty/70">Visible to nearby</span>
                      <button
                        onClick={() => updateVisibilitySettings({
                          ...visibilitySettings,
                          visibleToNearby: !visibilitySettings.visibleToNearby
                        })}
                        className={`text-xs px-2 py-0.5 rounded ${
                          visibilitySettings.visibleToNearby 
                            ? 'text-amber-400 bg-amber-400/10' 
                            : 'text-dusty/50 bg-ink/30'
                        }`}
                      >
                        {visibilitySettings.visibleToNearby ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Nearby Riders Stats */}
              {locationSharingEnabled && nearbyRiders.length > 0 && (
                <div className="text-xs space-y-1">
                  <div className="flex justify-between text-dusty">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      Friends
                    </span>
                    <span className="font-semibold text-cyan-400">
                      {nearbyRiders.filter(r => r.isFriend).length}
                    </span>
                  </div>
                  <div className="flex justify-between text-dusty">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      Nearby
                    </span>
                    <span className="font-semibold text-amber-400">
                      {nearbyRiders.filter(r => !r.isFriend).length}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-dusty/10">
                    <button
                      onClick={fetchNearbyRiders}
                      className="w-full text-xs text-dusty hover:text-alabaster transition-colors"
                    >
                      🔄 Refresh
                    </button>
                  </div>
                </div>
              )}

              {locationSharingEnabled && nearbyRiders.length === 0 && (
                <p className="text-xs text-dusty/60 text-center py-2">
                  No riders nearby
                </p>
              )}

              {!locationSharingEnabled && (
                <p className="text-xs text-dusty/60 text-center py-2">
                  Enable to see nearby riders
                </p>
              )}
            </div>
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* END RIDER TRACKING CONTROLS */}
            {/* ═══════════════════════════════════════════════════════════════ */}

            {/* Emergency Buttons */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-red-400 mb-2">Emergency</h3>
              <div className="space-y-2">
                <button
                  onClick={() => sendEmergencyAlert('accident')}
                  className="w-full p-2 text-xs rounded-lg bg-red-50 text-red-700 ring-1 ring-red-200/80 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-200 dark:ring-red-500/40 dark:shadow-[0_10px_26px_-18px_rgba(220,38,38,0.65)] transition-colors"
                >
                  🚨 Accident Alert
                </button>
                <button
                  onClick={() => sendEmergencyAlert('breakdown')}
                  className="w-full p-2 text-xs rounded-lg bg-orange-50 text-orange-700 ring-1 ring-orange-200/80 hover:bg-orange-100 dark:bg-orange-500/20 dark:text-orange-200 dark:ring-orange-500/40 dark:shadow-[0_10px_26px_-18px_rgba(249,115,22,0.6)] transition-colors"
                >
                  🛠️ Breakdown Help
                </button>
                <button
                  onClick={() => sendEmergencyAlert('medical')}
                  className="w-full p-2 text-xs rounded-lg bg-purple-50 text-purple-700 ring-1 ring-purple-200/80 hover:bg-purple-100 dark:bg-purple-500/20 dark:text-purple-200 dark:ring-purple-500/40 dark:shadow-[0_10px_26px_-18px_rgba(168,85,247,0.6)] transition-colors"
                >
                  🏥 Medical Emergency
                </button>
              </div>
            </div>

            {/* Route Info */}
            {routeData && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-dusty mb-2">Route</h3>
                <div className="text-xs space-y-1 text-dusty">
                  <p>📍 Distance: {(routeData.distance / 1000).toFixed(1)} km</p>
                  <p>⏱️ Duration: {Math.round(routeData.duration / 60)} min</p>
                  <button
                    onClick={() => {
                      setDestination(null)
                      setRouteData(null)
                    }}
                    className="w-full p-1 rounded-lg bg-ink text-dusty hover:text-alabaster transition-colors"
                  >
                    Clear Route
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Emergency Alerts Counter */}
      {showControls && emergencyAlerts.length > 0 && (
        <div className="absolute top-20 right-4 z-[1000]">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-dusk rounded-full p-3 text-center shadow-card ring-1 ring-red-500/30"
          >
            <div className="text-red-400 text-lg font-bold">🚨</div>
            <div className="text-xs text-red-300">
              {emergencyAlerts.length} alerts
            </div>
          </motion.div>
        </div>
      )}

      {/* Instructions */}
      {showControls && !routeData && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000]">
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-full px-6 py-3 text-center shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700"
          >
            <p className="text-sm text-slate-700 dark:text-slate-300">
              🔍 Search location or click on map to set destination
            </p>
          </motion.div>
        </div>
      )}

      {/* Route Directions Panel */}
      {showRoutePanel && routeData && (
        <div className="absolute bottom-4 right-4 z-[1000] max-w-sm">
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 max-h-96 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Route Details</h3>
              <button
                onClick={() => setShowRoutePanel(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                <span className="text-sm text-slate-700 dark:text-slate-300">Distance</span>
                <span className="font-semibold text-cyan-700 dark:text-cyan-400">
                  {(routeData.distance / 1000).toFixed(1)} km
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <span className="text-sm text-slate-700 dark:text-slate-300">Duration</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {Math.round(routeData.duration / 60)} min
                </span>
              </div>
            </div>

            {routeInstructions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Turn-by-Turn Directions
                </h4>
                <div className="space-y-2">
                  {routeInstructions.slice(0, 10).map((instruction, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
                    >
                      <div className="flex-shrink-0 w-6 h-6 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded-full flex items-center justify-center text-xs font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-slate-900 dark:text-white capitalize">
                          {instruction.instruction.replace(/-/g, ' ')}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          {instruction.name}
                        </p>
                        {instruction.distance > 0 && (
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                            {instruction.distance > 1000 
                              ? `${(instruction.distance / 1000).toFixed(1)} km`
                              : `${Math.round(instruction.distance)} m`
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {routeInstructions.length > 10 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">
                      +{routeInstructions.length - 10} more steps
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setIsNavigating(true)
                  setCurrentStepIndex(0)
                  setShowRoutePanel(false)
                }}
                className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors font-medium text-sm"
              >
                Start Navigation
              </button>
              <button
                onClick={() => {
                  setDestination(null)
                  setRouteData(null)
                  setRouteCoordinates([])
                  setRouteInstructions([])
                  setShowRoutePanel(false)
                }}
                className="flex-1 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium text-sm"
              >
                Clear Route
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Real-time Navigation Panel */}
      {isNavigating && nextInstruction && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1001] w-full max-w-md px-4">
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 shadow-2xl text-white"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                {!isNaN(distanceToNextTurn) && distanceToNextTurn > 0 ? (
                  distanceToNextTurn < 1000 ? (
                    <div className="text-4xl font-bold mb-1 text-white">
                      {Math.round(distanceToNextTurn)} m
                    </div>
                  ) : (
                    <div className="text-4xl font-bold mb-1 text-white">
                      {(distanceToNextTurn / 1000).toFixed(1)} km
                    </div>
                  )
                ) : (
                  <div className="text-4xl font-bold mb-1 text-white">
                    -- m
                  </div>
                )}
                <p className="text-sm text-white/90 font-medium">to next turn</p>
              </div>
              <button
                onClick={() => {
                  setIsNavigating(false)
                  setShowRoutePanel(true)
                }}
                className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white/30 rounded-full flex items-center justify-center">
                  <span className="text-2xl">
                    {nextInstruction.includes('right') ? '➡️' : 
                     nextInstruction.includes('left') ? '⬅️' : 
                     nextInstruction.includes('straight') || nextInstruction.includes('continue') ? '⬆️' : '🔄'}
                  </span>
                </div>
                <p className="text-lg font-medium capitalize text-white">
                  {nextInstruction.replace(/-/g, ' ').replace(/_/g, ' ')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-xs text-white/80 font-medium mb-1">Remaining</p>
                <p className="text-lg font-semibold text-white">
                  {!isNaN(remainingDistance) && remainingDistance > 0 ? (
                    remainingDistance > 1000 
                      ? `${(remainingDistance / 1000).toFixed(1)} km`
                      : `${Math.round(remainingDistance)} m`
                  ) : '--'}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-xs text-white/80 font-medium mb-1">ETA</p>
                <p className="text-lg font-semibold text-white">
                  {!isNaN(remainingTime) && remainingTime > 0 ? `${remainingTime} min` : '--'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-white/90">
              <span className="font-medium">Step {currentStepIndex + 1} of {routeInstructions.length}</span>
              <button
                onClick={() => setShowRoutePanel(true)}
                className="hover:text-white transition-colors underline font-medium"
              >
                View all steps
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
  
  } catch (error) {
    console.error('🚨 MAP COMPONENT ERROR CAUGHT:', error)
    console.error('🚨 ERROR DETAILS:', error.message, error.stack)
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-900 text-white">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">🗺️ Map Loading Error</h2>
          <p className="mb-4">Map component crashed: {error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 px-4 py-2 rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }
}

export default Map