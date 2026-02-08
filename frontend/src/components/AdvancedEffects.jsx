import React, { useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

/**
 * Floating Orbs Background Effect
 * Creates multiple animated floating orbs with varying sizes and colors
 * Adds depth and visual interest to the background
 */
const FloatingOrbs = ({ count = 8 }) => {
    const { scrollY } = useScroll()

    // Generate random orb configurations
    const orbs = Array.from({ length: count }, (_, i) => {
        const colors = [
            'rgba(94, 234, 212, 0.08)',   // teal
            'rgba(56, 189, 248, 0.06)',   // sky
            'rgba(168, 85, 247, 0.05)',   // purple
            'rgba(59, 130, 246, 0.07)',   // blue
        ]

        return {
            id: i,
            color: colors[i % colors.length],
            size: Math.random() * 400 + 300,
            blur: Math.random() * 40 + 60,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            duration: Math.random() * 10 + 15,
            delay: Math.random() * 5,
            x: [0, Math.random() * 100 - 50, 0],
            y: [0, Math.random() * 100 - 50, 0],
        }
    })

    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            {orbs.map((orb) => {
                // Parallax scroll effect based on orb index
                const y = useTransform(scrollY, [0, 1000], [0, orb.id * 30])

                return (
                    <motion.div
                        key={orb.id}
                        className="absolute rounded-full"
                        style={{
                            left: orb.left,
                            top: orb.top,
                            width: `${orb.size}px`,
                            height: `${orb.size}px`,
                            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
                            filter: `blur(${orb.blur}px)`,
                            y,
                        }}
                        animate={{
                            x: orb.x,
                            y: orb.y,
                            scale: [1, 1.1, 1],
                            opacity: [0.4, 0.7, 0.4],
                        }}
                        transition={{
                            duration: orb.duration,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: orb.delay,
                        }}
                    />
                )
            })}
        </div>
    )
}

/**
 * Scan Lines Effect
 * Adds subtle retro-style scan lines for a tech aesthetic
 */
const ScanLines = () => {
    return (
        <div className="fixed inset-0 -z-10 pointer-events-none opacity-10">
            <div
                className="w-full h-full"
                style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(94, 234, 212, 0.5) 2px, rgba(94, 234, 212, 0.5) 4px)',
                }}
            />
        </div>
    )
}

/**
 * Radial Pulse Effect
 * Creates expanding circles from center for emphasis
 */
const RadialPulse = () => {
    return (
        <div className="fixed inset-0 -z-10 flex items-center justify-center pointer-events-none overflow-hidden">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="absolute w-[200px] h-[200px] rounded-full border border-teal-400/10"
                    animate={{
                        scale: [1, 8],
                        opacity: [0.4, 0],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: 'easeOut',
                        delay: i * 2.5,
                    }}
                />
            ))}
        </div>
    )
}

/**
 * Starfield Background
 * Creates a subtle moving starfield effect
 */
const Starfield = () => {
    const canvasRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        let animationId
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

        // Create stars
        const stars = Array.from({ length: 100 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.5,
            speed: Math.random() * 0.3 + 0.1,
            opacity: Math.random() * 0.5 + 0.3,
        }))

        const animate = () => {
            ctx.fillStyle = 'rgba(10, 15, 26, 0.05)'
            ctx.fillRect(0, 0, width, height)

            stars.forEach((star) => {
                // Move stars slowly
                star.y += star.speed
                if (star.y > height) {
                    star.y = 0
                    star.x = Math.random() * width
                }

                // Draw star
                ctx.beginPath()
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(148, 163, 184, ${star.opacity})`
                ctx.fill()

                // Twinkle effect
                star.opacity += (Math.random() - 0.5) * 0.02
                star.opacity = Math.max(0.1, Math.min(0.8, star.opacity))
            })

            animationId = requestAnimationFrame(animate)
        }

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (!prefersReducedMotion) {
            animate()
        }

        return () => {
            window.removeEventListener('resize', resize)
            if (animationId) {
                cancelAnimationFrame(animationId)
            }
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 -z-10 pointer-events-none"
            style={{ opacity: 0.5 }}
        />
    )
}

/**
 * Combined Background Effects Component
 * Exports all effects for easy integration
 */
export { FloatingOrbs, ScanLines, RadialPulse, Starfield }
export default FloatingOrbs
