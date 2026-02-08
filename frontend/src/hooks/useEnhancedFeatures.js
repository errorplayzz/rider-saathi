import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook for monitoring network connectivity status
 * Provides real-time online/offline detection with enhanced features
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [connectionType, setConnectionType] = useState('unknown')
  const [effectiveType, setEffectiveType] = useState('unknown')

  useEffect(() => {
    const updateConnectionStatus = () => {
      setIsOnline(navigator.onLine)
      
      // Get connection info if available (experimental API)
      if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
        if (connection) {
          setConnectionType(connection.type || 'unknown')
          setEffectiveType(connection.effectiveType || 'unknown')
        }
      }
    }

    // Update status immediately
    updateConnectionStatus()

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      updateConnectionStatus()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for connection changes if available
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      if (connection && connection.addEventListener) {
        connection.addEventListener('change', updateConnectionStatus)
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      
      if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
        if (connection && connection.removeEventListener) {
          connection.removeEventListener('change', updateConnectionStatus)
        }
      }
    }
  }, [])

  return {
    isOnline,
    connectionType,
    effectiveType,
    isSlowConnection: effectiveType === 'slow-2g' || effectiveType === '2g'
  }
}

/**
 * Custom hook for managing notifications with audio and vibration
 * Provides enhanced user feedback for different interaction types
 */
export const useNotifications = () => {
  const [permission, setPermission] = useState(Notification.permission)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [vibrationEnabled, setVibrationEnabled] = useState('vibrate' in navigator)

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result
    }
    return 'denied'
  }, [])

  // Show notification with enhanced features
  const showNotification = useCallback((options) => {
    const {
      type = 'info',
      title = 'Rider Sathi',
      message = '',
      duration = 4000,
      priority = 'normal',
      silent = false
    } = options

    // Visual notification (browser)
    if (permission === 'granted' && !silent) {
      const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️'
      
      const notification = new Notification(`${icon} ${title}`, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `notification-${Date.now()}`,
        requireInteraction: priority === 'high' || priority === 'critical',
        silent: priority === 'normal'
      })

      if (duration > 0) {
        setTimeout(() => notification.close(), duration)
      }
    }

    // Audio feedback
    if (audioEnabled && !silent) {
      playNotificationSound(type, priority)
    }

    // Console logging for development
    const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️'
    console.log(`${emoji} ${title}: ${message}`)

    return true
  }, [permission, audioEnabled])

  // Play audio feedback
  const playNotificationSound = useCallback((type, priority) => {
    if (!audioEnabled) return

    try {
      const context = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = context.createOscillator()
      const gainNode = context.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(context.destination)

      // Different frequencies for different notification types
      const frequencies = {
        success: [523, 659, 784], // C5-E5-G5 (major chord)
        error: [311, 277, 247],   // D#4-C#4-B3 (descending)
        warning: [440, 554],       // A4-C#5
        info: [523]                // C5
      }

      const freq = frequencies[type] || frequencies.info
      const duration = priority === 'critical' ? 0.8 : 0.3

      freq.forEach((f, i) => {
        oscillator.frequency.setValueAtTime(f, context.currentTime + (i * 0.1))
      })

      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.1, context.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration)

      oscillator.start(context.currentTime)
      oscillator.stop(context.currentTime + duration)
    } catch (error) {
      console.warn('Unable to play notification sound:', error)
    }
  }, [audioEnabled])

  // Vibration feedback
  const vibrateDevice = useCallback((pattern = 'light') => {
    if (!vibrationEnabled || !('vibrate' in navigator)) return

    const patterns = {
      light: [50],
      medium: [100],
      heavy: [200],
      success: [50, 50, 50],
      error: [100, 50, 100, 50, 100],
      emergency: [200, 100, 200, 100, 200, 100, 200]
    }

    try {
      navigator.vibrate(patterns[pattern] || patterns.light)
    } catch (error) {
      console.warn('Unable to vibrate device:', error)
    }
  }, [vibrationEnabled])

  // Initialize permission check
  useEffect(() => {
    if (permission === 'default') {
      // Don't auto-request, wait for user interaction
      console.log('Notification permission not granted. Call requestPermission() when appropriate.')
    }
  }, [permission])

  return {
    permission,
    audioEnabled,
    vibrationEnabled,
    showNotification,
    vibrateDevice,
    requestPermission,
    setAudioEnabled,
    setVibrationEnabled: (enabled) => {
      if ('vibrate' in navigator) {
        setVibrationEnabled(enabled)
      }
    }
  }
}

export default {
  useNetworkStatus,
  useNotifications
}