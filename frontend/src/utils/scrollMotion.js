/**
 * RIDER SAATHI - SCROLL MOTION SYSTEM
 * ═══════════════════════════════════════════════════════════════
 * 
 * Philosophy: "Nothing moves without reason."
 * 
 * This is a scroll-driven motion language for a mission-critical
 * safety platform. All motion serves information hierarchy,
 * readability, and user confidence - never decoration.
 * 
 * Core Principles:
 * 1. Motion is scroll-reactive only (no time loops)
 * 2. Speed is slow, calm, predictable
 * 3. Transforms are subtle and purposeful
 * 4. Sections respond as ONE continuous system
 * 5. Accessibility is non-negotiable
 */

import { useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

// ═══════════════════════════════════════════════════════════════
// MOTION CONSTANTS - Single Source of Truth
// ═══════════════════════════════════════════════════════════════

export const MOTION_CONFIG = {
  // Micro motion for informational content
  MICRO_RISE: 8, // pixels - barely perceptible entry
  MICRO_FADE: [0, 1], // opacity range
  
  // Breathing motion for transitional sections
  BREATHING_DEPTH: 0.02, // 2% parallax - subliminal
  BREATHING_SCALE: [0.98, 1], // subtle scale for depth
  
  // Hero de-emphasis motion
  HERO_EXIT_Y: -80, // upward drift as user scrolls away
  HERO_EXIT_OPACITY: [1, 0.3], // fade but don't disappear completely
  HERO_EXIT_SCALE: [1, 0.96], // slight scale down
  
  // Section entry motion
  SECTION_ENTER_Y: [30, 0], // gentle rise into view
  SECTION_ENTER_OPACITY: [0, 1], // fade in
  
  // Easing - only linear or easeOut allowed
  EASE: 'easeOut',
  
  // Viewport offsets for scroll triggers
  VIEWPORT_START: 'start end', // section enters bottom of viewport
  VIEWPORT_CENTER: 'center center', // section at viewport center
  VIEWPORT_EXIT: 'end start', // section exits top of viewport
}

// ═══════════════════════════════════════════════════════════════
// ACCESSIBILITY - Reduced Motion Support
// ═══════════════════════════════════════════════════════════════

export const useReducedMotion = () => {
  const prefersReducedMotion = 
    typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  
  return prefersReducedMotion
}

// ═══════════════════════════════════════════════════════════════
// MOTION PRIMITIVES - Reusable Scroll Hooks
// ═══════════════════════════════════════════════════════════════

/**
 * useHeroExit
 * 
 * De-emphasizes hero content as user scrolls down.
 * Purpose: Shift attention from hero to content below.
 * 
 * Returns: { y, opacity, scale } motion values
 */
export const useHeroExit = () => {
  const ref = useRef(null)
  const isReduced = useReducedMotion()
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [MOTION_CONFIG.VIEWPORT_START, MOTION_CONFIG.VIEWPORT_EXIT]
  })
  
  if (isReduced) {
    return { ref, y: 0, opacity: 1, scale: 1 }
  }
  
  return {
    ref,
    y: useTransform(scrollYProgress, [0, 1], [0, MOTION_CONFIG.HERO_EXIT_Y]),
    opacity: useTransform(scrollYProgress, [0, 0.5], MOTION_CONFIG.HERO_EXIT_OPACITY),
    scale: useTransform(scrollYProgress, [0, 1], MOTION_CONFIG.HERO_EXIT_SCALE),
  }
}

/**
 * useSectionEnter
 * 
 * Micro-motion for informational sections entering viewport.
 * Purpose: Confirm content hierarchy without distraction.
 * 
 * Returns: { y, opacity } motion values
 */
export const useSectionEnter = () => {
  const ref = useRef(null)
  const isReduced = useReducedMotion()
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [MOTION_CONFIG.VIEWPORT_START, 'start center']
  })
  
  if (isReduced) {
    return { ref, y: 0, opacity: 1 }
  }
  
  return {
    ref,
    y: useTransform(scrollYProgress, [0, 1], MOTION_CONFIG.SECTION_ENTER_Y),
    opacity: useTransform(scrollYProgress, [0, 1], MOTION_CONFIG.SECTION_ENTER_OPACITY),
  }
}

/**
 * useParallaxDepth
 * 
 * Subtle parallax for breathing sections (backgrounds only).
 * Purpose: Reduce cognitive fatigue with depth illusion.
 * 
 * Speed multiplier: 0.5 = half scroll speed (background lags)
 * 
 * Returns: { y } motion value
 */
