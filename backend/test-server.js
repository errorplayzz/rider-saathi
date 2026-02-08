import express from 'express'
import { createServer } from 'http'

console.log('Starting test server...')

const app = express()
const server = createServer(app)

app.get('/test', (req, res) => {
  res.json({ message: 'Test server working!' })
})

const PORT = process.env.PORT || 5002

server.listen(PORT, () => {
  console.log(`✅ Test server running on port ${PORT}`)
  console.log(`🌐 Visit: http://localhost:${PORT}/test`)
})

server.on('error', (error) => {
  console.error('❌ Server error:', error)
})