import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'

// Theme-aware color system
const getThemeColors = (isDark) => ({
  // Primary frame color
  frame: isDark ? '#4fd1c5' : '#2d6a6a',
  frameGlow: isDark ? 'rgba(79,209,197,0.4)' : 'rgba(45,106,106,0.2)',

  // Secondary/accent colors
  accent: isDark ? '#38b2ac' : '#3182ce',
  accentLight: isDark ? 'rgba(56,178,172,0.6)' : 'rgba(49,130,206,0.5)',

  // Highlight colors
  highlight: isDark ? '#ffffff' : '#1a202c',
  highlightFaint: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(26,32,44,0.3)',

  // Alert (tail light)
  alert: '#ef4444',

  // Background
  background: isDark
    ? 'linear-gradient(180deg, #0a0f1a 0%, #0d1424 50%, #06090f 100%)'
    : 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)',

  // Particles
  particleColor: isDark ? '#4fd1c5' : '#3182ce',
  particleShadow: isDark ? '0 0 8px rgba(79,209,197,0.6)' : '0 0 6px rgba(49,130,206,0.4)',

  // Text
  textGradient: isDark
    ? 'linear-gradient(135deg, #ffffff 0%, #a0aec0 50%, #4fd1c5 100%)'
    : 'linear-gradient(135deg, #1a202c 0%, #4a5568 50%, #2d6a6a 100%)',
  textShadow: isDark ? '0 0 60px rgba(79,209,197,0.4)' : '0 0 40px rgba(45,106,106,0.2)',

  // Road line
  roadLine: isDark
    ? 'linear-gradient(90deg, transparent 5%, rgba(79,209,197,0.4) 50%, transparent 95%)'
    : 'linear-gradient(90deg, transparent 5%, rgba(49,130,206,0.3) 50%, transparent 95%)',

  // Vignette
  vignette: isDark
    ? 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)'
    : 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.1) 100%)'
})

