import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import bgImage from '../assets/rider-saathi-bg-image.png'
import features from '../data/features'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'

const Home = () => {
  const [homepageStats, setHomepageStats] = useState(defaultStats)
  const [statsLoading, setStatsLoading] = useState(true)
  const { profile, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    
    const fetchStats = async () => {
      try {
        // If user is authenticated, use their profile stats
        if (isAuthenticated && profile) {
          setHomepageStats({
            totalRides: profile.total_rides || 0,
            totalDistance: profile.total_distance_meters || 0,
            rewardPoints: profile.reward_points || 0,
            helpCount: profile.help_count || 0
          })
        } else {
          // Show default stats for non-authenticated users
          setHomepageStats(defaultStats)
        }
      } catch (err) {
        console.error('Failed to load homepage stats:', err)
        setHomepageStats(defaultStats)
      } finally {
        if (mounted) setStatsLoading(false)
      }
    }

    fetchStats()
    return () => { mounted = false }
  }, [profile, isAuthenticated])

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center">
        {/* Background: video + 3D Canvas (video sits lowest, canvas above it) */}
        <div className="absolute inset-0 z-0">
          <img src={bgImage} alt="Rider Saathi background" className="bg-video" aria-hidden="true" />
        </div>

        {/* Hero Content */}
  <div className="relative z-20 text-center px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <h1 className="text-6xl md:text-8xl font-bold mb-6">
              <span className="bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
                Rider Saathi
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Your Ultimate Smart Ride Companion
            </p>
            
            <div className="flex justify-center items-center">
              <Link to="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 0 30px #00ffff' }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-neon text-lg px-8 py-4 mx-auto"
                >
                  Start Your Journey
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 border-2 border-neon-cyan rounded-full flex justify-center"
          >
            <div className="w-1 h-2 bg-neon-cyan rounded-full mt-2" />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 relative z-10 bg-dark-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-orbitron font-bold mb-6">
              <span className="bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
                Advanced Features
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Experience the future of motorcycle riding with our cutting-edge technology
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Link to={`/feature/${feature.slug}`} key={feature.title} className="block">
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  whileHover={{ scale: 1.03 }}
                  className="card-glow h-full"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl mb-2">{feature.icon}</div>
                    <div>
                      <h3 className="text-xl font-bold text-neon-cyan mb-1">{feature.title}</h3>
                      <p className="text-gray-300">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center justify-items-center">
            {(() => {
              const displayStats = [
                { value: statsLoading ? '...' : homepageStats.totalRides, label: 'Total Rides' },
                { value: statsLoading ? '...' : `${formatDistanceKm(homepageStats.totalDistance)} km`, label: 'Total KM' },
                { value: statsLoading ? '...' : homepageStats.rewardPoints, label: 'Reward Points' },
                { value: statsLoading ? '...' : homepageStats.helpCount, label: 'People Helped' }
              ]

              return displayStats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: index * 0.08 }}
                  className="space-y-2 flex flex-col items-center card-glow"
                >
                  <div className="text-4xl md:text-5xl font-orbitron font-bold text-neon-cyan">
                    {stat.value}
                  </div>
                  <div className="text-gray-300">{stat.label}</div>
                </motion.div>
              ))
            })()}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 relative z-10 bg-gradient-to-r from-dark-900 to-purple-900/20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-orbitron font-bold mb-6">
              Ready to Transform Your Ride?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of riders who trust Rider Saathi for their daily journeys
            </p>
            <Link to="/dashboard">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 40px #00ffff' }}
                whileTap={{ scale: 0.95 }}
                className="btn-neon text-xl px-10 py-5"
              >
                Get Started Now
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  )
}

// features are now imported from src/data/features

// Homepage stats default (will be populated from backend)
const defaultStats = {
  totalRides: 0,
  totalDistance: 0, // meters
  rewardPoints: 0,
  helpCount: 0
}

const formatDistanceKm = (meters) => {
  if (!meters) return '0'
  const km = Math.round(meters / 1000)
  return `${km}`
}

export default Home