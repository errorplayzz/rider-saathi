import express from 'express'
import path from 'path'
import fs from 'fs'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

// Load env BEFORE importing any route that might read process.env at module scope
// Load env BEFORE importing any route that might read process.env at module scope
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Import database configs
import { connectSupabase } from './config/supabase.js'
import { connectMongoDB } from './config/mongodb.js'

// Import routes
import authRoutes from './routes/auth.js'
import gpsRoutes from './routes/gps.js'
import emergencyRoutes from './routes/emergency.js'
import weatherRoutes from './routes/weather.js'
import rewardsRoutes from './routes/rewards.js'
import chatRoutes from './routes/chat.js'
import aiRoutes from './routes/ai.js'
import blogsRoutes from './routes/blogs.js'
// Chat system routes
import friendsRoutes from './routes/friends.js'
import messagesRoutes from './routes/messages.js'
import groupsRoutes from './routes/groups.js'
import communitiesRoutes from './routes/communities.js'
import postsRoutes from './routes/posts.js'
// Location tracking routes
import locationRoutes from './routes/location.js'
// Stats routes
import statsRoutes from './routes/stats.js'

// Import socket handlers
import { handleSocketConnection } from './services/socketService.js'

const app = express()
const server = createServer(app)

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      'https://nsut-rider-6ge2.vercel.app',
      'https://nsut-rider.vercel.app',
      'https://rider-saathi-org.vercel.app',
      'https://rider-saathi.vercel.app',
      ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(url => url.trim()) : [])
    ]
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed or matches Vercel pattern
    if (allowedOrigins.includes(origin) || origin.match(/https:\/\/nsut-rider.*\.vercel\.app$/)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

// Socket.IO setup
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000
})

// Rate limiting - More lenient for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 500 : 100, // 500 requests per 15 min in production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for certain IPs if needed
  skip: (req) => {
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return false;
  }
})

// Separate rate limiter for auth routes (more lenient)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 50 : 20, // 50 login attempts per 15 min
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production'
})

// Middleware
app.use(helmet())
app.use(cors(corsOptions))
app.use(compression())
app.use(morgan('combined'))
app.use(limiter)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Serve uploaded files (avatars, etc.)
const uploadsDir = path.join(process.cwd(), 'uploads')
// Ensure upload folders exist so multer can write files
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }
  const avatarsDir = path.join(uploadsDir, 'avatars')
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true })
  }
} catch (err) {
  console.error('Failed to create uploads directory:', err)
}
app.use('/uploads', express.static(uploadsDir))

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  })
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Backend is running!', 
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  })
})

// Make Socket.IO available to all routes
app.use((req, res, next) => {
  req.io = io
  next()
})

// API Routes
app.use('/api/auth', authLimiter, authRoutes) // Separate rate limiter for auth
app.use('/api/gps', gpsRoutes)
app.use('/api/emergency', emergencyRoutes)
app.use('/api/weather', weatherRoutes)
app.use('/api/rewards', rewardsRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/blogs', blogsRoutes)
// Chat system routes
app.use('/api/friends', friendsRoutes)
app.use('/api/messages', messagesRoutes)
app.use('/api/groups', groupsRoutes)
app.use('/api/communities', communitiesRoutes)
app.use('/api/posts', postsRoutes)
// Location tracking routes
app.use('/api/location', locationRoutes)
// Stats routes
app.use('/api/stats', statsRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack)
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    })
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    })
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  })
})

// Database connection
const connectDB = async () => {
  try {
    console.log('Attempting to connect to databases...')
    
    // Connect to both Supabase and MongoDB
    const supabaseConnected = await connectSupabase()
    const mongoConnected = await connectMongoDB()
    
    if (supabaseConnected || mongoConnected) {
      console.log('✅ Database connections established')
      if (supabaseConnected) console.log('  - Supabase: Connected')
      if (mongoConnected) console.log('  - MongoDB: Connected')
      return true
    }
    
    console.log('⚠️ No database connections established')
    return false
  } catch (error) {
    console.error('❌ Database connection error:', error.message)
    console.log('🔄 Running without database - some features will be limited')
    return false
  }
}

// Socket.IO connection handling
handleSocketConnection(io)

// Start server
const DEFAULT_PORT = 5001
const BASE_PORT = Number(process.env.PORT) || DEFAULT_PORT
const MAX_PORT_ATTEMPTS = 5

console.log(`🚀 Starting server (preferred port ${BASE_PORT})...`)

const listenOnPort = (port, dbConnected, attempt = 0) => {
  server.listen(port, () => {
    console.log(`✅ Server running on port ${port}`)
    console.log(`✅ Database: ${dbConnected ? 'Connected' : 'Disconnected (demo mode)'}`)
    console.log(`✅ API: http://localhost:${port}/api`)
  })

  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && attempt < MAX_PORT_ATTEMPTS) {
      const nextPort = port + 1
      console.warn(`⚠️ Port ${port} is in use. Trying ${nextPort}...`)
      listenOnPort(nextPort, dbConnected, attempt + 1)
      return
    }

    console.error('❌ Server failed to start:', error)
    process.exit(1)
  })
}

const startServer = async () => {
  const dbConnected = await connectDB()
  console.log(`✅ Database connection: ${dbConnected ? 'Success' : 'Failed (demo mode)'}`)
  listenOnPort(BASE_PORT, dbConnected)
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('Process terminated')
    // Supabase connections are automatically managed
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  server.close(() => {
    console.log('Process terminated')
    // Supabase connections are automatically managed
  })
})

startServer().catch((error) => {
  console.error('❌ Failed to start server:', error)
  console.error('Stack trace:', error.stack)
  process.exit(1)
})

export { io }
