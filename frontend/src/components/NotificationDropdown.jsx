import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BellIcon,
  ChatBubbleLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import NotificationToast from './NotificationToast'

const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [toastNotification, setToastNotification] = useState(null)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()
  const { user, authUser } = useAuth()

  useEffect(() => {
    if (!authUser) return

    // Load notifications from localStorage on mount
    loadNotifications()

    // Subscribe to realtime notifications
    const notificationSubscription = setupRealtimeSubscriptions()

    return () => {
      notificationSubscription?.unsubscribe()
    }
  }, [authUser])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadNotifications = () => {
    try {
      const stored = localStorage.getItem(`notifications_${authUser.id}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        setNotifications(parsed)
        updateUnreadCount(parsed)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  const saveNotifications = (notifs) => {
    try {
      localStorage.setItem(`notifications_${authUser.id}`, JSON.stringify(notifs))
      setNotifications(notifs)
      updateUnreadCount(notifs)
    } catch (error) {
      console.error('Error saving notifications:', error)
    }
  }

  const updateUnreadCount = (notifs) => {
    const count = notifs.filter(n => !n.read).length
    setUnreadCount(count)
  }

  const setupRealtimeSubscriptions = () => {
    // Subscribe to chat messages
    const chatChannel = supabase
      .channel('notification-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `sender_id=neq.${authUser.id}` // Don't notify for own messages
        },
        async (payload) => {
          // Check if message is in a room user is part of
          const { data: participant } = await supabase
            .from('room_participants')
            .select('room_id, chat_rooms(name, is_group)')
            .eq('user_id', authUser.id)
            .eq('room_id', payload.new.room_id)
            .single()

          if (participant) {
            // Fetch sender info
            const { data: sender } = await supabase
              .from('profiles')
              .select('full_name, avatar')
              .eq('id', payload.new.sender_id)
              .single()

            addNotification({
              id: `msg_${payload.new.id}`,
              type: 'message',
              title: 'New Message',
              message: `${sender?.full_name || 'Someone'} sent a message${participant.chat_rooms.is_group ? ` in ${participant.chat_rooms.name}` : ''}`,
              roomId: payload.new.room_id,
              timestamp: new Date(payload.new.created_at),
              read: false,
              avatar: sender?.avatar
            })
          }
        }
      )
      .subscribe()

    // Subscribe to emergency alerts
    const emergencyChannel = supabase
      .channel('notification-emergency')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emergency_alerts'
        },
        async (payload) => {
          if (payload.new.user_id === authUser.id) return // Don't notify for own alerts

          const { data: alertUser } = await supabase
            .from('profiles')
            .select('full_name, avatar')
            .eq('id', payload.new.user_id)
            .single()

          addNotification({
            id: `alert_${payload.new.id}`,
            type: 'emergency',
            title: 'Emergency Alert',
            message: `${alertUser?.full_name || 'Someone'} sent a ${payload.new.alert_type} emergency alert`,
            alertId: payload.new.id,
            timestamp: new Date(payload.new.created_at),
            read: false,
            avatar: alertUser?.avatar
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'emergency_alerts',
          filter: `user_id=eq.${authUser.id}` // Only for user's own alerts
        },
        async (payload) => {
          if (payload.new.status === 'resolved' && payload.old.status !== 'resolved') {
            addNotification({
              id: `resolved_${payload.new.id}`,
              type: 'resolved',
              title: 'Alert Resolved',
              message: `Your ${payload.new.alert_type} emergency alert has been resolved`,
              alertId: payload.new.id,
              timestamp: new Date(),
              read: false
            })
          }
        }
      )
      .subscribe()

    return {
      unsubscribe: () => {
        chatChannel.unsubscribe()
        emergencyChannel.unsubscribe()
      }
    }
  }

  const addNotification = (notification) => {
    const newNotifications = [notification, ...notifications].slice(0, 50) // Keep last 50
    saveNotifications(newNotifications)

    // Show toast popup
    setToastNotification(notification)
    setTimeout(() => setToastNotification(null), 5000)

    // Play notification sound
    playNotificationSound(notification.type)

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/Rider-saathi-logo.jpeg',
        badge: '/Rider-saathi-logo.jpeg'
      })
    }
  }

  const playNotificationSound = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      // Different tones for different notification types
      switch (type) {
        case 'message':
          oscillator.frequency.value = 800 // Higher pitch for messages
          break
        case 'emergency':
          oscillator.frequency.value = 440 // Alert tone
          break
        case 'resolved':
          oscillator.frequency.value = 600 // Success tone
          break
        default:
          oscillator.frequency.value = 700
      }
      
      oscillator.type = 'sine'
      gainNode.gain.value = 0.1 // Low volume
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.start()
      setTimeout(() => {
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
        oscillator.stop()
        ctx.close()
      }, 200)
    } catch (error) {
      // Ignore audio errors
      console.log('Audio notification disabled')
    }
  }

  const markAsRead = (notificationId) => {
    const updated = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    )
    saveNotifications(updated)
  }

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }))
    saveNotifications(updated)
  }

  const clearAll = () => {
    saveNotifications([])
  }

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id)
    setIsOpen(false)

    // Navigate based on notification type
    if (notification.type === 'message' && notification.roomId) {
      navigate(`/chat?room=${notification.roomId}`)
    } else if ((notification.type === 'emergency' || notification.type === 'resolved') && notification.alertId) {
      navigate(`/emergency?alert=${notification.alertId}`)
    }
  }

  const deleteNotification = (e, notificationId) => {
    e.stopPropagation()
    const updated = notifications.filter(n => n.id !== notificationId)
    saveNotifications(updated)
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return <ChatBubbleLeftIcon className="w-5 h-5 text-blue-400" />
      case 'emergency':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
      case 'resolved':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />
      default:
        return <BellIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  useEffect(() => {
    requestNotificationPermission()
  }, [])

  return (
    <>
      {/* Toast Notification Popup */}
      {toastNotification && (
        <NotificationToast
          notification={toastNotification}
          onClose={() => setToastNotification(null)}
          onClick={() => {
            handleNotificationClick(toastNotification)
            setToastNotification(null)
          }}
        />
      )}

      <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-300 hover:text-neon-cyan transition-colors duration-200"
      >
        {unreadCount > 0 ? (
          <BellSolidIcon className="w-6 h-6 text-neon-cyan animate-pulse" />
        ) : (
          <BellIcon className="w-6 h-6" />
        )}
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-96 bg-dark-800 border border-neon-cyan/30 rounded-lg shadow-xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="bg-dark-700 px-4 py-3 border-b border-neon-cyan/20 flex items-center justify-between">
              <h3 className="text-white font-semibold">Notifications</h3>
              <div className="flex items-center space-x-2">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-neon-cyan hover:text-neon-purple transition-colors"
                    >
                      Mark all read
                    </button>
                    <span className="text-gray-500">|</span>
                    <button
                      onClick={clearAll}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Clear all
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400">
                  <BellIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                  <p className="text-xs mt-1">We'll notify you when something happens</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => handleNotificationClick(notification)}
                      className={`px-4 py-3 hover:bg-dark-700 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-neon-cyan/5' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Icon/Avatar */}
                        <div className="flex-shrink-0 mt-1">
                          {notification.avatar ? (
                            <img
                              src={notification.avatar}
                              alt=""
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center">
                              {getNotificationIcon(notification.type)}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${
                                !notification.read ? 'text-white' : 'text-gray-300'
                              }`}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatTimestamp(notification.timestamp)}
                              </p>
                            </div>

                            {/* Delete Button */}
                            <button
                              onClick={(e) => deleteNotification(e, notification.id)}
                              className="ml-2 text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Unread indicator */}
                          {!notification.read && (
                            <div className="w-2 h-2 bg-neon-cyan rounded-full mt-2" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  )
}

// Helper function to format timestamp
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export default NotificationDropdown
