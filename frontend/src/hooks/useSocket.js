import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../contexts/AuthContext'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001'

export const useSocket = () => {
  const { user, token } = useAuth()
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState([])
  const listenersRef = useRef(new Map())

  // Initialize socket connection
  useEffect(() => {
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    // Create socket connection with JWT auth
    socketRef.current = io(SOCKET_URL, {
      auth: {
        token
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })

    // Connection events
    socketRef.current.on('connect', () => {
      console.log('Socket connected:', socketRef.current.id)
      setIsConnected(true)
      
      // Join user's personal room
      socketRef.current.emit('join-user-room', user._id)
    })

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected')
      setIsConnected(false)
    })

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setIsConnected(false)
    })

    // Online users tracking
    socketRef.current.on('online-users', (users) => {
      setOnlineUsers(users)
    })

    socketRef.current.on('user-online', (userId) => {
      setOnlineUsers(prev => [...prev.filter(u => u.userId !== userId), { userId }])
    })

    socketRef.current.on('user-offline', (userId) => {
      setOnlineUsers(prev => prev.filter(u => u.userId !== userId))
    })

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [user, token])

  // Send direct message
  const sendDirectMessage = useCallback((data) => {
    if (!socketRef.current || !isConnected) {
      console.error('Socket not connected')
      return
    }

    const messageData = {
      ...data,
      tempId: `temp_${Date.now()}_${Math.random()}`
    }

    socketRef.current.emit('send-direct-message', messageData)
    return messageData.tempId
  }, [isConnected])

  // Send group message
  const sendGroupMessage = useCallback((data) => {
    if (!socketRef.current || !isConnected) {
      console.error('Socket not connected')
      return
    }

    const messageData = {
      ...data,
      tempId: `temp_${Date.now()}_${Math.random()}`
    }

    socketRef.current.emit('send-group-message', messageData)
    return messageData.tempId
  }, [isConnected])

  // Mark message as read
  const markAsRead = useCallback((messageId) => {
    if (!socketRef.current || !isConnected) return
    socketRef.current.emit('mark-as-read', { messageId })
  }, [isConnected])

  // Typing indicators
  const startTyping = useCallback((recipientId, isGroup = false) => {
    if (!socketRef.current || !isConnected) return
    
    if (isGroup) {
      socketRef.current.emit('typing-group', { groupId: recipientId })
    } else {
      socketRef.current.emit('typing-direct', { recipientId })
    }
  }, [isConnected])

  const stopTyping = useCallback((recipientId, isGroup = false) => {
    if (!socketRef.current || !isConnected) return
    
    if (isGroup) {
      socketRef.current.emit('stop-typing-group', { groupId: recipientId })
    } else {
      socketRef.current.emit('stop-typing-direct', { recipientId })
    }
  }, [isConnected])

  // Join group
  const joinGroup = useCallback((groupId) => {
    if (!socketRef.current || !isConnected) return
    socketRef.current.emit('join-group', groupId)
  }, [isConnected])

  // Leave group
  const leaveGroup = useCallback((groupId) => {
    if (!socketRef.current || !isConnected) return
    socketRef.current.emit('leave-group', groupId)
  }, [isConnected])

  // Join community
  const joinCommunity = useCallback((communityId) => {
    if (!socketRef.current || !isConnected) return
    socketRef.current.emit('join-community', communityId)
  }, [isConnected])

  // Leave community
  const leaveCommunity = useCallback((communityId) => {
    if (!socketRef.current || !isConnected) return
    socketRef.current.emit('leave-community', communityId)
  }, [isConnected])

  // Generic event listener registration
  const on = useCallback((event, callback) => {
    if (!socketRef.current) return

    // Remove existing listener if any
    if (listenersRef.current.has(event)) {
      socketRef.current.off(event, listenersRef.current.get(event))
    }

    // Add new listener
    socketRef.current.on(event, callback)
    listenersRef.current.set(event, callback)

    // Return cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.off(event, callback)
        listenersRef.current.delete(event)
      }
    }
  }, [])

  // Generic event emitter
  const emit = useCallback((event, data) => {
    if (!socketRef.current || !isConnected) {
      console.error('Socket not connected')
      return
    }
    socketRef.current.emit(event, data)
  }, [isConnected])

  // Update location
  const updateLocation = useCallback((location) => {
    if (!socketRef.current || !isConnected) return
    socketRef.current.emit('location-update', {
      location,
      timestamp: new Date()
    })
  }, [isConnected])

  // Emergency alert
  const sendEmergencyAlert = useCallback((alertData) => {
    if (!socketRef.current || !isConnected) return
    socketRef.current.emit('emergency-alert', alertData)
  }, [isConnected])

  return {
    socket: socketRef.current,
    isConnected,
    onlineUsers,
    sendDirectMessage,
    sendGroupMessage,
    markAsRead,
    startTyping,
    stopTyping,
    joinGroup,
    leaveGroup,
    joinCommunity,
    leaveCommunity,
    on,
    emit,
    updateLocation,
    sendEmergencyAlert,
    isUserOnline: useCallback((userId) => {
      return onlineUsers.some(u => u.userId === userId)
    }, [onlineUsers])
  }
}
