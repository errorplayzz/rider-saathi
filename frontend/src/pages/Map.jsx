import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle, Polyline } from 'react-leaflet'
import gsap from 'gsap';
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import {
  MagnifyingGlassIcon, XMarkIcon, HomeIcon, BriefcaseIcon, MicrophoneIcon,
  EyeIcon, EyeSlashIcon, BeakerIcon, SparklesIcon, BuildingOfficeIcon,
  WrenchScrewdriverIcon, PlusCircleIcon, ShieldExclamationIcon,
  ViewfinderCircleIcon, MapIcon, Square3Stack3DIcon, MapPinIcon, RocketLaunchIcon
} from '@heroicons/react/24/outline';
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
// Premium Custom Map Markers replacing generic Leaflet pins
const userPremiumIcon = new L.divIcon({
  className: 'bg-transparent border-none',
  html: `<div class="relative w-8 h-8 flex items-center justify-center">
          <div class="absolute inset-0 bg-white/20 rounded-full animate-[ping_2s_ease-in-out_infinite]"></div>
          <div class="w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,1)] border-[3px] border-[#090909]"></div>
         </div>`,
  iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16]
});

const destinationIcon = new L.divIcon({
  className: 'bg-transparent border-none',
  html: `<div class="w-6 h-6 rounded-full bg-[#B08968] shadow-[0_0_20px_rgba(176,137,104,0.6)] border-2 border-white/20 animate-bounce"></div>`,
  iconSize: [24, 24], iconAnchor: [12, 24], popupAnchor: [0, -24]
});

const emergencyPremiumIcon = new L.divIcon({
  className: 'bg-transparent border-none',
  html: `<div class="relative w-10 h-10 flex items-center justify-center">
          <div class="absolute inset-0 bg-red-500/40 rounded-full animate-[ping_1.5s_ease-in-out_infinite]"></div>
          <div class="w-5 h-5 bg-red-500 rounded-full shadow-[0_0_25px_rgba(239,68,68,1)] border-2 border-white/30"></div>
         </div>`,
  iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20]
});

const poiPremiumIcon = new L.divIcon({
  className: 'bg-transparent border-none',
  html: `<div class="w-4 h-4 rounded-full bg-slate-300 shadow-[0_0_10px_rgba(255,255,255,0.4)] border border-white/10 hover:scale-150 transition-transform duration-300"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8]
});

const friendPremiumIcon = new L.divIcon({
  className: 'bg-transparent border-none',
  html: `<div class="w-4 h-4 rounded-full bg-[#B08968] shadow-[0_0_15px_rgba(176,137,104,0.6)] border border-[#090909] hover:scale-150 transition-transform duration-300"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8]
});

