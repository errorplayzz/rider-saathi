import React, { useEffect, useRef } from 'react'

/**
 * 3D Particle Wave Effect
 * Creates flowing 3D waves with particles
 * Optimized for performance with minimal redraws
 */
const ParticleWaves = () => {
    const canvasRef = useRef(null)
    const particlesRef = useRef([])
    const mouseRef = useRef({ x: 0, y: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d', { alpha: true })
        let animationId
        let width = window.innerWidth
        let height = window.innerHeight
        let time = 0

        // Initialize particles in a wave formation
        const initParticles = () => {
            particlesRef.current = []
            const particleCount = Math.min(80, Math.floor(width / 15)) // Adaptive particle count
            
            for (let i = 0; i < particleCount; i++) {
                particlesRef.current.push({
                    x: (i / particleCount) * width,
                    baseY: height * 0.5,
                    z: Math.random() * 200,
                    speed: 0.5 + Math.random() * 0.5,
                    amplitude: 40 + Math.random() * 60,
                    frequency: 0.01 + Math.random() * 0.02,
                    phase: Math.random() * Math.PI * 2,
                    size: 1 + Math.random() * 2
                })
            }
        }

        const resize = () => {
            width = window.innerWidth
            height = window.innerHeight
            canvas.width = width
            canvas.height = height
            initParticles()
        }

        resize()
        window.addEventListener('resize', resize)

        // Mouse tracking for interactive effect
        const handleMouseMove = (e) => {
            mouseRef.current.x = e.clientX / width
            mouseRef.current.y = e.clientY / height
        }
        window.addEventListener('mousemove', handleMouseMove, { passive: true })

        // Animation loop
        const animate = () => {
            time += 0.005

            // Clear with transparency
            ctx.clearRect(0, 0, width, height)

            // Draw connecting lines and particles
            ctx.strokeStyle = 'rgba(94, 234, 212, 0.2)'
            ctx.lineWidth = 1

            particlesRef.current.forEach((particle, index) => {
                // Calculate wave motion
                const wave1 = Math.sin(time + particle.phase) * particle.amplitude
                const wave2 = Math.cos(time * 0.7 + particle.phase * 0.5) * (particle.amplitude * 0.6)
                
                // Mouse interaction - subtle attraction
                const dx = (mouseRef.current.x * width - particle.x) * 0.05
                const dy = (mouseRef.current.y * height - particle.baseY) * 0.05
                
                // Calculate Y position with 3D perspective
                const perspective = 300
                const scale = perspective / (perspective + particle.z)
                const y = particle.baseY + wave1 + wave2 + dy * scale

                // Update Z for depth movement
                particle.z -= particle.speed
                if (particle.z < 0) particle.z = 200

                // Draw line to next particle
                if (index < particlesRef.current.length - 1) {
                    const nextParticle = particlesRef.current[index + 1]
                    const nextWave1 = Math.sin(time + nextParticle.phase) * nextParticle.amplitude
                    const nextWave2 = Math.cos(time * 0.7 + nextParticle.phase * 0.5) * (nextParticle.amplitude * 0.6)
                    const nextScale = perspective / (perspective + nextParticle.z)
                    const nextY = nextParticle.baseY + nextWave1 + nextWave2

                    ctx.beginPath()
                    ctx.moveTo(particle.x, y)
                    ctx.lineTo(nextParticle.x, nextY)
                    ctx.strokeStyle = `rgba(94, 234, 212, ${0.15 * scale})`
                    ctx.stroke()
                }

                // Draw particle
                const particleSize = particle.size * scale
                ctx.beginPath()
                ctx.arc(particle.x, y, particleSize, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(56, 189, 248, ${0.6 * scale})`
                ctx.fill()

                // Add glow effect
                ctx.beginPath()
                ctx.arc(particle.x, y, particleSize * 3, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(94, 234, 212, ${0.1 * scale})`
                ctx.fill()
            })

            animationId = requestAnimationFrame(animate)
        }

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (!prefersReducedMotion) {
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
            className="fixed inset-0 -z-10 pointer-events-none"
            style={{ opacity: 0.6 }}
        />
    )
}

export default ParticleWaves
