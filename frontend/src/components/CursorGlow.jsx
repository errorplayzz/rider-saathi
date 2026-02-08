import React, { useEffect, useRef } from 'react'

/**
 * Interactive Sparkling Cursor Effect
 * Creates a small sparkling ball that follows the mouse
 * Clean effect without trails
 */
const CursorGlow = () => {
    const canvasRef = useRef(null)
    const cursorRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })
    const sparklesRef = useRef([])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d', { alpha: true })
        let animationId
        let width = window.innerWidth
        let height = window.innerHeight
        let time = 0

        const resize = () => {
            width = window.innerWidth
            height = window.innerHeight
            canvas.width = width
            canvas.height = height
        }

        resize()
        window.addEventListener('resize', resize)

        // Mouse movement tracking
        const handleMouseMove = (e) => {
            cursorRef.current.targetX = e.clientX
            cursorRef.current.targetY = e.clientY
        }
        window.addEventListener('mousemove', handleMouseMove, { passive: true })

        // Animation loop
        const animate = () => {
            time += 0.1
            
            // Smooth cursor following (easing effect)
            cursorRef.current.x += (cursorRef.current.targetX - cursorRef.current.x) * 0.2
            cursorRef.current.y += (cursorRef.current.targetY - cursorRef.current.y) * 0.2

            // Add current position to trail
            sparklesRef.current.push({
                x: cursorRef.current.x,
                y: cursorRef.current.y,
                life: 1.0,
                size: 8
            })

            // Remove old sparkles
            sparklesRef.current = sparklesRef.current.filter(s => s.life > 0)

            // Clear canvas completely - no stains
            ctx.clearRect(0, 0, width, height)

            const x = cursorRef.current.x
            const y = cursorRef.current.y

            // Draw trailing sparkles that fade out
            sparklesRef.current.forEach((sparkle) => {
                sparkle.life -= 0.04 // Fade out speed
                
                if (sparkle.life > 0) {
                    const alpha = sparkle.life
                    const size = sparkle.size * sparkle.life
                    
                    // Trail sparkle glow
                    const trailGradient = ctx.createRadialGradient(sparkle.x, sparkle.y, 0, sparkle.x, sparkle.y, size * 2)
                    trailGradient.addColorStop(0, `rgba(94, 234, 212, ${alpha * 0.6})`)
                    trailGradient.addColorStop(0.5, `rgba(56, 189, 248, ${alpha * 0.3})`)
                    trailGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
                    
                    ctx.fillStyle = trailGradient
                    ctx.beginPath()
                    ctx.arc(sparkle.x, sparkle.y, size * 2, 0, Math.PI * 2)
                    ctx.fill()

                    // Trail core
                    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`
                    ctx.beginPath()
                    ctx.arc(sparkle.x, sparkle.y, size * 0.4, 0, Math.PI * 2)
                    ctx.fill()
                }
            })

            // Draw sparkles around cursor
            for (let i = 0; i < 8; i++) {
                const angle = (time + i * Math.PI / 4) * 2
                const distance = 15 + Math.sin(time * 2 + i) * 5
                const sparkX = x + Math.cos(angle) * distance
                const sparkY = y + Math.sin(angle) * distance
                const sparkSize = 2 + Math.sin(time * 3 + i) * 1

                // Sparkle glow
                const sparkGradient = ctx.createRadialGradient(sparkX, sparkY, 0, sparkX, sparkY, sparkSize * 2)
                sparkGradient.addColorStop(0, 'rgba(94, 234, 212, 0.8)')
                sparkGradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.4)')
                sparkGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
                
                ctx.fillStyle = sparkGradient
                ctx.beginPath()
                ctx.arc(sparkX, sparkY, sparkSize * 2, 0, Math.PI * 2)
                ctx.fill()

                // Sparkle core
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
                ctx.beginPath()
                ctx.arc(sparkX, sparkY, sparkSize * 0.5, 0, Math.PI * 2)
                ctx.fill()
            }

            // Draw main cursor ball - smaller size
            const mainSize = 8
            
            // Outer glow
            const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, mainSize * 3)
            outerGlow.addColorStop(0, 'rgba(94, 234, 212, 0.6)')
            outerGlow.addColorStop(0.3, 'rgba(56, 189, 248, 0.4)')
            outerGlow.addColorStop(0.6, 'rgba(168, 85, 247, 0.2)')
            outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
            
            ctx.fillStyle = outerGlow
            ctx.beginPath()
            ctx.arc(x, y, mainSize * 3, 0, Math.PI * 2)
            ctx.fill()

            // Middle glow
            const middleGlow = ctx.createRadialGradient(x, y, 0, x, y, mainSize * 1.5)
            middleGlow.addColorStop(0, 'rgba(94, 234, 212, 0.9)')
            middleGlow.addColorStop(0.5, 'rgba(56, 189, 248, 0.6)')
            middleGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
            
            ctx.fillStyle = middleGlow
            ctx.beginPath()
            ctx.arc(x, y, mainSize * 1.5, 0, Math.PI * 2)
            ctx.fill()

            // Core ball with pulsing effect
            const pulse = Math.sin(time * 0.5) * 0.3 + 0.7
            ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`
            ctx.beginPath()
            ctx.arc(x, y, mainSize * 0.6, 0, Math.PI * 2)
            ctx.fill()

            // Inner glow for depth
            ctx.fillStyle = 'rgba(94, 234, 212, 0.8)'
            ctx.beginPath()
            ctx.arc(x, y, mainSize * 0.4, 0, Math.PI * 2)
            ctx.fill()

            animationId = requestAnimationFrame(animate)
        }

        // Check for touch device
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
        
        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        if (!isTouchDevice && !prefersReducedMotion) {
            animate()
        }

        return () => {
            window.removeEventListener('resize', resize)
            window.removeEventListener('mousemove', handleMouseMove)
            if (animationId) {
                cancelAnimationFrame(animationId)
            }
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{ 
                zIndex: 9999,
                mixBlendMode: 'screen',
                opacity: 0.8
            }}
        />
    )
}

export default CursorGlow
