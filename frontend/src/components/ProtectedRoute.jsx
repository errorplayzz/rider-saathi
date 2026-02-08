import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { motion } from 'framer-motion'

const ProtectedRoute = ({ children }) => {
  const { user, profile, loading, session } = useAuth()
  const location = useLocation()
  const [authChecked, setAuthChecked] = useState(false)

  // Give auth a moment to stabilize before making routing decisions
  useEffect(() => {
    const checkTimer = setTimeout(() => {
      setAuthChecked(true)
    }, 100) // Short delay to let auth state stabilize
    
    return () => clearTimeout(checkTimer)
  }, [])

  // Don't make routing decisions until auth has been checked
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <div className="relative">
            <div className="w-16 h-16 mx-auto">
              <svg className="animate-spin text-cyan-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-slate-400">Checking authentication...</p>
        </motion.div>
      </div>
    )
  }

  // Show loading if still loading and no auth info
  if (loading && !user && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <div className="relative">
            <div className="w-16 h-16 mx-auto">
              <svg className="animate-spin text-cyan-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-slate-400">Verifying authentication...</p>
        </motion.div>
      </div>
    )
  }

  // Check for authentication - use session as primary check, user as secondary
  const isAuthenticated = !!(session?.user || user)

  if (!isAuthenticated && !loading) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  }

  // User is authenticated, render protected content
  return children
}

export default ProtectedRoute