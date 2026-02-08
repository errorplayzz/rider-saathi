import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'

console.log('Loading environment variables...')
dotenv.config()

console.log('Creating Express app...')
const app = express()
const server = createServer(app)

console.log('Setting up Socket.IO...')
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

console.log('Setting up basic middleware...')
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Backend is running!', 
    timestamp: new Date().toISOString()
  })
})

const PORT = process.env.PORT || 5001

console.log(`Starting server on port ${PORT}...`)

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`)
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`)
})

server.on('error', (error) => {
  console.error('❌ Server error:', error)
})