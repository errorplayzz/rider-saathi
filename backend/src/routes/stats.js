import express from 'express'
import User from '../models/User.js'
import EmergencyAlert from '../models/EmergencyAlert.js'
import Ride from '../models/Ride.js'

const router = express.Router()

// @route   GET /api/stats/live-network
// @desc    Get live network operational statistics
// @access  Public (for home page visibility)
router.get('/live-network', async (req, res) => {
  try {
    // Define "active" users as those seen in the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    
    // Riders Online: Count users who are online or have been seen recently
    const ridersOnline = await User.countDocuments({
      $or: [
        { isOnline: true },
        { lastSeen: { $gte: thirtyMinutesAgo } }
      ]
    })

    // Emergencies Handled: Count all resolved emergency alerts
    const emergenciesHandled = await EmergencyAlert.countDocuments({
      status: 'resolved'
    })

    // Calculate average response time
    const respondedAlerts = await EmergencyAlert.find({
      status: { $in: ['responded', 'resolved'] },
      'responders.0': { $exists: true }
    }).select('createdAt responders').lean()

    let totalResponseTime = 0
    let responseCount = 0

    respondedAlerts.forEach(alert => {
      if (alert.responders && alert.responders.length > 0) {
        const firstResponder = alert.responders[0]
        if (firstResponder.respondedAt) {
          const responseTime = new Date(firstResponder.respondedAt) - new Date(alert.createdAt)
          totalResponseTime += responseTime
          responseCount++
        }
      }
    })

    // Average response time in minutes
    const avgResponseTimeMs = responseCount > 0 ? totalResponseTime / responseCount : 0
    const avgResponseTimeMinutes = avgResponseTimeMs / (1000 * 60)

    // Helpers Nearby: Count users who are online and available (not actively in emergency)
    const helpersNearby = await User.countDocuments({
      isOnline: true,
      isActive: true,
      'preferences.emergencyAlerts': true
    })

    // Active Rides: Count ongoing rides
    const activeRides = await Ride.countDocuments({
      status: 'active',
      endTime: null
    })

    // Total Active Emergencies
    const activeEmergencies = await EmergencyAlert.countDocuments({
      status: 'active'
    })

    res.json({
      success: true,
      statistics: {
        ridersOnline,
        emergenciesHandled,
        avgResponseTime: avgResponseTimeMinutes.toFixed(1),
        helpersNearby,
        activeRides,
        activeEmergencies
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Live network stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch live network statistics',
      error: error.message
    })
  }
})

// @route   GET /api/stats/dashboard
// @desc    Get detailed dashboard statistics
// @access  Private (requires auth)
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    // User's personal stats
    const user = await User.findById(userId).select('stats')

    // System-wide stats
    const totalUsers = await User.countDocuments({ isActive: true })
    const totalRides = await Ride.countDocuments()
    const totalEmergencies = await EmergencyAlert.countDocuments()

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recentRides = await Ride.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    })
    const recentEmergencies = await EmergencyAlert.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    })

    res.json({
      success: true,
      personal: {
        totalRides: user?.stats?.totalRides || 0,
        totalDistance: user?.stats?.totalDistance || 0,
        helpCount: user?.stats?.helpCount || 0,
        rewardPoints: user?.stats?.rewardPoints || 0
      },
      system: {
        totalUsers,
        totalRides,
        totalEmergencies,
        recentRides,
        recentEmergencies
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    })
  }
})

export default router
