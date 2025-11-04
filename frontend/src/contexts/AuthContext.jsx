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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await loadProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId) => {
    try {
      const profileData = await getProfile(userId)
      setProfile(profileData)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
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