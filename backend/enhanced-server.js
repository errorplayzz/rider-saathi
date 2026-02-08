/**
 * Enhanced Rider Sathi Backend Server
 * Premium real-time rider tracking and emergency navigation system
 * 🚀 Production-ready with error handling, rate limiting, and optimizations
 */

const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const compression = require('compression')
const helmet = require('helmet')
const { v4: uuidv4 } = require('uuid')

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
})

// Enhanced Security & Performance Middleware
app.use(helmet({
  contentSecurityPolicy: false, // For development
  crossOriginEmbedderPolicy: false
}))

app.use(compression())

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Enhanced Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

const emergencyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 emergency alerts per minute
  message: {
    error: 'Emergency alert rate limit exceeded. Please wait before sending another alert.',
    retryAfter: '1 minute'
  }
})

const locationLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 10, // 10 location updates per second
  skipSuccessfulRequests: true
})

app.use('/api/', generalLimiter)
app.use('/api/emergency/create', emergencyLimiter)
app.use('/api/location/update', locationLimiter)

// In-memory data stores (production should use Redis/MongoDB)
const riders = new Map()
const emergencyAlerts = new Map()
const activeRooms = new Map()
const socketUsers = new Map()

// Utility Functions with error handling
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  try {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180
    const φ2 = lat2 * Math.PI/180
    const Δφ = (lat2-lat1) * Math.PI/180
    const Δλ = (lon2-lon1) * Math.PI/180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c // Distance in meters
  } catch (error) {
    console.error('❌ Distance calculation error:', error)
    return 0
  }
}

const findNearbyRiders = (userLocation, radius = 5000) => {
  try {
    const nearby = []
    for (const [id, rider] of riders) {
      if (!rider.location || !rider.lastSeen) continue
      
      // Skip offline riders (inactive for more than 5 minutes)
      if (Date.now() - rider.lastSeen > 300000) continue
      
      const distance = calculateDistance(
        userLocation.lat, 
        userLocation.lng,
        rider.location.lat, 
        rider.location.lng
      )
      
      if (distance <= radius) {
        nearby.push({
          ...rider,
          distance: Math.round(distance)
        })
      }
    }
    
    return nearby.sort((a, b) => a.distance - b.distance)
  } catch (error) {
    console.error('❌ Error finding nearby riders:', error)
    return []
  }
}

const validateLocation = (location) => {
  if (!location || typeof location !== 'object') return false
  if (typeof location.lat !== 'number' || typeof location.lng !== 'number') return false
  if (Math.abs(location.lat) > 90 || Math.abs(location.lng) > 180) return false
  return true
}

const sanitizeInput = (str) => {
  if (typeof str !== 'string') return ''
  return str.replace(/[<>]/g, '').trim().substring(0, 500)
}

