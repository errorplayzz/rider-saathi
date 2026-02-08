import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Boot sequence animation wrapper
const BootSequence = ({ children, duration = 2000, onComplete }) => {
    const [phase, setPhase] = useState('booting') // 'booting' | 'ready' | 'complete'
    const [showContent, setShowContent] = useState(false)

    useEffect(() => {
        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        if (prefersReducedMotion) {
            setPhase('complete')
            setShowContent(true)
            onComplete?.()
            return
        }

        // Boot sequence timing
        const bootTimer = setTimeout(() => {
            setPhase('ready')
        }, duration * 0.6)

        const readyTimer = setTimeout(() => {
            setPhase('complete')
            setShowContent(true)
            onComplete?.()
        }, duration)

        return () => {
            clearTimeout(bootTimer)
            clearTimeout(readyTimer)
        }
    }, [duration, onComplete])

    const bootLines = [
        'Initializing Rider Saathi...',
        'Loading safety protocols...',
        'Connecting to GPS network...',
        'System ready.'
    ]

    return (
        <div className="relative min-h-screen">
            {/* Boot sequence overlay */}
            <AnimatePresence>
                {phase !== 'complete' && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-ink"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    >
                        {/* Radar effect */}
                        <motion.div
                            className="absolute w-[400px] h-[400px] rounded-full border border-accent/20"
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: [0, 2, 2], opacity: [1, 0.5, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                        />
                        <motion.div
                            className="absolute w-[400px] h-[400px] rounded-full border border-accent/20"
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: [0, 2, 2], opacity: [1, 0.5, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                        />

                        {/* Boot text */}
                        <div className="text-center z-10">
                            <motion.div
                                className="text-4xl font-bold text-alabaster mb-8"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <span className="text-accent">◈</span> RIDER SAATHI
                            </motion.div>

                            <div className="space-y-2 text-left font-mono text-sm text-dusty">
                                {bootLines.map((line, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.3, duration: 0.3 }}
                                        className={index === bootLines.length - 1 && phase === 'ready' ? 'text-emerald-400' : ''}
                                    >
                                        <span className="text-accent mr-2">›</span>
                                        {line}
                                        {index === bootLines.length - 1 && phase !== 'ready' && (
                                            <motion.span
                                                animate={{ opacity: [1, 0, 1] }}
                                                transition={{ duration: 0.8, repeat: Infinity }}
                                            >
                                                _
                                            </motion.span>
                                        )}
                                    </motion.div>
                                ))}
                            </div>

                            {/* Progress bar */}
                            <motion.div
                                className="mt-8 w-64 h-1 bg-white/10 rounded-full overflow-hidden mx-auto"
                            >
                                <motion.div
                                    className="h-full bg-accent rounded-full"
                                    initial={{ width: '0%' }}
                                    animate={{ width: phase === 'ready' ? '100%' : '70%' }}
                                    transition={{ duration: duration / 1000, ease: 'easeOut' }}
                                />
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main content */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: showContent ? 1 : 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                {children}
            </motion.div>
        </div>
    )
}

export default BootSequence
