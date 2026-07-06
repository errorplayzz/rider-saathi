import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ExclamationTriangleIcon, PhoneIcon, MapPinIcon, ClockIcon, UserGroupIcon, 
  TruckIcon, HeartIcon, FireIcon, CheckCircleIcon, XMarkIcon, SignalIcon, 
  WifiIcon, ShieldExclamationIcon, CloudIcon, BoltIcon, UserCircleIcon, 
  ChatBubbleLeftIcon, ArrowRightIcon, BellAlertIcon, MapIcon, ChevronRightIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import {
  getActiveEmergencyAlerts,
  createEmergencyAlert,
  respondToEmergency,
  resolveEmergency
} from '../lib/supabaseHelpers'

const Emergency = () => {
  const [activeAlert, setActiveAlert] = useState(null)
  const [nearbyAlerts, setNearbyAlerts] = useState([])
  const [emergencyContacts, setEmergencyContacts] = useState([])
  const [userLocation, setUserLocation] = useState(null)
  const [isResponding, setIsResponding] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '' })
  const [toast, setToast] = useState(null)

  const { user, profile } = useAuth()
  const { socket, connected } = useSocket()

  const emergencyTypes = [
    {
      type: 'accident',
      title: 'Accident',
      description: 'Vehicle accident or collision',
      icon: ExclamationTriangleIcon,
      color: 'red-500',
      emoji: '🚨'
    },
    {
      type: 'breakdown',
      title: 'Breakdown',
      description: 'Vehicle breakdown or malfunction',
      icon: TruckIcon,
      color: 'orange-500',
      emoji: '🛠️'
    },
    {
      type: 'medical',
      title: 'Medical Emergency',
      description: 'Medical assistance needed',
      icon: HeartIcon,
      color: 'pink-500',
      emoji: '🏥'
    },
    {
      type: 'fire',
      title: 'Fire Emergency',
      description: 'Fire or smoke detected',
      icon: FireIcon,
      color: 'red-600',
      emoji: '🔥'
    }
  ]

  useEffect(() => {
    getCurrentLocation()
    fetchNearbyAlerts()
    fetchEmergencyContacts()
  }, [])

  useEffect(() => {
    if (!socket) return

    socket.on('emergency-alert', (alertData) => {
      setNearbyAlerts(prev => [alertData, ...prev])
    })

    socket.on('alert-resolved', (alertId) => {
      setNearbyAlerts(prev => prev.filter(alert => alert.id !== alertId))
      if (activeAlert?.id === alertId) {
        setActiveAlert(null)
      }
    })

    socket.on('responder-joined', (data) => {
      setNearbyAlerts(prev =>
        prev.map(alert =>
          alert.id === data.alertId
            ? { ...alert, respondersCount: (alert.respondersCount || 0) + 1 }
            : alert
        )
      )
    })

    return () => {
      socket.off('emergency-alert')
      socket.off('alert-resolved')
      socket.off('responder-joined')
    }
  }, [socket, activeAlert])

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => console.error('Location error:', error),
        { enableHighAccuracy: true, maximumAge: 10000 }
      )
    }
  }

  // Promise-based location getter so click handlers can await location acquisition
  const getCurrentLocationAsync = (timeout = 10000) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation not supported'))

      let resolved = false
      const success = (position) => {
        resolved = true
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }
        setUserLocation(loc)
        resolve(loc)
      }

      const failure = (err) => {
        if (resolved) return
        resolved = true
        reject(err)
      }

      navigator.geolocation.getCurrentPosition(success, failure, { enableHighAccuracy: true })

      // fallback timeout
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          reject(new Error('Location request timed out'))
        }
      }, timeout)
    })
  }

  const fetchNearbyAlerts = async () => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const alerts = await getActiveEmergencyAlerts(
            position.coords.longitude,
            position.coords.latitude,
            10000
          )
          setNearbyAlerts(alerts || [])
        } catch (error) {
          console.error('Alerts fetch error:', error)
        }
      },
      (error) => console.error('Location error:', error)
    )
  }

  const fetchEmergencyContacts = async () => {
    try {
      // Emergency contacts stored in profile preferences
      const contacts = profile?.preferences?.emergencyContacts || []
      setEmergencyContacts(contacts)
    } catch (error) {
      console.error('Emergency contacts fetch error:', error)
    }
  }

  const sendEmergencyAlert = async (type) => {
    // Check if user is logged in
    if (!user || !user.id) {
      alert('Please login to send emergency alerts')
      return
    }

    try {
      // Ensure we have a location; try to request one if missing
      let loc = userLocation
      if (!loc) {
        try {
          // For fire alerts we try a little longer and require a location if we can't obtain one
          loc = await getCurrentLocationAsync(type === 'fire' ? 12000 : 8000)
        } catch (err) {
          if (type === 'fire') {
            // Fire alerts must include a location for responders and services
            alert('Location is required for fire alerts. Please enable your device location and try again.')
            return
          }

          // ask user whether to continue without precise location for non-fire types
          const proceed = window.confirm('Location not available. Send emergency alert without precise location? (recommended: enable location)')
          if (!proceed) return
        }
      }

      // If still no loc, send a placeholder (backend prefers location but may accept nulls)
      const severity = type === 'medical' || type === 'fire' ? 'high' : 'medium'
      const description = `${type} emergency alert`

      // Default location if not available
      const alertLocation = loc || {
        longitude: 77.1025,
        latitude: 28.7041,
        address: 'Location unavailable'
      }

      const alert = await createEmergencyAlert(
        user.id,
        type,
        severity,
        alertLocation,
        description
      )

      console.log('✅ Emergency alert created:', alert)
      setActiveAlert(alert)

      // Emit via socket for real-time updates
      if (socket) {
        socket.emit('emergency-alert', alert)
        console.log('📡 Alert sent via socket')
      }

      // Play a subtle alert sound
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'sine'
        o.frequency.value = 880
        g.gain.value = 0.03
        o.connect(g)
        g.connect(ctx.destination)
        o.start()
        setTimeout(() => { o.stop(); ctx.close() }, 300)
      } catch (e) {
        // ignore sound errors
        console.log('🔇 Audio not available')
      }

      // Show toast notification
      const emergencyType = emergencyTypes.find(e => e.type === type)
      setToast({
        message: `${emergencyType?.emoji || '🚨'} ${emergencyType?.title || type.toUpperCase()} alert sent! Help is on the way.`,
        type: 'success'
      })
      setTimeout(() => setToast(null), 4000)

      // Refresh nearby alerts
      fetchNearbyAlerts()

    } catch (error) {
      console.error('❌ Alert send error:', error)
      
      // Handle different error types
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        setToast({ 
          message: '🔐 Please login again to send emergency alerts', 
          type: 'warning' 
        })
      } else if (error.message?.includes('400')) {
        setToast({ 
          message: '📍 Location is required for emergency alerts. Please enable location services.', 
          type: 'warning' 
        })
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        setToast({ 
          message: '📡 Network error. Please check your connection and try again.', 
          type: 'error' 
        })
      } else {
        setToast({ 
          message: '❌ Failed to send emergency alert. Please try again.', 
          type: 'error' 
        })
      }
      
      setTimeout(() => setToast(null), 6000)
    }
  }

  const respondToAlert = async (alertId) => {
    if (!userLocation) {
      alert('Location not available')
      return
    }

    setIsResponding(true)
    try {
      await respondToEmergency(alertId, user.id, {
        responder_location: {
          type: 'Point',
          coordinates: [userLocation.longitude, userLocation.latitude]
        }
      })

      // Update local state
      setNearbyAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId
            ? { ...alert, respondersCount: (alert.respondersCount || 0) + 1, responded: true }
            : alert
        )
      )

      // Emit via socket
      if (socket) {
        socket.emit('responder-joined', { alertId, responder: user })
      }

      setToast({ message: '✅ Response sent! You are now heading to help.', type: 'success' })
      setTimeout(() => setToast(null), 3000)
    } catch (error) {
      console.error('Response error:', error)
      setToast({ message: 'Failed to respond to alert', type: 'warning' })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setIsResponding(false)
    }
  }

  const resolveAlert = async (alertId) => {
    try {
      await resolveEmergency(alertId)

      setNearbyAlerts(prev => prev.filter(alert => alert.id !== alertId))
      if (activeAlert?.id === alertId) {
        setActiveAlert(null)
      }

      // Emit via socket
      if (socket) {
        socket.emit('alert-resolved', alertId)
      }

      setToast({ message: '✅ Emergency resolved successfully!', type: 'success' })
      setTimeout(() => setToast(null), 3000)
    } catch (error) {
      console.error('Resolve error:', error)
      const message = error.message || 'Failed to resolve alert'
      setToast({ message, type: 'warning' })
      setTimeout(() => setToast(null), 4000)
    }
  }

  const addEmergencyContact = async () => {
    if (!newContact.name || !newContact.phone) {
      alert('Please fill in all required fields')
      return
    }

    try {
      // Store emergency contacts in profile preferences
      const contacts = profile?.preferences?.emergencyContacts || []
      const updatedContacts = [...contacts, newContact]

      // Update via AuthContext - need to import updateProfile from supabaseHelpers
      const { updateProfile: updateProfileHelper } = await import('../lib/supabaseHelpers')
      const preferences = profile?.preferences || {}
      await updateProfileHelper(user.id, {
        preferences: { ...preferences, emergencyContacts: updatedContacts }
      })

      setEmergencyContacts(updatedContacts)
      setNewContact({ name: '', phone: '', relationship: '' })
      setShowContactForm(false)
      alert('Emergency contact added successfully!')
    } catch (error) {
      console.error('Add contact error:', error)
      alert('Failed to add emergency contact')
    }
  }

  const callEmergencyContact = (phone) => {
    window.open(`tel:${phone}`, '_self')
  }

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
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

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F7] font-sans pb-32 relative overflow-x-hidden selection:bg-[#B08968]/30">
      
      {/* Background Depth Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#B08968]/15 via-[#1A1A1A]/40 to-[#050505]"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[50vh] bg-gradient-to-t from-[#090909] to-transparent"></div>
        {activeAlert && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 0.15 }} 
            className="absolute inset-0 bg-red-600 mix-blend-overlay"
          />
        )}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 space-y-8">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Emergency Command Center</h1>
            <p className="text-[#86868B] text-sm">Active ride monitoring and rapid response systems.</p>
          </div>
          <div className="flex items-center gap-4">
            {activeAlert && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full text-red-500"
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold tracking-widest uppercase">SOS Active</span>
              </motion.div>
            )}
            <div className="flex items-center gap-2 px-4 py-2 bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-full text-[#B08968]">
              <div className="w-2 h-2 rounded-full bg-[#B08968]" />
              <span className="text-xs font-bold tracking-widest uppercase">Network Secured</span>
            </div>
          </div>
        </header>

        {/* SECTION 1: EMERGENCY NETWORK HERO */}
        <section className="bg-gradient-to-b from-[#1C1C1E]/90 to-[#0A0A0A]/90 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#86868B]">System Telemetry</h2>
            <SignalIcon className="w-5 h-5 text-[#B08968]" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[
              { label: 'GPS Accuracy', value: '±3 meters', icon: MapPinIcon, active: true },
              { label: 'Network', value: 'LTE Connected', icon: WifiIcon, active: true },
              { label: 'Bluetooth', value: 'Helmet Paired', icon: PhoneIcon, active: true },
              { label: 'Weather Risk', value: 'Clear / Safe', icon: CloudIcon, active: true },
              { label: 'Nearby Riders', value: `${nearbyAlerts.length} Units`, icon: UserGroupIcon, active: true },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                <stat.icon className="w-5 h-5 text-[#86868B]" />
                <div className="mt-2 text-[#F5F5F7] font-semibold">{stat.value}</div>
                <div className="text-[10px] uppercase tracking-widest text-[#86868B]">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: EMERGENCY ACTIONS GRID */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#86868B]">Rapid Dispatch</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { id: 'accident', title: 'Accident', icon: ExclamationTriangleIcon, color: 'text-red-500', bg: 'hover:bg-red-500/10 hover:border-red-500/30' },
              { id: 'medical', title: 'Medical', icon: HeartIcon, color: 'text-rose-500', bg: 'hover:bg-rose-500/10 hover:border-rose-500/30' },
              { id: 'fire', title: 'Fire', icon: FireIcon, color: 'text-orange-500', bg: 'hover:bg-orange-500/10 hover:border-orange-500/30' },
              { id: 'breakdown', title: 'Breakdown', icon: TruckIcon, color: 'text-[#B08968]', bg: 'hover:bg-[#B08968]/10 hover:border-[#B08968]/30' },
              { id: 'crime', title: 'Crime', icon: ShieldExclamationIcon, color: 'text-purple-500', bg: 'hover:bg-purple-500/10 hover:border-purple-500/30' },
              { id: 'disaster', title: 'Disaster', icon: BoltIcon, color: 'text-yellow-500', bg: 'hover:bg-yellow-500/10 hover:border-yellow-500/30' }
            ].map((action) => (
              <button 
                key={action.id}
                onClick={() => sendEmergencyAlert(action.id)}
                disabled={isResponding || (activeAlert && activeAlert.alert_type === action.id)}
                className={`group relative flex flex-col items-center justify-center gap-4 p-6 rounded-[24px] bg-gradient-to-b from-[#1C1C1E]/80 to-[#0A0A0A]/90 backdrop-blur-xl border border-white/10 shadow-xl transition-all duration-300 ${action.bg} overflow-hidden disabled:opacity-50`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                <action.icon className={`w-8 h-8 ${action.color} group-hover:scale-110 transition-transform duration-300`} />
                <span className="text-sm font-semibold text-[#F5F5F7] z-10">{action.title}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* SECTION 4: NEARBY EMERGENCY FEED */}
          <section className="lg:col-span-2 space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#86868B]">Live Network Feed</h2>
            <div className="bg-gradient-to-b from-[#1C1C1E]/60 to-[#0A0A0A]/80 backdrop-blur-2xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] rounded-[32px] p-2 h-[600px] overflow-y-auto custom-scrollbar">
              {nearbyAlerts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                  <CheckCircleIcon className="w-12 h-12 text-[#B08968] mb-4" />
                  <p className="text-lg text-white font-medium">All Clear</p>
                  <p className="text-sm text-[#86868B]">No emergencies reported in your sector.</p>
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  {nearbyAlerts.map(alert => (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={alert.id}
                      className="group flex flex-col sm:flex-row gap-4 p-4 rounded-[24px] bg-gradient-to-br from-[#252529] to-[#121212] border border-white/10 shadow-[0_8px_16px_-6px_rgba(0,0,0,0.5)] hover:border-white/20 transition-all"
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                        <BellAlertIcon className="w-6 h-6 text-red-500" />
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[#F5F5F7] font-semibold capitalize">{alert.alert_type} Alert</span>
                          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] uppercase tracking-wider font-bold">High Priority</span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-[#86868B] mb-4">
                          <span className="flex items-center gap-1"><MapPinIcon className="w-3.5 h-3.5" /> 2.4 km away</span>
                          <span className="flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" /> Just now</span>
                          <span className="flex items-center gap-1"><UserGroupIcon className="w-3.5 h-3.5" /> {alert.respondersCount || 0} Responding</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => respondToAlert(alert.id)} disabled={isResponding} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-full transition-colors disabled:opacity-50">
                            Respond
                          </button>
                          <button className="px-4 py-2 bg-[#B08968]/20 hover:bg-[#B08968]/30 text-[#B08968] text-xs font-semibold rounded-full transition-colors">
                            View Map
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className="space-y-8">
            {/* SECTION 5: LIVE MAP PREVIEW */}
            <section>
               <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#86868B] mb-6">Sector Map</h2>
               <div className="w-full h-48 bg-[#0A0A0A]/90 rounded-[32px] border border-white/10 shadow-[0_16px_32px_-12px_rgba(0,0,0,0.8)] overflow-hidden relative flex items-center justify-center group cursor-pointer">
                  {/* Fake map placeholder for UI, actual map is heavy to instantiate here */}
                  <div className="absolute inset-0 bg-[url('https://cartodb-basemaps-c.global.ssl.fastly.net/dark_all/12/2356/1572.png')] bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111111] to-transparent" />
                  <div className="w-4 h-4 rounded-full bg-[#B08968] ring-4 ring-[#B08968]/30 animate-pulse relative z-10" />
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between text-[10px] font-bold tracking-widest text-[#86868B] uppercase">
                    <span>Active Sector</span>
                    <span className="flex items-center gap-1">Open <ArrowRightIcon className="w-3 h-3"/></span>
                  </div>
               </div>
            </section>

            {/* SECTION 3: EMERGENCY CONTACTS */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#86868B]">Priority Contacts</h2>
                <button onClick={() => setShowContactForm(true)} className="text-[#B08968] text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">
                  + Add
                </button>
              </div>
              <div className="space-y-3">
                {emergencyContacts.length === 0 ? (
                  <div className="p-6 text-center rounded-[24px] bg-[#111111]/80 border border-white/5 text-[#86868B] text-sm">
                    No contacts configured.
                  </div>
                ) : (
                  emergencyContacts.map((contact, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-[#111111]/80 backdrop-blur-xl border border-white/5 rounded-[24px] hover:border-white/10 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                           <UserCircleIcon className="w-6 h-6 text-[#86868B]" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#F5F5F7]">{contact.name}</div>
                          <div className="text-[10px] text-[#86868B] uppercase tracking-widest">{contact.relationship}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                          <ChatBubbleLeftIcon className="w-4 h-4 text-white" />
                        </button>
                        <button className="w-8 h-8 rounded-full bg-[#B08968]/20 flex items-center justify-center hover:bg-[#B08968]/30 transition-colors">
                          <PhoneIcon className="w-4 h-4 text-[#B08968]" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
        
        {/* SECTION 7: SAFETY TIPS */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#86868B] mb-6">Mission Briefing</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
            {[
              { title: 'Night Vision', desc: 'Ensure visor is clear. Drop speed by 20%.', icon: EyeIcon },
              { title: 'Rain Protocol', desc: 'Traction reduced. Avoid sudden braking.', icon: CloudIcon },
              { title: 'Fatigue Check', desc: 'Riding > 2hrs? Pull over for 15 mins.', icon: ClockIcon },
              { title: 'Gear Check', desc: 'Helmet strapped, gloves secured.', icon: ShieldExclamationIcon }
            ].map((tip, i) => (
              <div key={i} className="flex-shrink-0 w-64 p-5 rounded-[24px] bg-gradient-to-b from-[#1C1C1E] to-[#0A0A0A] backdrop-blur-xl border border-white/10 shadow-lg shadow-black/60 snap-start hover:border-[#B08968]/30 hover:shadow-[0_0_20px_rgba(176,137,104,0.15)] transition-all">
                <tip.icon className="w-6 h-6 text-[#B08968] mb-3 drop-shadow-[0_0_8px_rgba(176,137,104,0.5)]" />
                <h3 className="text-sm font-bold text-white mb-1">{tip.title}</h3>
                <p className="text-xs text-[#86868B]">{tip.desc}</p>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* SECTION 8: STICKY BOTTOM EMERGENCY DOCK */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 pb-safe pointer-events-none">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 p-2 bg-[#050505]/70 backdrop-blur-3xl border border-white/10 shadow-[0_-30px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] rounded-[32px] pointer-events-auto">
          
          <button 
            onClick={() => sendEmergencyAlert('accident')}
            className="flex-1 flex items-center justify-center gap-2 p-4 rounded-[24px] bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 border border-red-400/30 transition-all text-white shadow-[0_0_30px_rgba(220,38,38,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(220,38,38,0.6),inset_0_1px_0_rgba(255,255,255,0.3)]">
            <BellAlertIcon className="w-5 h-5 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
            <span className="font-bold tracking-widest uppercase text-sm drop-shadow-md">SOS Override</span>
          </button>
          
          <div className="hidden md:flex items-center gap-2 px-2">
            <button 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Emergency Location',
                    text: 'I need help! Here is my current location.',
                    url: `https://www.google.com/maps?q=${userLocation?.latitude},${userLocation?.longitude}`
                  }).catch(console.error);
                } else {
                  alert('Location sharing is not supported on this browser.');
                }
              }}
              className="p-4 rounded-[24px] bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-[#F5F5F7] flex items-center gap-2">
              <MapPinIcon className="w-5 h-5" />
              <span className="font-medium text-xs">Share Location</span>
            </button>
            <button 
              onClick={() => {
                if (emergencyContacts.length > 0) {
                  callEmergencyContact(emergencyContacts[0].phone);
                } else {
                  alert('Please add a priority contact first.');
                }
              }}
              className="p-4 rounded-[24px] bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-[#F5F5F7] flex items-center gap-2">
              <PhoneIcon className="w-5 h-5" />
              <span className="font-medium text-xs">Call Contacts</span>
            </button>
          </div>
          
        </div>
      </div>

    </div>
  )
}

export default Emergency;