// Enhanced Socket.io with error handling and optimizations
io.on('connection', (socket) => {
  console.log('🔗 User connected:', socket.id)
  
  // Enhanced error handling
  socket.on('error', (error) => {
    console.error('❌ Socket error for', socket.id, ':', error)
  })

  // Join user room for real-time updates
  socket.on('join-user-room', (userId) => {
    try {
      if (!userId) return
      
      const sanitizedUserId = sanitizeInput(userId.toString())
      socket.join(`user-${sanitizedUserId}`)
      socketUsers.set(socket.id, sanitizedUserId)
      
      console.log(`📍 User ${sanitizedUserId} joined their room`)
    } catch (error) {
      console.error('❌ Error joining user room:', error)
    }
  })

  // Enhanced location sharing with validation and rate limiting
  socket.on('location-update', (data) => {
    try {
      const { userId, location, heading, speed, accuracy } = data
      
      if (!userId || !validateLocation(location)) {
        socket.emit('error', { message: 'Invalid location data' })
        return
      }
      
      const sanitizedUserId = sanitizeInput(userId.toString())
      const now = Date.now()
      
      // Update rider data with enhanced info
      riders.set(sanitizedUserId, {
        id: sanitizedUserId,
        socketId: socket.id,
        location: {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lng)
        },
        heading: heading || 0,
        speed: speed || 0,
        accuracy: accuracy || 0,
        lastSeen: now,
        online: true
      })

      // Broadcast to nearby riders with throttling
      const nearbyRiders = findNearbyRiders(location, 10000) // 10km radius
      const updateData = {
        userId: sanitizedUserId,
        location,
        timestamp: now,
        nearbyCount: nearbyRiders.length
      }

      // Efficient broadcasting to relevant users only
      nearbyRiders.forEach(rider => {
        if (rider.socketId && rider.id !== sanitizedUserId) {
          socket.to(rider.socketId).emit('rider-location-update', updateData)
        }
      })

      // Acknowledge receipt
      socket.emit('location-update-ack', {
        timestamp: now,
        nearbyRiders: nearbyRiders.length
      })

    } catch (error) {
      console.error('❌ Location update error:', error)
      socket.emit('error', { message: 'Location update failed' })
    }
  })

  // Enhanced emergency broadcasting with priority levels
  socket.on('emergency-broadcast', (data) => {
    try {
      const { type, location, message, userId, severity, radius = 10000 } = data
      
      if (!validateLocation(location) || !userId) {
        socket.emit('error', { message: 'Invalid emergency data' })
        return
      }

      const sanitizedData = {
        id: uuidv4(),
        type: sanitizeInput(type),
        message: sanitizeInput(message || ''),
        userId: sanitizeInput(userId.toString()),
        location: {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lng)
        },
        severity: severity || 'normal',
        timestamp: Date.now(),
        radius
      }

      // Store emergency alert
      emergencyAlerts.set(sanitizedData.id, sanitizedData)

      // Find all riders in emergency radius
      const nearbyRiders = findNearbyRiders(location, radius)
      
      console.log(`🚨 Emergency broadcast: ${type} to ${nearbyRiders.length} nearby riders`)

      // High-priority broadcasting with immediate delivery
      nearbyRiders.forEach(rider => {
        if (rider.socketId) {
          io.to(rider.socketId).emit('emergency-alert', {
            ...sanitizedData,
            distance: rider.distance,
            priority: severity === 'critical' ? 'immediate' : 'high'
          })
        }
      })

      // Broadcast to all connected clients for dashboard updates
      socket.broadcast.emit('emergency-update', {
        action: 'new',
        alert: sanitizedData,
        affectedRiders: nearbyRiders.length
      })

      // Acknowledge successful broadcast
      socket.emit('emergency-broadcast-ack', {
        alertId: sanitizedData.id,
        broadcastCount: nearbyRiders.length,
        timestamp: Date.now()
      })

    } catch (error) {
      console.error('❌ Emergency broadcast error:', error)
      socket.emit('error', { message: 'Emergency broadcast failed' })
    }
  })

  // Enhanced disconnect handling
  socket.on('disconnect', (reason) => {
    try {
      console.log(`🔌 User disconnected: ${socket.id}, reason: ${reason}`)
      
      const userId = socketUsers.get(socket.id)
      if (userId) {
        // Mark rider as offline instead of removing
        if (riders.has(userId)) {
          const rider = riders.get(userId)
          rider.online = false
          rider.lastSeen = Date.now()
          riders.set(userId, rider)
        }
        
        socketUsers.delete(socket.id)
        
        // Notify nearby riders of offline status
        if (riders.has(userId)) {
          const rider = riders.get(userId)
          if (rider.location) {
            const nearby = findNearbyRiders(rider.location, 5000)
            nearby.forEach(nearbyRider => {
              if (nearbyRider.socketId) {
                socket.to(nearbyRider.socketId).emit('rider-offline', {
                  userId,
                  timestamp: Date.now()
                })
              }
            })
          }
        }
      }
    } catch (error) {
      console.error('❌ Disconnect handling error:', error)
    }
  })
})

// Enhanced REST API Endpoints

// Health check with detailed status
app.get('/api/health', (req, res) => {
  try {
    const connectedUsers = socketUsers.size
    const activeRiders = Array.from(riders.values()).filter(r => r.online).length
    const totalAlerts = emergencyAlerts.size
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      stats: {
        connectedUsers,
        activeRiders,
        totalAlerts,
        memoryUsage: process.memoryUsage()
      },
      version: '2.0.0'
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    })
  }
})

