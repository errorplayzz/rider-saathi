import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
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
  const { user, profile } = useAuth()

  // Presence channel for online/offline tracking
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
        console.log('User joined:', key)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key)
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
          console.log('✅ Connected to Supabase Realtime')
        }
      })

    // Cleanup on unmount
    return () => {
      presenceChannel.unsubscribe()
      if (user) {
        updateUserStatus(user.id, false).catch(console.error)
      }
      setConnected(false)
    }
  }, [user, profile])

  // Subscribe to a chat room
  const joinChatRoom = useCallback((roomId) => {
    if (!roomId || activeChannels.has(roomId)) return

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          // Emit custom event for components to listen to
          window.dispatchEvent(
            new CustomEvent('new-message', {
              detail: { roomId, message: payload.new }
            })
          )
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Joined chat room: ${roomId}`)
        }
      })

    setActiveChannels(prev => new Map(prev).set(roomId, channel))
  }, [activeChannels])

  // Leave a chat room
  const leaveChatRoom = useCallback((roomId) => {
    const channel = activeChannels.get(roomId)
    if (channel) {
      channel.unsubscribe()
      setActiveChannels(prev => {
        const newMap = new Map(prev)
        newMap.delete(roomId)
        return newMap
      })
      console.log(`Left chat room: ${roomId}`)
    }
  }, [activeChannels])

  // Send a message
  const sendMessage = useCallback(async (roomId, message, messageType = 'text') => {
    if (!user) return

    try {
      const result = await sendMessageHelper(roomId, user.id, message, messageType)
      return result
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }, [user])

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

  // Send emergency alert
  const sendEmergencyAlert = useCallback(async (alertData) => {
    if (!user) return

    try {
      const alert = await createEmergencyAlertHelper(
        user.id,
        alertData.type,
        alertData.severity,
        alertData.location,
        alertData.description
      )
      
      return alert
    } catch (error) {
      console.error('Error sending emergency alert:', error)
      throw error
    }
  }, [user])

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
      console.log('Battery alert:', batteryLevel)
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
    // Legacy compatibility - these are now handled differently
    socket: null // No direct socket object in Supabase Realtime
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}