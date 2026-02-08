import React, { useEffect, useRef } from 'react'
import { useScroll, useTransform, motion } from 'framer-motion'

/**
 * Dynamic Cyber Grid Background
 * Creates an animated futuristic grid with depth and perspective
 * Optimized for performance with CSS transforms
 */
const CyberGrid = () => {
    const { scrollY } = useScroll()
    const gridY = useTransform(scrollY, [0, 1000], [0, 200])

    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none opacity-20">
            {/* Perspective container */}
            <motion.div
                className="absolute inset-0 w-full h-full"
                style={{
                    perspective: '1000px',
                    y: gridY
                }}
            >
                {/* Grid floor with perspective */}
                <div
                    className="absolute inset-x-0 bottom-0 h-[200vh]"
                    style={{
                        transform: 'rotateX(60deg)',
                        transformOrigin: 'center bottom',
                        backgroundImage: `
                            linear-gradient(rgba(94, 234, 212, 0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(94, 234, 212, 0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: '80px 80px',
                        backgroundPosition: '0 0'
                    }}
                />

                {/* Vertical grid lines with fade */}
                <div className="absolute inset-0">
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute h-full w-px"
                            style={{
                                left: `${(i + 1) * 5}%`,
                                background: 'linear-gradient(to bottom, transparent, rgba(56, 189, 248, 0.15) 50%, transparent)',
                            }}
                            animate={{
                                opacity: [0.3, 0.6, 0.3]
                            }}
                            transition={{
                                duration: 3 + i * 0.2,
                                repeat: Infinity,
                                ease: 'easeInOut'
                            }}
                        />
                    ))}
                </div>

                {/* Horizontal grid lines */}
                <div className="absolute inset-0">
                    {[...Array(10)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-full h-px"
                            style={{
                                top: `${(i + 1) * 10}%`,
                                background: 'linear-gradient(to right, transparent, rgba(94, 234, 212, 0.1) 50%, transparent)',
                            }}
                            animate={{
                                opacity: [0.2, 0.5, 0.2]
                            }}
                            transition={{
                                duration: 4 + i * 0.3,
                                repeat: Infinity,
                                ease: 'easeInOut'
                            }}
                        />
                    ))}
                </div>

                {/* Moving scan lines */}
                <motion.div
                    className="absolute inset-x-0 h-px"
                    style={{
                        background: 'linear-gradient(to right, transparent, rgba(94, 234, 212, 0.5), transparent)',
                        boxShadow: '0 0 10px rgba(94, 234, 212, 0.5)'
                    }}
                    animate={{
                        top: ['0%', '100%']
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: 'linear'
                    }}
                />

                {/* Grid intersection highlights */}
                {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={`highlight-${i}`}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                            left: `${20 + i * 10}%`,
                            top: `${30 + (i % 3) * 20}%`,
                            background: 'radial-gradient(circle, rgba(94, 234, 212, 0.8), transparent)',
                            boxShadow: '0 0 15px rgba(94, 234, 212, 0.6)'
                        }}
                        animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 1, 0.5]
                        }}
                        transition={{
                            duration: 2 + i * 0.3,
                            repeat: Infinity,
                            ease: 'easeInOut'
                        }}
                    />
                ))}
            </motion.div>

            {/* Overlay gradient for depth */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(ellipse at center, transparent 0%, rgba(10, 15, 26, 0.8) 80%)'
                }}
            />
        </div>
    )
}

/**
 * Digital Rain Effect (Matrix-style)
 * Creates falling code/character effect
 */
const DigitalRain = ({ density = 50 }) => {
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

        // Characters to use
        const chars = '01アイウエオカキクケコサシスセソタチツテト'
        const fontSize = 14
        const columns = Math.floor(width / fontSize)
        const drops = new Array(columns).fill(1)

        const draw = () => {
            // Fade effect
            ctx.fillStyle = 'rgba(10, 15, 26, 0.05)'
            ctx.fillRect(0, 0, width, height)

            ctx.fillStyle = 'rgba(94, 234, 212, 0.8)'
            ctx.font = `${fontSize}px monospace`

            for (let i = 0; i < drops.length; i++) {
                // Random character
                const char = chars[Math.floor(Math.random() * chars.length)]
                const x = i * fontSize
                const y = drops[i] * fontSize

                ctx.fillText(char, x, y)

                // Reset drop randomly
                if (y > height && Math.random() > 0.975) {
                    drops[i] = 0
                }

                drops[i]++
            }

            animationId = requestAnimationFrame(draw)
        }

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (!prefersReducedMotion) {
            draw()
        }

        return () => {
            window.removeEventListener('resize', resize)
            if (animationId) {
                cancelAnimationFrame(animationId)
            }
        }
    }, [density])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 -z-10 pointer-events-none"
            style={{ opacity: 0.1 }}
        />
    )
}

/**
 * Geometric Shapes Background
 * Floating geometric shapes with depth
 */
const GeometricShapes = ({ count = 15 }) => {
    const shapes = Array.from({ length: count }, (_, i) => ({
        id: i,
        type: ['circle', 'square', 'triangle'][i % 3],
        size: Math.random() * 100 + 50,
        x: Math.random() * 100,
        y: Math.random() * 100,
        rotation: Math.random() * 360,
        duration: Math.random() * 20 + 10,
        delay: Math.random() * 5,
    }))

    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            {shapes.map((shape) => (
                <motion.div
                    key={shape.id}
                    className="absolute"
                    style={{
                        left: `${shape.x}%`,
                        top: `${shape.y}%`,
                    }}
                    animate={{
                        x: [0, 50, -50, 0],
                        y: [0, -30, 30, 0],
                        rotate: [shape.rotation, shape.rotation + 360],
                        opacity: [0.1, 0.3, 0.1],
                    }}
                    transition={{
                        duration: shape.duration,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: shape.delay,
                    }}
                >
                    {shape.type === 'circle' && (
                        <div
                            className="rounded-full border border-teal-400/20"
                            style={{ width: shape.size, height: shape.size }}
                        />
                    )}
                    {shape.type === 'square' && (
                        <div
                            className="border border-sky-400/20"
                            style={{ width: shape.size, height: shape.size }}
                        />
                    )}
                    {shape.type === 'triangle' && (
                        <div
                            className="border-l border-r border-b border-purple-400/20"
                            style={{
                                width: 0,
                                height: 0,
                                borderLeftWidth: shape.size / 2,
                                borderRightWidth: shape.size / 2,
                                borderBottomWidth: shape.size,
                                borderLeftColor: 'transparent',
                                borderRightColor: 'transparent',
                            }}
                        />
                    )}
                </motion.div>
            ))}
        </div>
    )
}

export { CyberGrid, DigitalRain, GeometricShapes }
export default CyberGrid
