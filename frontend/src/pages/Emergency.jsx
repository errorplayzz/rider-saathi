import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ExclamationTriangleIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  UserGroupIcon,
  TruckIcon,
  HeartIcon,
  FireIcon,
  CheckCircleIcon,
  XMarkIcon
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
    <div className="min-h-screen pt-20 px-4 pb-12">
      <div className="max-w-6xl mx-auto">
        {/* Top Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="rounded-2xl bg-white/85 dark:bg-slate-900/70 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.55)] dark:shadow-[0_30px_70px_-36px_rgba(0,0,0,0.9)] ring-1 ring-slate-200/70 dark:ring-slate-700/50 p-6 md:p-7">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">Emergency Network</p>
                <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 dark:text-alabaster mt-2">
                  {connected ? 'Active / Monitoring' : 'Monitoring Paused'}
                </h1>
                <p className="text-sm text-slate-600 dark:text-dusty mt-2">
                  Immediate assistance and community safety network
                </p>
              </div>
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] border ${
                connected
                  ? 'border-green-200/70 text-green-600 bg-green-50/70 dark:border-green-500/30 dark:text-green-300 dark:bg-green-500/10'
                  : 'border-slate-300/50 text-slate-500 bg-slate-100/60 dark:border-slate-600/40 dark:text-slate-300 dark:bg-slate-900/40'
                }`}>
                <span className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-slate-400'}`} />
                {connected ? 'Network Active' : 'Network Offline'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Active Alert */}
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-white/80 dark:bg-slate-900/70 border border-red-200/60 dark:border-red-500/30 shadow-[0_16px_40px_-26px_rgba(220,38,38,0.5)] p-6 mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="text-3xl">🚨</div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-alabaster">
                    Your Emergency Alert is Active
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-dusty">
                    Alert ID: {activeAlert.id} • {activeAlert.respondersCount || 0} responders
                  </p>
                </div>
              </div>
              <button
                onClick={() => resolveAlert(activeAlert.id)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors"
              >
                Mark Resolved
              </button>
            </div>
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-alabaster">Emergency Actions</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">Command zone</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {emergencyTypes.map((emergency) => {
              const Icon = emergency.icon
              const isPrimary = emergency.type === 'accident'
              return (
                <motion.button
                  key={emergency.type}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => sendEmergencyAlert(emergency.type)}
                  // allow sending even if realtime socket is disconnected; backend will still receive the alert
                  disabled={!!activeAlert}
                  className={`relative text-left transition-all duration-200 rounded-2xl ${
                    isPrimary ? 'lg:col-span-2 p-7 min-h-[220px]' : 'p-5 min-h-[180px]'
                  } ${!!activeAlert ? 'opacity-50 cursor-not-allowed' : ''} ${
                    isPrimary
                      ? 'bg-white/85 dark:bg-slate-900/70 shadow-[0_24px_60px_-32px_rgba(220,38,38,0.6)] border border-red-200/90 dark:border-red-500/50'
                      : 'bg-white/75 dark:bg-slate-900/55 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.35)] dark:shadow-[0_16px_36px_-26px_rgba(0,0,0,0.75)]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">{emergency.type}</p>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-alabaster mt-2">
                        {emergency.title}
                      </h3>
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ring-1 ${isPrimary ? 'bg-red-100/70 dark:bg-red-500/10 ring-red-200/80 dark:ring-red-500/40 shadow-[0_0_14px_rgba(220,38,38,0.25)]' : 'bg-slate-100/70 dark:bg-slate-800/60 ring-slate-200/70 dark:ring-slate-700/60'}`}>
                      <Icon className={`w-6 h-6 ${emergency.type === 'accident' ? 'text-emergency-accident' :
                        emergency.type === 'medical' ? 'text-emergency-medical' :
                          emergency.type === 'fire' ? 'text-emergency-fire' :
                            'text-dusty'
                        }`} />
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-dusty mt-3">
                    {emergency.description}
                  </p>

                  <div className={`mt-5 inline-flex items-center px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] ${
                    isPrimary
                      ? 'bg-red-50/80 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                      : 'bg-slate-100/70 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300'
                  }`}>
                    {isPrimary ? 'Dispatch Accident Alert' : 'Dispatch Alert'}
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* Toast Notification */}
        {
          toast && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className={`fixed top-20 right-4 z-[100] max-w-md p-4 rounded-lg shadow-2xl border-l-4 ${toast.type === 'success'
                ? 'bg-green-900/90 border-green-500 text-green-100'
                : toast.type === 'danger'
                  ? 'bg-red-900/90 border-red-500 text-red-100'
                  : 'bg-orange-900/90 border-orange-500 text-orange-100'
                } backdrop-blur-md`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-1 font-medium">{toast.message}</div>
                <button
                  onClick={() => setToast(null)}
                  className="text-white/70 hover:text-white"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )
        }

        {/* Emergency Contacts & Nearby Alerts */}
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Emergency Contacts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-1 rounded-2xl bg-white/60 dark:bg-slate-900/45 border border-slate-200/60 dark:border-slate-700/50 p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-alabaster">Emergency Contacts</h2>
                <p className="text-xs text-slate-500 dark:text-dusty mt-1">Who will be notified first</p>
              </div>
              <button
                onClick={() => setShowContactForm(!showContactForm)}
                className="text-accent hover:text-accent-hover transition-colors text-sm"
              >
                + Add
              </button>
            </div>

            {showContactForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="rounded-2xl bg-white/75 dark:bg-slate-900/55 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.35)] dark:shadow-[0_16px_36px_-26px_rgba(0,0,0,0.75)] p-5 mb-6"
              >
                <h3 className="text-base font-semibold text-slate-900 dark:text-alabaster mb-4">Add Emergency Contact</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/70 dark:bg-dusk border border-slate-200/70 dark:border-dusty/30 rounded text-slate-900 dark:text-alabaster focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-white/70 dark:bg-dusk border border-slate-200/70 dark:border-dusty/30 rounded text-slate-900 dark:text-alabaster focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                  <input
                    type="text"
                    placeholder="Relationship (optional)"
                    value={newContact.relationship}
                    onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                    className="w-full px-4 py-2 bg-white/70 dark:bg-dusk border border-slate-200/70 dark:border-dusty/30 rounded text-slate-900 dark:text-alabaster focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={addEmergencyContact}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors"
                    >
                      Add Contact
                    </button>
                    <button
                      onClick={() => setShowContactForm(false)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-full transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="space-y-4">
              {emergencyContacts.length > 0 ? (
                emergencyContacts.map((contact, index) => (
                  <div key={index} className="rounded-2xl bg-white/75 dark:bg-slate-900/55 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.35)] dark:shadow-[0_16px_36px_-26px_rgba(0,0,0,0.75)] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-slate-900 dark:text-alabaster font-semibold">{contact.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-dusty">{contact.relationship}</p>
                        <p className="text-sm text-accent">{contact.phone}</p>
                      </div>
                      <button
                        onClick={() => callEmergencyContact(contact.phone)}
                        className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors"
                      >
                        <PhoneIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-white/75 dark:bg-slate-900/55 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.35)] dark:shadow-[0_16px_36px_-26px_rgba(0,0,0,0.75)] text-center py-9">
                  <PhoneIcon className="w-12 h-12 text-slate-400 dark:text-dusty mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-dusty">No emergency contacts added</p>
                  <button
                    onClick={() => setShowContactForm(true)}
                    className="text-accent hover:text-accent-hover mt-2 text-sm"
                  >
                    Add your first contact
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Nearby Alerts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-alabaster">Nearby Emergencies</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-dusty">Live monitoring</span>
            </div>

            {nearbyAlerts.length > 0 ? (
              <div className="space-y-4">
                {nearbyAlerts.map((alert) => {
                  // Prefer server-provided distance (meters). If missing, derive from coordinates.
                  let distance = typeof alert.distance === 'number' ? alert.distance : null

                  if (distance === null) {
                    if (alert.location && Array.isArray(alert.location.coordinates) && alert.location.coordinates.length === 2 && userLocation) {
                      // server stores [longitude, latitude]
                      distance = calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        alert.location.coordinates[1],
                        alert.location.coordinates[0]
                      )
                    } else {
                      distance = 0
                    }
                  }

                  // normalize createdAt / timestamp
                  const timestamp = alert.createdAt || alert.timestamp || Date.now()

                  // determine ownership (backend returns populated `user` object)
                  const alertOwnerId = alert.user?.id || alert.user?._id || alert.user

                  return (
                    <div key={alert.id} className="rounded-2xl bg-white/70 dark:bg-slate-900/50 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.3)] dark:shadow-[0_14px_32px_-24px_rgba(0,0,0,0.7)] px-7 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center bg-slate-100/80 dark:bg-slate-800/60 ring-1 ring-slate-200/70 dark:ring-slate-700/60 shadow-[0_0_10px_rgba(148,163,184,0.2)]">
                            <span className="text-xl">
                            {alert.type === 'accident' ? '🚨' :
                              alert.type === 'breakdown' ? '🛠️' :
                                alert.type === 'medical' ? '🏥' :
                                  alert.type === 'fire' ? '🔥' : '⚠️'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className={`w-2 h-2 rounded-full ${alert.severity === 'high' ? 'bg-red-500' : alert.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'} shadow-[0_0_8px_rgba(239,68,68,0.35)]`} />
                              <h3 className="text-lg font-semibold text-slate-900 dark:text-alabaster capitalize">
                                {alert.type} Emergency
                              </h3>
                              <span className={`px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] rounded-full text-white ${alert.severity === 'high' ? 'bg-red-600' :
                                alert.severity === 'medium' ? 'bg-orange-600' :
                                  'bg-yellow-600'
                                }`}>
                                {alert.severity}
                              </span>

                              {/* Show who reported the alert (rider name + optional avatar) */}
                              <div className="flex items-center ml-3 text-sm text-slate-500 dark:text-gray-300">
                                {alert.user?.avatar ? (
                                  <img src={alert.user.avatar} alt={alert.user?.name || 'reporter'} className="w-6 h-6 rounded-full mr-2 object-cover" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-gray-700 mr-2" />
                                )}
                                <span className="truncate">{alert.user?.name || 'Anonymous'}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-gray-400">
                              <div className="flex items-center space-x-1">
                                <MapPinIcon className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                                <span>{Math.round(distance)}m away</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <ClockIcon className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                                <span>{new Date(timestamp).toLocaleTimeString()}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <UserGroupIcon className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                                <span>{alert.respondersCount || 0} responding</span>
                              </div>
                            </div>
                            {alert.description && (
                              <p className="text-sm text-slate-600 dark:text-gray-300 mt-2">
                                {alert.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {alert.responded ? (
                            <div className="flex items-center px-3 py-2 bg-green-600 text-white rounded-full">
                              <CheckCircleIcon className="w-4 h-4 mr-1" />
                              Responding
                            </div>
                          ) : (
                            <button
                              onClick={() => respondToAlert(alert.id)}
                              disabled={isResponding}
                              className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors ${isResponding ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                              {isResponding ? 'Responding...' : 'Respond'}
                            </button>
                          )}
                          {alertOwnerId && alertOwnerId.toString() === user?.id?.toString() && (
                            <button
                              onClick={() => resolveAlert(alert.id)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-2xl bg-white/70 dark:bg-slate-900/55 shadow-[0_14px_36px_-24px_rgba(34,197,94,0.5)] p-10 text-center border border-green-200/60 dark:border-green-500/30">
                <CheckCircleIcon className="w-14 h-14 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-alabaster mb-2">All Clear</h3>
                <p className="text-sm text-slate-600 dark:text-dusty">No emergency alerts in your area</p>
              </div>
            )}
          </motion.div>
        </div>
      </div >
    </div >
  )
}

export default Emergency

/* Inline styles for the toast popup (kept local to this file) */
const style = document.createElement('style')
style.innerHTML = `
.alert-popup {
  background: linear-gradient(90deg, #ff3b3b, #b10000);
  color: white;
  padding: 15px 25px;
  border-radius: 10px;
  box-shadow: 0 0 15px rgba(255, 0, 0, 0.4);
  font-weight: bold;
  text-align: center;
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  animation: fadeInOut 3s ease-in-out;
}
@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(20px) translateX(-50%); }
  10% { opacity: 1; transform: translateY(0) translateX(-50%); }
  90% { opacity: 1; }
  100% { opacity: 0; transform: translateY(20px) translateX(-50%); }
}
`
document.head.appendChild(style)