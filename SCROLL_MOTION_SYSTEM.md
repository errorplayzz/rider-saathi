# Rider Saathi - Scroll Motion System
**A logic-driven, mission-critical scroll experience**

---

## Philosophy

> "Nothing moves without reason."

This is **not** a collection of animations.  
This is a **scroll motion system** designed for a safety-critical platform where every motion serves information hierarchy, readability, and user confidence.

---

## Core Principles

1. **Scroll-Reactive Only** - No time-based loops or auto-playing effects
2. **Calm & Predictable** - Motion speed is slow, never playful
3. **Continuous System** - Sections respond together, not individually
4. **Information First** - Motion confirms hierarchy, never competes
5. **Accessible** - Respects `prefers-reduced-motion`

---

## Global Motion Language

### Allowed Transforms
- ✅ `translateY` - Vertical movement
- ✅ `opacity` - Fade in/out
- ✅ `scale` - Subtle depth (0.98 → 1.0 max)

### Forbidden Transforms
- ❌ `rotate` - No rotation
- ❌ `skew` - No distortion
- ❌ Elastic/bounce easing
- ❌ Looping animations

### Easing Rules
- Use `linear` or `easeOut` only
- Never playful (`bounce`, `spring`, etc.)
- Motion should feel like "content entering awareness, not performing"

---

## Section Types & Motion Rules

### 1. Hero Section
**Purpose:** De-emphasize as user scrolls down  
**Motion:**
- Fade: 1.0 → 0.3 opacity
- Scale: 1.0 → 0.96
- Drift: 0 → -80px upward

**Why:** Shifts attention from hero to content below without hard cut.

**Pattern:**
```jsx
const { ref, y, opacity, scale } = useHeroExit()

<motion.section ref={ref} style={{ y, opacity, scale }}>
  {hero content}
</motion.section>
```

---

### 2. Informational Sections
**Examples:** Features, Tech Stack, Advanced Features  
**Purpose:** Confirm hierarchy without distraction  
**Motion:**
- Rise: 30px → 0px (micro movement)
- Fade: 0 → 1 opacity
- Duration: 0.6s, easeOut

**Why:** Gentle entry confirms content structure without drawing attention.

**Pattern:**
```jsx
const { ref, y, opacity } = useSectionEnter()

<motion.section 
  ref={ref} 
  style={{ y, opacity }}
  transition={{ duration: 0.6, ease: 'easeOut' }}
>
  {informational content}
</motion.section>
```

---

### 3. Breathing Sections
**Examples:** Transition zones, visual breaks  
**Purpose:** Reduce cognitive fatigue with depth illusion  
**Motion:**
- Background parallax only (50% scroll speed)
- Foreground content: NO motion
- Creates subtle depth without distraction

**Why:** Background moving slower than scroll creates subliminal depth cue, giving users mental breathing room.

**Pattern:**
```jsx
const { ref, y: bgY } = useParallaxDepth(0.5)

<section ref={ref} className="relative">
  {/* Background layer - parallax */}
  <motion.div 
    style={{ y: bgY }} 
    className="absolute inset-0 pointer-events-none"
  >
    {background elements}
  </motion.div>
  
  {/* Foreground - static */}
  <div className="relative z-10">
    {content}
  </div>
</section>
```

---

### 4. Trust/Stats Sections
**Examples:** Live Network Stats, Operational Signals  
**Purpose:** Convey reliability and precision  
**Motion:** Almost none (anchored feeling)

**Why:** Numbers and trust signals must feel stable and dependable. Motion here would undermine credibility.

**Pattern:**
```jsx
const { ref } = useStaticAnchor()

<section ref={ref}>
  {stats - static, no motion}
</section>
```

---

### 5. Impact/Vision Sections
**Examples:** Impact & Benefits, Mission statements  
**Purpose:** Support meaning, not visuals  
**Motion:**
- Gentle rise: 30px → 0px
- Fade: 0 → 1 opacity
- Duration: 0.8s (slightly slower than informational)

**Why:** Vision content deserves thoughtful pacing. Slightly slower motion adds weight to strategic messaging.

**Pattern:**
```jsx
const { ref, y, opacity } = useSectionEnter()

<motion.section 
  ref={ref} 
  style={{ y, opacity }}
  transition={{ duration: 0.8, ease: 'easeOut' }}
>
  {vision content}
</motion.section>
```

---

## Implementation Guide

### Step 1: Install Dependencies
Already installed: `framer-motion`

