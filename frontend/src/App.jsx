import React, { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

// Components
import AppShell from './components/AppShell'
import Navbar from './components/Navbar'
import ScrollToTop from './components/ScrollToTop'
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Map from './pages/Map'
import TestMap from './pages/TestMap'
import BasicMap from './pages/BasicMap'
import LeafletMap from './pages/LeafletMap'
import EnhancedMap from './pages/EnhancedMap'
import Emergency from './pages/Emergency'
import Chat from './pages/Chat'
import Vlogs from './pages/Vlogs'
import Blog from './pages/Blog'
import Profile from './pages/Profile'
import FeatureDetails from './pages/FeatureDetails'
import ForgotPassword from './pages/ForgotPassword'
import Team from './pages/Team'

// Context
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import ChatWidget from './components/ChatWidget'

// Safe loading fallback with timeout
const LoadingFallback = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="loading-dots">
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  )
}

// Inner component to access theme context
const AppContent = () => {
  const { isDark } = useTheme()

  return (
    <AppShell isDark={isDark}>
      {/* Main App Content */}
      <div className="min-h-screen transition-colors duration-300 relative"
        style={{
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Clean, professional background */}
        <div className="fixed inset-0 pointer-events-none transition-colors duration-300" 
          style={{ backgroundColor: 'var(--bg-primary)' }} 
        />

        <Navbar />

        <main className="relative z-10">
          <AnimatePresence mode="wait">
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/feature/:slug" element={<FeatureDetails />} />
                <Route path="/team" element={<Team />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/map"
                  element={
                    <ProtectedRoute>
                      <EnhancedMap />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/emergency"
                  element={
                    <ProtectedRoute>
                      <Emergency />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/blogs"
                  element={
                    <ProtectedRoute>
                      <Blog />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vlogs"
                  element={
                    <ProtectedRoute>
                      <Vlogs />
                    </ProtectedRoute>
                  }
                />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>
          </AnimatePresence>
        </main>
        
        {/* Global floating chat widget */}
        <ChatWidget />
      </div>
    </AppShell>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <ScrollToTop />
            <AppContent />
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
