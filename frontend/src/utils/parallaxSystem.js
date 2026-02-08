/**
 * RIDER SAATHI - PARALLAX DEPTH SYSTEM
 * ═══════════════════════════════════════════════════════════════
 * 
 * Philosophy: "Motion communicates depth, not decoration."
 * 
 * This is a multi-layer scroll-driven parallax system designed for
 * a mission-critical platform. Parallax creates weight, authority,
 * and depth - never distraction or "wow for the sake of wow".
 * 
 * Core Principle:
 * Different layers move at different scroll speeds to create
 * subliminal depth perception without breaking readability.
 */

import { useScroll, useTransform } from 'framer-motion'
import { useRef, useMemo } from 'react'

// ═══════════════════════════════════════════════════════════════
// PARALLAX CONSTANTS - Layer Speed Definitions
// ═══════════════════════════════════════════════════════════════

export const PARALLAX_LAYERS = {
  // Layer 1: Foreground (content)
  // Speed: 1.0x (normal scroll) - NO parallax
  // Elements: Text, cards, buttons, all interactive content
  FOREGROUND: {
    speed: 1.0,
    name: 'Foreground',
    description: 'Content layer - no parallax, locked to scroll',
  },
  
  // Layer 2: Mid-layer (visual depth)
  // Speed: 0.85x (15% slower than scroll)
  // Elements: Section dividers, oversized typography, subtle visuals
  MID: {
    speed: 0.85,
    range: [-25, 25], // pixels of movement across viewport
    name: 'Mid Layer',
    description: 'Gentle depth - barely perceptible lag',
  },
  
  // Layer 3: Background (ambient depth)
  // Speed: 0.6x (40% slower than scroll)
  // Elements: Gradients, abstract shapes, atmospheric elements
  BACKGROUND: {
    speed: 0.6,
    range: [-60, 60], // pixels of movement across viewport
    name: 'Background Layer',
    description: 'Strong depth - creates atmospheric distance',
  },
}

// Viewport scroll offsets for parallax calculations
export const PARALLAX_VIEWPORT = {
  START: 'start end',    // Element enters bottom of viewport
  CENTER: 'center center', // Element at viewport center
  END: 'end start',      // Element exits top of viewport
}

// ═══════════════════════════════════════════════════════════════
// ACCESSIBILITY - Reduced Motion Support
// ═══════════════════════════════════════════════════════════════

const useReducedMotion = () => {
  return useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])
}

// ═══════════════════════════════════════════════════════════════
// CORE PARALLAX HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * useParallaxLayer
 * 
 * Creates parallax motion for a specific layer.
 * 
 * @param {string} layer - 'MID' or 'BACKGROUND'
 * @param {object} options - Configuration options
 * @returns {object} - { ref, y } for motion.div
 * 
 * Usage:
 * const { ref, y } = useParallaxLayer('BACKGROUND')
 * <motion.div ref={ref} style={{ y }}>{content}</motion.div>
 */
export const useParallaxLayer = (layer = 'MID', options = {}) => {
  const ref = useRef(null)
  const isReduced = useReducedMotion()
  
  const layerConfig = PARALLAX_LAYERS[layer]
  if (!layerConfig) {
    console.warn(`Invalid parallax layer: ${layer}. Use 'MID' or 'BACKGROUND'`)
    return { ref, y: 0 }
  }
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: options.offset || [PARALLAX_VIEWPORT.START, PARALLAX_VIEWPORT.END],
  })
  
  // Disable parallax if reduced motion is preferred
  if (isReduced) {
    return { ref, y: 0 }
  }
  
  // Calculate parallax range
  const range = options.range || layerConfig.range
  
  // Transform scroll progress to y-axis movement
  // Slower layers move less, creating depth illusion
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [range[0], range[1]]
  )
  
  return { ref, y }
}

/**
 * useBackgroundParallax
 * 
 * Convenience hook for background layer parallax.
 * Use for ambient visuals, gradients, abstract depth elements.
 * 
 * Speed: 0.6x scroll (40% slower)
 * Range: -60px to +60px
 */
