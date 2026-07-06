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
  DocumentTextIcon,
  ShoppingBagIcon
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
    { name: 'Marketplace', path: '/marketplace', icon: ShoppingBagIcon },
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
      <nav
        className={`fixed z-[100] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] rounded-[26px] ${
          scrolled 
            ? 'top-[12px] bg-[rgba(18,18,18,0.88)] backdrop-blur-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.08)]' 
            : 'top-[18px] bg-[rgba(18,18,18,0.72)] backdrop-blur-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.2)] border-[rgba(255,255,255,0.06)]'
        }`}
        style={{
          borderWidth: '1px',
          borderStyle: 'solid'
        }}
      >
        <div className="px-6 sm:px-8">
          <div className="flex items-center justify-between h-[74px]">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                <img 
                  src={logo} 
                  alt="Rider Saathi" 
                  className="w-full h-full object-cover relative z-10 rounded-xl ring-1 ring-white/10 group-hover:ring-white/20 transition-all duration-300" 
                />
              </div>
              <span className="font-medium text-lg text-white tracking-wide transition-all duration-300 group-hover:text-[#B08968]">
                Rider Saathi
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className="relative group px-4 py-2.5 rounded-full flex items-center space-x-2 transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-[2px] hover:scale-[1.03]"
                    style={{
                      color: isActive ? '#ffffff' : 'rgba(255,255,255,0.72)',
                    }}
                  >
                    {/* Active Background Pill */}
                    <div className={`absolute inset-0 rounded-full transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                         style={{ 
                           background: 'rgba(255,255,255,0.03)',
                           boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
                         }} />
                         
                    {/* Icon with hover shift & glow */}
                    <div className="relative z-10 transition-transform duration-300 group-hover:-translate-y-[1px]">
                      <Icon className={`w-5 h-5 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} />
                      {/* Bronze highlight behind icon on hover */}
                      <div className="absolute inset-0 bg-[#B08968] blur-[8px] rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                    </div>

                    {/* Text */}
                    <span className="font-medium text-sm tracking-wide relative z-10">
                      {item.name}
                    </span>

                    {/* Hover Soft Glow */}
                    <div className="absolute inset-0 bg-white/5 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    {/* Active Underline (Animated from center) */}
                    <div className="absolute bottom-[4px] left-1/2 h-[2px] bg-[#B08968] transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] rounded-full"
                         style={{
                           width: isActive ? '24px' : '0px',
                           transform: 'translateX(-50%)',
                           boxShadow: isActive ? '0 0 8px rgba(176,137,104,0.6)' : 'none'
                         }} />
                         
                    {/* Active Bronze Background Glow */}
                    <div className={`absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(176,137,104,0.15)_0%,transparent_70%)] transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                  </Link>
                )
              })}
            </div>

            {/* Right Actions */}
            <div className="hidden md:flex items-center space-x-4">
              {user && (
                <div className="flex items-center justify-center h-[74px]">
                  <NotificationDropdown />
                </div>
              )}
              {!user && (
                <Link to="/login">
                  <button className="px-6 py-2 rounded-full font-medium text-white transition-all duration-300 hover:scale-105 hover:bg-white/10" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
                    Login
                  </button>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-4 h-[74px]">
              {user && <NotificationDropdown />}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full transition-all duration-300 hover:bg-white/10"
              >
                {isOpen ? (
                  <XMarkIcon className="w-6 h-6 text-white" />
                ) : (
                  <Bars3Icon className="w-6 h-6 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

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
          background: '#0A0A0A',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
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
                      color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.72)',
                    }}
                  >
                    {/* Active Background */}
                    {isActive && (
                      <motion.div
                        layoutId="mobileNavBackground"
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: 'rgba(255, 106, 0, 0.2)',
                          boxShadow: '0 0 12px rgba(255, 106, 0, 0.2)',
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}

                    {/* Hover Effect */}
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: isDark
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'rgba(10, 10, 10, 0.03)',
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
                      isActive ? 'text-white' : ''
                    }`}>
                      {item.name}
                    </span>

                    {/* Active Indicator */}
                    {isActive && (
                      <motion.div
                        className="absolute right-4 w-2 h-2 rounded-full bg-orange-500"
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
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-orange-500"
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
                borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.08)'}`,
              }}
            >
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="block"
              >
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  className="w-full px-6 py-3.5 rounded-xl font-semibold text-black overflow-hidden relative group"
                  style={{
                    background: '#FF6A00',
                    boxShadow: '0 0 12px rgba(255, 106, 0, 0.24)',
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