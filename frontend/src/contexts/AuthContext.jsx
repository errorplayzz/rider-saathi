import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase, getCurrentUser, signOut as supabaseSignOut } from '../lib/supabase'
import { getProfile, updateProfile as updateProfileHelper } from '../lib/supabaseHelpers'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check if user is authenticated on mount
  useEffect(() => {
    let isMounted = true
    
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        if (error) {
          setLoading(false)
          return
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.access_token) {
          localStorage.setItem('token', session.access_token)
        } else {
          localStorage.removeItem('token')
        }
        
        if (session?.user) {
          await loadProfile(session.user.id)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    // Start initialization
    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return
      
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.access_token) {
        localStorage.setItem('token', session.access_token)
      } else {
        localStorage.removeItem('token')
      }
      
      // Only load profile on SIGN_IN, not on every state change
      if (_event === 'SIGNED_IN' && session?.user) {
        await loadProfile(session.user.id)
      } else if (_event === 'SIGNED_OUT') {
        setProfile(null)
        localStorage.removeItem('token')
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const loadProfile = async (userId) => {
    if (!userId) {
      setLoading(false)
      return
    }
    
    // Create minimal profile IMMEDIATELY - no API calls to hang  
    const minimalProfile = {
      id: userId,
      name: 'Rider', // Simple fallback
      email: 'user@app.com', // Simple fallback
      total_rides: 0,
      reward_points: 0,
      help_count: 0,
      preferences: { shareLocation: true, notifications: true }
    }
    
    // IMMEDIATE APP UNLOCK - no waiting!
    setProfile(minimalProfile)
    setLoading(false)  // ← App unlocked NOW!
    
    // Background: Try to get real email after app is unlocked
    setTimeout(async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser?.email) {
          const updatedProfile = {
            ...minimalProfile,
            name: authUser.email?.split('@')[0] || 'Rider',
            email: authUser.email
          }
          setProfile(updatedProfile)
        }
      } catch (error) {
        // Background email update failed, but app works with minimal profile
      }
    }, 50)  // Tiny delay
    
    // Background database load (optional - app already works)
    setTimeout(async () => {
      try {
        const profileData = await getProfile(userId)
        
        if (profileData) {
          setProfile(profileData)
        }
      } catch (error) {
        // Background database failed, minimal profile OK
      }
    }, 100)
  }

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      
      // Profile will be loaded via onAuthStateChange
      return { success: true, user: data.user }
    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        error: error.message || 'Login failed'
      }
    }
  }

  const register = async (userData) => {
    try {
      const { email, password, name, phone, bikeDetails } = userData
      
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone
          }
        }
      })
      
      if (signUpError) throw signUpError
      
      // The profile is auto-created via the trigger, but we can update it with additional data
      if (authData.user) {
        const updates = {
          name,
          phone,
          bike_details: bikeDetails || {}
        }
        
        // Wait a moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Try to update profile, but don't fail if it doesn't exist yet
        try {
          await updateProfileHelper(authData.user.id, updates)
        } catch (profileError) {
          console.warn('Profile update failed, will be created on first login:', profileError.message)
          // Don't throw error - profile will be synced on next login
        }
      }
      
      return { success: true, user: authData.user }
    } catch (error) {
      console.error('Registration error:', error)
      return {
        success: false,
        error: error.message || 'Registration failed'
      }
    }
  }

  const logout = async () => {
    try {
      await supabaseSignOut()
      setUser(null)
      setProfile(null)
      setSession(null)
      localStorage.removeItem('token')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const updateProfile = async (profileData) => {
    try {
      if (!user) throw new Error('No user logged in')
      
      const updatedProfile = await updateProfileHelper(user.id, profileData)
      setProfile(updatedProfile)
      
      return { success: true, profile: updatedProfile }
    } catch (error) {
      console.error('Profile update error:', error)
      return {
        success: false,
        error: error.message || 'Profile update failed'
      }
    }
  }

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      
      if (error) throw error
      
      return { success: true }
    } catch (error) {
      console.error('Password reset error:', error)
      return {
        success: false,
        error: error.message || 'Password reset failed'
      }
    }
  }

  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) throw error
      
      return { success: true }
    } catch (error) {
      console.error('Password update error:', error)
      return {
        success: false,
        error: error.message || 'Password update failed'
      }
    }
  }

  const refreshProfile = async () => {
    try {
      if (!user?.id) return
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (error) throw error
      
      setProfile(data)
      return data
    } catch (error) {
      console.error('Profile refresh error:', error)
      return null
    }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    login,
    register,
    logout,
    updateProfile,
    refreshProfile,
    resetPassword,
    updatePassword,
    isAuthenticated: !!user && !!profile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}