import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const RealtimeContext = createContext()

export const useRealtime = () => {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return context
}

export const RealtimeProvider = ({ children }) => {
  const [connected, setConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [typingUsers, setTypingUsers] = useState({})
  const { user, profile } = useAuth()
  
  const channelsRef = useRef(new Map())
  const presenceChannelRef = useRef(null)
  const typingTimeoutsRef = useRef(new Map())

  // ============================================
  // PRESENCE: Online/Offline User Tracking
  // ============================================
  useEffect(() => {
    if (!user || !profile) {
      setConnected(false)
      return
    }

    const setupPresence = async () => {
      try {
        // Create presence channel for online users
        const presenceChannel = supabase.channel('online-users', {
          config: {
            presence: {
              key: user.id
            }
          }
        })

        // Listen for presence changes
        presenceChannel
          .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState()
            const users = Object.keys(state).map(userId => {
              const presenceData = state[userId][0]
              return {
                userId,
                name: presenceData.name,
                email: presenceData.email,
                online_at: presenceData.online_at
              }
            })
            setOnlineUsers(users)
            console.log('👥 Online users updated:', users.length)
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            console.log('✅ User joined:', key)
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            console.log('❌ User left:', key)
          })

        // Subscribe to presence channel
        const status = await presenceChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Track current user's presence
            await presenceChannel.track({
              userId: user.id,
              name: profile.name || user.email,
              email: user.email,
              online_at: new Date().toISOString()
            })
            setConnected(true)
            console.log('🟢 Connected to Supabase Realtime')
          }
        })

        presenceChannelRef.current = presenceChannel

        // Update profile status in database
        await supabase
          .from('profiles')
          .update({ 
            is_online: true,
            last_seen: new Date().toISOString()
          })
          .eq('id', user.id)

      } catch (error) {
        console.error('Presence setup error:', error)
        setConnected(false)
      }
    }

    setupPresence()

    // Cleanup on unmount or user change
    return () => {
      if (presenceChannelRef.current) {
        presenceChannelRef.current.unsubscribe()
        presenceChannelRef.current = null
      }
      
      // Update profile status to offline
      if (user?.id) {
        supabase
          .from('profiles')
          .update({ 
            is_online: false,
            last_seen: new Date().toISOString()
          })
          .eq('id', user.id)
          .then(() => console.log('👋 User set to offline'))
      }
      
      setConnected(false)
    }
  }, [user, profile])

  // ============================================
  // CHAT ROOM: Subscribe to messages
  // ============================================
  const joinChatRoom = useCallback(async (roomId) => {
    if (!user || !roomId) return

    // Unsubscribe from previous room if exists
    const existingChannel = channelsRef.current.get(`chat:${roomId}`)
    if (existingChannel) {
      await existingChannel.unsubscribe()
    }

    console.log(`📥 Joining chat room: ${roomId}`)

    // Create channel for this room
    const roomChannel = supabase.channel(`room:${roomId}`)

    // Listen for new messages (postgres_changes)
    roomChannel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      },
      async (payload) => {
        console.log('📨 New message received:', payload.new)
        
        // Fetch sender info
        const { data: sender } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .eq('id', payload.new.sender_id)
          .single()

        // Emit custom event for message
        window.dispatchEvent(new CustomEvent('realtime-message', {
          detail: {
            roomId,
            message: {
              ...payload.new,
              sender: sender || { id: payload.new.sender_id }
            }
          }
        }))
      }
    )

    // Subscribe to channel
    await roomChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to room: ${roomId}`)
      }
    })

    channelsRef.current.set(`chat:${roomId}`, roomChannel)
    return roomChannel
  }, [user])

  // ============================================
  // TYPING INDICATOR: Broadcast typing status
  // ============================================
  const sendTypingIndicator = useCallback((roomId, isTyping) => {
    if (!user || !roomId) return

    const channelKey = `typing:${roomId}`
    let typingChannel = channelsRef.current.get(channelKey)

    if (!typingChannel) {
      typingChannel = supabase.channel(channelKey)
      
      // Listen for typing broadcasts
      typingChannel.on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setTypingUsers(prev => ({
            ...prev,
            [roomId]: {
              ...prev[roomId],
              [payload.userId]: payload.isTyping ? payload : null
            }
          }))

          // Clear typing indicator after 3 seconds
          if (payload.isTyping) {
            const timeoutKey = `${roomId}:${payload.userId}`
            clearTimeout(typingTimeoutsRef.current.get(timeoutKey))
            
            const timeout = setTimeout(() => {
              setTypingUsers(prev => {
                const room = { ...prev[roomId] }
                delete room[payload.userId]
                return { ...prev, [roomId]: room }
              })
            }, 3000)
            
            typingTimeoutsRef.current.set(timeoutKey, timeout)
          }
        }
      })

      typingChannel.subscribe()
      channelsRef.current.set(channelKey, typingChannel)
    }

    // Broadcast typing status
    typingChannel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        userName: profile?.name || user.email,
        isTyping,
        timestamp: Date.now()
      }
    })
  }, [user, profile])

  // ============================================
  // MESSAGE: Send message to room
  // ============================================
  const sendMessage = useCallback(async (roomId, content, messageType = 'text', extras = {}) => {
    if (!user || !roomId || !content) {
      throw new Error('Missing required parameters')
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          content: content,
          message_type: messageType,
          ...extras
        })
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, name, avatar_url)
        `)
        .single()

      if (error) throw error

      console.log('✅ Message sent:', data.id)
      return data
    } catch (error) {
      console.error('Send message error:', error)
      throw error
    }
  }, [user])

  // ============================================
  // EMERGENCY: Send emergency alert
  // ============================================
  const sendEmergencyAlert = useCallback(async (alertType, location, description) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const { data, error } = await supabase
        .from('emergency_alerts')
        .insert({
          user_id: user.id,
          alert_type: alertType,
          severity: 'high',
          location: `POINT(${location.longitude} ${location.latitude})`,
          location_address: location.address,
          description: description,
          status: 'active'
        })
        .select()
        .single()

      if (error) throw error

      // Broadcast to nearby users via presence channel
      const emergencyChannel = supabase.channel('emergency-alerts')
      emergencyChannel.send({
        type: 'broadcast',
        event: 'new-emergency',
        payload: {
          alertId: data.id,
          userId: user.id,
          type: alertType,
          location: location,
          timestamp: data.created_at
        }
      })

      console.log('🚨 Emergency alert sent:', data.id)
      return data
    } catch (error) {
      console.error('Emergency alert error:', error)
      throw error
    }
  }, [user])

  // ============================================
  // LOCATION: Update user location
  // ============================================
  const updateLocation = useCallback(async (location) => {
    if (!user) return

    try {
      await supabase
        .from('profiles')
        .update({
          current_location: `POINT(${location.longitude} ${location.latitude})`,
          current_address: location.address,
          location_updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      // Broadcast location update
      const locationChannel = supabase.channel('location-updates')
      locationChannel.send({
        type: 'broadcast',
        event: 'location-update',
        payload: {
          userId: user.id,
          location: location,
          timestamp: Date.now()
        }
      })
    } catch (error) {
      console.error('Location update error:', error)
    }
  }, [user])

  // ============================================
  // CLEANUP: Leave chat room
  // ============================================
  const leaveChatRoom = useCallback(async (roomId) => {
    const channel = channelsRef.current.get(`room:${roomId}`)
    if (channel) {
      await channel.unsubscribe()
      channelsRef.current.delete(`room:${roomId}`)
      console.log(`👋 Left chat room: ${roomId}`)
    }

    const typingChannel = channelsRef.current.get(`typing:${roomId}`)
    if (typingChannel) {
      await typingChannel.unsubscribe()
      channelsRef.current.delete(`typing:${roomId}`)
    }
  }, [])

  // Cleanup all channels on unmount
  useEffect(() => {
    return () => {
      channelsRef.current.forEach(async (channel) => {
        await channel.unsubscribe()
      })
      channelsRef.current.clear()
      
      typingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      typingTimeoutsRef.current.clear()
    }
  }, [])

  const value = {
    // Connection state
    connected,
    onlineUsers,
    typingUsers,

    // Chat functions
    joinChatRoom,
    leaveChatRoom,
    sendMessage,
    sendTypingIndicator,

    // Emergency functions
    sendEmergencyAlert,

    // Location functions
    updateLocation
  }

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  )
}

export default RealtimeProvider
