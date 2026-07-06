import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { 
  BellIcon,
  ChatBubbleLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  Cog8ToothIcon
} from '@heroicons/react/24/outline'
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { supabase } from '../lib/supabase'
import NotificationToast from './NotificationToast'

const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isRendered, setIsRendered] = useState(false)
  const panelRef = useRef(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [toastNotification, setToastNotification] = useState(null)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket } = useSocket()
  const userId = user?.id || user?._id

  const updateUnreadCount = useCallback((notifs) => {
    const count = notifs.filter(n => !n.read).length
    setUnreadCount(count)
  }, [])

  const saveNotifications = useCallback((notifs) => {
    if (!userId) return
    try {
      localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifs))
      setNotifications(notifs)
      updateUnreadCount(notifs)
    } catch (error) {
      console.error('Error saving notifications:', error)
    }
  }, [userId, updateUnreadCount])

  const addNotification = useCallback((notification) => {
    const normalized = {
      id: notification.id || `${notification.type || 'notification'}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: notification.type || 'info',
      title: notification.title || 'Notification',
      message: notification.message || 'You have a new update',
      timestamp: notification.timestamp || new Date(),
      read: false,
      ...notification
    }

    setNotifications((prev) => {
      const deduped = prev.filter((item) => item.id !== normalized.id)
      const next = [normalized, ...deduped].slice(0, 50)

      try {
        if (userId) {
          localStorage.setItem(`notifications_${userId}`, JSON.stringify(next))
        }
      } catch (error) {
        console.error('Error saving notifications:', error)
      }

      updateUnreadCount(next)
      return next
    })

    // Show toast popup
    setToastNotification(normalized)
    setTimeout(() => setToastNotification(null), 5000)

    // Play notification sound
    playNotificationSound(normalized.type)

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(normalized.title, {
        body: normalized.message,
        icon: '/Rider-saathi-logo.jpeg',
        badge: '/Rider-saathi-logo.jpeg'
      })
    }
  }, [updateUnreadCount, userId])

  useEffect(() => {
    if (!userId) return

    // Load notifications from localStorage on mount
    loadNotifications()

    // Subscribe to realtime notifications
    const notificationSubscription = setupRealtimeSubscriptions(userId)

    return () => {
      notificationSubscription?.unsubscribe()
    }
  }, [userId, addNotification])

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
      const stored = localStorage.getItem(`notifications_${userId}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        setNotifications(parsed)
        updateUnreadCount(parsed)
      } else {
        setNotifications([])
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  const setupRealtimeSubscriptions = (activeUserId) => {
    if (!activeUserId) {
      return { unsubscribe: () => {} }
    }

    // Subscribe to chat messages
    const chatChannel = supabase
      .channel('notification-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `sender_id=neq.${activeUserId}` // Don't notify for own messages
        },
        async (payload) => {
          // Check if message is in a room user is part of
          const { data: participant } = await supabase
            .from('room_participants')
            .select('room_id, chat_rooms(name, is_group)')
            .eq('user_id', activeUserId)
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
          if (payload.new.user_id === activeUserId) return // Don't notify for own alerts

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
          filter: `user_id=eq.${activeUserId}` // Only for user's own alerts
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

  useEffect(() => {
    if (!userId) return

    const handleSocketEmergency = (payload = {}) => {
      const alertId = payload.id || payload.alertId || payload._id
      const alertType = payload.type || 'emergency'

      addNotification({
        id: `emergency_${alertId || Date.now()}`,
        type: 'emergency',
        title: 'Emergency Alert',
        message: payload.description || `${alertType} alert received nearby`,
        alertId,
        timestamp: payload.createdAt || new Date(),
        avatar: payload.user?.avatar || payload.avatar
      })
    }

    const handleCommentNotification = (payload = {}) => {
      addNotification({
        id: `comment_${payload.commentId || Date.now()}`,
        type: 'message',
        title: 'New Comment',
        message: 'Someone commented on your post',
        postId: payload.postId,
        timestamp: payload.timestamp || new Date()
      })
    }

    const handleWindowMessage = (event) => {
      const detail = event?.detail || {}
      const message = detail.message || detail
      const sender = message?.sender?.name || message?.senderName || 'Someone'

      addNotification({
        id: `message_${message?._id || message?.id || detail?.roomId || Date.now()}`,
        type: 'message',
        title: 'New Message',
        message: `${sender} sent you a message`,
        roomId: detail?.roomId || message?.roomId || message?.room,
        timestamp: message?.createdAt || message?.timestamp || new Date(),
        avatar: message?.sender?.avatar || message?.senderAvatar
      })
    }

    const handleWindowEmergency = (event) => {
      const detail = event?.detail || {}
      handleSocketEmergency(detail)
    }

    if (socket) {
      socket.on('emergency-alert', handleSocketEmergency)
      socket.on('comment-notification', handleCommentNotification)
    }

    window.addEventListener('new-message', handleWindowMessage)
    window.addEventListener('direct-message', handleWindowMessage)
    window.addEventListener('emergency-alert', handleWindowEmergency)

    return () => {
      if (socket) {
        socket.off('emergency-alert', handleSocketEmergency)
        socket.off('comment-notification', handleCommentNotification)
      }
      window.removeEventListener('new-message', handleWindowMessage)
      window.removeEventListener('direct-message', handleWindowMessage)
      window.removeEventListener('emergency-alert', handleWindowEmergency)
    }
  }, [socket, addNotification, userId])

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
        return <ChatBubbleLeftIcon className="w-5 h-5 text-orange-400" />
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

  useLayoutEffect(() => {
    if (isOpen) {
      setIsRendered(true)
    }
  }, [isOpen])

  useLayoutEffect(() => {
    if (isRendered && panelRef.current) {
      if (isOpen) {
        gsap.fromTo(panelRef.current,
          { opacity: 0, scale: 0.96, y: -12, display: 'block' },
          { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'power3.out' }
        )
        if (notifications.length > 0) {
          gsap.fromTo('.notification-item',
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out', delay: 0.1 }
          )
        }
      } else {
        gsap.to(panelRef.current, {
          opacity: 0, scale: 0.96, y: -12, duration: 0.25, ease: 'power2.in',
          onComplete: () => setIsRendered(false)
        })
      }
    }
  }, [isOpen, isRendered, notifications.length])

  return (
    <>
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
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-full transition-colors duration-300 group hover:bg-[#B08968]/10"
        >
          {unreadCount > 0 ? (
            <BellSolidIcon className="w-[22px] h-[22px] text-[#B08968]" />
          ) : (
            <BellIcon className="w-[22px] h-[22px] text-[#86868B] group-hover:text-[#B08968] transition-colors" />
          )}
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#B08968] rounded-full border-[1.5px] border-[#0C0C0C]" />
          )}
        </button>

        <div
          ref={panelRef}
          className="absolute right-0 mt-3 w-[380px] rounded-[24px] overflow-hidden z-[100] shadow-[0_24px_48px_rgba(0,0,0,0.5)] border border-[#B08968]/20"
          style={{
            display: isRendered ? 'block' : 'none',
            background: 'linear-gradient(135deg, rgba(17,17,17,0.92) 0%, rgba(12,12,12,0.96) 100%)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)'
          }}
        >
          <div className="h-[72px] px-5 flex items-center justify-between border-b border-[#B08968]/10 bg-black/20">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 flex items-center justify-center w-[36px] h-[36px] rounded-full bg-[#B08968]/10 text-[#B08968]">
                <BellIcon className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="m-0 p-0 text-[15px] font-semibold text-[#F5F5F7] leading-none mb-1">Notifications</h3>
                <p className="m-0 p-0 text-[13px] text-[#86868B] leading-none">Ride updates</p>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                navigate('/profile', { state: { activeTab: 'settings', t: Date.now() } });
              }}
              className="flex-shrink-0 p-2 -mr-2 rounded-full hover:bg-white/5 transition-colors group"
            >
              <Cog8ToothIcon className="w-5 h-5 text-[#86868B] group-hover:text-[#F5F5F7] transition-colors" />
            </button>
          </div>

          <div className="max-h-[536px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            {notifications.length === 0 ? (
              <div className="px-6 py-20 flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-[#B08968] blur-[40px] opacity-20 rounded-full" />
                  <div className="w-16 h-16 rounded-full bg-gradient-to-b from-[#B08968]/20 to-transparent flex items-center justify-center border border-[#B08968]/10 relative z-10">
                    <BellIcon className="w-8 h-8 text-[#B08968]" />
                  </div>
                </div>
                <h4 className="text-[17px] font-medium text-[#F5F5F7] mb-2">You're all caught up</h4>
                <p className="text-[14px] text-[#86868B] leading-relaxed max-w-[240px]">
                  Ride alerts, safety updates and community activity will appear here.
                </p>
              </div>
            ) : (
              <div className="p-3 flex flex-col gap-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="notification-item group relative p-4 rounded-[16px] bg-white/[0.02] border border-white/[0.04] cursor-pointer transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.08] hover:-translate-y-[2px] hover:shadow-[0_8px_16px_rgba(176,137,104,0.08)] overflow-hidden"
                  >
                    {!notification.read && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[24px] bg-[#B08968] rounded-r-full" />
                    )}
                    
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[radial-gradient(ellipse_at_center,rgba(176,137,104,0.06)_0%,transparent_100%)] transition-opacity duration-500 pointer-events-none" />

                    <div className="flex gap-4 relative z-10">
                      <div className="mt-0.5 flex-shrink-0">
                        {notification.avatar ? (
                          <img src={notification.avatar} className="w-9 h-9 rounded-full object-cover border border-white/10" alt="" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#B08968]/10 border border-[#B08968]/20 flex items-center justify-center">
                            <div className="scale-75">{getNotificationIcon(notification.type)}</div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1 gap-2">
                          <h5 className={`text-[14px] font-medium leading-tight truncate ${!notification.read ? 'text-[#F5F5F7]' : 'text-[#e0e0e0]'}`}>
                            {notification.title}
                          </h5>
                          <span className="text-[11px] text-[#86868B] whitespace-nowrap flex-shrink-0">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>
                        <p className="text-[13px] text-[#86868B] leading-snug line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

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
