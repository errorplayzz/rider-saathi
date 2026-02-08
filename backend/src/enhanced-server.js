const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const cors = require('cors')
const mongoose = require('mongoose')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const app = express()
const server = http.createServer(app)

// Socket.io setup with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
})

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
})
app.use(limiter)

// MongoDB connection (optional - using in-memory storage for demo)
const connectDB = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI)
      console.log('📦 MongoDB connected')
    } else {
      console.log('📦 Using in-memory storage (MongoDB URI not provided)')
    }
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error)
  }
}

// In-memory storage for demo purposes
const storage = {
  riders: new Map(), // userId -> { location, lastSeen, isOnline, profile }
  emergencies: new Map(), // emergencyId -> emergency data
  activeRooms: new Set(), // active socket rooms
  userSockets: new Map() // userId -> socketId mapping
}

// Utility functions
const calculateDistance = (pos1, pos2) => {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = pos1.lat * Math.PI / 180
  const φ2 = pos2.lat * Math.PI / 180
  const Δφ = (pos2.lat - pos1.lat) * Math.PI / 180
  const Δλ = (pos2.lng - pos1.lng) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c // Distance in meters
}

const generateId = () => {
  return Math.random().toString(36).substr(2, 9)
}

const isWithinRadius = (pos1, pos2, radiusMeters) => {
  return calculateDistance(pos1, pos2) <= radiusMeters
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`)

  // Join user-specific room
  socket.on('join-user-room', (userId) => {
    if (!userId) return

    socket.join(`user-${userId}`)
    storage.userSockets.set(userId, socket.id)
    storage.activeRooms.add(`user-${userId}`)
    
    console.log(`👤 User ${userId} joined room with socket ${socket.id}`)

    // Mark user as online
    const existingRider = storage.riders.get(userId)
    if (existingRider) {
      existingRider.isOnline = true
      existingRider.lastSeen = new Date()
    }

    // Send current nearby riders to newly connected user
    const nearbyRiders = findNearbyRiders(userId)
    socket.emit('riders-nearby', nearbyRiders)
  })

  // Handle location updates
  socket.on('location-update', (data) => {
    const { userId, location, accuracy, timestamp } = data

    if (!userId || !location || !location.lat || !location.lng) {
      console.warn('⚠️ Invalid location update received')
      return
    }

    // Update rider location in storage
    const riderData = {
      userId,
      location: {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng)
      },
      accuracy: accuracy || null,
      lastSeen: new Date(timestamp) || new Date(),
      isOnline: true,
      socketId: socket.id
    }

    storage.riders.set(userId, riderData)
    console.log(`📍 Location updated for user ${userId}: ${location.lat}, ${location.lng}`)

    // Find and notify nearby riders
    const nearbyRiders = findNearbyRiders(userId)
    
    // Broadcast to nearby riders that this user moved
    nearbyRiders.forEach(rider => {
      const riderSocketId = storage.userSockets.get(rider.userId)
      if (riderSocketId && riderSocketId !== socket.id) {
        io.to(riderSocketId).emit('rider-location-update', {
          userId: userId,
          location: location,
          distance: rider.distance
        })
      }
    })

    // Send updated nearby riders list back to the user
    socket.emit('riders-nearby', nearbyRiders)
  })

  // Handle emergency broadcasts
  socket.on('emergency-broadcast', (emergencyData) => {
    const emergency = {
      id: generateId(),
      ...emergencyData,
      created_at: new Date(),
      status: 'active'
    }

    storage.emergencies.set(emergency.id, emergency)
    console.log(`🚨 Emergency alert broadcasted: ${emergency.type} by ${emergency.userId}`)

    // Broadcast to all nearby riders (within 10km)
    const alertLocation = emergency.location
    storage.riders.forEach((rider, riderId) => {
      if (riderId !== emergency.userId && rider.isOnline) {
        const distance = calculateDistance(alertLocation, rider.location)
        if (distance <= 10000) { // 10km radius
          const riderSocketId = storage.userSockets.get(riderId)
          if (riderSocketId) {
            io.to(riderSocketId).emit('emergency-alert', {
              ...emergency,
              distance: distance
            })
          }
        }
      }
    })
  })

  // Handle emergency response
  socket.on('emergency-respond', (data) => {
    const { emergencyId, userId, responseType } = data
    
    const emergency = storage.emergencies.get(emergencyId)
    if (!emergency) return

    emergency.responses = emergency.responses || []
    emergency.responses.push({
      userId,
      responseType,
      timestamp: new Date()
    })

    // Notify emergency creator
    const creatorSocketId = storage.userSockets.get(emergency.userId)
    if (creatorSocketId) {
      io.to(creatorSocketId).emit('emergency-response', {
        emergencyId,
        response: {
          userId,
          responseType,
          timestamp: new Date()
        }
      })
    }

    console.log(`🚑 Emergency response: ${responseType} from ${userId} for emergency ${emergencyId}`)
  })

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`)
    
    // Find user by socket ID and mark as offline
    storage.userSockets.forEach((socketId, userId) => {
      if (socketId === socket.id) {
        const rider = storage.riders.get(userId)
        if (rider) {
          rider.isOnline = false
          rider.lastSeen = new Date()
        }
        storage.userSockets.delete(userId)
        console.log(`👤 User ${userId} marked offline`)
      }
    })
  })
})

