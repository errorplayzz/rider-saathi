import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Particle class for the dissolution effect
const createParticles = (count) => {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100 - 50,
        y: Math.random() * 60 - 30,
        size: Math.random() * 4 + 2,
        delay: Math.random() * 0.5,
        duration: 0.8 + Math.random() * 0.4
    }))
}

// Updated the intro animation to focus on text and particles
const CinematicIntro = ({ onComplete }) => {
    const [phase, setPhase] = useState(0)
    const [particles] = useState(() => createParticles(60))
    const [bootLines, setBootLines] = useState([])
    const containerRef = useRef(null)

    const systemMessages = useMemo(() => [
        'Initializing Rider Safety Grid…',
        'Calibrating Live GPS Intelligence…',
        'Establishing Emergency Response Network…',
        'Synchronizing Nearby Rider Nodes…',
        'Safety Protocols: ACTIVE'
    ], [])

    useEffect(() => {
        const sequence = async () => {
            // Phase 1: Particles and text animation
            await wait(100)
            setPhase(1)

            // Phase 2: Text formation (3.5-4.5s)
            await wait(1500)
            setPhase(2)

            // Phase 3: Boot sequence (4.5-7s)
            await wait(1000)
            setPhase(3)

            // Show boot lines one by one
            for (let i = 0; i < systemMessages.length; i++) {
                await wait(400)
                setBootLines(prev => [...prev, systemMessages[i]])
            }

            // Phase 4: Power zoom (7-8s)
            await wait(800)
            setPhase(4)

            // Complete
            await wait(1200)
            onComplete?.()
        }

        sequence()
    }, [onComplete, systemMessages])

    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    return (
        <motion.div
            ref={containerRef}
            className="fixed inset-0 z-[9999] overflow-hidden select-none"
            style={{
                background: 'radial-gradient(ellipse at 50% 100%, #0c1929 0%, #050a10 50%, #000 100%)',
                cursor: 'none'
            }}
            initial={{ opacity: 1 }}
            animate={phase === 4 ? {
                opacity: 0,
                scale: 1.5,
                filter: 'brightness(2)'
            } : { opacity: 1 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
        >
            {/* Atmospheric layers */}
            <div className="absolute inset-0">
                {/* Star field / particles */}
                <div className="absolute inset-0 opacity-30">
                    {[...Array(50)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-white rounded-full"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`
                            }}
                            animate={{ opacity: [0.2, 0.8, 0.2] }}
                            transition={{
                                duration: 2 + Math.random() * 2,
                                repeat: Infinity,
                                delay: Math.random() * 2,
                            }}
                        />
                    ))}
                </div>

                {/* Road horizon line */}
                <motion.div
                    className="absolute bottom-[30%] left-0 right-0 h-px"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.3), transparent)'
                    }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: phase >= 1 ? 1 : 0 }}
                    transition={{ duration: 1, delay: 0.5 }}
                />

                {/* Perspective road lines */}
                {phase >= 1 && phase < 5 && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[30%] overflow-hidden" style={{ perspective: '500px' }}>
                        <motion.div
                            className="absolute inset-0 origin-bottom"
                            style={{
                                background: `repeating-linear-gradient(
                  to bottom,
                  transparent,
                  transparent 40px,
                  rgba(6,182,212,0.1) 40px,
                  rgba(6,182,212,0.1) 42px
                )`,
                                transform: 'rotateX(60deg) translateZ(-100px)'
                            }}
                            animate={{ backgroundPosition: ['0px 0px', '0px 84px'] }}
                            transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
                        />
                    </div>
                )}
            </div>

            {/* Boot sequence text */}
            {phase >= 3 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    {bootLines.map((line, index) => (
                        <motion.div
                            key={index}
                            className="text-lg md:text-2xl font-mono"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.4 }}
                        >
                            {line}
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    )
}

export default CinematicIntro