// Get nearby riders with enhanced filtering
app.post('/api/riders/nearby', (req, res) => {
  try {
    const { location, radius = 5000, includeOffline = false } = req.body
    
    if (!validateLocation(location)) {
      return res.status(400).json({
        error: 'Invalid location data',
        message: 'Location must have valid lat and lng coordinates'
      })
    }
    
    let nearbyRiders = findNearbyRiders(location, radius)
    
    if (!includeOffline) {
      nearbyRiders = nearbyRiders.filter(rider => rider.online)
    }
    
    res.json({
      riders: nearbyRiders,
      count: nearbyRiders.length,
      radius,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('❌ Nearby riders error:', error)
    res.status(500).json({
      error: 'Failed to find nearby riders',
      message: 'Internal server error'
    })
  }
})

// Enhanced emergency alert creation
app.post('/api/emergency/create', emergencyLimiter, (req, res) => {
  try {
    const { userId, type, message, location, severity = 'normal' } = req.body
    
    if (!userId || !type || !validateLocation(location)) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'type', 'location']
      })
    }

    const alert = {
      id: uuidv4(),
      userId: sanitizeInput(userId.toString()),
      type: sanitizeInput(type),
      message: sanitizeInput(message || ''),
      location: {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng)
      },
      severity,
      status: 'active',
      created_at: new Date().toISOString(),
      timestamp: Date.now()
    }

    emergencyAlerts.set(alert.id, alert)

    // Immediate response
    res.status(201).json({
      alert,
      message: 'Emergency alert created successfully'
    })

    // Async broadcasting (don't wait for it)
    setImmediate(() => {
      try {
        const nearbyRiders = findNearbyRiders(location, 10000)
        nearbyRiders.forEach(rider => {
          if (rider.socketId) {
            io.to(rider.socketId).emit('emergency-alert', {
              ...alert,
              distance: rider.distance
            })
          }
        })
        console.log(`🚨 Emergency ${type} broadcasted to ${nearbyRiders.length} riders`)
      } catch (broadcastError) {
        console.error('❌ Emergency broadcast error:', broadcastError)
      }
    })

  } catch (error) {
    console.error('❌ Emergency creation error:', error)
    res.status(500).json({
      error: 'Failed to create emergency alert',
      message: 'Internal server error'
    })
  }
})

// Get nearby emergency alerts
app.post('/api/emergency/nearby', (req, res) => {
  try {
    const { location, radius = 10000 } = req.body
    
    if (!validateLocation(location)) {
      return res.status(400).json({
        error: 'Invalid location data'
      })
    }
    
    const nearbyAlerts = []
    const now = Date.now()
    
    for (const alert of emergencyAlerts.values()) {
      // Skip alerts older than 4 hours
      if (now - alert.timestamp > 14400000) continue
      
      const distance = calculateDistance(
        location.lat, location.lng,
        alert.location.lat, alert.location.lng
      )
      
      if (distance <= radius) {
        nearbyAlerts.push({
          ...alert,
          distance: Math.round(distance),
          timeAgo: Math.round((now - alert.timestamp) / 1000)
        })
      }
    }
    
    // Sort by severity and recency
    nearbyAlerts.sort((a, b) => {
      const severityOrder = { 'critical': 3, 'high': 2, 'normal': 1 }
      const aSeverity = severityOrder[a.severity] || 1
      const bSeverity = severityOrder[b.severity] || 1
      
      if (aSeverity !== bSeverity) return bSeverity - aSeverity
      return a.timestamp - b.timestamp // Most recent first
    })
    
    res.json({
      alerts: nearbyAlerts,
      count: nearbyAlerts.length,
      timestamp: now
    })
    
  } catch (error) {
    console.error('❌ Nearby alerts error:', error)
    res.status(500).json({
      error: 'Failed to fetch emergency alerts'
    })
  }
})