const strangerPremiumIcon = new L.divIcon({
  className: 'bg-transparent border-none',
  html: `<div class="w-4 h-4 rounded-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)] border border-[#090909] hover:scale-150 transition-transform duration-300"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8]
});



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

  const containerRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      // Entrance animations for panels
      gsap.fromTo(".panel-top-left", 
        { opacity: 0, x: -30, filter: 'blur(10px)' }, 
        { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.8, ease: "power3.out", delay: 0.2 }
      );
      gsap.fromTo(".panel-top-center", 
        { opacity: 0, y: -20 }, 
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", delay: 0.3 }
      );
      gsap.fromTo(".panel-top-right", 
        { opacity: 0, x: 30, filter: 'blur(10px)' }, 
        { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.8, ease: "power3.out", delay: 0.4 }
      );
      gsap.fromTo(".panel-bottom-left", 
        { opacity: 0, y: 30 }, 
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 0.5 }
      );
      gsap.fromTo(".panel-bottom-center", 
        { opacity: 0, y: 40, scale: 0.95 }, 
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.2)", delay: 0.6 }
      );
      gsap.fromTo(".panel-bottom-right", 
        { opacity: 0, scale: 0.5 }, 
        { opacity: 1, scale: 1, duration: 0.8, ease: "elastic.out(1, 0.5)", delay: 0.7 }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [showControls]);

  return (
    <div ref={containerRef} className="relative bg-[#090909] font-sans overflow-hidden" style={{ height: 'calc(100vh - 4rem)', marginTop: '4rem' }}>
      
      {/* Search Panel (Top Left) */}
      <div className="panel-top-left absolute top-6 left-6 z-[1002] w-full max-w-sm pointer-events-auto">
        <div className="bg-[#111111]/80 backdrop-blur-3xl rounded-[24px] p-2 ring-1 ring-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Where to?"
              className="w-full bg-transparent text-[#F5F5F7] px-4 py-3 pl-12 rounded-xl focus:bg-white/5 outline-none transition-colors placeholder:text-[#86868B]"
            />
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-full transition-colors group">
              <MicrophoneIcon className="w-4 h-4 text-[#86868B] group-hover:text-[#B08968]" />
            </button>
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setShowSearchResults(false); }}
                className="absolute right-10 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-full transition-colors"
              >
                <XMarkIcon className="w-4 h-4 text-[#86868B]" />
              </button>
            )}
          </div>

          <div className="flex justify-between mt-2 px-2 pb-2 gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-xs text-[#F5F5F7]">
              <HomeIcon className="w-3.5 h-3.5 text-[#B08968]" /> Home
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-xs text-[#F5F5F7]">
              <BriefcaseIcon className="w-3.5 h-3.5 text-[#B08968]" /> Work
            </button>
          </div>
          
          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="mt-2 border-t border-white/5 pt-2 max-h-64 overflow-y-auto custom-scrollbar">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => selectSearchResult(result)}
                  className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors rounded-xl flex flex-col gap-1"
                >
                  <p className="text-sm font-medium text-[#F5F5F7] truncate">{result.display_name}</p>
                  <p className="text-[10px] text-[#86868B] uppercase tracking-widest truncate">
                    {result.type}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Status Pill (Top Center) */}
      <div className="panel-top-center absolute top-6 left-1/2 transform -translate-x-1/2 z-[1002] pointer-events-auto">
        <div className="bg-[#111111]/90 backdrop-blur-3xl rounded-full px-6 py-3 flex items-center gap-6 ring-1 ring-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
          <button 
            onClick={() => setShowControls(!showControls)}
            className="flex items-center gap-2 text-xs font-medium hover:opacity-80 transition-opacity"
          >
            {showControls ? <EyeSlashIcon className="w-4 h-4 text-[#86868B]" /> : <EyeIcon className="w-4 h-4 text-[#86868B]" />}
            <span className="text-[#86868B]">Controls</span>
          </button>
          <div className="w-[1px] h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${userLocation ? 'bg-green-500 text-green-500' : 'bg-orange-500 text-orange-500'}`} />
            <span className="text-xs font-medium text-[#F5F5F7] uppercase tracking-widest">{userLocation ? 'Live GPS' : 'Searching'}</span>
          </div>
          <div className="w-[1px] h-4 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-[#B08968]">Sport Mode</span>
          </div>
        </div>
      </div>

      {/* Quick POI Chips (Top Right) */}
      <div className="panel-top-right absolute top-6 right-6 z-[1002] pointer-events-auto flex flex-col gap-3">
        <div className="text-[10px] font-semibold text-right text-[#86868B] uppercase tracking-[0.2em] mb-1 mr-1">Find Places</div>
        {[
          { type: 'fuel', label: 'Fuel', icon: BeakerIcon },
          { type: 'food', label: 'Food', icon: SparklesIcon },
          { type: 'hotels', label: 'Hotels', icon: BuildingOfficeIcon },
          { type: 'repair', label: 'Repair', icon: WrenchScrewdriverIcon },
          { type: 'medical', label: 'Medical', icon: PlusCircleIcon }
        ].map(poi => (
          <button
            key={poi.type}
            onClick={() => handlePOITypeChange(poi.type)}
            className={`group flex items-center justify-end gap-3 px-4 py-2.5 rounded-full backdrop-blur-xl ring-1 transition-all duration-300 hover:scale-105 ${
              selectedPOIType === poi.type 
                ? 'bg-[#B08968] ring-[#B08968]/50 text-[#090909] shadow-[0_0_20px_rgba(176,137,104,0.3)]' 
                : 'bg-[#111111]/80 ring-white/10 text-[#F5F5F7] hover:bg-[#1a1a1a]'
            }`}
          >
            <span className="text-xs font-medium">{poi.label}</span>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedPOIType === poi.type ? 'bg-black/20' : 'bg-white/5 group-hover:bg-[#B08968]/20'}`}>
              <poi.icon className={`w-3.5 h-3.5 ${selectedPOIType === poi.type ? 'text-black' : 'text-[#B08968]'}`} />
            </div>
          </button>
        ))}
      </div>

      {/* Live Ride HUD (Bottom Left) */}
      {showControls && (
        <div className="panel-bottom-left absolute bottom-28 left-6 z-[1002] pointer-events-auto">
          <div className="bg-[#111111]/80 backdrop-blur-3xl rounded-[28px] p-6 ring-1 ring-white/10 shadow-[0_24px_48px_rgba(0,0,0,0.6)] w-72 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#B08968]/10 to-transparent opacity-20 pointer-events-none" />
            <p className="text-[10px] font-semibold text-[#86868B] uppercase tracking-[0.2em] mb-4">Ride Telemetry</p>
            
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-5xl font-semibold tracking-tighter text-[#F5F5F7]">0</span>
              <span className="text-sm font-medium text-[#86868B]">km/h</span>
            </div>

            <div className="grid grid-cols-2 gap-y-5 gap-x-4">
              <div>
                <p className="text-[10px] text-[#86868B] uppercase tracking-widest mb-1">Time</p>
                <p className="text-sm font-medium text-[#F5F5F7]">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#86868B] uppercase tracking-widest mb-1">Network</p>
                <p className="text-sm font-medium text-[#F5F5F7]">{nearbyRiders.length} nearby</p>
              </div>
              <div>
                <p className="text-[10px] text-[#86868B] uppercase tracking-widest mb-1">Weather</p>
                <p className="text-sm font-medium text-[#F5F5F7]">{weather ? `${weather.current.temperature}°C` : '--'}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#86868B] uppercase tracking-widest mb-1">Sharing</p>
                <button
                  onClick={() => toggleLocationSharing(!locationSharingEnabled)}
                  className={`text-xs font-medium px-2 py-0.5 rounded-md ${locationSharingEnabled ? 'bg-[#B08968]/20 text-[#B08968]' : 'bg-white/10 text-[#86868B]'}`}
                >
                  {locationSharingEnabled ? 'Active' : 'Paused'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Dock (Bottom Center) */}
      {showControls && (
        <div className="panel-bottom-center absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[1002] pointer-events-auto">
          <div className="bg-[#111111]/90 backdrop-blur-3xl rounded-[24px] p-2 ring-1 ring-white/10 shadow-[0_24px_48px_rgba(0,0,0,0.6)] flex items-center gap-2">
            
            <button className="flex flex-col items-center justify-center w-16 h-16 rounded-[18px] hover:bg-white/5 transition-colors group">
              <ViewfinderCircleIcon className="w-6 h-6 text-[#86868B] group-hover:text-[#F5F5F7] mb-1" />
              <span className="text-[9px] font-medium text-[#86868B] group-hover:text-[#F5F5F7]">Center</span>
            </button>
            
            <button className="flex flex-col items-center justify-center w-16 h-16 rounded-[18px] hover:bg-white/5 transition-colors group">
              <MapIcon className="w-6 h-6 text-[#86868B] group-hover:text-[#F5F5F7] mb-1" />
              <span className="text-[9px] font-medium text-[#86868B] group-hover:text-[#F5F5F7]">3D View</span>
            </button>
            
            <div className="w-[1px] h-8 bg-white/10 mx-2" />
            
            <button className="relative overflow-hidden group flex items-center justify-center gap-3 px-8 h-16 rounded-[20px] bg-[#B08968] hover:bg-[#c29875] transition-colors shadow-[0_0_20px_rgba(176,137,104,0.3)]">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
              <RocketLaunchIcon className="w-5 h-5 text-black" />
              <span className="text-sm font-semibold text-black">Start Ride</span>
            </button>

            <div className="w-[1px] h-8 bg-white/10 mx-2" />

            <button className="flex flex-col items-center justify-center w-16 h-16 rounded-[18px] hover:bg-white/5 transition-colors group">
              <Square3Stack3DIcon className="w-6 h-6 text-[#86868B] group-hover:text-[#F5F5F7] mb-1" />
              <span className="text-[9px] font-medium text-[#86868B] group-hover:text-[#F5F5F7]">Layers</span>
            </button>

            <button className="flex flex-col items-center justify-center w-16 h-16 rounded-[18px] hover:bg-white/5 transition-colors group">
              <MapPinIcon className="w-6 h-6 text-[#86868B] group-hover:text-[#F5F5F7] mb-1" />
              <span className="text-[9px] font-medium text-[#86868B] group-hover:text-[#F5F5F7]">Traffic</span>
            </button>
            
          </div>
        </div>
      )}

      {/* SOS Button (Bottom Right) */}
      <div className="panel-bottom-right absolute bottom-8 right-8 z-[1002] pointer-events-auto">
        <button 
          onClick={() => sendEmergencyAlert('medical')}
          className="relative group flex items-center justify-center w-16 h-16 rounded-full bg-[#111111]/80 backdrop-blur-xl ring-1 ring-red-500/50 hover:bg-red-500/20 transition-all shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:scale-110"
        >
          <div className="absolute inset-0 rounded-full border border-red-500/30 animate-[ping_2.5s_ease-in-out_infinite]" />
          <ShieldExclamationIcon className="w-7 h-7 text-red-500" />
        </button>
      </div>

      {/* The Edge-to-Edge Map */}
      <div className="absolute inset-3 rounded-[32px] overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.8)] z-0 bg-[#0a0a0a]">
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={14}
          zoomControl={false} // Hide default zoom controls for premium feel
          style={{ height: '100%', width: '100%' }}
          className="map-shell"
          whenCreated={(mapInstance) => { mapRef.current = mapInstance }}
        >
          <TileLayer
            key={theme}
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &copy; CARTO'
          />
          <MapEventHandler onMapClick={handleMapClick} />

          {/* Glowing Routes */}
          {routeCoordinates.length > 0 && (
            <>
              {/* Outer Glow */}
              <Polyline positions={routeCoordinates} pathOptions={{ color: '#B08968', weight: 12, opacity: 0.15, lineCap: 'round', lineJoin: 'round' }} />
              {/* Core Line */}
              <Polyline positions={routeCoordinates} pathOptions={{ color: '#B08968', weight: 4, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }} />
            </>
          )}

          {/* Premium User Marker */}
          <Circle center={[userLocation.lat, userLocation.lng]} radius={Math.min(accuracy || 40, 80)} pathOptions={{ color: 'rgba(176, 137, 104, 0.4)', fillColor: 'rgba(176, 137, 104, 0.1)', fillOpacity: 1, weight: 1 }} />
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userPremiumIcon}>
            <Popup className="premium-popup">
              <div className="bg-[#111111] text-[#F5F5F7] p-1 rounded-xl">
                <h3 className="font-semibold text-xs text-[#B08968] uppercase tracking-widest mb-1">Your Location</h3>
                <p className="text-sm font-medium">{user?.name || 'Rider'}</p>
              </div>
            </Popup>
          </Marker>

          {/* Destination Marker */}
          {destination && (
            <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
              <Popup className="premium-popup">
                 <div className="bg-[#111111] text-[#F5F5F7] p-1 rounded-xl text-center">
                    <h3 className="font-semibold text-xs text-[#86868B] uppercase tracking-widest mb-1">Destination</h3>
                    {destination.name && <p className="text-sm font-medium">{destination.name}</p>}
                    <button onClick={() => { setDestination(null); setRouteData(null); setRouteCoordinates([]); }} className="mt-3 w-full py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-medium hover:bg-red-500/20">Clear Route</button>
                 </div>
              </Popup>
            </Marker>
          )}

          {/* POI Markers */}
          {nearbyPOIs.map((poi) => (
            <Marker key={poi.id} position={[poi.coordinates[1], poi.coordinates[0]]} icon={poiPremiumIcon}>
               <Popup className="premium-popup"><div className="bg-[#111111] text-white p-1">{poi.name}</div></Popup>
            </Marker>
          ))}

          {/* Emergency Markers */}
          {emergencyAlerts.filter(a => a.location?.coordinates?.length >= 2).map((alert) => (
            <Marker key={alert.id} position={[alert.location.coordinates[1], alert.location.coordinates[0]]} icon={emergencyPremiumIcon}>
              <Popup className="premium-popup"><div className="bg-[#111111] text-red-500 p-1 font-semibold">{alert.type.toUpperCase()}</div></Popup>
            </Marker>
          ))}

          {/* Network Riders */}
          {nearbyRiders.map((rider) => {
            if (!rider.location) return null
            const icon = rider.isFriend ? friendPremiumIcon : strangerPremiumIcon
            return (
              <Marker key={`nearby-${rider.userId}`} position={[rider.location.lat, rider.location.lng]} icon={icon}>
                <Popup className="premium-popup"><div className="bg-[#111111] text-white p-1 text-sm">{rider.name}</div></Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>
    </div>
  )

  } catch (error) {
    console.error('🚨 MAP COMPONENT ERROR CAUGHT:', error);
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-900 text-white">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">🗺️ Map Loading Error</h2>
          <p className="mb-4">Map component crashed: {error.message}</p>
        </div>
      </div>
    )
  }
}

export default Map;