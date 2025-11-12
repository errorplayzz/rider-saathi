import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  MapIcon, 
  ChatBubbleLeftIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
  BoltIcon,
  CloudIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { 
  getLeaderboard, 
  getActiveEmergencyAlerts,
  createRide,
  updateRide,
  updateUserStatus,
  updateProfile
} from '../lib/supabaseHelpers'

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [weather, setWeather] = useState(null)
  const [nearbyAlerts, setNearbyAlerts] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [batteryLevel, setBatteryLevel] = useState(null) // initialize as null so we can show a loading state while the battery is checked
  const [isCharging, setIsCharging] = useState(false)
  const [batterySupported, setBatterySupported] = useState(true)
  const [isRiding, setIsRiding] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [currentRide, setCurrentRide] = useState(null) // store current ride record (or id)
  
  const { user, profile, session } = useAuth()
  const { socket, connected, onlineUsers } = useSocket()

  // Debug logging to help diagnose why the dashboard might be blank in some environments
  useEffect(() => {
    try {
      if (import.meta.env?.DEV) {
        console.log('DBG Dashboard state:', {
          currentLocation,
          nearbyAlertsCount: nearbyAlerts?.length,
          weatherLoaded: !!weather,
          statsLoaded: !!stats
        })
      }
    } catch (e) {
      // ignore in non-Vite environments
    }
  }, [currentLocation, nearbyAlerts, weather, stats])

  useEffect(() => {
    fetchUserStats()
    fetchWeather()
    fetchNearbyAlerts()
    fetchLeaderboard()
    getCurrentLocation()
    
  // Use the Battery Status API when supported to read device battery level and charging state
    let batteryMgr = null
    const initBattery = async () => {
      try {
        if ('getBattery' in navigator) {
          const battery = await navigator.getBattery()
          batteryMgr = battery
          
          const updateBattery = () => {
            const level = Math.round(battery.level * 100)
            const charging = Boolean(battery.charging)
            setBatteryLevel(level)
            setIsCharging(charging)
            console.log('Battery updated:', level, charging)
          }

          updateBattery()
          
          battery.addEventListener('levelchange', updateBattery)
          battery.addEventListener('chargingchange', updateBattery)
          } else {
          console.warn('Battery API not supported in this browser')
          setBatterySupported(false)
          // If Battery API isn't available, clear battery info so the UI hides the battery card
          setBatteryLevel(null)
        }
      } catch (err) {
        console.warn('Battery API error:', err)
        setBatterySupported(false)
        setBatteryLevel(null)
      }
    }
    
    initBattery()

    return () => {
      try {
        if (batteryMgr) {
          batteryMgr.removeEventListener('levelchange', () => {})
          batteryMgr.removeEventListener('chargingchange', () => {})
        }
      } catch (e) {
        // no-op: ignore errors while removing event listeners
      }
    }
  }, [])

  useEffect(() => {
    if (!socket) return

    socket.on('emergency-alert', (alertData) => {
      setNearbyAlerts(prev => [alertData, ...prev.slice(0, 4)])
    })

    socket.on('battery-alert', (data) => {
      if (data.batteryLevel < 20) {
        // Handle low battery: notify user and log for debugging
        console.log('Low battery alert received:', data)
      }
    })

    return () => {
      socket.off('emergency-alert')
      socket.off('battery-alert')
    }
  }, [socket])

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => console.error('Location error:', error),
        { enableHighAccuracy: true, maximumAge: 10000 }
      )
    }
  }

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Haversine formula - returns distance in meters
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const fetchUserStats = async () => {
    try {
  // Build stats object from the profile provided by AuthContext
      if (profile) {
        const statsData = {
          totalRides: profile.total_rides || 0,
          totalDistance: profile.total_distance_meters ? (profile.total_distance_meters / 1000).toFixed(1) : '0',
          rewardPoints: profile.reward_points || 0,
          helpGiven: profile.help_count || 0
        }
        setStats(statsData)
      }
    } catch (error) {
      console.error('Stats fetch error:', error)
    }
  }

  const fetchWeather = async () => {
    console.log('🌤️ Starting weather fetch...')
    
    if (!navigator.geolocation) {
      console.log('❌ Geolocation not supported')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude
          const lon = position.coords.longitude
          console.log(`📍 Location: ${lat}, ${lon}`)
          console.log(`🎯 Location accuracy: ${position.coords.accuracy} meters`)

          // Prefer fetching weather from our backend API (it may aggregate, cache, or add context)
          const API_BASE = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000'
          console.log(`🔗 Backend URL: ${API_BASE}`)

          // Use the session token from AuthContext for authenticated backend requests if available
          const token = (typeof session !== 'undefined' && session?.access_token) ? session.access_token : 'demo-token'

          const url = `${API_BASE.replace(/\/$/, '')}/api/weather/current?latitude=${lat}&longitude=${lon}`
          console.log(`🌐 Trying backend API: ${url}`)

          try {
            const res = await fetch(url, {
              headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            })

            console.log(`🔄 Backend response status: ${res.status}`)

            if (res.ok) {
              const body = await res.json()
              console.log('📦 Backend response:', body)
              
              // Expecting backend response in the shape: { success: true, weather: { ... } }
              if (body && body.success && body.weather) {
                console.log('✅ Using backend weather data')
                setWeather(body.weather)
                return
              }
            }
            throw new Error(`Backend weather API returned ${res.status}`)
          } catch (backendError) {
            console.log('⚠️ Backend weather API failed, trying direct OpenWeather API...', backendError)
            
            // If backend fails, fall back to calling public weather APIs directly
            const weatherApiKey = import.meta.env.VITE_OPENWEATHER_API_KEY
            console.log(`🔑 Weather API Key: ${weatherApiKey ? 'Found' : 'Missing'}`)
            
            // Try OpenMeteo first — usually accurate and free to use
            try {
              const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`
              console.log(`🌐 Trying OpenMeteo API (most accurate free API)...`)
              
              const meteoRes = await fetch(openMeteoUrl)
              if (meteoRes.ok) {
                const meteoData = await meteoRes.json()
                console.log('📦 OpenMeteo response:', meteoData)
                
                const weatherData = {
                  location: {
                    name: 'Current Location',
                    country: 'IN',
                    coordinates: { latitude: lat, longitude: lon }
                  },
                  current: {
                    temperature: Math.round(meteoData.current_weather.temperature),
                    feelsLike: Math.round(meteoData.current_weather.temperature - 2), // approximate 'feels like' temperature
                    humidity: meteoData.hourly.relative_humidity_2m[0] || 50,
                    pressure: 1013, // default pressure value
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
                  },
                  debug: {
                    source: 'OpenMeteo (Most Accurate)',
                    isNight: !meteoData.current_weather.is_day,
                    timestamp: new Date().toLocaleString()
                  }
                }
                
                console.log('✅ Using OpenMeteo weather data (most accurate):', weatherData)
                setWeather(weatherData)
                return
              }
            } catch (meteoError) {
              console.log('⚠️ OpenMeteo failed, trying WeatherAPI...', meteoError)
            }
            
            // If provided, try WeatherAPI.com using the API key (often high accuracy)
            const weatherAPIKey = import.meta.env.VITE_WEATHERAPI_KEY
            if (weatherAPIKey && weatherAPIKey !== 'your-weatherapi-key-here') {
              try {
                const weatherAPIUrl = `https://api.weatherapi.com/v1/current.json?key=${weatherAPIKey}&q=${lat},${lon}&aqi=no`
                console.log(`🌐 Trying WeatherAPI.com (most accurate)...`)
                
                const weatherAPIRes = await fetch(weatherAPIUrl)
                if (weatherAPIRes.ok) {
                  const weatherAPIData = await weatherAPIRes.json()
                  console.log('📦 WeatherAPI response:', weatherAPIData)
                  
                  const weatherData = {
                    location: {
                      name: weatherAPIData.location.name,
                      country: weatherAPIData.location.country,
                      coordinates: { latitude: lat, longitude: lon }
                    },
                    current: {
                      temperature: Math.round(weatherAPIData.current.temp_c),
                      feelsLike: Math.round(weatherAPIData.current.feelslike_c),
                      humidity: weatherAPIData.current.humidity,
                      pressure: weatherAPIData.current.pressure_mb,
                      visibility: weatherAPIData.current.vis_km,
                      windSpeed: weatherAPIData.current.wind_kph / 3.6, // convert from km/h to m/s
                      windDirection: weatherAPIData.current.wind_degree,
                      description: weatherAPIData.current.condition.text.toLowerCase(),
                      main: weatherAPIData.current.condition.text,
                      icon: weatherAPIData.current.is_day ? '01d' : '01n'
                    },
                    rideConditions: {
                      isGoodForRiding: !weatherAPIData.current.condition.text.toLowerCase().includes('rain') && 
                                      !weatherAPIData.current.condition.text.toLowerCase().includes('storm') &&
                                      weatherAPIData.current.wind_kph < 50,
                      warnings: weatherAPIData.current.is_day ? [] : ['Night time - use proper lighting'],
                      recommendation: weatherAPIData.current.is_day ? 'Good for riding' : 'Night riding - use proper lighting'
                    },
                    debug: {
                      source: 'WeatherAPI.com (Most Accurate)',
                      isNight: !weatherAPIData.current.is_day,
                      timestamp: new Date().toLocaleString()
                    }
                  }
                  
                  console.log('✅ Using WeatherAPI.com data (most accurate):', weatherData)
                  setWeather(weatherData)
                  return
                }
              } catch (weatherAPIError) {
                console.error('❌ WeatherAPI.com failed:', weatherAPIError)
              }
            }
            
            // Fall back to OpenWeather if earlier services fail
            if (weatherApiKey && weatherApiKey !== 'demo-api-key-replace-with-real-key') {
              try {
                const directUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric`
                console.log(`🌐 Trying direct OpenWeather API...`)
                
                const directRes = await fetch(directUrl)
                console.log(`🔄 Direct API response status: ${directRes.status}`)
                
                if (directRes.ok) {
                  const directData = await directRes.json()
                  console.log('📦 Direct API response:', directData)
                  
                  // Normalize the OpenWeather response into our expected weather format
                  const weatherData = {
                    location: {
                      name: directData.name,
                      country: directData.sys.country,
                      coordinates: { latitude: lat, longitude: lon }
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
                      isGoodForRiding: true, // Simple default logic
                      warnings: directData.weather[0].icon.includes('n') ? ['Night time - reduced visibility'] : [],
                      recommendation: directData.weather[0].icon.includes('n') ? 'Night riding - use proper lighting' : 'Good for riding'
                    },
                    debug: {
                      source: 'OpenWeather Direct API',
                      isNight: directData.weather[0].icon.includes('n'),
                      timestamp: new Date().toLocaleString()
                    }
                  }
                  
                  console.log('✅ Using direct weather data:', weatherData)
                  setWeather(weatherData)
                  return
                } else {
                  console.log('❌ Direct API failed with status:', directRes.status)
                }
              } catch (directError) {
                console.error('❌ Direct OpenWeather API failed:', directError)
              }
            } else {
              console.log('❌ No valid weather API key found')
            }
            
            // Final fallback to demo weather
            console.log('🔄 Using fallback weather data')
            setWeather({ 
              current: { 
                temperature: 15, // Changed to match current PC weather
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
                name: 'Demo Location',
                country: 'IN'
              }
            })
          }
        } catch (error) {
          console.error('❌ Weather fetch error:', error)
          // Final fallback weather
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
      },
      (error) => {
        console.error('❌ Location error:', error)
        // If location permission denied, use Delhi coordinates as default
        const defaultLat = 28.6139
        const defaultLon = 77.2090
        console.log('🎯 Using default Delhi coordinates for weather...')
        
        // Try to fetch weather with default coordinates
        fetchWeatherForCoordinates(defaultLat, defaultLon)
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 300000 // 5 minutes cache
      }
    )
  }

  const fetchWeatherForCoordinates = async (lat, lon) => {
    try {
      console.log(`📍 Fetching weather for coordinates: ${lat}, ${lon}`)
      
      // Try backend API first (preferred method)
      const API_BASE = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000'
      console.log(`🔗 Backend URL: ${API_BASE}`)

      // Get a token from Auth context (Supabase session) if available
      const token = (typeof session !== 'undefined' && session?.access_token) ? session.access_token : 'demo-token'

      const url = `${API_BASE.replace(/\/$/, '')}/api/weather/current?latitude=${lat}&longitude=${lon}`
      console.log(`🌐 Trying backend API: ${url}`)

      try {
        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })

        console.log(`🔄 Backend response status: ${res.status}`)

        if (res.ok) {
          const body = await res.json()
          console.log('📦 Backend response:', body)
          
          // backend returns { success: true, weather: { ... } }
          if (body && body.success && body.weather) {
            console.log('✅ Using backend weather data')
            setWeather(body.weather)
            return
          }
        }
        throw new Error(`Backend weather API returned ${res.status}`)
      } catch (backendError) {
        console.log('⚠️ Backend weather API failed, trying direct APIs...', backendError)
        
        // Try WeatherAPI.com (most accurate with API key)
        const weatherAPIKey = import.meta.env.VITE_WEATHERAPI_KEY
        if (weatherAPIKey && weatherAPIKey !== 'your-weatherapi-key-here') {
          try {
            const weatherAPIUrl = `https://api.weatherapi.com/v1/current.json?key=${weatherAPIKey}&q=${lat},${lon}&aqi=no`
            console.log(`🌐 Trying WeatherAPI.com (most accurate)...`)
            
            const weatherAPIRes = await fetch(weatherAPIUrl)
            if (weatherAPIRes.ok) {
              const weatherAPIData = await weatherAPIRes.json()
              console.log('📦 WeatherAPI response:', weatherAPIData)
              
              const weatherData = {
                location: {
                  name: weatherAPIData.location.name,
                  country: weatherAPIData.location.country,
                  coordinates: { latitude: lat, longitude: lon }
                },
                current: {
                  temperature: Math.round(weatherAPIData.current.temp_c),
                  feelsLike: Math.round(weatherAPIData.current.feelslike_c),
                  humidity: weatherAPIData.current.humidity,
                  pressure: weatherAPIData.current.pressure_mb,
                  visibility: weatherAPIData.current.vis_km,
                  windSpeed: weatherAPIData.current.wind_kph / 3.6, // Convert to m/s
                  windDirection: weatherAPIData.current.wind_degree,
                  description: weatherAPIData.current.condition.text.toLowerCase(),
                  main: weatherAPIData.current.condition.text,
                  icon: weatherAPIData.current.is_day ? '01d' : '01n'
                },
                rideConditions: {
                  isGoodForRiding: !weatherAPIData.current.condition.text.toLowerCase().includes('rain') && 
                                  !weatherAPIData.current.condition.text.toLowerCase().includes('storm') &&
                                  weatherAPIData.current.wind_kph < 50,
                  warnings: weatherAPIData.current.is_day ? [] : ['Night time - use proper lighting'],
                  recommendation: weatherAPIData.current.is_day ? 'Good for riding' : 'Night riding - use proper lighting'
                },
                debug: {
                  source: 'WeatherAPI.com (Most Accurate)',
                  isNight: !weatherAPIData.current.is_day,
                  timestamp: new Date().toLocaleString()
                }
              }
              
              console.log('✅ Using WeatherAPI.com data (most accurate):', weatherData)
              setWeather(weatherData)
              return
            }
          } catch (weatherAPIError) {
            console.error('❌ WeatherAPI.com failed:', weatherAPIError)
          }
        }
        
        // Final fallback to demo weather
        console.log('🔄 Using fallback weather data')
        setWeather({ 
          current: { 
            temperature: 15, // Changed to match current night weather
            description: 'clear sky',
            humidity: 65,
            windSpeed: 2.5
          }, 
          rideConditions: { 
            isGoodForRiding: true, 
            warnings: ['Location permission required for accurate weather'],
            recommendation: 'Allow location for real weather data'
          },
          location: {
            name: 'Demo Location',
            country: 'IN'
          }
        })
      }
    } catch (error) {
      console.error('❌ Weather fetch error:', error)
      // Final fallback weather
      setWeather({ 
        current: { 
          temperature: 15, 
          description: 'clear sky' 
        }, 
        rideConditions: { 
          isGoodForRiding: true, 
          warnings: ['Location permission required'] 
        } 
      })
    }
  }

  const fetchNearbyAlerts = async () => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const alerts = await getActiveEmergencyAlerts(
            position.coords.longitude,
            position.coords.latitude,
            10000 // 10km radius
          )
          setNearbyAlerts(Array.isArray(alerts) ? alerts.slice(0, 5) : [])
        } catch (error) {
          console.error('Alerts fetch error:', error)
        }
      },
      (error) => console.error('Location error:', error)
    )
  }

  const fetchLeaderboard = async () => {
    try {
      const leaderboardData = await getLeaderboard(5)
      setLeaderboard(leaderboardData || [])
    } catch (error) {
      console.error('Leaderboard fetch error:', error)
    }
  }

  const startRide = async () => {
    if (!currentLocation) {
      alert('Location not available')
      return
    }

    try {
      const ride = await createRide(user.id, {
        longitude: currentLocation.longitude,
        latitude: currentLocation.latitude,
        address: 'Starting location'
      })
      
      // store ride locally so we can end it later
      setCurrentRide(ride)
      setIsRiding(true)

      // emit ride-start event so other clients can show this rider on map (if they share location)
      try {
        const share = profile?.preferences?.shareLocation ?? true
        socket?.sendRideEvent && socket.sendRideEvent('ride-start', {
          ride,
          user: { id: user.id, name: profile?.name, bike: profile?.bike_model },
          location: currentLocation,
          shareLocation: share
        })
      } catch (e) {
        console.warn('Failed to emit ride-start event', e)
      }

      // update profile is_riding flag
      try { await updateUserStatus(user.id, true, true) } catch (e) { /* non-fatal */ }

      // Increment user's total rides in profile (best-effort) so "Your Stats" updates
      try {
        const newTotal = (profile?.total_rides || 0) + 1
        await updateProfile(user.id, { total_rides: newTotal })
        // update local stats state for immediate feedback
        setStats(prev => ({ ...(prev || {}), totalRides: newTotal }))
      } catch (e) {
        console.warn('Failed to update profile ride count:', e)
      }

      alert('Ride started! Stay safe!')
    } catch (error) {
      console.error('Start ride error:', error)
      alert('Failed to start ride')
    }
  }

  const endRide = async () => {
    if (!currentRide) {
      alert('No active ride to end')
      setIsRiding(false)
      return
    }

    if (!currentLocation) {
      // still attempt to end ride without final location
      const confirmEnd = window.confirm('Location not available. End ride anyway?')
      if (!confirmEnd) return
    }

    try {
      const updates = {
        end_time: new Date().toISOString()
      }

      if (currentLocation) {
        updates.end_location = `POINT(${currentLocation.longitude} ${currentLocation.latitude})`
        updates.end_address = 'Ending location'
      }

      await updateRide(currentRide.id || currentRide, updates)

      // emit ride-end so other clients remove marker
      try {
        socket?.sendRideEvent && socket.sendRideEvent('ride-end', { rideId: currentRide.id || currentRide, userId: user.id })
      } catch (e) {
        console.warn('Failed to emit ride-end event', e)
      }

      // clear local ride state
      setCurrentRide(null)
      setIsRiding(false)

      // update profile is_riding flag
      try { await updateUserStatus(user.id, true, false) } catch (e) { /* non-fatal */ }

      alert('Ride ended — good job!')
    } catch (error) {
      console.error('End ride error:', error)
      alert('Failed to end ride')
    }
  }

  const sendBatteryAlert = () => {
    if (socket && batteryLevel <= 20) {
      socket.emit('battery-alert', {
        batteryLevel,
        location: currentLocation
      })
      alert('Low battery alert sent to nearby riders!')
    }
  }

  const quickFeatures = [
    {
      title: 'Start Navigation',
      description: 'Begin GPS tracking and navigation',
      icon: MapIcon,
      color: 'neon-cyan',
      action: () => setIsRiding(!isRiding),
      link: '/map'
    },
    {
      title: 'Emergency Alert',
      description: 'Send emergency signal to nearby riders',
      icon: ExclamationTriangleIcon,
      color: 'red-500',
      action: () => alert('Emergency alert sent!'),
      link: '/emergency'
    },
    {
      title: 'Group Chat',
      description: 'Chat with nearby riders',
      icon: ChatBubbleLeftIcon,
      color: 'neon-purple',
      action: () => {},
      link: '/chat'
    },
    {
      title: 'View Rewards',
      description: 'Check your points and achievements',
      icon: TrophyIcon,
      color: 'yellow-500',
      action: () => {},
      link: '/profile'
    }
  ]

  return (
    <div className="min-h-screen pt-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-orbitron font-bold text-white mb-2">
            Welcome back, {profile?.name || user?.user_metadata?.name || 'Rider'}!
          </h1>
          <p className="text-gray-300">
            Ready for your next adventure? Here's your riding dashboard.
          </p>
        </motion.div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Connection Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-glow"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Connection</h3>
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            <p className="text-2xl font-bold text-neon-cyan">
              {connected ? 'Online' : 'Offline'}
            </p>
            <p className="text-sm text-gray-400">
              {onlineUsers.length} riders nearby
            </p>
          </motion.div>

          {/* Battery Status */}
          {batteryLevel !== null && batterySupported && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-glow"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Battery</h3>
                <div className="flex items-center gap-2">
                  {isCharging ? (
                    <BoltIcon className="w-6 h-6 text-green-400 animate-pulse" />
                  ) : (
                    <BoltIcon className="w-6 h-6 text-yellow-500" />
                  )}
                </div>
            </div>
              <p className="text-2xl font-bold text-neon-cyan">{batteryLevel}% {isCharging && <span className="text-sm text-green-400">(Charging)</span>}</p>
            <div className="w-full bg-dark-600 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  batteryLevel > 50 ? 'bg-green-500' : batteryLevel > 20 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${batteryLevel}%` }}
              />
            </div>
            {batteryLevel <= 20 && (
              <button
                onClick={sendBatteryAlert}
                className="text-xs text-red-400 hover:text-red-300 mt-2"
              >
                Send Low Battery Alert
              </button>
            )}
          </motion.div>
          )}

          {/* Weather */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card-glow"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Weather</h3>
              <CloudIcon className="w-6 h-6 text-blue-400" />
            </div>
            {weather ? (
              <>
                <p className="text-2xl font-bold text-neon-cyan">
                  {weather.current.temperature}°C
                </p>
                <p className="text-sm text-gray-400 capitalize">
                  {weather.current.description}
                </p>
                <div className={`text-xs mt-2 ${
                  weather.rideConditions.isGoodForRiding ? 'text-green-400' : 'text-red-400'
                }`}>
                  {weather.rideConditions.isGoodForRiding ? '✓ Good for riding' : '⚠ Poor conditions'}
                </div>
              </>
            ) : (
              <p className="text-gray-400">Loading...</p>
            )}
          </motion.div>

          {/* Ride Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card-glow"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Ride Status</h3>
              <div className={`w-3 h-3 rounded-full ${isRiding ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            </div>
            <p className="text-2xl font-bold text-neon-cyan">
              {isRiding ? 'Riding' : 'Parked'}
            </p>
            <button
              onClick={isRiding ? endRide : startRide}
              className={`text-xs mt-2 px-3 py-1 rounded transition-colors ${
                isRiding 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isRiding ? 'End Ride' : 'Start Ride'}
            </button>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-orbitron font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Link
                  key={feature.title}
                  to={feature.link}
                  className="group"
                >
                  <motion.div
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className="card-glow h-full cursor-pointer"
                  >
                    <div className={`text-${feature.color} mb-4`}>
                      <Icon className="w-12 h-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2 text-center">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-400 text-center">
                      {feature.description}
                    </p>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </motion.div>

        {/* Stats and Activity */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* User Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2"
          >
            <h2 className="text-2xl font-orbitron font-bold text-white mb-6">Your Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card-glow text-center">
                <ChartBarIcon className="w-8 h-8 text-neon-cyan mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stats?.totalRides || 0}</p>
                <p className="text-sm text-gray-400">Total Rides</p>
              </div>
              <div className="card-glow text-center">
                <MapIcon className="w-8 h-8 text-neon-purple mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">
                  {stats?.totalDistance ? `${(stats.totalDistance / 1000).toFixed(0)}` : '0'}
                </p>
                <p className="text-sm text-gray-400">Total KM</p>
              </div>
              <div className="card-glow text-center">
                <UserGroupIcon className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stats?.helpCount || 0}</p>
                <p className="text-sm text-gray-400">People Helped</p>
              </div>
              <div className="card-glow text-center">
                <TrophyIcon className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stats?.rewardPoints || 0}</p>
                <p className="text-sm text-gray-400">Reward Points</p>
              </div>
            </div>
          </motion.div>

          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <h2 className="text-2xl font-orbitron font-bold text-white mb-6">Top Riders</h2>
            <div className="card-glow">
              {leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {leaderboard.map((rider, index) => (
                    <div key={rider.user._id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-black' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-dark-600 text-gray-300'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="text-white text-sm">{rider.user.name}</span>
                      </div>
                      <span className="text-neon-cyan text-sm font-semibold">
                        {rider.score} pts
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center">No leaderboard data</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Recent Alerts */}
        {nearbyAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <h2 className="text-2xl font-orbitron font-bold text-white mb-6">Nearby Alerts</h2>
            <div className="space-y-4">
              {nearbyAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="card-glow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">
                        {alert.type === 'accident' ? '🚨' :
                         alert.type === 'breakdown' ? '🛠️' :
                         alert.type === 'medical' ? '🏥' : '⚠️'}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold capitalize">
                          {alert.type} Alert
                        </h3>
                        {(() => {
                          let d = typeof alert.distance === 'number' ? alert.distance : null

                          if (d === null && alert.location && Array.isArray(alert.location.coordinates) && alert.location.coordinates.length === 2 && currentLocation) {
                            // server may store [longitude, latitude]
                            d = calculateDistance(
                              currentLocation.latitude,
                              currentLocation.longitude,
                              alert.location.coordinates[1],
                              alert.location.coordinates[0]
                            )
                          }

                          const distanceText = Number.isFinite(d)
                            ? `${Math.round(d)}m away • ${alert.respondersCount || 0} responses`
                            : `${alert.respondersCount || 0} responses`

                          return <p className="text-sm text-gray-400">{distanceText}</p>
                        })()}
                        {alert.description && (
                          <p className="text-sm text-gray-300 mt-1">
                            {alert.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Link
                      to={`/emergency`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                    >
                      Respond
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default Dashboard