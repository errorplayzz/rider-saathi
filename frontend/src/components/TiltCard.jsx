import React, { useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

// 3D Tilt Card with cursor-reactive depth effect
const TiltCard = ({
    children,
    className = '',
    glowColor = 'rgba(94, 234, 212, 0.15)',
    intensity = 15,
    ...props
}) => {
    const cardRef = useRef(null)
    const [isHovered, setIsHovered] = useState(false)

    // Motion values for smooth animation
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    // Spring physics for natural feel
    const springConfig = { stiffness: 150, damping: 15, mass: 0.1 }
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [intensity, -intensity]), springConfig)
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-intensity, intensity]), springConfig)

    const handleMouseMove = (e) => {
        if (!cardRef.current) return

        const rect = cardRef.current.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2

        const x = (e.clientX - centerX) / rect.width
        const y = (e.clientY - centerY) / rect.height

        mouseX.set(x)
        mouseY.set(y)
    }

    const handleMouseLeave = () => {
        setIsHovered(false)
        mouseX.set(0)
        mouseY.set(0)
    }

    return (
        <motion.div
            ref={cardRef}
            className={`relative ${className}`}
            style={{
                transformStyle: 'preserve-3d',
                perspective: '1000px',
                rotateX,
                rotateY
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            {...props}
        >
            {/* Glow effect on hover */}
            <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                    background: `radial-gradient(circle at 50% 50%, ${glowColor}, transparent 70%)`,
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.3s ease'
                }}
            />

            {/* Card content with depth */}
            <div
                className="relative z-10"
                style={{
                    transform: 'translateZ(20px)'
                }}
            >
                {children}
            </div>

            {/* Shadow layer for depth */}
            <motion.div
                className="absolute inset-0 rounded-2xl -z-10"
                style={{
                    boxShadow: isHovered
                        ? `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px ${glowColor}`
                        : '0 10px 30px -10px rgba(0, 0, 0, 0.3)',
                    transition: 'box-shadow 0.3s ease'
                }}
            />
        </motion.div>
    )
}

export default TiltCard