export const useBackgroundParallax = (options = {}) => {
  return useParallaxLayer('BACKGROUND', options)
}

/**
 * useMidLayerParallax
 * 
 * Convenience hook for mid-layer parallax.
 * Use for section dividers, oversized typography, subtle visuals.
 * 
 * Speed: 0.85x scroll (15% slower)
 * Range: -25px to +25px
 */
export const useMidLayerParallax = (options = {}) => {
  return useParallaxLayer('MID', options)
}

/**
 * useHeroParallax
 * 
 * Specialized parallax for hero section.
 * Creates gentle depth without compromising readability.
 * 
 * Returns:
 * - bgY: Background layer parallax
 * - midY: Mid layer parallax (optional overlay elements)
 */
export const useHeroParallax = () => {
  const ref = useRef(null)
  const isReduced = useReducedMotion()
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  
  if (isReduced) {
    return { ref, bgY: 0, midY: 0 }
  }
  
  // Background moves slower (creates depth)
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 150])
  
  // Mid-layer moves moderately (optional overlay elements)
  const midY = useTransform(scrollYProgress, [0, 1], [0, 80])
  
  return { ref, bgY, midY }
}

/**
 * useBreathingParallax
 * 
 * For transition/breathing sections between dense content.
 * Strongest parallax allowed - helps reset user mentally.
 * 
 * Returns multiple layers for complex depth composition.
 */
export const useBreathingParallax = () => {
  const ref = useRef(null)
  const isReduced = useReducedMotion()
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [PARALLAX_VIEWPORT.START, PARALLAX_VIEWPORT.END],
  })
  
  if (isReduced) {
    return { ref, layer1: 0, layer2: 0, layer3: 0 }
  }
  
  // Three-layer depth for maximum breathing space
  const layer1 = useTransform(scrollYProgress, [0, 1], [-80, 80])  // Deepest
  const layer2 = useTransform(scrollYProgress, [0, 1], [-40, 40])  // Mid
  const layer3 = useTransform(scrollYProgress, [0, 1], [-15, 15])  // Subtle
  
  return { ref, layer1, layer2, layer3 }
}

/**
 * useStaticLayer
 * 
 * For trust/stats sections - NO parallax.
 * Returns ref for consistency but no motion values.
 */
export const useStaticLayer = () => {
  const ref = useRef(null)
  return { ref, y: 0 }
}

// ═══════════════════════════════════════════════════════════════
// SECTION-SPECIFIC PATTERNS
// ═══════════════════════════════════════════════════════════════

