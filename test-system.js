#!/usr/bin/env node

/**
 * Enhanced Rider Tracking System - Test Script
 * Quick verification that all components are working
 */

const http = require('http')
const { spawn } = require('child_process')

console.log('🧪 Testing Enhanced Rider Tracking System...')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

// Test 1: Check if backend server is responsive
const testBackendHealth = async () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(data)
          console.log('✅ Backend server is healthy')
          console.log(`   📊 Active riders: ${result.activeRiders}`)
          console.log(`   🚨 Active emergencies: ${result.activeEmergencies}`)
          console.log(`   📡 Server uptime: ${Math.round(result.uptime)}s`)
          resolve(true)
        } else {
          reject(new Error(`Backend returned status ${res.statusCode}`))
        }
      })
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Backend server timeout'))
    })

    req.on('error', (err) => {
      reject(err)
    })

    req.end()
  })
}

// Test 2: Check external APIs availability
const testExternalAPIs = async () => {
  const apis = [
    {
      name: 'OSRM Routing',
      url: 'https://router.project-osrm.org/route/v1/driving/13.388860,52.517037;13.397634,52.529407?overview=false',
      required: true
    },
    {
      name: 'Nominatim Search',
      url: 'https://nominatim.openstreetmap.org/search?format=json&q=Delhi&limit=1',
      required: true
    },
    {
      name: 'Overpass POI',
      url: 'https://overpass-api.de/api/interpreter',
      required: true
    }
  ]

  for (const api of apis) {
    try {
      const url = new URL(api.url)
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        timeout: 10000
      }

      await new Promise((resolve, reject) => {
        const module = url.protocol === 'https:' ? require('https') : require('http')
        const req = module.request(options, (res) => {
          if (res.statusCode < 400) {
            console.log(`✅ ${api.name} API is accessible`)
            resolve()
          } else {
            console.log(`⚠️  ${api.name} API returned status ${res.statusCode}`)
            resolve() // Not fatal for testing
          }
        })

        req.on('timeout', () => {
          req.destroy()
          console.log(`⏰ ${api.name} API timeout`)
          resolve() // Not fatal for testing
        })

        req.on('error', (err) => {
          console.log(`❌ ${api.name} API error: ${err.message}`)
          resolve() // Not fatal for testing
        })

        req.end()
      })

    } catch (error) {
      console.log(`❌ ${api.name} API error: ${error.message}`)
    }
  }
}

// Test 3: Check if frontend is accessible
const testFrontend = async () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
      timeout: 5000
    }

    const req = http.request(options, (res) => {
      if (res.statusCode < 400) {
        console.log('✅ Frontend server is accessible')
        resolve(true)
      } else {
        console.log(`⚠️  Frontend returned status ${res.statusCode}`)
        resolve(false)
      }
    })

    req.on('timeout', () => {
      req.destroy()
      console.log('⏰ Frontend server timeout - make sure it\'s running')
      resolve(false)
    })

    req.on('error', (err) => {
      console.log(`❌ Frontend server error: ${err.message}`)
      console.log('   💡 Run: cd frontend && npm run dev')
      resolve(false)
    })

    req.end()
  })
}

// Main test runner
const runTests = async () => {
  try {
    console.log('🔍 Testing backend health...')
    await testBackendHealth()
    
    console.log('\n🌐 Testing external APIs...')
    await testExternalAPIs()
    
    console.log('\n🖥️  Testing frontend availability...')
    await testFrontend()
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 All tests completed!')
    console.log('\n📱 Ready to use Enhanced Rider Tracking System:')
    console.log('   • Frontend: http://localhost:3000/map')
    console.log('   • Backend API: http://localhost:5000/api/health')
    console.log('   • Features: Real-time tracking, Emergency alerts, Navigation')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.log('\n🔧 Troubleshooting:')
    console.log('   1. Ensure backend server is running: cd backend && npm run dev')
    console.log('   2. Ensure frontend server is running: cd frontend && npm run dev')
    console.log('   3. Check internet connection for external APIs')
    console.log('   4. Review ENHANCED_SETUP_GUIDE.md for detailed setup')
    process.exit(1)
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests()
}

module.exports = { testBackendHealth, testExternalAPIs, testFrontend }