import React, { useState, useEffect } from 'react'
import gsap from 'gsap'
import { Link } from 'react-router-dom'
import {
  MapIcon, ChatBubbleLeftIcon, ExclamationTriangleIcon, TrophyIcon,
  BoltIcon, CloudIcon, UserGroupIcon, ChartBarIcon, ClockIcon,
  MapPinIcon, SunIcon, ShieldCheckIcon, SignalIcon, BeakerIcon,
  ShoppingBagIcon, ChatBubbleBottomCenterTextIcon, MicrophoneIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import {
  getLeaderboard,
  getActiveEmergencyAlerts,
  createRide,
  updateRide,
  updateUserStatus,
  updateProfile,
  getRides,
  getRewards
} from '../lib/supabaseHelpers'
import { withTimeout, safeFetch, getLocationWithTimeout } from '../utils/asyncHelpers'

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [weather, setWeather] = useState(null)
  const [nearbyAlerts, setNearbyAlerts] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [backendOnline, setBackendOnline] = useState(false)
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
    location: false,
    activity: false
  })

  const { user, profile, session } = useAuth()
  const { socket, onlineUsers } = useSocket()

  useEffect(() => {
    let mounted = true

    const checkBackendHealth = async () => {
      try {
        const API_BASE = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:5001'
        const healthUrl = `${API_BASE.replace(/\/$/, '')}/api/health`
        const response = await safeFetch(healthUrl, { headers: { Accept: 'application/json' } }, 5000, 1)
        const data = await response.json()

        if (mounted) {
          setBackendOnline(Boolean(response.ok && data?.success))
        }
      } catch (error) {
        if (mounted) setBackendOnline(false)
      }
    }

    checkBackendHealth()
    const interval = setInterval(checkBackendHealth, 30000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

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
          initBatterySafely(),
          initActivitySafely()
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

  const initActivitySafely = async () => {
    setLoading('activity', true)
    try {
      await withTimeout(fetchRecentActivity(), 6000, 'activity fetch')
    } catch (error) {
      // Silent fail
    } finally {
      setLoading('activity', false)
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

  const fetchRecentActivity = async () => {
    if (!user) return
    try {
      // Fetch latest 5 rides and 5 rewards
      const [rides, rewards] = await Promise.all([
        getRides(user.id, 5).catch(() => []),
        getRewards(user.id, 5).catch(() => [])
      ])
      
      const activities = []
      
      if (rides && rides.length > 0) {
        rides.forEach(ride => {
          activities.push({
            id: `ride-${ride.id}`,
            title: 'Ride Completed',
            description: ride.distance_meters ? `${(ride.distance_meters / 1000).toFixed(1)} km` : 'Location ride recorded',
            timestamp: new Date(ride.end_time || ride.created_at),
            type: 'ride'
          })
        })
      }
      
      if (rewards && rewards.length > 0) {
        rewards.forEach(reward => {
          activities.push({
            id: `reward-${reward.id}`,
            title: 'Points Earned',
            description: `+${reward.points} pts - ${reward.activity_type || 'Activity'}`,
            timestamp: new Date(reward.created_at),
            type: 'reward'
          })
        })
      }
      
      // Sort by timestamp descending
      activities.sort((a, b) => b.timestamp - a.timestamp)
      
      setRecentActivity(activities.slice(0, 3))
    } catch (error) {
      setRecentActivity([])
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

  const containerRef = React.useRef(null);

  React.useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      gsap.fromTo(".hero-greeting", 
        { opacity: 0, y: 20 }, 
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      );
      
      gsap.fromTo(".dashboard-section",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "power3.out", delay: 0.2 }
      );

      gsap.to(".weather-float", {
        y: -10, duration: 2, repeat: -1, yoyo: true, ease: "sine.inOut"
      });
      
      if (batteryLevel) {
        gsap.fromTo(".battery-fill",
          { width: "0%" },
          { width: `${batteryLevel}%`, duration: 1.5, ease: "power3.out", delay: 0.8 }
        );
      }
    }, containerRef);
    return () => ctx.revert();
  }, [batteryLevel]);

  return (
    <div ref={containerRef} className="min-h-screen pt-24 pb-16 px-4 md:px-8 text-[#F5F5F7] bg-[#090909] font-sans relative overflow-x-hidden">
      {/* Background Decorators */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#B08968]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#1a1a1a]/40 blur-[100px] rounded-full" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 flex flex-col gap-10">
        
        {/* 1. Premium Greeting */}
        <section className="hero-greeting flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-[#F5F5F7] mb-2">
              Good Evening, {profile?.name?.split(' ')[0] || user?.user_metadata?.name?.split(' ')[0] || 'Rider'}.
            </h1>
            <p className="text-[#86868B] text-base md:text-lg">Everything is ready for your next ride.</p>
          </div>
          
          <div className="flex items-center gap-6 bg-[#111111]/80 backdrop-blur-xl border border-white/[0.04] px-6 py-3 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-[#B08968]" />
              <span className="text-sm font-medium">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <div className="w-[1px] h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              <CloudIcon className="w-5 h-5 text-[#86868B]" />
              <span className="text-sm font-medium">{weather ? `${weather.current.temperature}°C` : '--'}</span>
            </div>
            <div className="w-[1px] h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-5 h-5 text-[#86868B]" />
              <span className="text-sm font-medium">{currentLocation ? 'Location Active' : 'Locating...'}</span>
            </div>
          </div>
        </section>

        {/* 2. Main Cockpit (Hero Card) */}
        <section className="dashboard-section relative rounded-[32px] bg-[#111111]/90 backdrop-blur-3xl border border-white/[0.05] shadow-[0_24px_48px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
          
          <div className="p-8 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6">
            
            {/* Left: Bike Graphic */}
            <div className="lg:col-span-4 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(176,137,104,0.1),transparent_70%)] blur-2xl" />
              {/* Premium Bike Silhouette placeholder */}
              <div className="relative w-full aspect-square max-w-[300px]">
                <img src="https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover rounded-full opacity-40 mix-blend-screen mask-image-radial filter grayscale contrast-150" alt="Motorcycle" style={{ WebkitMaskImage: 'radial-gradient(circle, black 40%, transparent 70%)' }} />
              </div>
            </div>

            {/* Center: Ride Status */}
            <div className="lg:col-span-5 flex flex-col justify-center gap-8">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full shadow-[0_0_12px_rgba(0,0,0,0.5)] ${backendOnline ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'}`} />
                <span className="text-sm uppercase tracking-widest text-[#86868B] font-medium">{backendOnline ? 'System Connected' : 'System Offline'}</span>
              </div>
              
              <div>
                <h2 className="text-5xl font-semibold tracking-tight text-[#F5F5F7] mb-2">{isRiding ? 'Ride Active' : 'Ready to Ride'}</h2>
                <p className="text-[#86868B] text-lg">{onlineUsers.length} riders currently active on the network.</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#86868B] mb-2">Battery</p>
                  <p className="text-2xl font-medium text-[#F5F5F7] mb-2">{batterySupported && batteryLevel !== null ? `${batteryLevel}%` : '--'}</p>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="battery-fill h-full bg-[#B08968] rounded-full" />
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#86868B] mb-2">Today's Distance</p>
                  <p className="text-2xl font-medium text-[#F5F5F7]">{stats?.totalDistance ? `${Math.round(Number(stats.totalDistance))} km` : '0 km'}</p>
                </div>
              </div>
            </div>

            {/* Right: CTAs & Status Indicators */}
            <div className="lg:col-span-3 flex flex-col justify-between gap-8 border-l border-white/5 pl-0 lg:pl-8">
              <div className="flex flex-col gap-4">
                <button onClick={isRiding ? endRide : startRide} className={`w-full py-4 rounded-2xl font-medium text-[15px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg ${isRiding ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' : 'bg-[#B08968] text-black hover:bg-[#c29875] shadow-[#B08968]/20'}`}>
                  {isRiding ? 'End Current Ride' : 'Start Ride'}
                </button>
                <Link to="/map" className="w-full py-4 rounded-2xl font-medium text-[15px] text-center bg-white/[0.03] text-[#F5F5F7] border border-white/[0.05] transition-all duration-300 hover:bg-white/[0.06] hover:scale-[1.02] active:scale-[0.98]">
                  Open Navigation
                </Link>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'GPS', active: Boolean(currentLocation) },
                  { label: 'NET', active: backendOnline },
                  { label: 'BLU', active: true },
                  { label: 'SOS', active: true, color: 'text-red-400' }
                ].map(indicator => (
                  <div key={indicator.label} className="flex flex-col items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${indicator.active ? (indicator.color ? 'bg-red-500' : 'bg-green-500') : 'bg-white/20'}`} />
                    <span className="text-[10px] uppercase tracking-widest text-[#86868B]">{indicator.label}</span>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        </section>

        {/* 3. Context & Intelligence */}
        <section className="dashboard-section grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Weather */}
          <div className="lg:col-span-4 rounded-[28px] bg-[#111111]/80 backdrop-blur-xl border border-white/[0.05] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#B08968]/10 blur-3xl rounded-full" />
            
            <div className="flex justify-between items-start mb-8">
              <span className="text-xs uppercase tracking-widest text-[#86868B]">Weather Conditions</span>
              <span className={`text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border ${weather?.rideConditions?.isGoodForRiding ? 'text-green-400 border-green-400/30 bg-green-400/10' : 'text-red-400 border-red-400/30 bg-red-400/10'}`}>
                {weather?.rideConditions?.isGoodForRiding ? 'Optimal' : 'Caution'}
              </span>
            </div>

            <div className="flex items-center gap-6 mb-8">
              <div className="weather-float">
                <SunIcon className="w-16 h-16 text-[#B08968]" />
              </div>
              <div>
                <p className="text-5xl font-medium tracking-tighter text-[#F5F5F7]">{weather ? `${weather.current.temperature}°C` : '--'}</p>
                <p className="text-[#86868B] capitalize text-sm mt-1">{weather ? weather.current.description : 'Loading...'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#86868B] mb-1">Wind</p>
                <p className="text-sm font-medium">{weather ? `${Math.round(weather.current.windSpeed)} m/s` : '--'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#86868B] mb-1">Humidity</p>
                <p className="text-sm font-medium">{weather?.current?.humidity ?? '--'}%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#86868B] mb-1">Visibility</p>
                <p className="text-sm font-medium">{weather?.current?.visibility ?? '--'} km</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#86868B] mb-1">AQI</p>
                <p className="text-sm font-medium">Good</p>
              </div>
            </div>
          </div>

          {/* Right: Rider Stats */}
          <div className="lg:col-span-8 rounded-[28px] bg-[#111111]/80 backdrop-blur-xl border border-white/[0.05] p-8 shadow-2xl">
            <span className="text-xs uppercase tracking-widest text-[#86868B] mb-8 block">Rider Intelligence</span>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 h-full pb-6">
              {[
                { label: "Today's KM", value: 0 }, // Would require daily aggregation endpoint
                { label: 'Total Rides', value: stats?.totalRides || 0 },
                { label: 'Total KM', value: stats?.totalDistance ? Math.round(Number(stats.totalDistance)) : 0 },
                { label: 'Hours Ridden', value: 0 }, // Would require daily aggregation endpoint
                { label: 'Emergency Assists', value: stats?.helpGiven || 0 },
                { label: 'Reward Points', value: stats?.rewardPoints || 0, highlight: true }
              ].map((stat, i) => (
                <div key={i} className="flex flex-col justify-center p-4 rounded-2xl bg-white/[0.02] border border-white/[0.02]">
                  <p className="text-[10px] uppercase tracking-widest text-[#86868B] mb-2">{stat.label}</p>
                  <p className={`text-3xl font-semibold tracking-tight ${stat.highlight ? 'text-[#B08968]' : 'text-[#F5F5F7]'}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Live Map Preview */}
        <section className="dashboard-section rounded-[28px] bg-[#111111]/80 backdrop-blur-xl border border-white/[0.05] p-2 shadow-2xl relative h-[280px] overflow-hidden group">
          <div className="absolute inset-0 bg-[#090909] opacity-80 z-10" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center opacity-30 grayscale filter mix-blend-overlay z-0" />
          
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
             <div className="w-16 h-16 rounded-full bg-[#B08968]/20 flex items-center justify-center mb-4 border border-[#B08968]/30">
               <MapPinIcon className="w-6 h-6 text-[#B08968]" />
             </div>
             <h3 className="text-xl font-medium text-white mb-6">Live Network Map</h3>
             <Link to="/map" className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:scale-105 transition-transform duration-300">
               Open Full Map
             </Link>
          </div>
        </section>

        {/* 5. Nearby Alerts & 6. Community */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Nearby Alerts */}
          <section className="dashboard-section rounded-[28px] bg-[#111111]/80 backdrop-blur-xl border border-white/[0.05] p-8 shadow-2xl">
            <span className="text-xs uppercase tracking-widest text-[#86868B] mb-6 block">Nearby Alerts</span>
            
            {nearbyAlerts.length > 0 ? (
              <div className="flex flex-col gap-3">
                {nearbyAlerts.slice(0, 4).map(alert => (
                  <div key={alert.id} className="group flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${alert.type === 'accident' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                        <ExclamationTriangleIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#F5F5F7]">
                          {alert.user?.name ? `${alert.user.name} needs help` : 'Emergency Alert'}
                        </p>
                        <p className="text-xs text-[#86868B] capitalize">
                          {alert.alert_type || alert.type || 'General'} Alert • {alert.distance ? `${Math.round(alert.distance)}m away` : 'Nearby'} • Just now
                        </p>
                      </div>
                    </div>
                    <Link to="/emergency" className="px-4 py-2 rounded-full bg-white/5 text-xs font-medium text-[#F5F5F7] hover:bg-[#B08968] hover:text-black transition-colors opacity-0 group-hover:opacity-100">
                      Respond
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-center opacity-50">
                <ShieldCheckIcon className="w-8 h-8 text-[#86868B] mb-3" />
                <p className="text-sm text-[#F5F5F7]">No active alerts.</p>
                <p className="text-xs text-[#86868B]">The network is safe.</p>
              </div>
            )}
          </section>

          {/* Community Leaderboard */}
          <section className="dashboard-section rounded-[28px] bg-[#111111]/80 backdrop-blur-xl border border-white/[0.05] p-8 shadow-2xl">
            <span className="text-xs uppercase tracking-widest text-[#86868B] mb-6 block">Community Leaders</span>
            
            {leaderboard.length > 0 ? (
              <div className="flex flex-col gap-3">
                {leaderboard.map((rider, index) => (
                  <div key={rider.user._id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03]">
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-mono text-[#86868B] w-4">{index + 1}</div>
                      <div className="w-8 h-8 rounded-full bg-white/10" />
                      <p className="text-sm font-medium text-[#F5F5F7]">{rider.user.name}</p>
                    </div>
                    <span className="text-sm font-medium text-[#B08968]">{rider.score} pts</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-center opacity-50">
                <UserGroupIcon className="w-8 h-8 text-[#86868B] mb-3" />
                <p className="text-sm text-[#F5F5F7]">Leaderboard syncing.</p>
              </div>
            )}
          </section>
        </div>

        {/* 7. Quick Actions */}
        <section className="dashboard-section mt-4">
           <span className="text-xs uppercase tracking-widest text-[#86868B] mb-6 block">Command Actions</span>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
             {quickFeatures.map(feature => (
               <Link key={feature.title} to={feature.link} className="group relative aspect-square flex flex-col justify-end p-6 rounded-3xl bg-[#111111]/80 backdrop-blur-xl border border-white/[0.05] shadow-lg hover:-translate-y-1 hover:border-[#B08968]/30 transition-all duration-300">
                  <div className="absolute top-6 left-6">
                    <feature.icon className={`w-6 h-6 ${feature.title === 'Emergency Alert' ? 'text-red-500' : 'text-[#B08968]'}`} />
                  </div>
                  <h4 className="text-sm font-medium text-[#F5F5F7] leading-tight">{feature.title}</h4>
               </Link>
             ))}
             
             <button className="group relative aspect-square flex flex-col justify-end p-6 rounded-3xl bg-[#111111]/80 backdrop-blur-xl border border-white/[0.05] shadow-lg hover:-translate-y-1 hover:border-[#B08968]/30 transition-all duration-300">
                <div className="absolute top-6 left-6">
                  <ShoppingBagIcon className="w-6 h-6 text-[#B08968]" />
                </div>
                <h4 className="text-sm font-medium text-[#F5F5F7] leading-tight">Marketplace</h4>
             </button>

             <button className="group relative aspect-square flex flex-col justify-end p-6 rounded-3xl bg-[#111111]/80 backdrop-blur-xl border border-white/[0.05] shadow-lg hover:-translate-y-1 hover:border-[#B08968]/30 transition-all duration-300">
                <div className="absolute top-6 left-6">
                  <MicrophoneIcon className="w-6 h-6 text-[#B08968]" />
                </div>
                <h4 className="text-sm font-medium text-[#F5F5F7] leading-tight">Voice Assist</h4>
             </button>
           </div>
        </section>

        {/* 8. Recent Activity */}
        <section className="dashboard-section rounded-[28px] bg-[#111111]/80 backdrop-blur-xl border border-white/[0.05] p-8 shadow-2xl mt-4">
           <span className="text-xs uppercase tracking-widest text-[#86868B] mb-8 block">Recent Activity</span>
           
           <div className="flex flex-col gap-6 pl-2">
             {recentActivity && recentActivity.length > 0 ? (
               recentActivity.map((activity, index) => (
                 <div key={activity.id} className={`relative pl-6 ${index !== recentActivity.length - 1 ? 'border-l border-[#B08968]/30' : 'border-l border-transparent'}`}>
                   <div className={`absolute w-2 h-2 rounded-full ${index === 0 ? 'bg-[#B08968] -left-[4.5px] top-1 shadow-[0_0_10px_rgba(176,137,104,0.5)] w-2.5 h-2.5' : 'bg-white/20 -left-1 top-1'}`} />
                   <p className="text-sm font-medium text-[#F5F5F7]">{activity.title}</p>
                   <p className="text-xs text-[#86868B] mt-1">{activity.timestamp.toLocaleDateString()} • {activity.description}</p>
                 </div>
               ))
             ) : (
               <div className="text-center py-6">
                 <p className="text-sm text-[#86868B]">No recent activity found.</p>
               </div>
             )}
           </div>
        </section>


      </div>
    </div>
  )
}

export default Dashboard
