#!/usr/bin/env node

/**
 * Enhanced Rider Tracking Server Startup Script
 * This script starts the enhanced backend server with Socket.io support
 */

const path = require('path')
const fs = require('fs')

// Set environment variables if .env file exists
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath })
} else {
  console.log('⚠️  No .env file found. Using default configuration.')
}

// Set default environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'development'
process.env.PORT = process.env.PORT || '5000'
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

console.log('🚀 Starting Enhanced Rider Tracking Server...')
console.log(`📊 Environment: ${process.env.NODE_ENV}`)
console.log(`🌐 Port: ${process.env.PORT}`)
console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

// Start the enhanced server
require('./enhanced-server.js')