### Step 2: Create Motion Utility
File: `/src/utils/scrollMotion.js` ✅ (created)

### Step 3: Apply to Sections

#### Hero Section
```jsx
import { useHeroExit } from '../utils/scrollMotion'

const Home = () => {
  const { ref: heroRef, y, opacity, scale } = useHeroExit()
  
  return (
    <motion.section 
      ref={heroRef}
      style={{ y, opacity, scale }}
      className="relative h-screen"
    >
      {/* existing hero content */}
    </motion.section>
  )
}
```

#### Feature Sections (Apply to multiple)
```jsx
import { useSectionEnter } from '../utils/scrollMotion'

// Inside Home component
const { ref: featuresRef, y: featuresY, opacity: featuresOpacity } = useSectionEnter()
const { ref: techStackRef, y: techStackY, opacity: techStackOpacity } = useSectionEnter()

return (
  <>
    <motion.section 
      ref={featuresRef}
      style={{ y: featuresY, opacity: featuresOpacity }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Features content */}
    </motion.section>
    
    {/* TechStack gets its own wrapper */}
    <motion.div
      ref={techStackRef}
      style={{ y: techStackY, opacity: techStackOpacity }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <TechStack />
    </motion.div>
  </>
)
```

#### Parallax Background Example
```jsx
import { useParallaxDepth } from '../utils/scrollMotion'

const SomeSection = () => {
  const { ref, y: bgY } = useParallaxDepth(0.5)
  
  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* Parallax background */}
      <motion.div 
        style={{ y: bgY }}
        className="absolute inset-0 -z-10"
      >
        <div className="h-full w-full bg-gradient-to-b from-slate-900 to-black" />
      </motion.div>
      
      {/* Static content */}
      <div className="relative z-10">
        {content}
      </div>
    </section>
  )
}
```

---

## Performance Optimization

### GPU Acceleration
All transforms automatically use GPU (`transform`, `opacity`).  
Avoid: `width`, `height`, `top`, `left` - these trigger layout recalculations.

### Mobile Considerations
- Parallax is very subtle (2% depth) - safe for mobile
- Reduced motion is automatically respected
- No heavy animations on scroll (all CSS transforms)

### Accessibility
All utilities check `prefers-reduced-motion`:
```js
const prefersReducedMotion = 
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (prefersReducedMotion) {
  return { ref, y: 0, opacity: 1, scale: 1 }
}
```

When enabled, all motion is disabled - content appears instantly.

---

## Testing Checklist

✅ **Visual Testing**
- [ ] Hero fades and drifts smoothly on scroll down
- [ ] Sections enter with micro-rise (barely noticeable)
- [ ] Parallax backgrounds lag subtly behind content
- [ ] Stats sections feel anchored (no motion)
- [ ] No jarring transitions or jumps

✅ **Accessibility Testing**
- [ ] Enable "Reduce motion" in OS settings
- [ ] Verify all animations are disabled
- [ ] Content appears instantly
- [ ] No layout shift

✅ **Performance Testing**
- [ ] Open Chrome DevTools > Performance
- [ ] Record scroll interaction
- [ ] Check for 60fps maintenance
- [ ] No layout thrashing
- [ ] No excessive repaints

✅ **Mobile Testing**
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Verify smooth scroll performance
- [ ] Check touch interaction doesn't interfere

---

## Motion Philosophy Summary

| Principle | Implementation |
|-----------|---------------|
| **Purposeful** | Every motion serves information hierarchy |
| **Subtle** | Users should feel calm, not impressed |
| **Continuous** | Sections respond as one system |
| **Accessible** | Respects reduced motion preferences |
| **Performant** | GPU-accelerated, 60fps target |
| **Predictable** | No surprises, no gimmicks |

---

## The Result Should Feel:

✅ **Calm** - Motion is slow and measured  
✅ **Precise** - Everything moves with intent  
✅ **Confident** - No nervous energy  
✅ **Mission-Critical** - Like a control system  
❌ **NOT** - Flashy, playful, marketing-y, template-ish

---

## Quick Reference

```js
// Hero exit
const { ref, y, opacity, scale } = useHeroExit()

// Section enter
const { ref, y, opacity } = useSectionEnter()

// Parallax background
const { ref, y } = useParallaxDepth(0.5)

// Static (no motion)
const { ref } = useStaticAnchor()
```

---

**System ready for implementation.**  
**Start with Hero, then cascade through sections.**  
**Test reduced motion early and often.**
