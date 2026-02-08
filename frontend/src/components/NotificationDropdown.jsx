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
      <AnimatePresence>
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
      </AnimatePresence>

      <div className="relative" ref={dropdownRef}>
        {/* Notification Bell Button with Enhanced Animation */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2.5 rounded-xl transition-all duration-300 group"
          style={{
            background: isOpen 
              ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)'
              : 'transparent',
          }}
        >
          {/* Glow Effect */}
          {unreadCount > 0 && (
            <motion.div
              className="absolute inset-0 rounded-xl"
              style={{
                background: 'radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, transparent 70%)',
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}

          {unreadCount > 0 ? (
            <motion.div
              animate={{
                rotate: [0, -15, 15, -15, 15, 0],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatDelay: 3,
              }}
            >
              <BellSolidIcon 
                className="w-6 h-6 relative z-10" 
                style={{ color: '#06b6d4' }}
              />
            </motion.div>
          ) : (
            <BellIcon 
              className="w-6 h-6 relative z-10 group-hover:text-cyan-400 transition-colors" 
              style={{ color: '#94a3b8' }}
            />
          )}
          
          {/* Unread Badge with Pulse Animation */}
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg z-20"
            >
              <motion.span
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
              
              {/* Ripple Effect */}
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-red-400"
                animate={{
                  scale: [1, 1.8],
                  opacity: [0.8, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
            </motion.span>
          )}
        </motion.button>

        {/* Dropdown with Enhanced Design */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                onClick={() => setIsOpen(false)}
              />

              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="absolute right-0 mt-3 w-[420px] rounded-2xl shadow-2xl overflow-hidden z-50 border"
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderColor: 'rgba(6, 182, 212, 0.2)',
                  boxShadow: '0 20px 60px -10px rgba(6, 182, 212, 0.3), 0 0 0 1px rgba(6, 182, 212, 0.1)',
                }}
              >
                {/* Animated Top Border */}
                <motion.div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{
                    background: 'linear-gradient(90deg, transparent, #06b6d4, #3b82f6, #8b5cf6, transparent)',
                    backgroundSize: '200% 100%',
                  }}
                  animate={{
                    backgroundPosition: ['0% 0%', '200% 0%'],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />

                {/* Header */}
                <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(148, 163, 184, 0.1)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <motion.div
                        animate={{
                          rotate: [0, -10, 10, 0],
                        }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          repeatDelay: 2,
                        }}
                      >
                        <BellSolidIcon className="w-6 h-6 text-cyan-400" />
                      </motion.div>
                      <div>
                        <h3 className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                          Notifications
                        </h3>
                        <p className="text-xs text-gray-400">
                          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                        </p>
                      </div>
                    </div>
                    
                    {notifications.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={markAllAsRead}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
                          style={{
                            background: 'rgba(6, 182, 212, 0.1)',
                            color: '#06b6d4',
                            border: '1px solid rgba(6, 182, 212, 0.2)',
                          }}
                        >
                          Mark all read
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={clearAll}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                          }}
                        >
                          Clear
                        </motion.button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notifications List */}
                <div className="max-h-[500px] overflow-y-auto" style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(6, 182, 212, 0.5) rgba(30, 41, 59, 0.5)',
                }}>
                  {notifications.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-6 py-12 text-center"
                    >
                      <motion.div
                        animate={{
                          scale: [1, 1.1, 1],
                          rotate: [0, -10, 10, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="mb-4"
                      >
                        <BellIcon className="w-16 h-16 mx-auto opacity-30" style={{ color: '#94a3b8' }} />
                      </motion.div>
                      <p className="text-gray-300 font-medium mb-1">No notifications yet</p>
                      <p className="text-sm text-gray-500">We'll notify you when something happens</p>
                    </motion.div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'rgba(148, 163, 184, 0.1)' }}>
                      {notifications.map((notification, index) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleNotificationClick(notification)}
                          className="relative px-5 py-4 cursor-pointer transition-all duration-300 group"
                          style={{
                            background: !notification.read 
                              ? 'linear-gradient(90deg, rgba(6, 182, 212, 0.05) 0%, transparent 100%)'
                              : 'transparent',
                          }}
                          whileHover={{
                            backgroundColor: 'rgba(148, 163, 184, 0.05)',
                          }}
                        >
                          {/* Left Border Indicator */}
                          {!notification.read && (
                            <motion.div
                              className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-cyan-500 to-blue-500"
                              animate={{
                                opacity: [0.5, 1, 0.5],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeInOut',
                              }}
                            />
                          )}

                          <div className="flex items-start space-x-3">
                            {/* Icon/Avatar with Animation */}
                            <motion.div 
                              className="flex-shrink-0 mt-1 relative"
                              whileHover={{ scale: 1.1, rotate: 5 }}
                            >
                              {notification.avatar ? (
                                <div className="relative">
                                  <img
                                    src={notification.avatar}
                                    alt=""
                                    className="w-10 h-10 rounded-full ring-2 ring-cyan-500/30"
                                  />
                                  {!notification.read && (
                                    <motion.div
                                      className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400"
                                      animate={{
                                        scale: [1, 1.3, 1],
                                        opacity: [1, 0.5, 1],
                                      }}
                                      transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                      }}
                                    />
                                  )}
                                </div>
                              ) : (
                                <div 
                                  className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
                                  style={{
                                    background: notification.type === 'emergency' 
                                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)'
                                      : notification.type === 'resolved'
                                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.1) 100%)'
                                      : 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
                                    border: `1px solid ${
                                      notification.type === 'emergency' 
                                        ? 'rgba(239, 68, 68, 0.3)'
                                        : notification.type === 'resolved'
                                        ? 'rgba(34, 197, 94, 0.3)'
                                        : 'rgba(6, 182, 212, 0.3)'
                                    }`,
                                  }}
                                >
                                  <motion.div
                                    animate={{
                                      rotate: notification.type === 'emergency' ? [0, -15, 15, 0] : 0,
                                    }}
                                    transition={{
                                      duration: 0.5,
                                      repeat: notification.type === 'emergency' ? Infinity : 0,
                                      repeatDelay: 1,
                                    }}
                                  >
                                    {getNotificationIcon(notification.type)}
                                  </motion.div>
                                </div>
                              )}
                            </motion.div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <p className={`text-sm font-semibold ${
                                  !notification.read ? 'text-white' : 'text-gray-300'
                                }`}>
                                  {notification.title}
                                </p>
                                
                                {/* Delete Button */}
                                <motion.button
                                  whileHover={{ scale: 1.2, rotate: 90 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => deleteNotification(e, notification.id)}
                                  className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-500/20"
                                >
                                  <XMarkIcon className="w-4 h-4 text-gray-400 hover:text-red-400" />
                                </motion.button>
                              </div>
                              
                              <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium" style={{
                                  color: notification.type === 'emergency' 
                                    ? '#ef4444'
                                    : notification.type === 'resolved'
                                    ? '#22c55e'
                                    : '#06b6d4',
                                }}>
                                  {formatTimestamp(notification.timestamp)}
                                </p>
                                
                                {/* Type Badge */}
                                <span
                                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                  style={{
                                    background: notification.type === 'emergency' 
                                      ? 'rgba(239, 68, 68, 0.1)'
                                      : notification.type === 'resolved'
                                      ? 'rgba(34, 197, 94, 0.1)'
                                      : 'rgba(6, 182, 212, 0.1)',
                                    color: notification.type === 'emergency' 
                                      ? '#ef4444'
                                      : notification.type === 'resolved'
                                      ? '#22c55e'
                                      : '#06b6d4',
                                    border: `1px solid ${
                                      notification.type === 'emergency' 
                                        ? 'rgba(239, 68, 68, 0.3)'
                                        : notification.type === 'resolved'
                                        ? 'rgba(34, 197, 94, 0.3)'
                                        : 'rgba(6, 182, 212, 0.3)'
                                    }`,
                                  }}
                                >
                                  {notification.type}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Hover Glow Effect */}
                          <motion.div
                            className="absolute inset-0 pointer-events-none"
                            initial={{ opacity: 0 }}
                            whileHover={{ opacity: 1 }}
                            style={{
                              background: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.05) 0%, transparent 70%)',
                            }}
                          />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </>
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
