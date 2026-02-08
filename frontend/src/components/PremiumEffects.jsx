import React from 'react'
import { motion } from 'framer-motion'

/**
 * Holographic Card Effect
 * Applies a premium holographic/iridescent effect to any element
 * Works best on cards and interactive elements
 */
const HolographicCard = ({ 
  children, 
  className = '',
  intensity = 'medium' // 'low', 'medium', 'high'
}) => {
  const intensityMap = {
    low: { shine: 0.3, spectrum: 0.15 },
    medium: { shine: 0.5, spectrum: 0.25 },
    high: { shine: 0.7, spectrum: 0.35 }
  }

  const config = intensityMap[intensity]

  return (
    <motion.div
      className={`relative ${className}`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      {/* Holographic overlay */}
      <motion.div
        className="absolute inset-0 rounded-inherit pointer-events-none overflow-hidden"
        style={{
          background: `
            linear-gradient(
              115deg,
              transparent 0%,
              rgba(94, 234, 212, ${config.shine}) 30%,
              rgba(56, 189, 248, ${config.shine}) 50%,
              rgba(168, 85, 247, ${config.shine}) 70%,
              transparent 100%
            )
          `,
          backgroundSize: '200% 100%',
          opacity: 0,
          mixBlendMode: 'overlay',
        }}
        whileHover={{
          opacity: config.spectrum,
          backgroundPosition: ['0% 50%', '100% 50%']
        }}
        transition={{
          backgroundPosition: {
            duration: 1,
            ease: 'linear'
          },
          opacity: {
            duration: 0.3
          }
        }}
      />

      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 rounded-inherit pointer-events-none overflow-hidden"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
          backgroundSize: '200% 100%',
          opacity: 0,
        }}
        whileHover={{
          opacity: 0.5,
          backgroundPosition: ['200% 0', '-200% 0']
        }}
        transition={{
          duration: 1.5,
          ease: 'easeInOut'
        }}
      />

      {/* Spectrum border */}
      <motion.div
        className="absolute inset-0 rounded-inherit pointer-events-none"
        style={{
          background: 'linear-gradient(45deg, rgba(94, 234, 212, 0.2), rgba(168, 85, 247, 0.2), rgba(56, 189, 248, 0.2))',
          backgroundSize: '300% 300%',
          opacity: 0,
          padding: '1px',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
        whileHover={{
          opacity: 1,
          backgroundPosition: ['0% 50%', '100% 50%']
        }}
        transition={{
          duration: 2,
          ease: 'linear'
        }}
      />

      {children}
    </motion.div>
  )
}

/**
 * Neon Glow Effect
 * Adds a vibrant neon glow to text or elements
 */
const NeonGlow = ({ 
  children, 
  color = 'teal', // 'teal', 'blue', 'purple', 'red'
  className = '' 
}) => {
  const colorMap = {
    teal: 'rgba(94, 234, 212, 1)',
    blue: 'rgba(56, 189, 248, 1)',
    purple: 'rgba(168, 85, 247, 1)',
    red: 'rgba(239, 68, 68, 1)',
  }

  const glowColor = colorMap[color]

  return (
    <span
      className={`relative inline-block ${className}`}
      style={{
        textShadow: `
          0 0 7px ${glowColor},
          0 0 10px ${glowColor},
          0 0 21px ${glowColor},
          0 0 42px ${glowColor.replace('1)', '0.5)')},
          0 0 82px ${glowColor.replace('1)', '0.3)')}
        `,
      }}
    >
      {children}
    </span>
  )
}

/**
 * Glass Card Effect
 * Premium frosted glass morphism
 */
const GlassCard = ({ 
  children, 
  className = '',
  blur = 'medium', // 'low', 'medium', 'high'
  tint = 0.05 
}) => {
  const blurMap = {
    low: 'blur(8px)',
    medium: 'blur(12px)',
    high: 'blur(20px)'
  }

  return (
    <div
      className={`relative ${className}`}
      style={{
        background: `rgba(255, 255, 255, ${tint})`,
        backdropFilter: blurMap[blur],
        WebkitBackdropFilter: blurMap[blur],
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      }}
    >
      {children}
    </div>
  )
}

/**
 * Gradient Border Animation
 * Animated gradient border that rotates
 */
const GradientBorder = ({ 
  children, 
  className = '',
  colors = ['#5EEAD4', '#38BDF8', '#A855F7'],
  borderWidth = 2,
  speed = 3 
}) => {
  return (
    <div className={`relative ${className}`}>
      <motion.div
        className="absolute inset-0 rounded-inherit"
        style={{
          background: `conic-gradient(from 0deg, ${colors.join(', ')}, ${colors[0]})`,
          padding: `${borderWidth}px`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
        animate={{
          rotate: 360
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

/**
 * Spotlight Effect
 * Creates a moving spotlight that follows cursor
 */
const SpotlightEffect = ({ children, className = '' }) => {
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 })
  const ref = React.useRef(null)

  React.useEffect(() => {
    const handleMouseMove = (e) => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }

    const element = ref.current
    if (element) {
      element.addEventListener('mousemove', handleMouseMove)
      return () => element.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(94, 234, 212, 0.15) 0%, transparent 70%)',
          filter: 'blur(30px)',
          left: mousePosition.x - 150,
          top: mousePosition.y - 150,
        }}
        animate={{
          left: mousePosition.x - 150,
          top: mousePosition.y - 150,
        }}
        transition={{ type: 'spring', stiffness: 150, damping: 20 }}
      />
      {children}
    </div>
  )
}

export { 
  HolographicCard, 
  NeonGlow, 
  GlassCard, 
  GradientBorder,
  SpotlightEffect 
}
export default HolographicCard