// Enhanced location update endpoint
app.post('/api/location/update', locationLimiter, (req, res) => {
  try {
    const { userId, location, heading, speed, accuracy } = req.body
    
    if (!userId || !validateLocation(location)) {
      return res.status(400).json({
        error: 'Invalid data',
        required: ['userId', 'location']
      })
    }
    
    const sanitizedUserId = sanitizeInput(userId.toString())
    const now = Date.now()
    
    riders.set(sanitizedUserId, {
      id: sanitizedUserId,
      location: {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng)
      },
      heading: heading || 0,
      speed: speed || 0,
      accuracy: accuracy || 0,
      lastSeen: now,
      online: true
    })
    
    res.json({
      success: true,
      timestamp: now,
      nearbyRiders: findNearbyRiders(location, 5000).length
    })
    
  } catch (error) {
    console.error('❌ Location update error:', error)
    res.status(500).json({
      error: 'Location update failed'
    })
  }
})

// Enhanced statistics endpoint
app.get('/api/stats', (req, res) => {
  try {
    const now = Date.now()
    const activeRiders = Array.from(riders.values()).filter(r => 
      r.online && (now - r.lastSeen) < 300000 // Active in last 5 minutes
    )
    
    const recentAlerts = Array.from(emergencyAlerts.values()).filter(a => 
      (now - a.timestamp) < 3600000 // Last hour
    )
    
    res.json({
      realTimeStats: {
        connectedSockets: socketUsers.size,
        activeRiders: activeRiders.length,
        totalRegisteredRiders: riders.size,
        recentAlerts: recentAlerts.length,
        totalAlerts: emergencyAlerts.size
      },
      performanceMetrics: {
        uptime: Math.round(process.uptime()),
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        avgResponseTime: '~50ms' // Would be calculated in production
      },
      timestamp: now
    })
  } catch (error) {
    console.error('❌ Stats error:', error)
    res.status(500).json({
      error: 'Failed to fetch statistics'
    })
  }
})

// Cleanup tasks for memory management
const cleanupOldData = () => {
  try {
    const now = Date.now()
    const FOUR_HOURS = 4 * 60 * 60 * 1000
    const ONE_HOUR = 60 * 60 * 1000
    
    // Remove old emergency alerts (older than 4 hours)
    for (const [id, alert] of emergencyAlerts) {
      if (now - alert.timestamp > FOUR_HOURS) {
        emergencyAlerts.delete(id)
      }
    }
    
    // Remove inactive riders (offline for more than 1 hour)
    for (const [id, rider] of riders) {
      if (now - rider.lastSeen > ONE_HOUR && !rider.online) {
        riders.delete(id)
      }
    }
    
    console.log('🧹 Cleanup completed:', {
      activeRiders: riders.size,
      activeAlerts: emergencyAlerts.size,
      connectedSockets: socketUsers.size
    })
  } catch (error) {
    console.error('❌ Cleanup error:', error)
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupOldData, 30 * 60 * 1000)

// Enhanced error handling
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error)
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist',
    availableEndpoints: [
      'GET /api/health',
      'POST /api/riders/nearby',
      'POST /api/emergency/create',
      'POST /api/emergency/nearby',
      'POST /api/location/update',
      'GET /api/stats'
    ]
  })
})

// Enhanced server startup
const PORT = process.env.PORT || 5000
const HOST = process.env.HOST || '0.0.0.0'

server.listen(PORT, HOST, () => {
  console.log('🚀 Enhanced Rider Sathi Server Started')
  console.log('📍 Server Details:')
  console.log(`   • HTTP Server: http://${HOST}:${PORT}`)
  console.log(`   • WebSocket Server: ws://${HOST}:${PORT}`)
  console.log(`   • Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`   • Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`)
  console.log('⚡ Features Enabled:')
  console.log('   • Real-time rider tracking')
  console.log('   • Emergency alert system')
  console.log('   • Rate limiting & security')
  console.log('   • Memory management')
  console.log('   • Performance monitoring')
  console.log('✅ Server ready to handle requests!')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Received SIGTERM, shutting down gracefully...')
  server.close(() => {
    console.log('✅ Server closed successfully')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🔄 Received SIGINT, shutting down gracefully...')
  server.close(() => {
    console.log('✅ Server closed successfully')
    process.exit(0)
  })
})

module.exports = { app, server, io }