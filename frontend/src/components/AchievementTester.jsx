import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { trackAchievementActivity, updateAchievementProgress, getUserAchievements } from '../lib/supabaseHelpers'
import { motion } from 'framer-motion'

/**
 * Achievement Test Component
 * Use this to test achievement unlocking functionality
 * Can be added to Dashboard or Profile page during development
 */
const AchievementTester = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [recentUnlocks, setRecentUnlocks] = useState([])

  const showMessage = (msg, isSuccess = true) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  const testActivity = async (activityType, label) => {
    if (!user?.id) {
      showMessage('Please log in first', false)
      return
    }

    setLoading(true)
    try {
      await trackAchievementActivity(user.id, activityType)
      showMessage(`✓ Tracked: ${label}`)
      
      // Check for new unlocks
      const achievements = await getUserAchievements(user.id)
      const newlyCompleted = achievements.filter(a => 
        a.isCompleted && 
        new Date(a.completedAt) > new Date(Date.now() - 5000)
      )
      
      if (newlyCompleted.length > 0) {
        setRecentUnlocks(newlyCompleted)
        showMessage(`🎉 Unlocked ${newlyCompleted.length} achievement(s)!`)
      }
    } catch (error) {
      console.error('Test error:', error)
      showMessage(`✗ Error: ${error.message}`, false)
    } finally {
      setLoading(false)
    }
  }

  const activities = [
    { type: 'emergency_response', label: 'Emergency Response', icon: '🚨' },
    { type: 'help_rider', label: 'Help Rider', icon: '🤝' },
    { type: 'ride_complete', label: 'Complete Ride', icon: '🏍️' },
    { type: 'eco_riding', label: 'Eco Riding', icon: '🌱' },
    { type: 'group_ride_join', label: 'Join Group Ride', icon: '🦋' },
    { type: 'group_ride_lead', label: 'Lead Group Ride', icon: '👨‍✈️' },
    { type: 'chat_message', label: 'Send Message', icon: '💬' },
    { type: 'route_share', label: 'Share Route', icon: '🗺️' }
  ]

  const quickTests = [
    {
      label: 'Unlock First Responder',
      action: async () => {
        await testActivity('emergency_response', 'Emergency Response')
      }
    },
    {
      label: 'Unlock Rookie Rider',
      action: async () => {
        await testActivity('ride_complete', 'Complete Ride')
      }
    },
    {
      label: 'Complete 5 Rides',
      action: async () => {
        setLoading(true)
        try {
          for (let i = 0; i < 5; i++) {
            await trackAchievementActivity(user.id, 'ride_complete')
          }
          showMessage('✓ Completed 5 rides!')
        } catch (error) {
          showMessage(`✗ Error: ${error.message}`, false)
        } finally {
          setLoading(false)
        }
      }
    },
    {
      label: 'Add 50km Distance',
      action: async () => {
        setLoading(true)
        try {
          await updateAchievementProgress(user.id, 'kilometer_king', 50)
          await updateAchievementProgress(user.id, 'distance_master', 50)
          showMessage('✓ Added 50km distance!')
        } catch (error) {
          showMessage(`✗ Error: ${error.message}`, false)
        } finally {
          setLoading(false)
        }
      }
    }
  ]

  return (
    <div className="card-glow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">🧪 Achievement Tester</h3>
        <div className="text-xs text-gray-400">
          Development Tool - Remove in Production
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 p-3 rounded ${
            message.includes('✗') 
              ? 'bg-red-500/20 border border-red-500/50 text-red-300'
              : 'bg-green-500/20 border border-green-500/50 text-green-300'
          }`}
        >
          {message}
        </motion.div>
      )}

      {/* Recent Unlocks */}
      {recentUnlocks.length > 0 && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-4 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded"
        >
          <div className="text-yellow-400 font-bold mb-2">🎉 Recently Unlocked:</div>
          {recentUnlocks.map(achievement => (
            <div key={achievement.id} className="text-white text-sm flex items-center space-x-2">
              <span className="text-2xl">{achievement.icon}</span>
              <div>
                <div className="font-semibold">{achievement.title}</div>
                <div className="text-xs text-gray-300">+{achievement.rewardPoints} points</div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Quick Test Buttons */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Quick Tests:</h4>
        <div className="grid grid-cols-2 gap-2">
          {quickTests.map((test, idx) => (
            <button
              key={idx}
              onClick={test.action}
              disabled={loading}
              className="px-3 py-2 bg-neon-purple hover:bg-neon-purple/80 text-white rounded text-sm transition-colors disabled:opacity-50"
            >
              {test.label}
            </button>
          ))}
        </div>
      </div>

      {/* Individual Activity Buttons */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Track Activities:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {activities.map((activity) => (
            <button
              key={activity.type}
              onClick={() => testActivity(activity.type, activity.label)}
              disabled={loading}
              className="flex flex-col items-center justify-center p-3 bg-dark-600 hover:bg-dark-500 rounded transition-colors disabled:opacity-50"
            >
              <span className="text-2xl mb-1">{activity.icon}</span>
              <span className="text-xs text-gray-300 text-center">{activity.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
        <strong>💡 Tip:</strong> Click activities to track progress. Visit Profile → Achievements to see unlocked achievements.
      </div>
    </div>
  )
}

export default AchievementTester
