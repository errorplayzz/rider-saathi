import React, { useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'

// Enhanced Animated floating particles with GPS-style connecting lines
const AnimatedBackground = ({ className = '' }) => {
    const canvasRef = useRef(null)
    const animationFrameRef = useRef(null)
    const particlesRef = useRef([])
    const mouseRef = useRef({ x: 0, y: 0 })

    // Generate particles once - increased count for more density
    const particleCount = 70

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        let width = window.innerWidth
        let height = window.innerHeight

        const resize = () => {
            width = window.innerWidth
            height = window.innerHeight
            canvas.width = width
            canvas.height = height
        }

        resize()
        window.addEventListener('resize', resize)

        // Mouse tracking for interactive effect
        const handleMouseMove = (e) => {
            mouseRef.current.x = e.clientX
            mouseRef.current.y = e.clientY
        }
        window.addEventListener('mousemove', handleMouseMove, { passive: true })

        // Initialize particles with varied properties
        if (particlesRef.current.length === 0) {
            for (let i = 0; i < particleCount; i++) {
                particlesRef.current.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4,
                    radius: Math.random() * 2.5 + 0.8,
                    opacity: Math.random() * 0.6 + 0.2,
                    pulseSpeed: Math.random() * 0.02 + 0.01,
                    pulsePhase: Math.random() * Math.PI * 2,
                    color: Math.random() > 0.7 ? 'teal' : 'slate' // Mix of colors
                })
            }
        }

        let time = 0
        const animate = () => {
            time += 0.01
            ctx.clearRect(0, 0, width, height)

            // Update and draw particles
            particlesRef.current.forEach((p, i) => {
                // Subtle mouse interaction - particles avoid cursor slightly
                const dx = mouseRef.current.x - p.x
                const dy = mouseRef.current.y - p.y
                const dist = Math.sqrt(dx * dx + dy * dy)
                
                if (dist < 150) {
                    const force = (150 - dist) / 150
                    p.vx -= (dx / dist) * force * 0.02
                    p.vy -= (dy / dist) * force * 0.02
                }

                // Dampen velocity for smooth motion
                p.vx *= 0.99
                p.vy *= 0.99

                p.x += p.vx
                p.y += p.vy

                // Wrap around edges
                if (p.x < 0) p.x = width
                if (p.x > width) p.x = 0
                if (p.y < 0) p.y = height
                if (p.y > height) p.y = 0

                // Pulse effect
                const pulse = Math.sin(time * p.pulseSpeed + p.pulsePhase) * 0.3 + 0.7

                // Draw particle glow
                const glowGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4)
                if (p.color === 'teal') {
                    glowGradient.addColorStop(0, `rgba(94, 234, 212, ${p.opacity * pulse * 0.3})`)
                    glowGradient.addColorStop(1, 'rgba(94, 234, 212, 0)')
                } else {
                    glowGradient.addColorStop(0, `rgba(148, 163, 184, ${p.opacity * pulse * 0.2})`)
                    glowGradient.addColorStop(1, 'rgba(148, 163, 184, 0)')
                }
                ctx.fillStyle = glowGradient
                ctx.beginPath()
                ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2)
                ctx.fill()

                // Draw particle core
                ctx.beginPath()
                ctx.arc(p.x, p.y, p.radius * pulse, 0, Math.PI * 2)
                if (p.color === 'teal') {
                    ctx.fillStyle = `rgba(94, 234, 212, ${p.opacity * pulse})`
                } else {
                    ctx.fillStyle = `rgba(148, 163, 184, ${p.opacity * pulse})`
                }
                ctx.fill()

                // Draw connections to nearby particles with enhanced styling
                particlesRef.current.slice(i + 1).forEach(p2 => {
                    const dx = p.x - p2.x
                    const dy = p.y - p2.y
                    const dist = Math.sqrt(dx * dx + dy * dy)

                    if (dist < 140) {
                        const alpha = 0.2 * (1 - dist / 140)
                        ctx.beginPath()
                        ctx.moveTo(p.x, p.y)
                        ctx.lineTo(p2.x, p2.y)
                        
                        // Create gradient line
                        const gradient = ctx.createLinearGradient(p.x, p.y, p2.x, p2.y)
                        if (p.color === 'teal' || p2.color === 'teal') {
                            gradient.addColorStop(0, `rgba(94, 234, 212, ${alpha})`)
                            gradient.addColorStop(1, `rgba(56, 189, 248, ${alpha * 0.5})`)
                        } else {
                            gradient.addColorStop(0, `rgba(148, 163, 184, ${alpha * 0.6})`)
                            gradient.addColorStop(1, `rgba(148, 163, 184, ${alpha * 0.3})`)
                        }
                        
                        ctx.strokeStyle = gradient
                        ctx.lineWidth = 0.8
                        ctx.stroke()
                    }
                })
            })

            animationFrameRef.current = requestAnimationFrame(animate)
        }

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (!prefersReducedMotion) {
            animate()
        }

        return () => {
            window.removeEventListener('resize', resize)
            window.removeEventListener('mousemove', handleMouseMove)
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [])

    return (
        <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
            {/* Particle canvas */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 z-0"
                style={{ opacity: 0.8 }}
            />

            {/* Animated gradient orbs */}
            <motion.div
                className="absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(94, 234, 212, 0.08) 0%, transparent 70%)',
                    filter: 'blur(60px)'
                }}
                animate={{
                    x: [0, 30, 0],
                    y: [0, -20, 0],
                    scale: [1, 1.1, 1]
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
            />

            <motion.div
                className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(56, 189, 248, 0.06) 0%, transparent 70%)',
                    filter: 'blur(80px)'
                }}
                animate={{
                    x: [0, -40, 0],
                    y: [0, 30, 0],
                    scale: [1, 1.15, 1]
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 1
                }}
            />

            <motion.div
                className="absolute bottom-0 left-1/2 w-[700px] h-[400px] -translate-x-1/2 rounded-full"
                style={{
                    background: 'radial-gradient(ellipse, rgba(148, 163, 184, 0.05) 0%, transparent 70%)',
                    filter: 'blur(100px)'
                }}
                animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.5, 0.8, 0.5]
                }}
                transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
            />

            {/* Radar sweep effect */}
            <motion.div
                className="absolute top-1/2 left-1/2 w-[800px] h-[800px] -translate-x-1/2 -translate-y-1/2"
                style={{
                    background: 'conic-gradient(from 0deg, transparent 0deg, rgba(94, 234, 212, 0.03) 30deg, transparent 60deg)',
                    borderRadius: '50%'
                }}
                animate={{
                    rotate: 360
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: 'linear'
                }}
            />

            {/* GPS grid lines */}
            <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="0.1" />
                    </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid)" />
            </svg>
        </div>
    )
}

export default AnimatedBackground
