import React, { useEffect, useRef, useState } from 'react'

/**
 * VideoBackground Component
 * 
 * Renders a subtle, looping background video with:
 * - Lazy loading via IntersectionObserver
 * - Accessibility support (respects prefers-reduced-motion)
 * - Performance optimization (only plays when visible)
 * - Dark overlay for text readability
 * 
 * @param {string} videoSrc - Path to video file
 * @param {number} opacity - Video opacity (0-1)
 * @param {number} blur - Blur amount in pixels
 * @param {string} overlayGradient - CSS gradient for overlay
 */
const VideoBackground = ({ 
  videoSrc, 
  opacity = 0.15, 
  blur = 2,
  overlayGradient = 'linear-gradient(to bottom, rgba(10,15,25,0.7) 0%, rgba(10,15,25,0.85) 100%)'
}) => {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const [shouldPlay, setShouldPlay] = useState(true) // Start true for immediate playback
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [videoError, setVideoError] = useState(false)

  // Check for prefers-reduced-motion accessibility setting
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Lazy load and play video only when section enters viewport
  useEffect(() => {
    if (prefersReducedMotion || !videoSrc || videoError) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldPlay(true)
          }
        })
      },
      { threshold: 0.01, rootMargin: '100px' }
    )

    const currentContainer = containerRef.current
    if (currentContainer) {
      observer.observe(currentContainer)
    }

    return () => {
      if (currentContainer) {
        observer.unobserve(currentContainer)
      }
    }
  }, [prefersReducedMotion, videoSrc, videoError])

  // Auto-play video when it becomes ready
  useEffect(() => {
    if (shouldPlay && videoRef.current) {
      videoRef.current.play().catch(() => {
        setVideoError(true)
      })
    }
  }, [shouldPlay])

  // Don't render video if user prefers reduced motion or no video source
  if (prefersReducedMotion || !videoSrc || videoError) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0" 
          style={{ background: overlayGradient }}
        />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Video Layer */}
      {shouldPlay && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity,
            filter: `blur(${blur}px)`,
          }}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setVideoError(true)}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {/* Dark overlay for text readability */}
      <div 
        className="absolute inset-0" 
        style={{ background: overlayGradient }}
      />
    </div>
  )
}

export default VideoBackground
