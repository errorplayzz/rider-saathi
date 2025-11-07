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

// Load env BEFORE importing any route that might read process.env at module scope
dotenv.config()

// Import Supabase config instead of MongoDB
import { connectSupabase } from './config/supabase.js'

// Import routes
import authRoutes from './routes/auth.js'
import gpsRoutes from './routes/gps.js'
import emergencyRoutes from './routes/emergency.js'
import weatherRoutes from './routes/weather.js'
import rewardsRoutes from './routes/rewards.js'
import chatRoutes from './routes/chat.js'
import aiRoutes from './routes/ai.js'

// Import socket handlers
import { handleSocketConnection } from './services/socketService.js'

// dotenv already configured above

const app = express()
const server = createServer(app)

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      'https://nsut-rider-6ge2.vercel.app',
      'https://nsut-rider.vercel.app',
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
    // You can add trusted IPs here if needed
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

// API Routes
app.use('/api/auth', authLimiter, authRoutes) // Separate rate limiter for auth
app.use('/api/gps', gpsRoutes)
app.use('/api/emergency', emergencyRoutes)
app.use('/api/weather', weatherRoutes)
app.use('/api/rewards', rewardsRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/ai', aiRoutes)

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
    console.log('Attempting to connect to Supabase...')
    const connected = await connectSupabase()
    if (connected) {
      console.log('✅ Supabase Connected successfully')
      return true
    }
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
const PORT = process.env.PORT || 5000

const startServer = async () => {
  const dbConnected = await connectDB()
  
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
    console.log(`📡 Socket.IO server running`)
    console.log(`💾 Database: ${dbConnected ? 'Connected' : 'Disconnected (demo mode)'}`)
    console.log(`\n🎯 Frontend URL: http://localhost:3000`)
    console.log(`🔧 Backend URL: http://localhost:${PORT}`)
    console.log(`📚 API Docs: http://localhost:${PORT}/api`)
  })
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

startServer().catch(console.error)

export { io }