export const useParallaxDepth = (speedMultiplier = 0.5) => {
  const ref = useRef(null)
  const isReduced = useReducedMotion()
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [MOTION_CONFIG.VIEWPORT_START, MOTION_CONFIG.VIEWPORT_EXIT]
  })
  
  if (isReduced) {
    return { ref, y: 0 }
  }
  
  // Move slower than scroll (creates depth)
  const range = 100 * (1 - speedMultiplier)
  
  return {
    ref,
    y: useTransform(scrollYProgress, [0, 1], [0, -range]),
  }
}

/**
 * useStaticAnchor
 * 
 * For trust/stats sections - minimal to zero motion.
 * Purpose: Convey reliability and precision.
 * 
 * Returns: Static values (motion disabled)
 */
export const useStaticAnchor = () => {
  const ref = useRef(null)
  
  return {
    ref,
    y: 0,
    opacity: 1,
    scale: 1,
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION MOTION PATTERNS - Implementation Guide
// ═══════════════════════════════════════════════════════════════

/**
 * PATTERN 1: HERO SECTION
 * 
 * Goal: De-emphasize as user scrolls down
 * Motion: Fade + scale down + drift up
 * 
 * Usage:
 * ```jsx
 * const { ref, y, opacity, scale } = useHeroExit()
 * 
 * <motion.section ref={ref} style={{ y, opacity, scale }}>
 *   {content}
 * </motion.section>
 * ```
 */

/**
 * PATTERN 2: INFORMATIONAL SECTIONS
 * (Features, Tech Stack, Advanced Features)
 * 
 * Goal: Confirm hierarchy without distraction
 * Motion: Micro fade-in + 8px rise
 * 
 * Usage:
 * ```jsx
 * const { ref, y, opacity } = useSectionEnter()
 * 
 * <motion.section 
 *   ref={ref} 
 *   style={{ y, opacity }}
 *   transition={{ duration: 0.6, ease: 'easeOut' }}
 * >
 *   {content}
 * </motion.section>
 * ```
 */

/**
 * PATTERN 3: BREATHING SECTIONS
 * (Transition zones, visual breaks)
 * 
 * Goal: Reduce cognitive fatigue with depth
 * Motion: Background parallax only
 * 
 * Usage:
 * ```jsx
 * const { ref, y: bgY } = useParallaxDepth(0.5)
 * 
 * <section ref={ref}>
 *   <motion.div style={{ y: bgY }} className="absolute inset-0">
 *     {background}
 *   </motion.div>
 *   <div className="relative z-10">
 *     {foreground content - NO motion}
 *   </div>
 * </section>
 * ```
 */

/**
 * PATTERN 4: TRUST/STATS SECTIONS
 * 
 * Goal: Convey reliability and precision
 * Motion: Almost none (anchored feeling)
 * 
 * Usage:
 * ```jsx
 * const { ref } = useStaticAnchor()
 * 
 * <section ref={ref}>
 *   {stats - static, no motion}
 * </section>
 * ```
 */

/**
 * PATTERN 5: IMPACT/VISION SECTIONS
 * 
 * Goal: Support meaning, not visuals
 * Motion: Gentle opacity + vertical translation
 * 
 * Usage:
 * ```jsx
 * const { ref, y, opacity } = useSectionEnter()
 * 
 * <motion.section 
 *   ref={ref} 
 *   style={{ y, opacity }}
 *   transition={{ duration: 0.8, ease: 'easeOut' }}
 * >
 *   {vision content}
 * </motion.section>
 * ```
 */

// ═══════════════════════════════════════════════════════════════
// IMPLEMENTATION CHECKLIST
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Step 1: Import motion utilities
 * import { useHeroExit, useSectionEnter, useParallaxDepth } from './utils/scrollMotion'
 * 
 * ✅ Step 2: Apply to Hero
 * const { ref, y, opacity, scale } = useHeroExit()
 * Wrap hero section with motion.section
 * 
 * ✅ Step 3: Apply to informational sections
 * const { ref, y, opacity } = useSectionEnter()
 * Wrap each section that needs entry motion
 * 
 * ✅ Step 4: Apply parallax to backgrounds only
 * const { ref, y: bgY } = useParallaxDepth(0.5)
 * Apply to background layer, NOT content
 * 
 * ✅ Step 5: Leave stats/trust sections static
 * const { ref } = useStaticAnchor()
 * No motion values needed
 * 
 * ✅ Step 6: Test reduced motion
 * Enable "Reduce motion" in OS settings
 * Verify all motion is disabled
 */

export default {
  useHeroExit,
  useSectionEnter,
  useParallaxDepth,
  useStaticAnchor,
  useReducedMotion,
  MOTION_CONFIG,
}
