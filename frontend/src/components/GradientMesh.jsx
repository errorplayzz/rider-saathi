import React, { useEffect, useRef } from 'react'

/**
 * Advanced Animated Gradient Mesh Background
 * Creates a flowing, organic gradient mesh that responds to scroll
 * Highly optimized with requestAnimationFrame
 */
const GradientMesh = () => {
    const canvasRef = useRef(null)
    const timeRef = useRef(0)
    const scrollRef = useRef(0)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d', { alpha: false })
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

        // Handle scroll for subtle parallax effect
        const handleScroll = () => {
            scrollRef.current = window.scrollY * 0.0005
        }
        window.addEventListener('scroll', handleScroll, { passive: true })

        // Color palette for the mesh
        const colors = [
            { r: 14, g: 165, b: 233 },    // sky blue
            { r: 94, g: 234, b: 212 },    // teal
            { r: 168, g: 85, b: 247 },    // purple
            { r: 59, g: 130, b: 246 },    // blue
            { r: 6, g: 182, b: 212 },     // cyan
        ]

        // Create gradient mesh points
        const createMeshPoints = () => {
            const points = []
            const gridSize = 4
            const spacing = { x: width / gridSize, y: height / gridSize }

            for (let i = 0; i <= gridSize; i++) {
                for (let j = 0; j <= gridSize; j++) {
                    points.push({
                        baseX: spacing.x * i,
                        baseY: spacing.y * j,
                        offsetX: Math.random() * 100 - 50,
                        offsetY: Math.random() * 100 - 50,
                        speedX: (Math.random() - 0.5) * 0.0003,
                        speedY: (Math.random() - 0.5) * 0.0003,
                        color: colors[Math.floor(Math.random() * colors.length)]
                    })
                }
            }
            return points
        }

        let meshPoints = createMeshPoints()

        // Animation loop
        const animate = () => {
            timeRef.current += 1

            // Fill with dark background
            ctx.fillStyle = '#0a0f1a'
            ctx.fillRect(0, 0, width, height)

            // Update and draw gradient blobs
            meshPoints.forEach((point, index) => {
                // Animate offset with sine waves
                const time = timeRef.current * 0.01
                const offsetX = point.offsetX + Math.sin(time * point.speedX * 1000 + index) * 80
                const offsetY = point.offsetY + Math.cos(time * point.speedY * 1000 + index) * 80

                const x = point.baseX + offsetX + scrollRef.current * 50
                const y = point.baseY + offsetY

                // Create radial gradient for each point
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, width * 0.4)
                gradient.addColorStop(0, `rgba(${point.color.r}, ${point.color.g}, ${point.color.b}, 0.15)`)
                gradient.addColorStop(0.5, `rgba(${point.color.r}, ${point.color.g}, ${point.color.b}, 0.05)`)
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

                ctx.fillStyle = gradient
                ctx.fillRect(0, 0, width, height)
            })

            // Apply blur effect using CSS filter for better performance
            animationId = requestAnimationFrame(animate)
        }

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (!prefersReducedMotion) {
            animate()
        } else {
            // Static render for reduced motion
            ctx.fillStyle = '#0a0f1a'
            ctx.fillRect(0, 0, width, height)
            meshPoints.forEach(point => {
                const gradient = ctx.createRadialGradient(
                    point.baseX, point.baseY, 0,
                    point.baseX, point.baseY, width * 0.3
                )
                gradient.addColorStop(0, `rgba(${point.color.r}, ${point.color.g}, ${point.color.b}, 0.1)`)
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
                ctx.fillStyle = gradient
                ctx.fillRect(0, 0, width, height)
            })
        }

        return () => {
            window.removeEventListener('resize', resize)
            window.removeEventListener('scroll', handleScroll)
            if (animationId) {
                cancelAnimationFrame(animationId)
            }
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 -z-10 pointer-events-none"
            style={{
                filter: 'blur(80px)',
                opacity: 0.9
            }}
        />
    )
}

export default GradientMesh