// Premium Engineered Bike Component
const EngineereBike = ({ wheelRotation = 0, isDark, idle = false }) => {
  const colors = getThemeColors(isDark)

  return (
    <svg
      viewBox="0 0 400 200"
      className="w-full h-auto"
      style={{
        filter: isDark ? `drop-shadow(0 0 20px ${colors.frameGlow})` : 'none'
      }}
    >
      <defs>
        {/* Frame gradient */}
        <linearGradient id="frameGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.frame} stopOpacity="1" />
          <stop offset="50%" stopColor={colors.accent} stopOpacity="0.9" />
          <stop offset="100%" stopColor={colors.frame} stopOpacity="1" />
        </linearGradient>

        {/* Wheel gradient for depth */}
        <linearGradient id="wheelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.frame} stopOpacity="0.8" />
          <stop offset="100%" stopColor={colors.accent} stopOpacity="0.6" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="engineGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={isDark ? "2" : "1"} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Soft glow for headlight */}
        <filter id="headlightGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#engineGlow)">
        {/* === REAR WHEEL (slightly smaller for perspective) === */}
        <g transform={`rotate(${wheelRotation}, 80, 130)`}>
          {/* Outer tire ring */}
          <circle cx="80" cy="130" r="38" fill="none" stroke={colors.frame} strokeWidth="3" opacity="0.9" />
          {/* Mid ring */}
          <circle cx="80" cy="130" r="32" fill="none" stroke={colors.accentLight} strokeWidth="1.5" />
          {/* Inner hub ring */}
          <circle cx="80" cy="130" r="24" fill="none" stroke={colors.frame} strokeWidth="1" opacity="0.7" />
          {/* Rotation indicators (dashed) */}
          <circle cx="80" cy="130" r="28" fill="none" stroke={colors.highlightFaint} strokeWidth="0.5" strokeDasharray="8 12" />
          {/* Hub center */}
          <circle cx="80" cy="130" r="6" fill={colors.frame} opacity="0.9" />
          <circle cx="80" cy="130" r="3" fill={colors.highlight} opacity="0.6" />
          {/* Spokes (8) */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <line
              key={i}
              x1={80 + 8 * Math.cos(angle * Math.PI / 180)}
              y1={130 + 8 * Math.sin(angle * Math.PI / 180)}
              x2={80 + 30 * Math.cos(angle * Math.PI / 180)}
              y2={130 + 30 * Math.sin(angle * Math.PI / 180)}
              stroke={colors.frame}
              strokeWidth="0.75"
              opacity="0.5"
            />
          ))}
        </g>

        {/* === FRONT WHEEL (slightly larger for perspective) === */}
        <g transform={`rotate(${wheelRotation * 1.1}, 310, 125)`}>
          {/* Outer tire ring */}
          <circle cx="310" cy="125" r="42" fill="none" stroke={colors.frame} strokeWidth="3.5" opacity="0.95" />
          {/* Mid ring */}
          <circle cx="310" cy="125" r="35" fill="none" stroke={colors.accentLight} strokeWidth="1.5" />
          {/* Inner hub ring */}
          <circle cx="310" cy="125" r="26" fill="none" stroke={colors.frame} strokeWidth="1" opacity="0.7" />
          {/* Rotation indicators (dashed) */}
          <circle cx="310" cy="125" r="30" fill="none" stroke={colors.highlightFaint} strokeWidth="0.5" strokeDasharray="10 14" />
          {/* Hub center */}
          <circle cx="310" cy="125" r="7" fill={colors.frame} opacity="0.9" />
          <circle cx="310" cy="125" r="3.5" fill={colors.highlight} opacity="0.6" />
          {/* Spokes (8) */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <line
              key={i}
              x1={310 + 9 * Math.cos(angle * Math.PI / 180)}
              y1={125 + 9 * Math.sin(angle * Math.PI / 180)}
              x2={310 + 32 * Math.cos(angle * Math.PI / 180)}
              y2={125 + 32 * Math.sin(angle * Math.PI / 180)}
              stroke={colors.frame}
              strokeWidth="0.75"
              opacity="0.5"
            />
          ))}
        </g>

        {/* === MAIN CHASSIS (thick primary lines) === */}
        {/* Lower frame beam */}
        <path
          d="M80 130 L130 95 L200 85 L260 82"
          fill="none"
          stroke="url(#frameGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Upper frame beam */}
        <path
          d="M130 95 L175 65 L240 60 L270 70"
          fill="none"
          stroke="url(#frameGradient)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Frame cross-brace */}
        <line x1="175" y1="65" x2="200" y2="85" stroke={colors.frame} strokeWidth="2" opacity="0.8" />

        {/* === REAR SWINGARM === */}
        <path
          d="M130 95 L80 130"
          fill="none"
          stroke={colors.frame}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Rear suspension */}
        <line x1="100" y1="100" x2="95" y2="115" stroke={colors.accent} strokeWidth="1.5" opacity="0.7" />

        {/* === FRONT FORK === */}
        <path
          d="M270 70 L285 85 L310 125"
          fill="none"
          stroke="url(#frameGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Secondary fork line */}
        <line x1="275" y1="78" x2="305" y2="120" stroke={colors.frame} strokeWidth="1.5" opacity="0.6" />

        {/* Front suspension detail */}
        <line x1="295" y1="100" x2="295" y2="115" stroke={colors.highlight} strokeWidth="1" opacity="0.4" />

        {/* === FUEL TANK === */}
        <ellipse cx="195" cy="68" rx="35" ry="14" fill="none" stroke={colors.frame} strokeWidth="2" opacity="0.8" />
        <ellipse cx="195" cy="66" rx="25" ry="8" fill="none" stroke={colors.highlightFaint} strokeWidth="0.75" />

        {/* === SEAT === */}
        <path
          d="M170 70 Q185 55 215 58 Q245 62 250 72"
          fill="none"
          stroke={colors.frame}
          strokeWidth="2"
          opacity="0.75"
          strokeLinecap="round"
        />

        {/* === ENGINE BLOCK (abstract) === */}
        <path
          d="M140 88 L175 85 L180 105 L165 108 L145 105 Z"
          fill="none"
          stroke={colors.accent}
          strokeWidth="1.5"
          opacity="0.6"
        />
        {/* Engine detail lines */}
        <line x1="150" y1="90" x2="150" y2="102" stroke={colors.frame} strokeWidth="0.75" opacity="0.4" />
        <line x1="160" y1="88" x2="160" y2="104" stroke={colors.frame} strokeWidth="0.75" opacity="0.4" />
        <line x1="170" y1="87" x2="170" y2="105" stroke={colors.frame} strokeWidth="0.75" opacity="0.4" />

        {/* === EXHAUST === */}
        <path
          d="M55 115 C70 112, 85 108, 125 100"
          fill="none"
          stroke={colors.accent}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.65"
        />
        <ellipse cx="50" cy="116" rx="8" ry="5" fill="none" stroke={colors.frame} strokeWidth="1.5" opacity="0.7" />

        {/* === HANDLEBARS === */}
        <path
          d="M265 62 L250 50 M265 62 L275 48"
          fill="none"
          stroke={colors.frame}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Grip details */}
        <circle cx="248" cy="48" r="3" fill="none" stroke={colors.highlightFaint} strokeWidth="1" />
        <circle cx="277" cy="46" r="3" fill="none" stroke={colors.highlightFaint} strokeWidth="1" />

        {/* === HEADLIGHT === */}
        <g filter="url(#headlightGlow)">
          <ellipse cx="295" cy="75" rx="10" ry="8" fill={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.3)'} />
          <ellipse cx="295" cy="75" rx="6" ry="5" fill={colors.frame} opacity="0.9" />
          <ellipse cx="295" cy="74" rx="3" ry="2.5" fill={colors.highlight} opacity="0.7" />
        </g>

        {/* === TAIL LIGHT (alert indicator) === */}
        <circle cx="55" cy="95" r="4" fill={colors.alert} opacity="0.7" filter="url(#engineGlow)" />
        <circle cx="55" cy="95" r="2" fill="#ff6b6b" opacity="0.9" />

        {/* === CONNECTION NODES (engineering points) === */}
        {[
          [80, 130], [130, 95], [175, 65], [200, 85], [240, 60],
          [270, 70], [310, 125], [195, 68]
        ].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="3" fill={colors.frame} opacity="0.9" />
            <circle cx={x} cy={y} r="1.5" fill={colors.highlight} opacity="0.5" />
          </g>
        ))}

        {/* === WINDSCREEN === */}
        <path
          d="M265 58 Q280 40 295 50"
          fill="none"
          stroke={colors.highlightFaint}
          strokeWidth="1.5"
          opacity="0.5"
        />
      </g>
    </svg>
  )
}