/**
 * PATTERN 1: HERO SECTION
 * 
 * Goal: Depth without compromising readability
 * Layers:
 * - Background image/gradient: Parallax enabled (slower)
 * - Foreground content: NO parallax (locked to scroll)
 * 
 * Example:
 * ```jsx
 * const { ref, bgY } = useHeroParallax()
 * 
 * <section ref={ref} className="relative h-screen">
 *   {/* Background - parallax */}
 *   <motion.div style={{ y: bgY }} className="absolute inset-0">
 *     <img src={bgImage} className="w-full h-full object-cover" />
 *   </motion.div>
 *   
 *   {/* Content - NO parallax */}
 *   <div className="relative z-10">
 *     <h1>Hero Title</h1>
 *     <p>Hero description</p>
 *   </div>
 * </section>
 * ```
 */

/**
 * PATTERN 2: INFORMATIONAL SECTIONS
 * (Features, Tech Stack, Advanced Features)
 * 
 * Goal: Minimal parallax - stability over depth
 * Layers:
 * - Background ambient elements: Subtle parallax (0.85x)
 * - Content: NO parallax
 * 
 * Example:
 * ```jsx
 * const { ref, y } = useMidLayerParallax()
 * 
 * <section className="relative py-24">
 *   {/* Background ambient - subtle parallax */}
 *   <motion.div 
 *     ref={ref}
 *     style={{ y }}
 *     className="absolute inset-0 -z-10"
 *   >
 *     <div className="h-full w-full bg-gradient-to-b from-slate-900 to-black opacity-50" />
 *   </motion.div>
 *   
 *   {/* Content - NO parallax */}
 *   <div className="relative">
 *     {features}
 *   </div>
 * </section>
 * ```
 */

/**
 * PATTERN 3: BREATHING SECTIONS
 * (Transition zones, visual breaks)
 * 
 * Goal: Maximum depth to reset user mentally
 * Layers:
 * - Three depth layers with varying speeds
 * - No foreground content (pure visual break)
 * 
 * Example:
 * ```jsx
 * const { ref, layer1, layer2, layer3 } = useBreathingParallax()
 * 
 * <section ref={ref} className="relative h-[60vh]">
 *   {/* Deepest layer */}
 *   <motion.div 
 *     style={{ y: layer1 }}
 *     className="absolute inset-0 opacity-30"
 *   >
 *     <div className="w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
 *   </motion.div>
 *   
 *   {/* Mid layer */}
 *   <motion.div 
 *     style={{ y: layer2 }}
 *     className="absolute inset-0 opacity-20"
 *   >
 *     <div className="w-64 h-64 bg-teal-500/20 rounded-full blur-2xl" />
 *   </motion.div>
 *   
 *   {/* Subtle layer */}
 *   <motion.div 
 *     style={{ y: layer3 }}
 *     className="absolute inset-0 opacity-10"
 *   >
 *     <div className="text-9xl font-bold text-white/5">DEPTH</div>
 *   </motion.div>
 * </section>
 * ```
 */

/**
 * PATTERN 4: IMPACT/VISION SECTION
 * 
 * Goal: Gentle parallax reinforcing long-term scale
 * Layers:
 * - Background: Gentle parallax (0.85x)
 * - Content: NO parallax
 * 
 * Example:
 * ```jsx
 * const { ref, y } = useMidLayerParallax()
 * 
 * <section className="relative py-24">
 *   <motion.div 
 *     ref={ref}
 *     style={{ y }}
 *     className="absolute inset-0 -z-10"
 *   >
 *     {/* Subtle background depth */}
 *   </motion.div>
 *   
 *   <div className="relative">
 *     {/* Impact content - static */}
 *   </div>
 * </section>
 * ```
 */

/**
 * PATTERN 5: TRUST/STATS SECTION
 * 
 * Goal: Near-static - stability over motion
 * Layers: NONE
 * 
 * Example:
 * ```jsx
 * const { ref } = useStaticLayer()
 * 
 * <section ref={ref}>
 *   {/* All content static - no parallax */}
 *   {stats}
 * </section>
 * ```
 */

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE OPTIMIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * GPU Acceleration:
 * - All transforms use translateY (GPU-accelerated)
 * - Avoid width, height, top, left (CPU layout recalc)
 * 
 * Single Scroll Source:
 * - Each section creates its own scroll observer
 * - Framer Motion optimizes internally
 * - No manual scroll event listeners
 * 
 * Mobile Safety:
 * - Parallax ranges are small (30-60px max)
 * - Reduced motion automatically disables all parallax
 * - No performance impact on low-end devices
 */

// ═══════════════════════════════════════════════════════════════
// QUALITY CHECKLIST
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Parallax is barely noticeable (if it's obvious, reduce range)
 * ✅ Page feels heavier and more authoritative
 * ✅ Content readability is never compromised
 * ✅ No layout shifts or jumps
 * ✅ 60fps maintained on scroll
 * ✅ Reduced motion disables all parallax
 * ✅ Mobile performance is smooth
 * ✅ Motion feels inevitable, not decorative
 */

export default {
  useParallaxLayer,
  useBackgroundParallax,
  useMidLayerParallax,
  useHeroParallax,
  useBreathingParallax,
  useStaticLayer,
  PARALLAX_LAYERS,
  PARALLAX_VIEWPORT,
}
