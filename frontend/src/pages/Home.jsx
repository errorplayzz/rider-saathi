import React, { useEffect, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import bgImage from '../assets/hero-background.png'
import features from '../data/features'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import AnimatedBackground from '../components/AnimatedBackground'
import TiltCard from '../components/TiltCard'
import MagneticButton from '../components/MagneticButton'
import TechStack from '../components/TechStack'
import VideoBackground from '../components/VideoBackground'
import { getLiveNetworkStats } from '../services/statsAPI'
import GradientMesh from '../components/GradientMesh'
import ParticleWaves from '../components/ParticleWaves'
import CursorGlow from '../components/CursorGlow'
import { FloatingOrbs, ScanLines, RadialPulse, Starfield } from '../components/AdvancedEffects'

// Video assets for background context
// Note: Videos should be placed in /public/videos/ folder
// If video files exist, they will be loaded. Otherwise, sections display without video.
const roadContextVideo = '/videos/road-context.mp4'
const networkImpactVideo = '/videos/network-impact.mp4'


const Home = () => {
  const [homepageStats, setHomepageStats] = useState(defaultStats)
  const [statsLoading, setStatsLoading] = useState(true)
  const [liveNetworkStats, setLiveNetworkStats] = useState({
    ridersOnline: 0,
    emergenciesHandled: 0,
    avgResponseTime: '0',
    helpersNearby: 0
  })
  const [networkStatsLoading, setNetworkStatsLoading] = useState(true)

  const { profile, isAuthenticated } = useAuth()
  const { isDark } = useTheme()
  const prefersReducedMotion = useReducedMotion()
  const [reduceEffects, setReduceEffects] = useState(false)

  // Advanced Parallax scroll effects
  const { scrollY, scrollYProgress } = useScroll()
  
  // Hero parallax - multi-layer
  const heroY = useTransform(scrollY, [0, 800], [0, 300])
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0])
  const heroScale = useTransform(scrollY, [0, 500], [1, 1.1])
  const heroRotate = useTransform(scrollY, [0, 500], [0, -2])
  
  // Background layers parallax - different speeds
  const bgLayerSlow = useTransform(scrollY, [0, 1000], [0, 150])
  const bgLayerMedium = useTransform(scrollY, [0, 1000], [0, 250])
  const bgLayerFast = useTransform(scrollY, [0, 1000], [0, 400])
  
  // Sections parallax
  const section1Y = useTransform(scrollY, [0, 800], [100, -100])
  const section2Y = useTransform(scrollY, [800, 1600], [100, -100])
  const section3Y = useTransform(scrollY, [1600, 2400], [100, -100])
  
  // Horizontal parallax for variety
  const horizontalLeft = useTransform(scrollY, [0, 2000], [0, -100])
  const horizontalRight = useTransform(scrollY, [0, 2000], [0, 100])
  
  // Scale effects
  const scaleUp = useTransform(scrollY, [0, 1000], [0.8, 1])
  const scaleDown = useTransform(scrollY, [1000, 2000], [1, 0.9])
  
  // Rotation effects
  const rotate = useTransform(scrollY, [0, 2000], [0, 360])
  const rotateReverse = useTransform(scrollY, [0, 2000], [0, -360])
  
  // Opacity fades
  const fadeIn = useTransform(scrollY, [200, 600], [0, 1])
  const fadeOut = useTransform(scrollY, [1800, 2200], [1, 0])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const connection = navigator?.connection || navigator?.mozConnection || navigator?.webkitConnection
    const lowPower = Boolean(
      prefersReducedMotion ||
      connection?.saveData ||
      (navigator?.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
      window.innerWidth < 768
    )
    setReduceEffects(lowPower)
  }, [prefersReducedMotion])

  // Fetch live network statistics
  useEffect(() => {
    let mounted = true

    const fetchLiveNetworkStats = async () => {
      try {
        const stats = await getLiveNetworkStats()
        if (mounted) {
          setLiveNetworkStats(stats)
          setNetworkStatsLoading(false)
        }
      } catch (err) {
        console.error('Failed to load live network stats:', err)
        if (mounted) setNetworkStatsLoading(false)
      }
    }

    fetchLiveNetworkStats()
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchLiveNetworkStats, 30000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const fetchStats = async () => {
      try {
        if (isAuthenticated && profile) {
          setHomepageStats({
            totalRides: profile.total_rides || 0,
            totalDistance: profile.total_distance_meters || 0,
            rewardPoints: profile.reward_points || 0,
            helpCount: profile.help_count || 0
          })
        } else {
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

  // Feature card glow colors
  const cardGlows = [
    'rgba(56, 189, 248, 0.2)',  // sky
    'rgba(239, 68, 68, 0.2)',   // red
    'rgba(168, 85, 247, 0.2)',  // purple
    'rgba(16, 185, 129, 0.2)'   // emerald
  ]

  return (
    <div className="min-h-screen relative overflow-hidden transition-colors duration-300 bg-ink text-alabaster">
      {/* Advanced Background Effects - Layered for depth */}
      <GradientMesh />
      {!reduceEffects && <Starfield />}
      {!reduceEffects && <FloatingOrbs count={8} />}
      {!reduceEffects && <ParticleWaves />}
      <AnimatedBackground className="z-0" />
      {!reduceEffects && <ScanLines />}
      {!reduceEffects && <RadialPulse />}
      {!reduceEffects && <CursorGlow />}

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Grid Background - parallax slow layer */}
        <motion.div 
          className="absolute inset-0 opacity-15 pointer-events-none z-0"
          style={{ y: reduceEffects ? 0 : bgLayerSlow }}
        >
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(94, 234, 212, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(94, 234, 212, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
              animation: 'gridMove 30s linear infinite'
            }}
          />
        </motion.div>

        {/* Radial Waves - parallax medium layer */}
        <motion.div 
          className="absolute inset-0 pointer-events-none opacity-20 z-0"
          style={{ y: reduceEffects ? 0 : bgLayerMedium, rotate: reduceEffects ? 0 : rotate }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-teal-400/20 animate-wave" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-sky-400/20 animate-wave" style={{ animationDelay: '1s' }} />
        </motion.div>
        
        {/* Parallax background layers */}
        <motion.div
          className="absolute inset-0 z-0"
          style={{ y: reduceEffects ? 0 : heroY }}
        >
          {/* Base background image with enhanced visibility */}
          <img
            src={bgImage}
            alt="Rider Saathi background"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: isDark ? 0.6 : 0.55,
              filter: isDark
                ? 'contrast(1.1) brightness(0.9) saturate(1.1)'
                : 'contrast(1.05) brightness(1.05) saturate(1.0)'
            }}
            aria-hidden="true"
          />

          {/* Theme-aware gradient overlay - lighter touch */}
          <div
            className="absolute inset-0"
            style={{
              background: isDark
                ? `linear-gradient(180deg, 
                    rgba(10,15,25,0.4) 0%, 
                    rgba(10,15,25,0.35) 40%, 
                    rgba(10,15,25,0.5) 70%,
                    rgba(10,15,25,0.95) 100%)`
                : `linear-gradient(180deg, 
                    rgba(248,250,252,0.35) 0%, 
                    rgba(248,250,252,0.3) 40%, 
                    rgba(248,250,252,0.45) 70%,
                    rgba(248,250,252,0.95) 100%)`
            }}
          />

          {/* Subtle ambient glow accents */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isDark
                ? 'radial-gradient(ellipse 60% 40% at 30% 30%, rgba(6,182,212,0.08) 0%, transparent 50%), radial-gradient(ellipse 50% 30% at 75% 60%, rgba(6,182,212,0.05) 0%, transparent 50%)'
                : 'radial-gradient(ellipse 60% 40% at 30% 30%, rgba(59,130,246,0.06) 0%, transparent 50%), radial-gradient(ellipse 50% 30% at 75% 60%, rgba(59,130,246,0.04) 0%, transparent 50%)'
            }}
          />

          {/* Soft vignette at edges */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isDark
                ? 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)'
                : 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.08) 100%)'
            }}
          />

          {/* Animated route lines SVG */}
          <div className="absolute inset-0 opacity-40">
            <svg className="w-full h-full" viewBox="0 0 1200 600" preserveAspectRatio="none" aria-hidden="true">
              <motion.path
                d="M0 420 C 260 340, 420 480, 680 420 S 1120 360, 1200 460"
                fill="none"
                stroke="rgba(148,163,184,0.25)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 3, ease: 'easeOut', delay: 0.5 }}
              />
              <motion.path
                d="M0 300 C 240 220, 520 360, 760 280 S 1080 220, 1200 320"
                fill="none"
                stroke="rgba(148,163,184,0.2)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 3, ease: 'easeOut', delay: 1 }}
              />
              <motion.circle
                cx="220" cy="360" r="18"
                fill="rgba(148,163,184,0.15)"
                animate={{ r: [16, 24, 16], opacity: [0.15, 0.3, 0.15] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.circle
                cx="860" cy="260" r="14"
                fill="rgba(94,234,212,0.15)"
                animate={{ r: [12, 20, 12], opacity: [0.15, 0.25, 0.15] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              />
            </svg>
          </div>
        </motion.div>

        {/* Hero Content with advanced parallax */}
        <motion.div
          className="relative z-20 text-center px-4 max-w-5xl mx-auto"
          style={{ 
            opacity: heroOpacity,
            scale: heroScale,
            rotateX: heroRotate
          }}
        >
          {/* Localized text backdrop for readability */}
          <div
            className="absolute inset-0 -inset-x-8 -inset-y-12 rounded-3xl"
            style={{
              background: isDark
                ? 'radial-gradient(ellipse at center, rgba(10,15,25,0.6) 0%, transparent 70%)'
                : 'radial-gradient(ellipse at center, rgba(248,250,252,0.7) 0%, transparent 70%)',
              backdropFilter: 'blur(2px)'
            }}
          />
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
          >
            <motion.p
              className="text-xs uppercase tracking-[0.3em] mb-4 dark:text-white/90 text-gray-700"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <span className="inline-block animate-pulse mr-2">◈</span>
              Mission Control
            </motion.p>

            <h1 className="text-4xl md:text-6xl font-semibold mb-6 leading-tight">
              <span className="text-gradient-animated">Rider Saathi</span>
            </h1>

            <p className="text-lg md:text-2xl mb-10 max-w-3xl mx-auto font-light leading-relaxed dark:text-gray-200 text-dusty">
              A safety-focused command center for riders — real-time GPS tracking, emergency response, live assistance, and proactive road intelligence.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-10">
              <Link to="/dashboard">
                <MagneticButton variant="primary" glowColor="rgba(94, 234, 212, 0.4)">
                  Start Tracking
                </MagneticButton>
              </Link>
              <Link to="/emergency">
                <MagneticButton variant="secondary" glowColor="rgba(239, 68, 68, 0.3)">
                  Emergency Response
                </MagneticButton>
              </Link>
            </div>
          </motion.div>
        </motion.div>

      </section>

      {/* Feature Highlights */}
      {/* Video Background 1: Road/POV Context - DO NOT move to Hero */}
      <section className="py-12 px-4 relative z-10 overflow-hidden">
        {/* Animated Grid Background - behind video */}
        <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(94, 234, 212, 0.15) 1px, transparent 1px),
                linear-gradient(90deg, rgba(94, 234, 212, 0.15) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
              animation: 'gridMove 20s linear infinite'
            }}
          />
        </div>
        
        {/* Subtle Animated Orbs - behind video */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[120px] animate-float-delayed" />
        </div>
        
        {!reduceEffects && (
          <VideoBackground 
            videoSrc={roadContextVideo}
            opacity={0.6}
            blur={0}
            overlayGradient="linear-gradient(to bottom, rgba(10,15,25,0.3) 0%, rgba(10,15,25,0.5) 100%)"
          />
        )}
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center mb-14"
            viewport={{ once: true, margin: '-100px' }}
          >
            <p className="text-xs uppercase tracking-[0.5em] text-dusty mb-4">
              <span className="inline-block animate-float">🛡️</span> Safety Intelligence
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-alabaster">
              Trusted Rider Safety Platform
            </h2>
            <p className="text-lg max-w-3xl mx-auto leading-relaxed text-dusty">
              Designed like a mission control system — calm, precise, and always ready.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Real-Time GPS Tracking',
                desc: 'Live routing, geo-fencing, and precision tracking at mission-control clarity.',
                accent: 'from-sky-500/30 to-sky-300/10',
                icon: '📍'
              },
              {
                title: 'Emergency Assistance',
                desc: 'Instant alerting, verified responders, and safety escalation workflows.',
                accent: 'from-red-500/30 to-orange-400/10',
                icon: '🚨'
              },
              {
                title: 'Live Rider Chat',
                desc: 'Secure channels for coordination with nearby riders and support teams.',
                accent: 'from-purple-500/30 to-fuchsia-400/10',
                icon: '💬'
              },
              {
                title: 'Weather & Road Alerts',
                desc: 'Proactive warnings for weather shifts, surface risks, and route hazards.',
                accent: 'from-emerald-500/30 to-emerald-300/10',
                icon: '⛈️'
              }
            ].map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true, margin: '-50px' }}
              >
                <TiltCard
                  className="h-full"
                  glowColor={cardGlows[index]}
                  intensity={12}
                >
                  <div className={`relative rounded-2xl p-6 bg-ink/50 backdrop-blur-xl ring-1 ring-white/10 h-full`}>
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.accent} opacity-40`} />
                    <div className="relative space-y-3">
                      <div className="h-12 w-12 rounded-xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center text-2xl animate-float">
                        {card.icon}
                      </div>
                      <h3 className="text-base font-semibold text-alabaster">{card.title}</h3>
                      <p className="text-sm text-dusty leading-relaxed">{card.desc}</p>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <TechStack />

      {/* Deep Feature Grid */}
      <section className="py-12 px-4 relative z-10 overflow-hidden">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(94, 234, 212, 0.08) 1px, transparent 1px),
                linear-gradient(90deg, rgba(94, 234, 212, 0.08) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
              animation: 'gridMove 25s linear infinite'
            }}
          />
        </div>

        {/* Floating Animated Orbs with parallax */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div 
            className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-[120px] animate-float"
            style={{ x: reduceEffects ? 0 : horizontalLeft, y: reduceEffects ? 0 : section2Y }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-sky-500/15 rounded-full blur-[120px] animate-float-delayed"
            style={{ x: reduceEffects ? 0 : horizontalRight, y: reduceEffects ? 0 : section2Y }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-teal-500/10 rounded-full blur-[100px] animate-pulse"
            style={{ scale: reduceEffects ? 1 : scaleUp }}
          />
        </div>

        {/* Radial Waves */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-purple-400/20 animate-wave" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-teal-400/20 animate-wave" style={{ animationDelay: '1.5s' }} />
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
            viewport={{ once: true }}
          >
            <p className="text-xs uppercase tracking-[0.5em] text-dusty mb-3">
              <span className="inline-block animate-float-delayed">⚙️</span> System Modules
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-alabaster">
              Advanced Features
            </h2>
            <p className="text-lg max-w-3xl mx-auto text-dusty">
              Everything you need for a safer, smarter ride.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Link to={`/feature/${feature.slug}`} key={feature.title} className="block">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <TiltCard
                    className="h-full"
                    glowColor="rgba(148, 163, 184, 0.15)"
                    intensity={8}
                  >
                    <div className="h-full p-6 rounded-2xl bg-ink/50 backdrop-blur-xl ring-1 ring-white/10">
                      <div className="flex items-start gap-4">
                        <div className="text-2xl mb-2 animate-float">{feature.icon}</div>
                        <div>
                          <h3 className="text-base font-semibold mb-2 text-alabaster">{feature.title}</h3>
                          <p className="text-sm text-dusty leading-relaxed">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  </TiltCard>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Impact and Benefits Section */}
      {/* Video Background 2: Abstract Network/Ecosystem Visualization */}
      <section className="py-12 px-4 relative z-10 overflow-hidden">
        {/* Animated Grid Background - behind video */}
        <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(168, 85, 247, 0.15) 1px, transparent 1px),
                linear-gradient(90deg, rgba(168, 85, 247, 0.15) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
              animation: 'gridMove 25s linear infinite reverse'
            }}
          />
        </div>
        
        {/* Subtle Animated Orbs - behind video */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] animate-float" />
          <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-float-delayed" />
        </div>
        
        {!reduceEffects && (
          <VideoBackground 
            videoSrc={networkImpactVideo}
            opacity={0.6}
            blur={0}
            overlayGradient="linear-gradient(to bottom, rgba(10,15,25,0.3) 0%, rgba(10,15,25,0.5) 100%)"
          />
        )}
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
            viewport={{ once: true, margin: '-100px' }}
          >
            <p className="text-xs uppercase tracking-[0.5em] text-dusty mb-4">
              IMPACT AND BENEFITS
            </p>
            <h2 className="text-3xl md:text-5xl font-semibold mb-6 text-alabaster leading-tight">
              Designed to Protect, Connect, and Empower Riders
            </h2>
            <p className="text-lg max-w-3xl mx-auto leading-relaxed text-dusty">
              Rider Saathi goes beyond navigation, it creates a safer, more connected riding ecosystem.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Impact Column */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true, margin: '-50px' }}
            >
              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-alabaster mb-6 tracking-tight">
                  Impact
                </h3>
              </div>
              <div className="space-y-6">
                {[
                  {
                    title: 'Enhanced Rider Safety',
                    desc: 'Proactive alerts and instant emergency responses help prevent accidents and save lives.',
                      icon: '🛡️'
                  },
                  {
                    title: 'Increased Convenience',
                    desc: 'A single platform reduces distractions and simplifies every aspect of riding.',
                      icon: '⚡'
                  },
                  {
                    title: 'Stronger Rider Community',
                    desc: 'Encourages collaboration, coordination, and mutual support among riders.',
                      icon: '🤝'
                  }
                ].map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                      className="group relative flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-white/5 via-white/0 to-transparent backdrop-blur-md ring-1 ring-white/10 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)] hover:-translate-y-1 hover:ring-white/20 transition-all duration-300"
                  >
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent opacity-0 group-hover:opacity-100 transition" />
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-xl">
                          {item.icon}
                        </div>
                      </div>
                    <div>
                      <h4 className="text-base font-semibold text-alabaster mb-2">
                        {item.title}
                      </h4>
                      <p className="text-sm text-white/80 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Benefits Column */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true, margin: '-50px' }}
            >
              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-alabaster mb-6 tracking-tight">
                  Benefits
                </h3>
              </div>
              <div className="space-y-6">
                {[
                  {
                    title: 'Social Impact',
                    desc: 'Builds a safety-first culture where riders actively look out for one another.',
                      icon: '🌍'
                  },
                  {
                    title: 'Economic Opportunity',
                    desc: 'Unlocks a growing ecosystem for rider-focused tools, services, and innovation.',
                      icon: '📈'
                  },
                  {
                    title: 'Broader Mobility Impact',
                    desc: 'Promotes organized, responsible, and community-driven riding practices.',
                      icon: '🚦'
                  }
                ].map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                      className="group relative flex gap-4 p-6 rounded-2xl bg-gradient-to-br from-white/5 via-white/0 to-transparent backdrop-blur-md ring-1 ring-white/10 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)] hover:-translate-y-1 hover:ring-white/20 transition-all duration-300"
                  >
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent opacity-0 group-hover:opacity-100 transition" />
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-xl">
                          {item.icon}
                        </div>
                      </div>
                    <div>
                      <h4 className="text-base font-semibold text-alabaster mb-2">
                        {item.title}
                      </h4>
                      <p className="text-sm text-white/80 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust / Live Stats Section */}
      <section className="py-12 px-4 relative z-10 overflow-hidden">
        {/* Animated Grid Background with parallax */}
        <motion.div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{ y: reduceEffects ? 0 : bgLayerSlow, rotate: reduceEffects ? 0 : rotateReverse }}
        >
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(56, 189, 248, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(56, 189, 248, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
              animation: 'gridMove 30s linear infinite reverse'
            }}
          />
        </motion.div>

        {/* Animated background glows with parallax */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div 
            className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-teal-500/15 rounded-full blur-[120px] animate-float"
            style={{ x: reduceEffects ? 0 : horizontalLeft, scale: reduceEffects ? 1 : scaleUp }}
          />
          <motion.div 
            className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-sky-500/15 rounded-full blur-[100px] animate-float-delayed"
            style={{ x: reduceEffects ? 0 : horizontalRight, scale: reduceEffects ? 1 : scaleDown }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[80px] animate-pulse"
            style={{ y: reduceEffects ? 0 : section3Y }}
          />
        </div>

        {/* Scan Lines */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div 
            className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent"
            style={{ animation: 'scanLine 7s ease-in-out infinite' }}
          />
        </div>
        
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
            viewport={{ once: true }}
          >
            <p className="text-xs uppercase tracking-[0.5em] text-dusty mb-3">
              <span className="inline-block animate-breathe">📡</span> Live Network
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-alabaster">Operational Trust Signals</h2>
            <p className="text-lg text-dusty">Always-on visibility into the Rider Saathi safety grid.</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { 
                value: networkStatsLoading ? '...' : liveNetworkStats.ridersOnline.toLocaleString(), 
                label: 'Riders online', 
                delay: 0 
              },
              { 
                value: networkStatsLoading ? '...' : liveNetworkStats.emergenciesHandled.toLocaleString(), 
                label: 'Emergencies handled', 
                delay: 0.1 
              },
              { 
                value: networkStatsLoading ? '...' : `${liveNetworkStats.avgResponseTime} min`, 
                label: 'Avg response time', 
                delay: 0.2 
              },
              { 
                value: networkStatsLoading ? '...' : liveNetworkStats.helpersNearby.toLocaleString(), 
                label: 'Helpers nearby', 
                delay: 0.3 
              }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: stat.delay }}
                viewport={{ once: true }}
              >
                <TiltCard glowColor="rgba(94, 234, 212, 0.1)" intensity={6}>
                  <div className="p-6 rounded-2xl bg-ink/50 backdrop-blur-xl ring-1 ring-white/10">
                    <motion.div
                      className="text-2xl md:text-3xl font-semibold text-alabaster mb-1"
                      animate={{ opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 3, repeat: Infinity, delay: index * 0.5 }}
                    >
                      {stat.value}
                    </motion.div>
                    <div className="text-xs uppercase tracking-[0.2em] text-dusty">{stat.label}</div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

// Homepage stats default
const defaultStats = {
  totalRides: 0,
  totalDistance: 0,
  rewardPoints: 0,
  helpCount: 0
}

export default Home