// Generate stroke particles
const createStrokeParticles = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 500,
    y: (Math.random() - 0.5) * 250,
    length: 10 + Math.random() * 30,
    angle: Math.random() * 360,
    delay: Math.random() * 0.8,
    duration: 0.6 + Math.random() * 0.4
  }))
}

const CinematicBrandIntro = ({ onComplete }) => {
  const { isDark } = useTheme()
  const [phase, setPhase] = useState(0)
  const [wheelRotation, setWheelRotation] = useState(0)
  const particles = useMemo(() => createStrokeParticles(60), [])

  const colors = useMemo(() => getThemeColors(isDark), [isDark])

  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  // Wheel rotation animation
  useEffect(() => {
    if ((phase === 1 || phase === 0) && !prefersReducedMotion) {
      const interval = setInterval(() => {
        setWheelRotation(prev => prev + (phase === 1 ? 10 : 2))
      }, 30)
      return () => clearInterval(interval)
    }
  }, [phase, prefersReducedMotion])

  useEffect(() => {
    if (prefersReducedMotion) {
      setTimeout(() => onComplete?.(), 300) // Even quicker for reduced motion
      return
    }

    const sequence = async () => {
      await wait(100) // Quick start
      setPhase(1)
      await wait(1200) // Reduced timing
      setPhase(2) 
      await wait(800)  // Faster transitions
      setPhase(3)
      await wait(800)  // Quick final phase
      setPhase(4)
      await wait(500)  // Minimal end delay
      onComplete?.()
    }

    sequence()
  }, [onComplete, prefersReducedMotion])

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  return (
    <motion.div
      className="fixed inset-0 z-[9999] overflow-hidden select-none"
      style={{ background: colors.background, cursor: 'none' }}
      initial={{ opacity: 1 }}
      animate={phase === 4 ? { opacity: 0, scale: 1.15 } : { opacity: 1 }}
      transition={{ duration: 1, ease: 'easeInOut' }}
    >
      {/* Ambient particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: colors.particleColor,
              opacity: 0.3
            }}
            animate={{ opacity: [0.1, 0.4, 0.1], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
          />
        ))}
      </div>

      {/* Ground/Road line */}
      <motion.div
        className="absolute top-[68%] left-0 right-0 h-[1px]"
        style={{ background: colors.roadLine }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: phase >= 1 ? 1 : 0, opacity: phase >= 1 && phase < 4 ? 1 : 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {/* Motion streaks */}
      {phase === 1 && (
        <div className="absolute top-[66%] left-0 right-0">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-[1px]"
              style={{
                width: 30 + Math.random() * 50,
                left: `${5 + i * 12}%`,
                background: `linear-gradient(90deg, transparent, ${colors.particleColor}40, transparent)`
              }}
              animate={{ x: [-20, 40], opacity: [0, 0.5, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </div>
      )}

      {/* Light trail behind bike */}
      <AnimatePresence>
        {phase === 1 && (
          <motion.div
            className="absolute top-[50%] h-[2px]"
            style={{
              background: `linear-gradient(90deg, transparent, ${colors.particleColor}30, ${colors.particleColor}60)`,
              filter: `blur(2px)`
            }}
            initial={{ left: '-30%', width: 150, opacity: 0 }}
            animate={{ left: '15%', width: 200, opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* BIKE ANIMATION */}
      <AnimatePresence>
        {phase >= 1 && phase <= 2 && (
          <motion.div
            className="absolute top-1/2 w-[450px] md:w-[550px] lg:w-[650px]"
            initial={{ left: '-45%', y: '-50%', opacity: 0 }}
            animate={phase === 1 ? {
              left: '50%',
              x: '-50%',
              y: ['-50%', '-51%', '-50%', '-49%', '-50%'],
              opacity: 1
            } : {
              left: '50%',
              x: '-50%',
              y: '-50%',
              opacity: 0,
              scale: 0.9,
              filter: 'blur(15px)'
            }}
            exit={{ opacity: 0 }}
            transition={phase === 1 ? {
              left: { duration: 2.2, ease: [0.25, 0.1, 0.25, 1] },
              y: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 0.5 }
            } : { duration: 1.2 }}
          >
            <EngineereBike wheelRotation={wheelRotation} isDark={isDark} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* DISSOLUTION PARTICLES */}
      <AnimatePresence>
        {phase === 2 && (
          <div className="absolute inset-0 flex items-center justify-center">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute"
                style={{
                  width: p.length,
                  height: 1,
                  backgroundColor: colors.particleColor,
                  transform: `rotate(${p.angle}deg)`,
                  boxShadow: colors.particleShadow
                }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                animate={{ x: p.x * 0.4, y: p.y * 0.4, opacity: 0.8, scale: 1 }}
                exit={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* BRAND TEXT */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, scale: phase === 4 ? 1.2 : 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <motion.h1
              className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-wider uppercase"
              style={{
                color: 'transparent',
                backgroundImage: colors.textGradient,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                textShadow: colors.textShadow
              }}
              initial={{ scale: 0.8, opacity: 0, filter: 'blur(20px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            >
              Rider Saathi
            </motion.h1>

            {/* Pulse glow */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ delay: 0.5, duration: 1 }}
            >
              <div
                className="w-[600px] h-[200px] rounded-full"
                style={{ background: `radial-gradient(ellipse, ${colors.frameGlow} 0%, transparent 70%)` }}
              />
            </motion.div>

            {/* Underline */}
            <motion.div
              className="mt-6 h-[2px] rounded-full"
              style={{ background: `linear-gradient(90deg, transparent, ${colors.frame}99, transparent)` }}
              initial={{ width: 0 }}
              animate={{ width: 200 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: colors.vignette }} />
    </motion.div>
  )
}

export default CinematicBrandIntro
