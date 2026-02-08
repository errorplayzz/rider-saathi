import React from 'react'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

/**
 * Scroll Reveal Animation Wrapper
 * Provides smooth reveal animations when elements enter viewport
 */
const ScrollReveal = ({ 
  children, 
  direction = 'up',
  delay = 0,
  duration = 0.7,
  distance = 30,
  once = true,
  className = ''
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { 
    once,
    margin: '-50px'
  })

  const directionOffset = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
  }

  return (
    <motion.div
      ref={ref}
      initial={{ 
        opacity: 0,
        ...directionOffset[direction]
      }}
      animate={isInView ? {
        opacity: 1,
        x: 0,
        y: 0
      } : {}}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Stagger Children Animation
 * Animates multiple children with stagger effect
 */
const StaggerChildren = ({ 
  children, 
  staggerDelay = 0.1,
  once = true,
  className = ''
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { 
    once,
    margin: '-50px'
  })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
      className={className}
    >
      {React.Children.map(children, (child) => (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { 
              opacity: 1, 
              y: 0,
              transition: {
                duration: 0.6,
                ease: [0.25, 0.1, 0.25, 1]
              }
            }
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}

/**
 * Scale In Animation
 * Scales element from smaller to normal size
 */
const ScaleIn = ({ 
  children, 
  delay = 0,
  duration = 0.6,
  once = true,
  className = ''
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { 
    once,
    margin: '-50px'
  })

  return (
    <motion.div
      ref={ref}
      initial={{ 
        opacity: 0,
        scale: 0.9
      }}
      animate={isInView ? {
        opacity: 1,
        scale: 1
      } : {}}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Slide and Fade Animation
 * Combines slide with fade for smooth entrance
 */
const SlideAndFade = ({ 
  children, 
  from = 'bottom',
  delay = 0,
  duration = 0.8,
  distance = 40,
  once = true,
  className = ''
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { 
    once,
    margin: '-80px'
  })

  const offsets = {
    top: { y: -distance },
    bottom: { y: distance },
    left: { x: -distance },
    right: { x: distance }
  }

  return (
    <motion.div
      ref={ref}
      initial={{ 
        opacity: 0,
        ...offsets[from]
      }}
      animate={isInView ? {
        opacity: 1,
        x: 0,
        y: 0
      } : {}}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Rotate In Animation
 * Rotates element as it enters
 */
const RotateIn = ({ 
  children, 
  delay = 0,
  duration = 0.8,
  once = true,
  className = ''
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { 
    once,
    margin: '-50px'
  })

  return (
    <motion.div
      ref={ref}
      initial={{ 
        opacity: 0,
        rotateX: -20,
        scale: 0.95
      }}
      animate={isInView ? {
        opacity: 1,
        rotateX: 0,
        scale: 1
      } : {}}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      style={{ perspective: 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Text Reveal Animation
 * Reveals text word by word or letter by letter
 */
const TextReveal = ({ 
  text,
  delay = 0,
  staggerDelay = 0.03,
  once = true,
  className = ''
}) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { 
    once,
    margin: '-50px'
  })

  const words = text.split(' ')

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: delay
          }
        }
      }}
      className={className}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
          style={{ display: 'inline-block', marginRight: '0.25em' }}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  )
}

export { 
  ScrollReveal, 
  StaggerChildren, 
  ScaleIn, 
  SlideAndFade, 
  RotateIn,
  TextReveal 
}
export default ScrollReveal
