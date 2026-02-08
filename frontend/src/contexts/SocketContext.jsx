import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { 
  updateLocation as updateLocationHelper,
  updateUserStatus,
  sendMessage as sendMessageHelper,
  createEmergencyAlert as createEmergencyAlertHelper,
  addRideWaypoint
} from '../lib/supabaseHelpers'

const SocketContext = createContext()

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const [connected, setConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [activeChannels, setActiveChannels] = useState(new Map())
  const [socketIO, setSocketIO] = useState(null) // Real Socket.IO connection
  const { user, profile } = useAuth()
  const listenersRef = React.useRef({})

  // Socket.IO connection for real-time features
  useEffect(() => {
    if (!user) return

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001'
    const token = localStorage.getItem('token')

    if (!token) return

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    socket.on('connect', () => {
      setSocketIO(socket)
    })

    socket.on('disconnect', () => {
      // Handle disconnect
    })

    socket.on('error', (error) => {
      console.error('Socket.IO Error:', error)
    })

    return () => {
      socket.disconnect()
      setSocketIO(null)
    }
  }, [user])

  // Presence channel for online/offline tracking (Supabase)
  useEffect(() => {
    if (!user || !profile) {
      setConnected(false)
      return
    }

    // Subscribe to presence channel
    const presenceChannel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id
        }
      }
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const users = Object.keys(state).map(userId => ({
          userId,
          ...state[userId][0]
        }))
        setOnlineUsers(users)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // User joined
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // User left
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track our own presence
          await presenceChannel.track({
            user_id: user.id,
            email: user.email,
            name: profile.name,
            online_at: new Date().toISOString()
          })
          
          // Update database status
          await updateUserStatus(user.id, true)
          setConnected(true)
        }
      })

    // If the tab is backgrounded, browsers may throttle or drop the
    // realtime connection. When the document becomes visible again or
    // when the browser regains network connectivity, attempt to
    // re-track presence or resubscribe so the UI shows online state
    // without a full page refresh.
    const handleVisibilityRestore = async () => {
      try {
        if (!presenceChannel) return
        if (!document.hidden) {
          await presenceChannel.track({
            user_id: user.id,
            email: user.email,
            name: profile.name,
            online_at: new Date().toISOString()
          })
          setConnected(true)
        }
      } catch (err) {
        console.warn('Could not re-track presence, attempting to resubscribe', err)
        try {
          await presenceChannel.subscribe()
        } catch (e) {
          console.error('Resubscribe failed', e)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityRestore)
    window.addEventListener('online', handleVisibilityRestore)

    // Subscribe to broadcast channels for location and ride events
    const locChannel = supabase.channel('location-updates')
    locChannel.on('broadcast', { event: 'location-update' }, (payload) => {
      // Dispatch as window event so components can listen via socket.on compatibility
      window.dispatchEvent(new CustomEvent('location-update', { detail: payload }))
    }).subscribe()

    const rideChannel = supabase.channel('ride-events')
    rideChannel.on('broadcast', { event: 'ride-start' }, (payload) => {
      window.dispatchEvent(new CustomEvent('ride-start', { detail: payload }))
    }).on('broadcast', { event: 'ride-end' }, (payload) => {
      window.dispatchEvent(new CustomEvent('ride-end', { detail: payload }))
    }).on('broadcast', { event: 'share-change' }, (payload) => {
      window.dispatchEvent(new CustomEvent('share-change', { detail: payload }))
    }).subscribe()

    const batteryChannel = supabase.channel('battery-alerts')
    batteryChannel.on('broadcast', { event: 'battery-alert' }, (payload) => {
      window.dispatchEvent(new CustomEvent('battery-alert', { detail: payload }))
    }).subscribe()

    // Keep reference to channels so they can be cleaned up on unmount
    const cleanupChannels = [presenceChannel, locChannel, rideChannel, batteryChannel]

    // Cleanup on unmount
    return () => {
      // Unsubscribe all channels we created
      cleanupChannels.forEach(ch => ch.unsubscribe && ch.unsubscribe())
      if (user) {
        updateUserStatus(user.id, false).catch(console.error)
      }
      setConnected(false)
    }
  }, [user, profile])

  // Subscribe to a chat room via Socket.IO
  const joinChatRoom = useCallback((roomId) => {
    if (!roomId || !socketIO || !socketIO.connected) {
      console.warn('Cannot join room: socket not connected')
      return
    }

    console.log('Joining chat room:', roomId)
    socketIO.emit('join-chat-room', roomId)
    
    // Listen for new messages in this room
    if (!socketIO.hasListeners('new-message')) {
      socketIO.on('new-message', (messageData) => {
        console.log('New message received:', messageData)
        // Dispatch custom event for chat components to listen
        window.dispatchEvent(new CustomEvent('new-message', {
          detail: { roomId: messageData.room, message: messageData }
        }))
      })
    }
  }, [socketIO])

  // Leave a chat room via Socket.IO
  const leaveChatRoom = useCallback((roomId) => {
    if (!roomId || !socketIO || !socketIO.connected) {
      console.warn('Cannot leave room: socket not connected')
      return
    }

    console.log('Leaving chat room:', roomId)
    socketIO.emit('leave-chat-room', roomId)
  }, [socketIO])

  // Send a message via Socket.IO
  const sendMessage = useCallback((roomId, message, messageType = 'text') => {
    if (!user || !socketIO || !socketIO.connected) {
      console.warn('Cannot send message: user not logged in or socket not connected')
      return false
    }

    const messageData = {
      roomId,
      message,
      messageType,
      senderId: user.id
    }

    console.log('Sending message via Socket.IO:', messageData)
    socketIO.emit('send-message', messageData)
    return true
  }, [user, socketIO])

  // Update location
  const updateLocation = useCallback(async (location) => {
    if (!user) return

    try {
      await updateLocationHelper(
        user.id,
        location.longitude,
        location.latitude,
        location.address
      )

      // Broadcast location update via realtime
      const channel = supabase.channel('location-updates')
      await channel.send({
        type: 'broadcast',
        event: 'location-update',
        payload: {
          userId: user.id,
          location,
          timestamp: Date.now()
        }
      })
    } catch (error) {
      console.error('Error updating location:', error)
    }
  }, [user])

  // Subscribe to emergency alerts
  const subscribeToEmergencyAlerts = useCallback((callback) => {
    const channel = supabase
      .channel('emergency-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emergency_alerts'
        },
        (payload) => {
          callback(payload.new)
        }
      )
      .subscribe()

    return () => channel.unsubscribe()
  }, [])

  // Provide a small socket-like API backed by window events so components can call socket.on/off
  const supabaseSocket = React.useMemo(() => {
    return {
      on: (event, cb) => {
        if (!event || typeof cb !== 'function') return
        const handler = (e) => cb(e.detail)
        // store handler so it can be removed later
        listenersRef.current[event] = listenersRef.current[event] || new Set()
        listenersRef.current[event].add(handler)
        window.addEventListener(event, handler)
      },
      off: (event) => {
        const set = listenersRef.current[event]
        if (!set) return
        for (const handler of set) {
          window.removeEventListener(event, handler)
        }
        delete listenersRef.current[event]
      },
      sendRideEvent: async (type, payload) => {
        try {
          const channel = supabase.channel('ride-events')
          await channel.send({ type: 'broadcast', event: type, payload })
        } catch (e) {
          console.error('Failed to send ride event:', e)
        }
      }
    }
  }, [])

  // Send emergency alert
  const sendEmergencyAlert = useCallback(async (alertData) => {
    if (!user) return

    try {
      // Use backend API instead of direct Supabase
      const token = localStorage.getItem('token')
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/emergency/alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: alertData.type,
          severity: alertData.severity,
          location: {
            latitude: alertData.location.latitude,
            longitude: alertData.location.longitude,
            address: alertData.location.address
          },
          description: alertData.description
        })
      })

      if (!response.ok) {
        throw new Error(`Emergency alert failed: ${response.status}`)
      }

      const alert = await response.json()
      
      // Emit via Socket.IO for realtime updates
      if (socketIO && socketIO.connected) {
        socketIO.emit('emergency-alert', alert)
      }
      
      return alert
    } catch (error) {
      console.error('Error sending emergency alert:', error)
      throw error
    }
  }, [user, socketIO])

  // Join ride group (subscribe to ride updates)
  const joinRideGroup = useCallback((rideId) => {
    if (!rideId || activeChannels.has(`ride:${rideId}`)) return

    const channel = supabase
      .channel(`ride:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${rideId}`
        },
        (payload) => {
          window.dispatchEvent(
            new CustomEvent('ride-update', {
              detail: { rideId, ride: payload.new }
            })
          )
        }
      )
      .subscribe()

    setActiveChannels(prev => new Map(prev).set(`ride:${rideId}`, channel))
  }, [activeChannels])

  // Leave ride group
  const leaveRideGroup = useCallback((rideId) => {
    const channel = activeChannels.get(`ride:${rideId}`)
    if (channel) {
      channel.unsubscribe()
      setActiveChannels(prev => {
        const newMap = new Map(prev)
        newMap.delete(`ride:${rideId}`)
        return newMap
      })
    }
  }, [activeChannels])

  // Send battery alert
  const sendBatteryAlert = useCallback(async (batteryLevel) => {
    if (!user) return

    try {
      // You can store this in a separate battery_alerts table or in ride metrics
      // For now, just broadcast via realtime
      const channel = supabase.channel('battery-alerts')
      await channel.send({
        type: 'broadcast',
        event: 'battery-alert',
        payload: {
          userId: user.id,
          batteryLevel,
          timestamp: Date.now()
        }
      })
    } catch (error) {
      console.error('Error sending battery alert:', error)
    }
  }, [user])

  // Send helper alert (responding to emergency)
  const sendHelperAlert = useCallback(async (helpData) => {
    if (!user) return

    try {
      // Broadcast that user is responding to help
      const channel = supabase.channel('helper-alerts')
      await channel.send({
        type: 'broadcast',
        event: 'helper-alert',
        payload: {
          helperId: user.id,
          ...helpData,
          timestamp: Date.now()
        }
      })
    } catch (error) {
      console.error('Error sending helper alert:', error)
    }
  }, [user])

  const value = {
    connected,
    onlineUsers,
    updateLocation,
    joinRideGroup,
    leaveRideGroup,
    sendEmergencyAlert,
    subscribeToEmergencyAlerts,
    sendMessage,
    joinChatRoom,
    leaveChatRoom,
    sendBatteryAlert,
    sendHelperAlert,
    // Real Socket.IO connection for map tracking
    socket: socketIO,
    // Legacy Supabase compatibility
    supabaseSocket: supabaseSocket
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}