// Helper function to find nearby riders
const findNearbyRiders = (userId, radiusMeters = 5000) => {
  const currentUser = storage.riders.get(userId)
  if (!currentUser || !currentUser.location) return []

  const nearbyRiders = []
  const userLocation = currentUser.location

  storage.riders.forEach((rider, riderId) => {
    if (riderId !== userId && rider.isOnline && rider.location) {
      const distance = calculateDistance(userLocation, rider.location)
      
      if (distance <= radiusMeters) {
        nearbyRiders.push({
          userId: riderId,
          name: `Rider ${riderId.slice(-4)}`, // Display name
          location: rider.location,
          distance: distance,
          lastSeen: rider.lastSeen,
          isFriend: false, // TODO: implement friend system
          isOnline: rider.isOnline
        })
      }
    }
  })

  return nearbyRiders.sort((a, b) => a.distance - b.distance)
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    activeRiders: storage.riders.size,
    activeEmergencies: Array.from(storage.emergencies.values()).filter(e => e.status === 'active').length
  })
})

// Get nearby riders
app.post('/api/riders/nearby', (req, res) => {
  try {
    const { userId, location, radius = 5000 } = req.body

    if (!userId || !location) {
      return res.status(400).json({ error: 'Missing userId or location' })
    }

    // Update user location first
    const riderData = storage.riders.get(userId) || {}
    riderData.location = location
    riderData.lastSeen = new Date()
    storage.riders.set(userId, riderData)

    const nearbyRiders = findNearbyRiders(userId, radius)
    
    res.json(nearbyRiders)
  } catch (error) {
    console.error('❌ Error getting nearby riders:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create emergency alert
app.post('/api/emergency/create', (req, res) => {
  try {
    const { userId, type, message, location } = req.body

    if (!userId || !type || !location) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const emergency = {
      id: generateId(),
      userId,
      type,
      message: message || '',
      location: {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng)
      },
      created_at: new Date(),
      status: 'active',
      responses: []
    }

    storage.emergencies.set(emergency.id, emergency)

    console.log(`🚨 Emergency created: ${emergency.type} by ${userId}`)
    
    res.json(emergency)
  } catch (error) {
    console.error('❌ Error creating emergency:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get nearby emergency alerts
app.post('/api/emergency/nearby', (req, res) => {
  try {
    const { location, radius = 10000 } = req.body

    if (!location) {
      return res.status(400).json({ error: 'Missing location' })
    }

    const nearbyEmergencies = []

    storage.emergencies.forEach(emergency => {
      if (emergency.status === 'active') {
        const distance = calculateDistance(location, emergency.location)
        if (distance <= radius) {
          nearbyEmergencies.push({
            ...emergency,
            distance
          })
        }
      }
    })

    // Sort by distance (closest first)
    nearbyEmergencies.sort((a, b) => a.distance - b.distance)

    res.json(nearbyEmergencies)
  } catch (error) {
    console.error('❌ Error getting nearby emergencies:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Respond to emergency
app.post('/api/emergency/:id/respond', (req, res) => {
  try {
    const { id } = req.params
    const { userId, responseType, message } = req.body

    const emergency = storage.emergencies.get(id)
    if (!emergency) {
      return res.status(404).json({ error: 'Emergency not found' })
    }

    const response = {
      userId,
      responseType,
      message: message || '',
      timestamp: new Date()
    }

    emergency.responses = emergency.responses || []
    emergency.responses.push(response)

    // Notify emergency creator via socket
    const creatorSocketId = storage.userSockets.get(emergency.userId)
    if (creatorSocketId) {
      io.to(creatorSocketId).emit('emergency-response', {
        emergencyId: id,
        response
      })
    }

    console.log(`🚑 Emergency response: ${responseType} from ${userId}`)
    
    res.json({ success: true, response })
  } catch (error) {
    console.error('❌ Error responding to emergency:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update emergency status
app.patch('/api/emergency/:id', (req, res) => {
  try {
    const { id } = req.params
    const { status, userId } = req.body

    const emergency = storage.emergencies.get(id)
    if (!emergency) {
      return res.status(404).json({ error: 'Emergency not found' })
    }

    // Only emergency creator can update status
    if (emergency.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    emergency.status = status
    emergency.updated_at = new Date()

    // Notify all nearby riders of status change
    const alertLocation = emergency.location
    storage.riders.forEach((rider, riderId) => {
      if (rider.isOnline) {
        const distance = calculateDistance(alertLocation, rider.location)
        if (distance <= 10000) { // 10km radius
          const riderSocketId = storage.userSockets.get(riderId)
          if (riderSocketId) {
            io.to(riderSocketId).emit('emergency-update', emergency)
          }
        }
      }
    })

    console.log(`🔄 Emergency ${id} status updated to: ${status}`)
    
    res.json(emergency)
  } catch (error) {
    console.error('❌ Error updating emergency:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get system statistics (for monitoring)
app.get('/api/stats', (req, res) => {
  try {
    const activeRiders = Array.from(storage.riders.values()).filter(rider => rider.isOnline).length
    const totalRiders = storage.riders.size
    const activeEmergencies = Array.from(storage.emergencies.values()).filter(e => e.status === 'active').length
    const totalEmergencies = storage.emergencies.size

    res.json({
      riders: {
        active: activeRiders,
        total: totalRiders
      },
      emergencies: {
        active: activeEmergencies,
        total: totalEmergencies
      },
      activeRooms: storage.activeRooms.size,
      uptime: process.uptime()
    })
  } catch (error) {
    console.error('❌ Error getting stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error)
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Cleanup function for inactive riders
setInterval(() => {
  const now = new Date()
  const inactiveThreshold = 5 * 60 * 1000 // 5 minutes

  storage.riders.forEach((rider, userId) => {
    if (rider.lastSeen && now - rider.lastSeen > inactiveThreshold) {
      if (rider.isOnline) {
        rider.isOnline = false
        console.log(`⏰ Marked rider ${userId} as offline due to inactivity`)
      }
    }
  })

  // Clean up old emergencies (older than 24 hours and resolved)
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000)
  storage.emergencies.forEach((emergency, id) => {
    if (emergency.status !== 'active' && emergency.created_at < dayAgo) {
      storage.emergencies.delete(id)
    }
  })
}, 30000) // Run every 30 seconds

// Start server
const PORT = process.env.PORT || 5000

const startServer = async () => {
  await connectDB()
  
  server.listen(PORT, () => {
    console.log('🚀 Enhanced Rider Tracking Server Started')
    console.log(`📍 Server running on port ${PORT}`)
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`📡 Socket.io enabled for real-time communication`)
    console.log('✅ Ready to track riders and handle emergencies')
  })
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM. Shutting down gracefully...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT. Shutting down gracefully...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

module.exports = app

// Start the server if this file is run directly
if (require.main === module) {
  startServer().catch(error => {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  })
}