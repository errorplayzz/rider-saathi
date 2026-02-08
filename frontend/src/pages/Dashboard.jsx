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
import { withTimeout, safeFetch, getLocationWithTimeout } from '../utils/asyncHelpers'

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
  const [loadingStates, setLoadingStates] = useState({
    stats: false,
    weather: false,
    alerts: false,
    leaderboard: false,
    location: false
  })

  const { user, profile, session } = useAuth()
  const { socket, connected, onlineUsers } = useSocket()

  // Safe loading state helper
  const setLoading = (key, value) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }))
  }



  useEffect(() => {
    // Initialize all data fetching with simple async calls
    const initializeDashboard = async () => {
      try {
        // Initialize basic data first
        fetchUserStats()
        
        // Then initialize other data in parallel without blocking render
        Promise.allSettled([
          initWeatherSafely(),
          initAlertsSafely(), 
          initLeaderboardSafely(),
          initLocationSafely(),
          initBatterySafely()
        ])
      } catch (error) {
        // Silent fail - dashboard will show loading states
      }
    }

    initializeDashboard()
  }, [])

  // Simplified safe initialization functions - responsive to actual server speed
  const initWeatherSafely = async () => {
    setLoading('weather', true)
    try {
      await withTimeout(fetchWeather(), 8000, 'weather fetch')
    } catch (error) {
      // Silent fail
    } finally {
      setLoading('weather', false)
    }
  }

  const initAlertsSafely = async () => {
    setLoading('alerts', true)
    try {
      await withTimeout(fetchNearbyAlerts(), 5000, 'alerts fetch')
    } catch (error) {
      // Silent fail
    } finally {
      setLoading('alerts', false)
    }
  }

  const initLeaderboardSafely = async () => {
    setLoading('leaderboard', true)
    try {
      await withTimeout(fetchLeaderboard(), 5000, 'leaderboard fetch')
    } catch (error) {
      // Silent fail
    } finally {
      setLoading('leaderboard', false)
    }
  }

  const initLocationSafely = async () => {
    setLoading('location', true)
    try {
      await withTimeout(getCurrentLocation(), 6000, 'location fetch')
    } catch (error) {
      // Silent fail
    } finally {
      setLoading('location', false)
    }
  }

  const initBatterySafely = async () => {
    try {
      if ('getBattery' in navigator) {
        const battery = await withTimeout(navigator.getBattery(), 2000, 'battery API') // Very quick
        
        const updateBattery = () => {
          const level = Math.round(battery.level * 100)
          const charging = Boolean(battery.charging)
          setBatteryLevel(level)
          setIsCharging(charging)
        }

        updateBattery()
        battery.addEventListener('levelchange', updateBattery)
        battery.addEventListener('chargingchange', updateBattery)
        
      } else {
        setBatterySupported(false)
        setBatteryLevel(null)
      }
    } catch (err) {
      // Battery API not supported
      setBatterySupported(false)
      setBatteryLevel(null)
    }
  }

  useEffect(() => {
    if (!socket) return

    socket.on('emergency-alert', (alertData) => {
      setNearbyAlerts(prev => [alertData, ...prev.slice(0, 4)])
    })

    socket.on('battery-alert', (data) => {
      if (data.batteryLevel < 20) {
        // Handle low battery: notify user
      }
    })

    return () => {
      socket.off('emergency-alert')
      socket.off('battery-alert')
    }
  }, [socket])

  const getCurrentLocation = async () => {
    try {
      const position = await getLocationWithTimeout({}, 10000)
      setCurrentLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      })
    } catch (error) {
      // Silent fail - dashboard will show no location
    }
  }

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Haversine formula - returns distance in meters
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
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
      // Stats fetch failed
    }
  }

  const fetchWeather = async () => {
    try {
      // Use safe geolocation with timeout
      const position = await getLocationWithTimeout({}, 8000)
      const lat = position.coords.latitude
      const lon = position.coords.longitude

      // Prefer fetching weather from our backend API
      const API_BASE = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:5001'
      const token = (typeof session !== 'undefined' && session?.access_token) ? session.access_token : 'demo-token'
      const url = `${API_BASE.replace(/\/$/, '')}/api/weather/current?latitude=${lat}&longitude=${lon}`

      try {
        // Try backend with safe fetch
        const res = await safeFetch(url, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }, 6000, 1)

        const body = await res.json()
        if (body && body.success && body.weather) {
          setWeather(body.weather)
          return
        }
      } catch (backendError) {
        // Try fallback APIs
      }

      // Fallback to external APIs with timeout
      await fetchWeatherFallback(lat, lon)
      
    } catch (error) {
      // Set a minimal fallback weather state
      setWeather({
        current: {
          temperature: '--',
          description: 'Weather unavailable',
          main: 'Unknown',
          icon: '01d'
        },
        rideConditions: {
          isGoodForRiding: true,
          warnings: ['Weather data unavailable'],
          recommendation: 'Check local conditions before riding'
        },
        debug: {
          source: 'Fallback',
          error: error.message,
          timestamp: new Date().toLocaleString()
        }
      })
    }
  }

  const fetchWeatherFallback = async (lat, lon) => {
    // Try OpenMeteo first (free, reliable)
    try {
      const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`
      const meteoRes = await safeFetch(openMeteoUrl, {}, 5000, 1)
      const meteoData = await meteoRes.json()

      const weatherData = {
        location: {
          name: 'Current Location',
          country: 'IN',
          coordinates: { latitude: lat, longitude: lon }
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
        },
        debug: {
          source: 'OpenMeteo (Fallback)',
          isNight: !meteoData.current_weather.is_day,
          timestamp: new Date().toLocaleString()
        }
      }

      setWeather(weatherData)
      return
    } catch (error) {
      // Fallback failed
      throw error
    }
  }

  const fetchNearbyAlerts = async () => {
    try {
      const position = await getLocationWithTimeout({}, 8000)
      const alerts = await withTimeout(
        getActiveEmergencyAlerts(
          position.coords.longitude,
          position.coords.latitude,
          10000 // 10km radius
        ),
        6000,
        'emergency alerts fetch'
      )
      setNearbyAlerts(Array.isArray(alerts) ? alerts.slice(0, 5) : [])
    } catch (error) {
      setNearbyAlerts([]) // Fallback to empty alerts
    }
  }

  const fetchLeaderboard = async () => {
    try {
      const leaderboardData = await withTimeout(
        getLeaderboard(5),
        8000,
        'leaderboard fetch'
      )
      setLeaderboard(leaderboardData || [])
    } catch (error) {
      setLeaderboard([]) // Fallback to empty leaderboard
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
        // Failed to emit event
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
        // Failed to update profile
      }

      alert('Ride started! Stay safe!')
    } catch (error) {
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
        // Failed to emit event
      }

      // clear local ride state
      setCurrentRide(null)
      setIsRiding(false)

      // update profile is_riding flag
      try { await updateUserStatus(user.id, true, false) } catch (e) { /* non-fatal */ }

      alert('Ride ended — good job!')
    } catch (error) {
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
      action: () => { },
      link: '/chat'
    },
    {
      title: 'View Rewards',
      description: 'Check your points and achievements',
      icon: TrophyIcon,
      color: 'yellow-500',
      action: () => { },
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
          className="mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-alabaster mb-4">
            Dashboard
          </h1>
          <p className="text-xl text-dusty">
            Welcome back, {profile?.name || user?.user_metadata?.name || 'Rider'}. Monitor your ride status and access safety features.
          </p>
        </motion.div>

        {/* System Status Panel */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-alabaster">System Status</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">Live Panel</span>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-br from-white/95 via-white/85 to-slate-100/80 dark:from-slate-900/85 dark:via-slate-900/75 dark:to-slate-950/80 shadow-[0_28px_70px_-30px_rgba(15,23,42,0.6)] dark:shadow-[0_36px_80px_-38px_rgba(0,0,0,0.95)] p-10 md:p-12"
          >
            <div className="flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">System</p>
                  <p className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-alabaster">
                    {connected ? 'Connected' : 'Offline'}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-dusty">
                    {onlineUsers.length} active riders • {isRiding ? 'Ride active' : 'Ride idle'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">Live</span>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-6">
                <div className="md:col-span-2 grid grid-cols-2 gap-6">
                  <div className="pr-4 border-r border-slate-200/80 dark:border-white/10">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">Network</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-alabaster">
                      {connected ? 'Stable' : 'Degraded'}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-dusty">Latency within range</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">Ride Status</p>
                    <p className="text-3xl font-bold text-accent">{isRiding ? 'Riding' : 'Parked'}</p>
                    <button
                      onClick={isRiding ? endRide : startRide}
                      className={`text-xs mt-2 px-4 py-1.5 rounded-full transition-colors ${isRiding
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                    >
                      {isRiding ? 'End Ride' : 'Start Ride'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">Battery</p>
                    {batteryLevel !== null && batterySupported ? (
                      <>
                        <p className="text-3xl font-bold text-accent">
                          {batteryLevel}% {isCharging && <span className="text-sm text-green-400">(Charging)</span>}
                        </p>
                        <div className="w-full bg-slate-200/70 dark:bg-dusk rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${batteryLevel > 50 ? 'bg-green-500' : batteryLevel > 20 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                            style={{ width: `${batteryLevel}%` }}
                          />
                        </div>
                        {batteryLevel <= 20 && (
                          <button
                            onClick={sendBatteryAlert}
                            className="text-xs text-red-500 hover:text-red-600 mt-2"
                          >
                            Send Low Battery Alert
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-slate-600 dark:text-dusty">Battery status unavailable</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">Weather</p>
                    {weather ? (
                      <>
                        <p className="text-3xl font-bold text-accent">{weather.current.temperature}°C</p>
                        <p className="text-sm text-slate-600 dark:text-dusty capitalize">{weather.current.description}</p>
                        <p className={`text-xs ${weather.rideConditions.isGoodForRiding ? 'text-green-500' : 'text-red-500'}`}>
                          {weather.rideConditions.isGoodForRiding ? 'Good for riding' : 'Poor conditions'}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-600 dark:text-dusty">Loading...</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Status & Context Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-alabaster">Context & Intelligence</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">Secondary systems</span>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Weather */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50/80 via-white/60 to-slate-100/70 dark:from-slate-900/70 dark:via-slate-900/50 dark:to-slate-950/70 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.35)] dark:shadow-[0_16px_36px_-26px_rgba(0,0,0,0.75)] p-5"
            >
              <div className="absolute inset-x-0 top-0 h-24 pointer-events-none">
                <div className="absolute -top-6 left-6 h-24 w-24 rounded-full bg-slate-300/30 dark:bg-slate-700/30 blur-2xl" />
                <div className="absolute -top-4 right-8 h-28 w-28 rounded-full bg-sky-200/25 dark:bg-sky-500/10 blur-3xl" />
              </div>

              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">Weather</p>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full border ${weather?.rideConditions?.isGoodForRiding ? 'text-green-600 border-green-200/70 bg-green-50/70 dark:text-green-300 dark:border-green-500/30 dark:bg-green-500/10' : 'text-red-600 border-red-200/70 bg-red-50/70 dark:text-red-300 dark:border-red-500/30 dark:bg-red-500/10'}`}>
                    {weather?.rideConditions?.isGoodForRiding ? 'Good for riding' : 'Poor conditions'}
                  </span>
                </div>

                <div className="relative flex flex-col items-center text-center">
                  <CloudIcon className="absolute -top-2 h-24 w-24 text-slate-400/20 dark:text-slate-600/20" />
                  {weather ? (
                    <>
                      <p className="text-4xl font-semibold text-slate-900 dark:text-alabaster">
                        {weather.current.temperature}°C
                      </p>
                      <p className="text-sm text-slate-600 dark:text-dusty capitalize mt-1">
                        {weather.current.description}
                      </p>
                    </>
                  ) : (
                    <p className="text-slate-600 dark:text-dusty">Loading...</p>
                  )}
                </div>

                {weather && (
                  <div className="grid grid-cols-3 gap-3 text-[11px] text-slate-600 dark:text-dusty">
                    <div className="flex flex-col items-center">
                      <BoltIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <span className="uppercase tracking-[0.2em] text-[10px] text-slate-500 dark:text-dusty mt-1">Wind</span>
                      <span className="font-semibold text-slate-800 dark:text-alabaster">{Math.round(weather.current.windSpeed || 0)} m/s</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <CloudIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <span className="uppercase tracking-[0.2em] text-[10px] text-slate-500 dark:text-dusty mt-1">Humidity</span>
                      <span className="font-semibold text-slate-800 dark:text-alabaster">{weather.current.humidity ?? 0}%</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <MapIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <span className="uppercase tracking-[0.2em] text-[10px] text-slate-500 dark:text-dusty mt-1">Visibility</span>
                      <span className="font-semibold text-slate-800 dark:text-alabaster">{weather.current.visibility ?? 0} km</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            <div className="lg:col-span-2 space-y-6">
              {/* Rider Stats */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl bg-white/70 dark:bg-slate-900/55 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.35)] dark:shadow-[0_16px_36px_-26px_rgba(0,0,0,0.75)] p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">Rider Stats</p>
                  <ChartBarIcon className="w-5 h-5 text-slate-500 dark:text-dusty" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-xl bg-white/80 dark:bg-slate-900/60 shadow-sm p-4 text-center">
                    <ChartBarIcon className="w-7 h-7 text-accent mx-auto mb-3" />
                    <p className="text-2xl font-semibold text-slate-900 dark:text-alabaster">{stats?.totalRides || 0}</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">Total Rides</p>
                  </div>
                  <div className="rounded-xl bg-white/80 dark:bg-slate-900/60 shadow-sm p-4 text-center">
                    <MapIcon className="w-7 h-7 text-slate-500 dark:text-dusty mx-auto mb-3" />
                    <p className="text-2xl font-semibold text-slate-900 dark:text-alabaster">
                      {stats?.totalDistance ? `${(stats.totalDistance / 1000).toFixed(0)}` : '0'}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">Total KM</p>
                  </div>
                  <div className="rounded-xl bg-white/80 dark:bg-slate-900/60 shadow-sm p-4 text-center">
                    <UserGroupIcon className="w-7 h-7 text-green-500 mx-auto mb-3" />
                    <p className="text-2xl font-semibold text-slate-900 dark:text-alabaster">{stats?.helpCount || 0}</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">People Helped</p>
                  </div>
                  <div className="rounded-xl bg-white/80 dark:bg-slate-900/60 shadow-sm p-4 text-center">
                    <TrophyIcon className="w-7 h-7 text-yellow-500 mx-auto mb-3" />
                    <p className="text-2xl font-semibold text-slate-900 dark:text-alabaster">{stats?.rewardPoints || 0}</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">Reward Points</p>
                  </div>
                </div>
              </motion.div>

              {/* Leaderboard */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-2xl bg-white/70 dark:bg-slate-900/55 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.35)] dark:shadow-[0_16px_36px_-26px_rgba(0,0,0,0.75)] p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">Top Riders</p>
                  <UserGroupIcon className="w-5 h-5 text-slate-500 dark:text-dusty" />
                </div>
                {leaderboard.length > 0 ? (
                  <div className="space-y-3">
                    {leaderboard.map((rider, index) => (
                      <div key={rider.user._id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-yellow-500 text-black' :
                            index === 1 ? 'bg-gray-300 text-black' :
                              index === 2 ? 'bg-orange-600 text-white' :
                                'bg-slate-200/80 text-slate-600 dark:bg-dusk dark:text-dusty'
                            }`}>
                            {index + 1}
                          </div>
                          <span className="text-slate-900 dark:text-alabaster text-sm">{rider.user.name}</span>
                        </div>
                        <span className="text-accent text-sm font-semibold">
                          {rider.score} pts
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600 dark:text-dusty text-center">No leaderboard data</p>
                )}
              </motion.div>

              {/* Recent Alerts */}
              {nearbyAlerts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="rounded-2xl bg-white/70 dark:bg-slate-900/55 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.35)] dark:shadow-[0_16px_36px_-26px_rgba(0,0,0,0.75)] p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">Nearby Alerts</p>
                    <ExclamationTriangleIcon className="w-5 h-5 text-slate-500 dark:text-dusty" />
                  </div>
                  <div className="space-y-4">
                    {nearbyAlerts.slice(0, 3).map((alert) => (
                      <div key={alert.id} className="rounded-xl bg-white/85 dark:bg-slate-900/70 shadow-sm p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-start space-x-4">
                            <div className="text-2xl">
                              {alert.type === 'accident' ? '🚨' :
                                alert.type === 'breakdown' ? '🛠️' :
                                  alert.type === 'medical' ? '🏥' : '⚠️'}
                            </div>
                            <div>
                              <h4 className="text-slate-900 dark:text-alabaster font-semibold capitalize">
                                {alert.type} Alert
                              </h4>
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

                                return <p className="text-xs text-slate-600 dark:text-dusty">{distanceText}</p>
                              })()}
                              {alert.description && (
                                <p className="text-sm text-slate-600 dark:text-dusty mt-1">
                                  {alert.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <Link
                            to={`/emergency`}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-full transition-colors"
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
        </section>


        {/* Quick Actions */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-alabaster">Command Actions</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">Command bar</span>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-2xl bg-white/70 dark:bg-slate-900/55 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.35)] dark:shadow-[0_16px_36px_-26px_rgba(0,0,0,0.75)] p-5"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {quickFeatures.map((feature) => {
                const Icon = feature.icon
                const isEmergency = feature.title === 'Emergency Alert'
                return (
                  <Link
                    key={feature.title}
                    to={feature.link}
                    className="group"
                  >
                    <motion.div
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`rounded-xl transition-all h-full cursor-pointer p-4 flex flex-col items-start text-left ${isEmergency
                          ? 'bg-red-50/80 dark:bg-red-950/30 shadow-[0_12px_26px_-16px_rgba(220,38,38,0.6)] ring-1 ring-red-200/80 dark:ring-red-500/40'
                          : 'bg-white/70 dark:bg-slate-900/60 shadow-sm'
                        }`}
                    >
                      <div className={`text-${feature.color} mb-3`}>
                        <Icon className="w-8 h-8" />
                      </div>
                      <h3 className={`text-sm font-semibold ${isEmergency ? 'text-red-700 dark:text-red-300' : 'text-slate-900 dark:text-alabaster'}`}>
                        {feature.title}
                      </h3>
                      <p className="text-[11px] text-slate-600 dark:text-dusty mt-1">
                        {feature.description}
                      </p>
                    </motion.div>
                  </Link>
                )
              })}
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  )
}

export default Dashboard