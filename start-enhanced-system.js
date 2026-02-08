#!/usr/bin/env node

/**
 * Enhanced Rider Tracking System - Development Launcher
 * Starts both frontend and backend development servers
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

console.log('🚀 Launching Enhanced Rider Tracking System...')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

// Check if we're in the right directory
const currentDir = process.cwd()
const expectedPaths = [
  path.join(currentDir, 'frontend'),
  path.join(currentDir, 'backend'),
  path.join(currentDir, 'ENHANCED_SETUP_GUIDE.md')
]

const missingPaths = expectedPaths.filter(p => !fs.existsSync(p))
if (missingPaths.length > 0) {
  console.error('❌ Not in the correct project directory!')
  console.error('   Expected to find: frontend/, backend/, and ENHANCED_SETUP_GUIDE.md')
  console.error('   Please navigate to your project root directory first.')
  process.exit(1)
}

// Platform-specific commands
const isWindows = process.platform === 'win32'
const npmCmd = isWindows ? 'npm.cmd' : 'npm'

const processes = []

// Function to start a process with proper error handling
const startProcess = (name, command, args, cwd, color) => {
  console.log(`\n🔧 Starting ${name}...`)
  console.log(`   📁 Directory: ${cwd}`)
  console.log(`   🚀 Command: ${command} ${args.join(' ')}`)

  const proc = spawn(command, args, {
    cwd: cwd,
    stdio: 'inherit',
    shell: isWindows
  })

  proc.on('error', (error) => {
    console.error(`\n❌ Failed to start ${name}:`, error.message)
    if (error.code === 'ENOENT') {
      console.error(`   💡 Make sure Node.js and npm are properly installed`)
      console.error(`   💡 Try running: cd ${path.basename(cwd)} && npm install`)
    }
  })

  proc.on('close', (code) => {
    if (code !== 0) {
      console.error(`\n⚠️  ${name} exited with code ${code}`)
    } else {
      console.log(`\n✅ ${name} stopped gracefully`)
    }
  })

  processes.push({ name, proc })
  return proc
}

// Start backend server
const backendDir = path.join(currentDir, 'backend')
const backendProc = startProcess(
  'Enhanced Backend Server',
  npmCmd,
  ['run', 'dev'],
  backendDir,
  '\x1b[36m' // Cyan
)

// Wait a moment for backend to initialize
setTimeout(() => {
  // Start frontend server
  const frontendDir = path.join(currentDir, 'frontend')
  const frontendProc = startProcess(
    'Frontend Development Server', 
    npmCmd,
    ['run', 'dev'],
    frontendDir,
    '\x1b[32m' // Green
  )
}, 3000)

// Show startup information
setTimeout(() => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🌟 Enhanced Rider Tracking System is starting up!')
  console.log('\n📡 Services:')
  console.log('   • Backend API: http://localhost:5000')
  console.log('   • Frontend App: http://localhost:3000')
  console.log('   • Enhanced Map: http://localhost:3000/map')
  console.log('\n🔍 Health Check:')
  console.log('   • Backend: http://localhost:5000/api/health')
  console.log('   • System Stats: http://localhost:5000/api/stats')
  console.log('\n✨ Features Available:')
  console.log('   🚴‍♂️ Real-time rider tracking')
  console.log('   🚨 Emergency alert system')
  console.log('   🗺️ Navigation with OSRM routing')
  console.log('   🔍 Location search with Nominatim')
  console.log('   📍 POI discovery with Overpass API')
  console.log('   📡 Socket.io real-time communication')
  console.log('\n🎮 Usage:')
  console.log('   1. Open http://localhost:3000/map')
  console.log('   2. Allow location permissions')
  console.log('   3. Start tracking and testing features!')
  console.log('\n⌨️  Press Ctrl+C to stop all servers')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}, 5000)

// Graceful shutdown handling
const shutdown = (signal) => {
  console.log(`\n\n📴 Received ${signal}. Shutting down gracefully...`)
  
  processes.forEach(({ name, proc }) => {
    if (!proc.killed) {
      console.log(`   🛑 Stopping ${name}...`)
      proc.kill('SIGTERM')
    }
  })

  // Force exit after 5 seconds if processes don't stop
  setTimeout(() => {
    console.log('\n⏰ Force stopping remaining processes...')
    processes.forEach(({ proc }) => {
      if (!proc.killed) {
        proc.kill('SIGKILL')
      }
    })
    process.exit(0)
  }, 5000)
}

// Handle process termination signals
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught Exception:', error)
  shutdown('EXCEPTION')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ Unhandled Rejection at:', promise, 'reason:', reason)
  shutdown('REJECTION')
})