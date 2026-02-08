import React, { useState, useEffect } from 'react'
import logo from '../assets/Rider-saathi-logo.jpeg'
import { Link, useLocation } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  HomeIcon,
  MapIcon,
  ChatBubbleLeftIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  ArrowRightOnRectangleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import NotificationDropdown from './NotificationDropdown'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hoveredItem, setHoveredItem] = useState(null)
  const location = useLocation()
  const { theme, toggleTheme, isDark } = useTheme()
  const { user, logout } = useAuth()
  
  const { scrollY } = useScroll()
  const navbarY = useTransform(scrollY, [0, 100], [0, -5])
  const navbarBlur = useTransform(scrollY, [0, 100], [8, 20])
  const navbarOpacity = useTransform(scrollY, [0, 100], [0.7, 0.95])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Public routes - accessible to everyone
  const publicNavItems = [
    { name: 'Home', path: '/', icon: HomeIcon },
  ]

  // Protected routes - only for authenticated users
  const protectedNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: ChartBarIcon },
    { name: 'Map', path: '/map', icon: MapIcon },
    { name: 'Emergency', path: '/emergency', icon: ExclamationTriangleIcon },
    { name: 'Chat', path: '/chat', icon: ChatBubbleLeftIcon },
    { name: 'Blogs', path: '/blogs', icon: DocumentTextIcon },
    { name: 'Profile', path: '/profile', icon: UserIcon },
  ]

  // Show appropriate nav items based on authentication
  const navItems = user ? [...publicNavItems, ...protectedNavItems] : publicNavItems

  const handleLogout = async () => {
    await logout()
    setIsOpen(false)
  }

  return (
    <>
      {/* Animated Background Glow */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 z-[99]"
        style={{
          background: 'linear-gradient(90deg, #06b6d4, #3b82f6, #8b5cf6, #06b6d4)',
          backgroundSize: '200% 100%',
          opacity: scrolled ? 0.6 : 0,
        }}
        animate={{
          backgroundPosition: ['0% 0%', '200% 0%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          y: navbarY,
        }}
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
          scrolled 
            ? 'shadow-2xl shadow-cyan-500/10' 
            : ''
        }`}
      >
        {/* Glass Morphism Container with Border Gradient */}
        <div 
          className="relative"
          style={{
            background: scrolled 
              ? (isDark 
                  ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.75) 100%)' 
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(248, 250, 252, 0.75) 100%)')
              : (isDark 
                  ? 'rgba(15, 23, 42, 0.4)' 
                  : 'rgba(255, 255, 255, 0.4)'),
            backdropFilter: `blur(${scrolled ? '24px' : '12px'})`,
            WebkitBackdropFilter: `blur(${scrolled ? '24px' : '12px'})`,
            borderBottom: scrolled 
              ? `1px solid ${isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.08)'}` 
              : 'none',
          }}
        >
          {/* Animated Border Gradient */}
          {scrolled && (
            <motion.div
              className="absolute inset-0 rounded-b-2xl"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2), transparent)',
                backgroundSize: '200% 100%',
              }}
              animate={{
                backgroundPosition: ['0% 0%', '200% 0%'],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          )}

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex items-center justify-between h-20">{/* Logo */}
              <Link to="/" className="flex items-center space-x-3 group relative">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  className="relative w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center"
                >
                  {/* Glow Effect on Logo */}
                  <motion.div
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, transparent 70%)',
                      opacity: 0,
                    }}
                    whileHover={{ opacity: 1, scale: 1.2 }}
                    transition={{ duration: 0.3 }}
                  />
                  <img 
                    src={logo} 
                    alt="Rider Saathi" 
                    className="w-full h-full object-cover relative z-10 rounded-xl ring-2 ring-cyan-500/20 group-hover:ring-cyan-500/50 transition-all duration-300" 
                  />
                </motion.div>
                <motion.span 
                  className="font-bold text-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 bg-clip-text text-transparent"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  Rider Saathi
                </motion.span>
                
                {/* Underline Animation on Logo Hover */}
                <motion.div
                  className="absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500"
                  initial={{ width: 0 }}
                  whileHover={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                />
              </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            <div className="flex items-center space-x-1 px-2 py-1.5 rounded-2xl" style={{
              background: isDark 
                ? 'rgba(30, 41, 59, 0.5)' 
                : 'rgba(241, 245, 249, 0.6)',
              border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(15, 23, 42, 0.05)'}`,
            }}>
              {navItems.map((item, index) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                const isHovered = hoveredItem === item.name

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className="relative"
                    onMouseEnter={() => setHoveredItem(item.name)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <motion.div
                      initial={false}
                      animate={{
                        scale: isHovered ? 1.05 : 1,
                        y: isHovered ? -2 : 0,
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="relative flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-300 overflow-hidden group"
                      style={{
                        color: isActive 
                          ? (isDark ? '#06b6d4' : '#0891b2')
                          : (isDark ? '#94a3b8' : '#64748b'),
                      }}
                    >
                      {/* Active Background with Gradient */}
                      {isActive && (
                        <motion.div
                          layoutId="navBackground"
                          className="absolute inset-0 rounded-xl"
                          style={{
                            background: isDark
                              ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)'
                              : 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                            boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)',
                          }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}

                      {/* Hover Glow Effect */}
                      {isHovered && !isActive && (
                        <motion.div
                          className="absolute inset-0 rounded-xl"
                          style={{
                            background: isDark
                              ? 'rgba(148, 163, 184, 0.08)'
                              : 'rgba(15, 23, 42, 0.04)',
                          }}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}

                      {/* Icon with Rotation Animation */}
                      <motion.div
                        animate={{
                          rotate: isHovered ? [0, -10, 10, 0] : 0,
                        }}
                        transition={{
                          duration: 0.5,
                          ease: 'easeInOut',
                        }}
                        className="relative z-10"
                      >
                        <Icon className="w-5 h-5" />
                      </motion.div>

                      {/* Text with Gradient on Active */}
                      <motion.span 
                        className={`font-semibold relative z-10 ${
                          isActive ? 'bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent' : ''
                        }`}
                        animate={{
                          scale: isActive ? [1, 1.05, 1] : 1,
                        }}
                        transition={{
                          duration: 2,
                          repeat: isActive ? Infinity : 0,
                          ease: 'easeInOut',
                        }}
                      >
                        {item.name}
                      </motion.span>

                      {/* Sparkle Effect on Hover */}
                      {isHovered && (
                        <>
                          <motion.div
                            className="absolute top-1 right-1 w-1 h-1 rounded-full bg-cyan-400"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          />
                          <motion.div
                            className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-blue-400"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
                          />
                        </>
                      )}
                    </motion.div>
                  </Link>
                )
              })}
            </div>

            {/* Notification Bell - Only show when logged in */}
            {user && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <NotificationDropdown />
              </motion.div>
            )}

            {/* Auth Buttons with Enhanced Animation */}
            {!user && (
              <Link to="/login">
                <motion.button
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: '0 10px 40px -10px rgba(6, 182, 212, 0.5)',
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="relative px-6 py-2.5 rounded-xl font-semibold text-white overflow-hidden group"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
                    backgroundSize: '200% 100%',
                  }}
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'],
                  }}
                  transition={{
                    backgroundPosition: {
                      duration: 3,
                      repeat: Infinity,
                      ease: 'linear',
                    },
                  }}
                >
                  {/* Shine Effect */}
                  <motion.div
                    className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '200%' }}
                    transition={{ duration: 0.6 }}
                  />
                  <span className="relative z-10">Login</span>
                </motion.button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-3">
            {/* Mobile Notification Bell - Only show when logged in */}
            {user && <NotificationDropdown />}

            <motion.button
              whileTap={{ scale: 0.9, rotate: 90 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setIsOpen(!isOpen)}
              className="relative p-2 rounded-xl transition-all duration-300"
              style={{
                background: isDark 
                  ? 'rgba(30, 41, 59, 0.6)' 
                  : 'rgba(241, 245, 249, 0.8)',
                border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(15, 23, 42, 0.1)'}`,
              }}
            >
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {isOpen ? (
                  <XMarkIcon className="w-6 h-6" style={{ color: isDark ? '#06b6d4' : '#0891b2' }} />
                ) : (
                  <Bars3Icon className="w-6 h-6" style={{ color: isDark ? '#94a3b8' : '#64748b' }} />
                )}
              </motion.div>
              
              {/* Ripple Effect */}
              {isOpen && (
                <motion.div
                  className="absolute inset-0 rounded-xl border-2 border-cyan-500"
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                />
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  </motion.nav>

      {/* Mobile Navigation with Enhanced Animations */}
      <motion.div
        initial={false}
        animate={{ 
          height: isOpen ? 'auto' : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ 
          height: { duration: 0.4, ease: 'easeInOut' },
          opacity: { duration: 0.3 }
        }}
        className="md:hidden overflow-hidden fixed top-20 left-0 right-0 z-[99]"
        style={{
          background: isDark 
            ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)' 
            : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(15, 23, 42, 0.05)'}`,
          boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div className="px-4 py-4 space-y-2 max-h-[calc(100vh-5rem)] overflow-y-auto">
          {navItems.map((item, index) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <motion.div
                key={item.name}
                initial={{ x: -50, opacity: 0 }}
                animate={{ 
                  x: isOpen ? 0 : -50, 
                  opacity: isOpen ? 1 : 0 
                }}
                transition={{ 
                  delay: isOpen ? index * 0.05 : 0,
                  duration: 0.3,
                  type: 'spring',
                  stiffness: 200,
                  damping: 20
                }}
              >
                <Link
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className="relative block rounded-xl overflow-hidden group"
                >
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center space-x-3 px-4 py-3.5 transition-all duration-300 relative z-10"
                    style={{
                      color: isActive 
                        ? (isDark ? '#06b6d4' : '#0891b2')
                        : (isDark ? '#94a3b8' : '#64748b'),
                    }}
                  >
                    {/* Active Background */}
                    {isActive && (
                      <motion.div
                        layoutId="mobileNavBackground"
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: isDark
                            ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)'
                            : 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                          boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)',
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}

                    {/* Hover Effect */}
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: isDark
                          ? 'rgba(148, 163, 184, 0.05)'
                          : 'rgba(15, 23, 42, 0.03)',
                      }}
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    />

                    <motion.div
                      animate={isActive ? {
                        rotate: [0, -10, 10, 0],
                      } : {}}
                      transition={{
                        duration: 0.5,
                        repeat: isActive ? Infinity : 0,
                        repeatDelay: 2,
                      }}
                      className="relative z-10"
                    >
                      <Icon className="w-6 h-6" />
                    </motion.div>
                    
                    <span className={`font-semibold relative z-10 ${
                      isActive ? 'bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent' : ''
                    }`}>
                      {item.name}
                    </span>

                    {/* Active Indicator */}
                    {isActive && (
                      <motion.div
                        className="absolute right-4 w-2 h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [1, 0.5, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                    )}
                  </motion.div>

                  {/* Left Border Indicator */}
                  {isActive && (
                    <motion.div
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-cyan-500 to-blue-500"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </Link>
              </motion.div>
            )
          })}
          
          {/* Mobile Auth Buttons with Animation */}
          {!user && (
            <motion.div 
              className="pt-4 mt-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ 
                y: isOpen ? 0 : 20, 
                opacity: isOpen ? 1 : 0 
              }}
              transition={{ delay: navItems.length * 0.05 + 0.1 }}
              style={{
                borderTop: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(15, 23, 42, 0.05)'}`,
              }}
            >
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="block"
              >
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  className="w-full px-6 py-3.5 rounded-xl font-semibold text-white overflow-hidden relative group"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
                    backgroundSize: '200% 100%',
                    boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.5)',
                  }}
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'],
                  }}
                  transition={{
                    backgroundPosition: {
                      duration: 3,
                      repeat: Infinity,
                      ease: 'linear',
                    },
                  }}
                >
                  {/* Shine Effect */}
                  <motion.div
                    className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 1,
                    }}
                  />
                  <span className="relative z-10">Login</span>
                </motion.button>
              </Link>
            </motion.div>
          )}
        </div>
      </motion.div>
    </>
  )
}

export default Navbar