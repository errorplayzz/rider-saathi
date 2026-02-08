import React, { useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

// Magnetic button with hover attraction and pulse glow
const MagneticButton = ({
    children,
    className = '',
    variant = 'primary', // 'primary' | 'secondary'
    glowColor = 'rgba(148, 163, 184, 0.4)',
    magnetStrength = 0.3,
    onClick,
    ...props
}) => {
    const buttonRef = useRef(null)
    const [isHovered, setIsHovered] = useState(false)

    // Motion values for magnetic effect
    const x = useMotionValue(0)
    const y = useMotionValue(0)

    // Spring physics
    const springConfig = { stiffness: 200, damping: 20 }
    const springX = useSpring(x, springConfig)
    const springY = useSpring(y, springConfig)

    const handleMouseMove = (e) => {
        if (!buttonRef.current) return

        const rect = buttonRef.current.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2

        const distX = e.clientX - centerX
        const distY = e.clientY - centerY

        x.set(distX * magnetStrength)
        y.set(distY * magnetStrength)
    }

    const handleMouseLeave = () => {
        setIsHovered(false)
        x.set(0)
        y.set(0)
    }

    const baseStyles = variant === 'primary'
        ? 'bg-accent text-ink font-semibold'
        : 'bg-ink/60 text-alabaster font-semibold ring-1 ring-dusty/20 backdrop-blur'

    return (
        <motion.button
            ref={buttonRef}
            className={`relative px-9 py-4 rounded-full overflow-hidden ${baseStyles} ${className}`}
            style={{
                x: springX,
                y: springY
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            whileTap={{ scale: 0.97 }}
            {...props}
        >
            {/* Pulse glow animation */}
            <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                    boxShadow: `0 0 20px ${glowColor}`,
                    opacity: 0
                }}
                animate={{
                    opacity: isHovered ? [0.3, 0.6, 0.3] : 0,
                    scale: isHovered ? [1, 1.05, 1] : 1
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
            />

            {/* Hover glow overlay */}
            <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                    background: `radial-gradient(circle at 50% 50%, ${glowColor}, transparent 70%)`,
                    opacity: isHovered ? 0.5 : 0,
                    transition: 'opacity 0.3s ease'
                }}
            />

            {/* Button content */}
            <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>

            {/* Shine effect on hover */}
            <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
                    opacity: 0
                }}
                animate={{
                    opacity: isHovered ? 1 : 0,
                    x: isHovered ? ['0%', '200%'] : '0%'
                }}
                transition={{
                    duration: 0.6,
                    ease: 'easeOut'
                }}
            />
        </motion.button>
    )
}

export default MagneticButton
