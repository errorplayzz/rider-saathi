import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  UserIcon,
  CogIcon,
  TrophyIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  ChartBarIcon,
  StarIcon,
  PencilIcon,
  CameraIcon,
  ShieldCheckIcon,
  BellIcon,
  EyeIcon,
  KeyIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'
import {
  uploadAvatar,
  getUserAchievements,
  getRides,
  updateProfile as updateProfileHelper
} from '../lib/supabaseHelpers'

const Profile = () => {
  const [activeTab, setActiveTab] = useState('profile')
  const [userStats, setUserStats] = useState(null)
  const [achievements, setAchievements] = useState([])
  const [rideHistory, setRideHistory] = useState([])
  const [emergencyContacts, setEmergencyContacts] = useState([])
  const [bikeDetails, setBikeDetails] = useState({})
  const [settings, setSettings] = useState({
    notifications: true,
    locationSharing: true,
    emergencyAlerts: true,
    groupInvites: true,
    rideRequests: true
  })
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    emergencyContact: '',
    bikeModel: '',
    bikeYear: '',
    bikeColor: ''
  })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingBike, setIsEditingBike] = useState(false)
  const [bikeSaving, setBikeSaving] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [show2FAModal, setShow2FAModal] = useState(false)
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [twoFAQrCode, setTwoFAQrCode] = useState('')
  const [twoFASecret, setTwoFASecret] = useState('')
  const [twoFAToken, setTwoFAToken] = useState('')
  const [twoFAStep, setTwoFAStep] = useState('setup') // 'setup', 'verify', or 'disable'

  const { user, profile, logout, refreshProfile } = useAuth()
  const { socket } = useSocket()
  const { theme, toggleTheme, isDark } = useTheme()

  const navigate = useNavigate()

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'stats', name: 'Statistics', icon: ChartBarIcon },
    { id: 'achievements', name: 'Achievements', icon: TrophyIcon },
    { id: 'history', name: 'Ride History', icon: MapPinIcon },
    { id: 'settings', name: 'Settings', icon: CogIcon }
  ]

  useEffect(() => {
    fetchUserProfile()
    fetchUserStats()
    fetchAchievements()
    fetchRideHistory()
    fetchEmergencyContacts()
  }, [])

  const fetchUserProfile = async () => {
    try {
      // Use the profile already available from AuthContext; avoid extra fetch
      if (!profile) return

      const prefs = profile.preferences || {}
      setSettings({
        notifications: prefs.notifications ?? true,
        locationSharing: prefs.shareLocation ?? true,
        emergencyAlerts: prefs.emergencyAlerts ?? true,
        groupInvites: prefs.groupInvites ?? true,
        rideRequests: prefs.rideRequests ?? true
      })
      setProfileForm({
        name: profile.name || user?.user_metadata?.name || '',
        email: user?.email || '',
        phone: profile.phone || '',
        emergencyContact: profile.emergency_contact || '',
        bikeModel: profile.bike_model || '',
        bikeYear: profile.bike_year || '',
        bikeColor: profile.bike_color || ''
      })
      setBikeDetails({
        model: profile.bike_model || '',
        year: profile.bike_year || '',
        color: profile.bike_color || ''
      })
      // Get 2FA status from profile metadata or database
      setTwoFAEnabled(profile.two_factor_enabled || false)
    } catch (error) {
      console.error('Profile fetch error:', error)
    }
  }

  const fetchUserStats = async () => {
    try {
      // Populate user statistics from the AuthContext profile
      if (!profile) return

      setUserStats({
        totalRides: profile.total_rides || 0,
        totalDistance: (profile.total_distance_meters / 1000).toFixed(1) || 0,
        rewardPoints: profile.reward_points || 0,
        helpGiven: profile.help_count || 0,
        rating: '5.0' // Default rating
      })
    } catch (error) {
      console.error('Stats fetch error:', error)
    }
  }

  const fetchAchievements = async () => {
    try {
      const achievementsData = await getUserAchievements(user.id)
      setAchievements(achievementsData || [])
    } catch (error) {
      console.error('Achievements fetch error:', error)
    }
  }

  const fetchRideHistory = async () => {
    try {
      const rides = await getRides(user.id, 10)
      setRideHistory(rides || [])
    } catch (error) {
      console.error('Ride history fetch error:', error)
    }
  }

  const fetchEmergencyContacts = async () => {
    try {
      // Emergency contacts may be stored in profile preferences
      const contacts = profile?.preferences?.emergencyContacts || []
      setEmergencyContacts(contacts)
    } catch (error) {
      console.error('Emergency contacts fetch error:', error)
    }
  }

  const updateProfile = async () => {
    try {
      await updateProfileHelper(user.id, {
        name: profileForm.name,
        phone: profileForm.phone,
        emergency_contact: profileForm.emergencyContact,
        bike_model: profileForm.bikeModel,
        bike_year: profileForm.bikeYear,
        bike_color: profileForm.bikeColor
      })
      setIsEditing(false)
      // Refresh profile information from AuthContext so UI shows the latest data
      await refreshProfile()
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Profile update error:', error)
      const msg = error?.message || JSON.stringify(error)
      if (msg && msg.toLowerCase().includes('row-level security')) {
        alert(msg + '\n\nIt looks like your database row-level security (RLS) policy is preventing profile updates. Apply a policy that allows authenticated users to update their own profile (for example: `auth.uid() = id`).')
      } else {
        alert(msg || 'Failed to update profile')
      }
    }
  }

  const saveBikeDetails = async () => {
    try {
      setBikeSaving(true)
      await updateProfileHelper(user.id, {
        bike_model: profileForm.bikeModel,
        bike_year: profileForm.bikeYear,
        bike_color: profileForm.bikeColor
      })

      setBikeDetails({
        model: profileForm.bikeModel,
        year: profileForm.bikeYear,
        color: profileForm.bikeColor
      })
      setIsEditingBike(false)
      // Refresh profile immediately
      await refreshProfile()
      alert('Bike details updated successfully!')
    } catch (error) {
      console.error('Bike details save error:', error)
      const msg = error?.message || JSON.stringify(error)
      if (msg && msg.toLowerCase().includes('row-level security')) {
        alert(msg + '\n\nRLS is likely blocking this update. Ensure your profiles table has an UPDATE policy allowing the authenticated user to update their own row.')
      } else {
        alert(msg || 'Failed to save bike details')
      }
    } finally {
      setBikeSaving(false)
    }
  }

  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match')
      return
    }

    try {
      // To change a user's password with Supabase, call supabase.auth.updateUser.
      // For now, guide the user to use the Forgot Password flow via email.
      alert('Please use the Forgot Password feature on the login page to change your password')
      setShowChangePassword(false)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      console.error('Password change error:', error)
      alert('Failed to change password')
    }
  }

  const updateSettings = async (settingKey, value) => {
    try {
      const updatedSettings = { ...settings, [settingKey]: value }

      // Persist updated preferences back to the user's profile
      const preferences = profile?.preferences || {}
      const updatedPreferences = { ...preferences }

      // Map frontend setting keys to backend preference keys
      if (settingKey === 'locationSharing') {
        updatedPreferences.shareLocation = value
      } else {
        updatedPreferences[settingKey] = value
      }

      await updateProfileHelper(user.id, { preferences: updatedPreferences })
      setSettings(updatedSettings)
      // Broadcast shareLocation changes so map clients can update visibility
      try {
        if (settingKey === 'locationSharing') {
          socket?.sendRideEvent && socket.sendRideEvent('share-change', { userId: user.id, shareLocation: value })
        }
      } catch (e) {
        console.warn('Failed to broadcast share-change:', e)
      }
    } catch (error) {
      console.error('Settings update error:', error)
    }
  }

  const handle2FASetup = async () => {
    try {
      const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001'
      
      // Get Supabase session token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      if (!token) {
        alert('Please log in again to enable 2FA')
        return
      }
      
      const response = await fetch(`${API_BASE}/api/auth/2fa/enable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        setTwoFAQrCode(data.qrCode)
        setTwoFASecret(data.secret)
        setTwoFAStep('verify')
      } else {
        alert(data.message || 'Failed to setup 2FA')
      }
    } catch (error) {
      console.error('2FA setup error:', error)
      alert('Failed to setup 2FA')
    }
  }

  const handle2FAVerify = async () => {
    try {
      const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001'
      
      // Get Supabase session token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      if (!token) {
        alert('Please log in again to verify 2FA')
        return
      }
      
      const response = await fetch(`${API_BASE}/api/auth/2fa/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: twoFAToken })
      })

      const data = await response.json()

      if (data.success) {
        setTwoFAEnabled(true)
        setShow2FAModal(false)
        setTwoFAToken('')
        setTwoFAQrCode('')
        setTwoFASecret('')
        setTwoFAStep('setup')
        alert('2FA enabled successfully!')
        await refreshProfile()
      } else {
        alert(data.message || 'Invalid verification code')
      }
    } catch (error) {
      console.error('2FA verify error:', error)
      alert('Failed to verify 2FA code')
    }
  }

  const handle2FADisable = async () => {
    try {
      const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001'
      
      // Get Supabase session token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      if (!token) {
        alert('Please log in again to disable 2FA')
        return
      }
      
      const response = await fetch(`${API_BASE}/api/auth/2fa/disable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: twoFAToken })
      })

      const data = await response.json()

      if (data.success) {
        setTwoFAEnabled(false)
        setShow2FAModal(false)
        setTwoFAToken('')
        setTwoFAStep('setup')
        alert('2FA disabled successfully!')
        await refreshProfile()
      } else {
        alert(data.message || 'Invalid verification code')
      }
    } catch (error) {
      console.error('2FA disable error:', error)
      alert('Failed to disable 2FA')
    }
  }

  const open2FAModal = () => {
    if (twoFAEnabled) {
      setTwoFAStep('disable')
    } else {
      setTwoFAStep('setup')
    }
    setShow2FAModal(true)
  }

  const deleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    )

    if (confirmed) {
      try {
        // Account deletion usually requires admin privileges (service role).
        // For safety, ask the user to contact support rather than deleting here.
        alert('Please contact support to delete your account')
        // await supabase.auth.admin.deleteUser(user.id) // Requires service role key
      } catch (error) {
        console.error('Account deletion error:', error)
        alert('Failed to delete account')
      }
    }
  }

  const formatDate = (dateInput) => {
    if (!dateInput) return 'Unknown date'
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return 'Unknown date'
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDuration = (seconds) => {
    const s = Number(seconds)
    if (!Number.isFinite(s) || s <= 0) return '0m'
    const hours = Math.floor(s / 3600)
    const minutes = Math.floor((s % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  // Helpers to normalize ride fields coming from different backends/schemas
  const getRideStart = (ride) => {
    return ride.startTime || ride.start_time || ride.start || ride.created_at || ride.createdAt || null
  }

  const getRideDurationSeconds = (ride) => {
    const d = ride.duration ?? ride.actualDuration ?? ride.actual_duration ?? ride.route?.actualDuration ?? ride.route?.estimatedDuration ?? ride.route?.estimated_duration ?? null
    const n = Number(d)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  const getRideDistanceMeters = (ride) => {
    const d = ride.distance ?? ride.totalDistance ?? ride.total_distance ?? ride.route?.totalDistance ?? ride.route?.total_distance ?? ride.metrics?.totalDistance ?? null
    const n = Number(d)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Identity + System Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div
                whileHover={{ y: -2 }}
                className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/80 to-slate-100/80 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950/80 ring-1 ring-slate-200/60 dark:ring-slate-700/50 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.4)] dark:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 pointer-events-none" />
                <div className="relative p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full ring-2 ring-cyan-400/50 animate-pulse" />
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 blur-md" />
                        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center ring-2 ring-cyan-300/40 shadow-lg">
                          {avatarPreview ? (
                            <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                          ) : profileForm.avatar ? (
                            <img src={profileForm.avatar} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-3xl font-bold text-white">
                              {(profile?.name || user?.user_metadata?.name)?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => document.getElementById('avatar-input').click()}
                          className="absolute -bottom-1 -right-1 p-2 bg-slate-900/80 text-cyan-200 rounded-full hover:text-white hover:bg-slate-900 transition-all shadow-lg ring-1 ring-cyan-400/30"
                          title="Change avatar"
                        >
                          <CameraIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">User Identity Module</div>
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mt-1">
                          {profile?.name || user?.user_metadata?.name || 'Anonymous Rider'}
                        </h2>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                          <div className="flex items-center gap-2 text-cyan-500">
                            <div className="w-8 h-8 rounded-full border-2 border-cyan-500/60 flex items-center justify-center">
                              <StarIcon className="w-4 h-4" />
                            </div>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">{userStats?.rating || '5.0'}</span>
                            <span className="text-slate-500 dark:text-slate-400">rating</span>
                          </div>
                          <div className="h-4 w-px bg-slate-300/60 dark:bg-slate-700/60" />
                          <div className="flex items-center gap-2 text-blue-500">
                            <TrophyIcon className="w-4 h-4" />
                            <span className="font-semibold text-slate-800 dark:text-slate-100">{userStats?.rewardPoints || 0}</span>
                            <span className="text-slate-500 dark:text-slate-400">points</span>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          Rider since {formatDate(profile?.created_at || new Date())}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:justify-end">
                      <button
                        onClick={async () => {
                          const confirmed = window.confirm('Log out now?')
                          if (!confirmed) return
                          await logout()
                          navigate('/login')
                        }}
                        className="px-4 py-2 text-xs uppercase tracking-widest bg-slate-900/70 text-slate-200 rounded-lg hover:bg-slate-900 transition-all ring-1 ring-slate-400/20"
                      >
                        System Logout
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Rides', value: userStats?.totalRides || 0, icon: ChartBarIcon },
                      { label: 'Distance (km)', value: userStats?.totalDistance || '0.0', icon: MapPinIcon },
                      { label: 'Help Given', value: userStats?.helpGiven || 0, icon: ShieldCheckIcon },
                      { label: 'Achievements', value: achievements?.length || 0, icon: TrophyIcon }
                    ].map((stat, idx) => (
                      <motion.div
                        key={stat.label}
                        whileHover={{ y: -2 }}
                        className="rounded-xl p-4 bg-white/70 dark:bg-slate-900/60 ring-1 ring-slate-200/60 dark:ring-slate-700/50 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <stat.icon className="w-5 h-5 text-cyan-500" />
                          <span className="text-xs text-slate-500 dark:text-slate-400">#{idx + 1}</span>
                        </div>
                        <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                        <div className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">{stat.label}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <input
                  id="avatar-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files && e.target.files[0]
                    if (!file) return
                    if (!user || !user.id) {
                      alert('No authenticated user available for upload')
                      return
                    }

                    const reader = new FileReader()
                    reader.onload = () => setAvatarPreview(reader.result)
                    reader.readAsDataURL(file)

                    try {
                      const avatarUrl = await uploadAvatar(user.id, file)
                      if (avatarUrl) {
                        await updateProfileHelper(user.id, { avatar_url: avatarUrl })
                        setProfileForm(p => ({ ...p, avatar: avatarUrl }))
                        await refreshProfile()
                        alert('Avatar uploaded successfully')
                      } else {
                        alert('Upload failed')
                      }
                    } catch (err) {
                      console.error('Avatar upload failed:', err)
                      alert(err?.message || 'Failed to upload avatar')
                    }
                  }}
                />
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/80 to-slate-100/80 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950/80 ring-1 ring-slate-200/60 dark:ring-slate-700/50 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.4)] dark:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">System Status</h3>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300 text-sm">Account Status</span>
                      <span className="text-emerald-500 text-xs font-semibold uppercase tracking-widest">Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300 text-sm">Two-Factor</span>
                      <span className={`text-xs font-semibold uppercase tracking-widest ${twoFAEnabled ? 'text-cyan-400' : 'text-slate-400'}`}>
                        {twoFAEnabled ? 'Enabled' : 'Offline'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300 text-sm">Notifications</span>
                      <span className={`text-xs font-semibold uppercase tracking-widest ${settings.notifications ? 'text-cyan-400' : 'text-slate-400'}`}>
                        {settings.notifications ? 'Online' : 'Muted'}
                      </span>
                    </div>
                    <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Last Sync</div>
                      <div className="text-sm text-slate-700 dark:text-slate-200 mt-1">
                        {formatDate(profile?.updated_at || user?.last_sign_in_at || new Date())}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Information Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                whileHover={{ y: -2 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/80 to-slate-100/80 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950/80 ring-1 ring-slate-200/60 dark:ring-slate-700/50 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.4)] dark:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 pointer-events-none" />
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Personal Module</h3>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 mt-1">Identity Signals</p>
                    </div>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Full Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg bg-white/70 dark:bg-slate-900/60 ring-1 ring-slate-200/70 dark:ring-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                        />
                      ) : (
                        <p className="text-slate-900 dark:text-white font-medium">{profileForm.name || 'Not provided'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Email</label>
                      <p className="text-slate-900 dark:text-white font-medium flex items-center gap-2">
                        <EnvelopeIcon className="w-4 h-4 text-cyan-400" />
                        {profileForm.email}
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Phone</label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg bg-white/70 dark:bg-slate-900/60 ring-1 ring-slate-200/70 dark:ring-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                        />
                      ) : (
                        <p className="text-slate-900 dark:text-white font-medium flex items-center gap-2">
                          <PhoneIcon className="w-4 h-4 text-cyan-400" />
                          {profileForm.phone || 'Not provided'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Emergency Contact</label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={profileForm.emergencyContact}
                          onChange={(e) => setProfileForm({ ...profileForm, emergencyContact: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg bg-white/70 dark:bg-slate-900/60 ring-1 ring-slate-200/70 dark:ring-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                        />
                      ) : (
                        <p className="text-slate-900 dark:text-white font-medium flex items-center gap-2">
                          <PhoneIcon className="w-4 h-4 text-cyan-400" />
                          {profileForm.emergencyContact || 'Not provided'}
                        </p>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex flex-wrap gap-3 mt-6">
                      <button
                        onClick={updateProfile}
                        className="px-5 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-5 py-2 bg-slate-200/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300/70 dark:hover:bg-slate-700/70 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/80 to-slate-100/80 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950/80 ring-1 ring-slate-200/60 dark:ring-slate-700/50 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.4)] dark:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Bike Telemetry</h3>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 mt-1">Vehicle Node</p>
                    </div>
                    <button
                      onClick={() => setIsEditingBike(!isEditingBike)}
                      className="p-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Bike Model</label>
                      {isEditingBike ? (
                        <input
                          type="text"
                          value={profileForm.bikeModel}
                          onChange={(e) => setProfileForm({ ...profileForm, bikeModel: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg bg-white/70 dark:bg-slate-900/60 ring-1 ring-slate-200/70 dark:ring-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        />
                      ) : (
                        <p className="text-slate-900 dark:text-white font-medium">{bikeDetails.model || 'Not provided'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Bike Year</label>
                      {isEditingBike ? (
                        <input
                          type="text"
                          value={profileForm.bikeYear}
                          onChange={(e) => setProfileForm({ ...profileForm, bikeYear: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg bg-white/70 dark:bg-slate-900/60 ring-1 ring-slate-200/70 dark:ring-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        />
                      ) : (
                        <p className="text-slate-900 dark:text-white font-medium">{bikeDetails.year || 'Not provided'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Bike Color</label>
                      {isEditingBike ? (
                        <input
                          type="text"
                          value={profileForm.bikeColor}
                          onChange={(e) => setProfileForm({ ...profileForm, bikeColor: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg bg-white/70 dark:bg-slate-900/60 ring-1 ring-slate-200/70 dark:ring-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        />
                      ) : (
                        <p className="text-slate-900 dark:text-white font-medium">{bikeDetails.color || 'Not provided'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Status</label>
                      <p className="text-emerald-500 font-medium">Operational</p>
                    </div>
                  </div>

                  {isEditingBike && (
                    <div className="flex flex-wrap gap-3 mt-6">
                      <button
                        onClick={saveBikeDetails}
                        disabled={bikeSaving}
                        className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-60"
                      >
                        {bikeSaving ? 'Saving...' : 'Save Telemetry'}
                      </button>
                      <button
                        onClick={() => setIsEditingBike(false)}
                        className="px-5 py-2 bg-slate-200/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300/70 dark:hover:bg-slate-700/70 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div
                whileHover={{ y: -2 }}
                className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/80 to-slate-100/80 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950/80 ring-1 ring-slate-200/60 dark:ring-slate-700/50 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.4)] dark:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Security & Access</h3>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 mt-1">Control Layer</p>
                    </div>
                    <ShieldCheckIcon className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setShowChangePassword(true)}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/70 dark:bg-slate-900/60 ring-1 ring-slate-200/60 dark:ring-slate-700/50 hover:ring-emerald-400/60 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <KeyIcon className="w-5 h-5 text-emerald-500" />
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">Change Password</span>
                      </div>
                      <span className="text-slate-400">›</span>
                    </button>
                    <button
                      onClick={() => setShow2FAModal(true)}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/70 dark:bg-slate-900/60 ring-1 ring-slate-200/60 dark:ring-slate-700/50 hover:ring-emerald-400/60 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <ShieldCheckIcon className="w-5 h-5 text-emerald-500" />
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">Two-Factor</span>
                      </div>
                      <span className="text-slate-400">›</span>
                    </button>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/80 to-slate-100/80 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950/80 ring-1 ring-slate-200/60 dark:ring-slate-700/50 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.4)] dark:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-orange-500/10 pointer-events-none" />
                <div className="relative p-6">
                  <h3 className="text-lg font-semibold text-red-500 mb-3">Danger Zone</h3>
                  <button
                    onClick={deleteAccount}
                    className="w-full flex items-center justify-center space-x-2 p-4 bg-red-500/90 hover:bg-red-500 rounded-xl transition-all shadow-lg"
                  >
                    <TrashIcon className="w-5 h-5 text-white" />
                    <span className="text-white font-semibold">Delete Account</span>
                  </button>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">
                    This action cannot be undone. All your data will be permanently deleted.
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )

      case 'stats':
        return (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { label: 'Total Rides', value: userStats?.totalRides || 0, icon: MapPinIcon, accent: 'text-cyan-500' },
                { label: 'Total KM', value: userStats?.totalDistance ? (userStats.totalDistance / 1000).toFixed(1) : '0', icon: ChartBarIcon, accent: 'text-blue-500' },
                { label: 'Reward Points', value: userStats?.rewardPoints || 0, icon: TrophyIcon, accent: 'text-amber-500' },
                { label: 'People Helped', value: userStats?.helpGiven || 0, icon: StarIcon, accent: 'text-emerald-500' }
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  whileHover={{ y: -2 }}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/80 to-slate-100/80 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950/80 ring-1 ring-slate-200/60 dark:ring-slate-700/50 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.4)] dark:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 pointer-events-none" />
                  <div className="relative p-6">
                    <div className="flex items-center justify-between">
                      <stat.icon className={`w-6 h-6 ${stat.accent}`} />
                      <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Metric</span>
                    </div>
                    <div className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                    <div className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div
                whileHover={{ y: -2 }}
                className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/80 to-slate-100/80 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950/80 ring-1 ring-slate-200/60 dark:ring-slate-700/50 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.4)] dark:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Monthly Summary</h3>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 mt-1">Performance Window</p>
                    </div>
                    <CalendarIcon className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/70 dark:bg-slate-900/60 ring-1 ring-slate-200/60 dark:ring-slate-700/50">
                      <span className="text-slate-600 dark:text-slate-300">This Month's Rides</span>
                      <span className="text-slate-900 dark:text-white font-semibold">{userStats?.monthlyRides || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/70 dark:bg-slate-900/60 ring-1 ring-slate-200/60 dark:ring-slate-700/50">
                      <span className="text-slate-600 dark:text-slate-300">Distance Covered</span>
                      <span className="text-slate-900 dark:text-white font-semibold">
                        {userStats?.monthlyDistance ? (userStats.monthlyDistance / 1000).toFixed(1) : '0'} km
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/70 dark:bg-slate-900/60 ring-1 ring-slate-200/60 dark:ring-slate-700/50">
                      <span className="text-slate-600 dark:text-slate-300">Average Rating</span>
                      <span className="text-slate-900 dark:text-white font-semibold">{userStats?.rating || '5.0'} ⭐</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/80 to-slate-100/80 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950/80 ring-1 ring-slate-200/60 dark:ring-slate-700/50 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.4)] dark:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
                <div className="relative p-6">
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Telemetry</div>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-300">Live Status</span>
                      <span className="text-xs font-semibold uppercase tracking-widest text-emerald-500">Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-300">Sync Interval</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">15s</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-300">Signal Quality</span>
                      <span className="text-xs text-cyan-500">Optimal</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )

      case 'achievements':
        return (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {achievements.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { label: 'Unlocked', value: achievements.filter(a => a.isCompleted).length, accent: 'text-cyan-500' },
                  { label: 'Total', value: achievements.length, accent: 'text-amber-500' },
                  { label: 'Points Earned', value: achievements.filter(a => a.isCompleted).reduce((sum, a) => sum + (a.rewardPoints || 0), 0), accent: 'text-emerald-500' }
                ].map((item) => (
                  <motion.div
                    key={item.label}
                    whileHover={{ y: -2 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/80 to-slate-100/80 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950/80 ring-1 ring-slate-200/60 dark:ring-slate-700/50 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.4)] dark:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 pointer-events-none" />
                    <div className="relative p-6 text-center">
                      <div className={`text-3xl font-bold ${item.accent}`}>{item.value}</div>
                      <div className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 mt-2">{item.label}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {achievements.length > 0 ? achievements.map((achievement, index) => {
                const completed = achievement.isCompleted
                const progress = achievement.progress?.current || 0
                const target = achievement.progress?.target || 1
                const progressPercent = Math.min((progress / target) * 100, 100)

                const tierColors = {
                  bronze: 'from-orange-400/20 to-orange-600/30',
                  silver: 'from-slate-300/20 to-slate-500/30',
                  gold: 'from-amber-300/20 to-amber-500/30',
                  platinum: 'from-blue-400/20 to-indigo-500/30',
                  diamond: 'from-cyan-400/20 to-blue-600/30'
                }

                const tierColor = tierColors[achievement.tier] || tierColors.bronze

                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/80 to-slate-100/80 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950/80 ring-1 ring-slate-200/60 dark:ring-slate-700/50 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.4)] dark:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)] ${!completed ? 'opacity-80' : ''}`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${tierColor} pointer-events-none`} />
                    <div className="relative p-6 text-center">
                      <div className="absolute top-4 right-4 text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                        {achievement.tier?.toUpperCase() || 'BRONZE'}
                      </div>
                      <div className={`text-4xl mb-3 ${completed ? '' : 'grayscale opacity-50'}`}>
                        {achievement.icon || '🏆'}
                      </div>
                      <h3 className={`text-lg font-semibold mb-2 ${completed ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                        {achievement.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        {achievement.description}
                      </p>

                      {!completed && (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                            <span>Progress</span>
                            <span>{progress} / {target} {achievement.progress?.unit || ''}</span>
                          </div>
                          <div className="w-full bg-slate-200/70 dark:bg-slate-800 rounded-full h-2">
                            <div
                              className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {completed ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-center space-x-1 text-emerald-500 text-sm">
                            <span>✓</span>
                            <span>Completed</span>
                          </div>
                          <div className="text-xs text-cyan-500">
                            {achievement.completedAt && formatDate(achievement.completedAt)}
                          </div>
                          <div className="text-xs text-amber-500 font-bold">
                            +{achievement.rewardPoints} points
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Locked • {achievement.rewardPoints} points when unlocked
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              }) : (
                <div className="col-span-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/80 to-slate-100/80 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950/80 ring-1 ring-slate-200/60 dark:ring-slate-700/50 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.4)] dark:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)]">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 pointer-events-none" />
                  <div className="relative p-12 text-center">
                    <TrophyIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Achievements Yet</h3>
                    <p className="text-slate-500 dark:text-slate-400">Complete activities to unlock achievements</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )

      case 'history':
        return (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {rideHistory.length > 0 ? rideHistory.map((ride, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -2 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/80 to-slate-100/80 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950/80 ring-1 ring-slate-200/60 dark:ring-slate-700/50 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.4)] dark:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 pointer-events-none" />
                <div className="relative p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/70 dark:bg-slate-900/60 ring-1 ring-slate-200/60 dark:ring-slate-700/50 flex items-center justify-center">
                        <MapPinIcon className="w-6 h-6 text-cyan-500" />
                      </div>
                      <div>
                        <h3 className="text-slate-900 dark:text-white font-semibold">
                          {ride.type === 'solo' ? 'Solo Ride' : 'Group Ride'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {formatDate(getRideStart(ride))} • {formatDuration(getRideDurationSeconds(ride))}
                        </p>
                        <p className="text-xs uppercase tracking-widest text-slate-400">
                          {(() => {
                            const meters = getRideDistanceMeters(ride)
                            return meters !== null ? `${(meters / 1000).toFixed(1)} km` : 'N/A'
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-900 dark:text-white font-semibold">+{ride.pointsEarned || 0} points</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Rating: {ride.rating || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/80 to-slate-100/80 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950/80 ring-1 ring-slate-200/60 dark:ring-slate-700/50 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.4)] dark:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)]">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 pointer-events-none" />
                <div className="relative p-12 text-center">
                  <MapPinIcon className="w-14 h-14 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Rides Yet</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Start your first ride to see your history here</p>
                </div>
              </div>
            )}
          </motion.div>
        )

      case 'settings':
        return (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div
                whileHover={{ y: -2 }}
                className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/80 to-slate-100/80 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950/80 ring-1 ring-slate-200/60 dark:ring-slate-700/50 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.4)] dark:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 pointer-events-none" />
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Notification Preferences</h3>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 mt-1">Signal Routing</p>
                    </div>
                    <BellIcon className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div className="space-y-4">
                    {/* Theme Mode Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/70 dark:bg-slate-900/60 ring-1 ring-slate-200/60 dark:ring-slate-700/50">
                      <div>
                        <p className="text-slate-900 dark:text-white font-medium">Theme Mode</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {isDark ? 'Dark mode enabled' : 'Light mode enabled'}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isDark}
                          onChange={toggleTheme}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200/70 dark:bg-slate-800 ring-1 ring-slate-300/40 dark:ring-slate-700/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                      </label>
                    </div>

                    {Object.entries(settings).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-white/70 dark:bg-slate-900/60 ring-1 ring-slate-200/60 dark:ring-slate-700/50">
                        <div>
                          <p className="text-slate-900 dark:text-white font-medium capitalize">
                            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {key === 'notifications' && 'Receive push notifications'}
                            {key === 'locationSharing' && 'Share your location with nearby riders'}
                            {key === 'emergencyAlerts' && 'Receive emergency alerts from other riders'}
                            {key === 'groupInvites' && 'Receive group chat invitations'}
                            {key === 'rideRequests' && 'Receive ride join requests'}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => updateSettings(key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200/70 dark:bg-slate-800 ring-1 ring-slate-300/40 dark:ring-slate-700/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/80 to-slate-100/80 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950/80 ring-1 ring-slate-200/60 dark:ring-slate-700/50 shadow-[0_18px_50px_-25px_rgba(15,23,42,0.4)] dark:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
                <div className="relative p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Security & Privacy</h3>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 mt-1">Defense Layer</p>
                    </div>
                    <ShieldCheckIcon className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="space-y-4">
                    <button
                      onClick={() => setShowChangePassword(true)}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-white/70 dark:bg-slate-900/60 ring-1 ring-slate-200/60 dark:ring-slate-700/50 hover:ring-emerald-400/60 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <KeyIcon className="w-5 h-5 text-emerald-500" />
                        <span className="text-slate-900 dark:text-white">Change Password</span>
                      </div>
                      <span className="text-slate-400">›</span>
                    </button>

                    <button
                      onClick={() => setShowPrivacyModal(true)}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-white/70 dark:bg-slate-900/60 ring-1 ring-slate-200/60 dark:ring-slate-700/50 hover:ring-emerald-400/60 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <EyeIcon className="w-5 h-5 text-emerald-500" />
                        <span className="text-slate-900 dark:text-white">Privacy Settings</span>
                      </div>
                      <span className="text-slate-400">›</span>
                    </button>
                    <button
                      onClick={open2FAModal}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-white/70 dark:bg-slate-900/60 ring-1 ring-slate-200/60 dark:ring-slate-700/50 hover:ring-emerald-400/60 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <ShieldCheckIcon className="w-5 h-5 text-emerald-500" />
                        <div className="text-left">
                          <span className="text-slate-900 dark:text-white block">Two-Factor Authentication</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {twoFAEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-400">›</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div
              whileHover={{ y: -2 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/90 via-white/80 to-slate-100/80 dark:from-slate-900/90 dark:via-slate-900/70 dark:to-slate-950/80 ring-1 ring-red-500/20 shadow-[0_18px_50px_-25px_rgba(239,68,68,0.3)]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-orange-500/10 pointer-events-none" />
              <div className="relative p-6">
                <h3 className="text-lg font-semibold text-red-500 mb-3">Danger Zone</h3>
                <button
                  onClick={deleteAccount}
                  className="w-full flex items-center justify-center space-x-2 p-4 bg-red-500/90 hover:bg-red-500 rounded-xl transition-all shadow-lg"
                >
                  <TrashIcon className="w-5 h-5 text-white" />
                  <span className="text-white font-semibold">Delete Account</span>
                </button>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center">
                  This action cannot be undone. All your data will be permanently deleted.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen pt-20 px-4 pb-12 bg-gradient-to-b from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-alabaster">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
            Rider Control Panel
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400">Mission-grade identity, telemetry, and system controls</p>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 overflow-x-auto"
        >
          <div className="flex space-x-2 bg-white/80 dark:bg-slate-900/70 p-1.5 rounded-xl min-w-max shadow-lg ring-1 ring-slate-200/60 dark:ring-slate-700/60">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg transition-all duration-200 font-medium ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white shadow-lg dark:bg-slate-800'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.name}</span>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Change Password Modal */}
        {showChangePassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-dusk rounded-2xl p-6 w-full max-w-md shadow-card ring-1 ring-dusty/10"
            >
              <h3 className="text-lg font-semibold text-alabaster mb-4">Change Password</h3>
              <div className="space-y-4">
                <input
                  type="password"
                  placeholder="Current Password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-4 py-2 bg-ink/60 ring-1 ring-dusty/20 rounded text-alabaster focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <input
                  type="password"
                  placeholder="New Password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-4 py-2 bg-ink/60 ring-1 ring-dusty/20 rounded text-alabaster focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 bg-ink/60 ring-1 ring-dusty/20 rounded text-alabaster focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={changePassword}
                    className="flex-1 px-4 py-2 bg-accent text-ink rounded-lg hover:bg-accent-hover transition-colors"
                  >
                    Update Password
                  </button>
                  <button
                    onClick={() => setShowChangePassword(false)}
                    className="px-4 py-2 bg-ink/60 text-alabaster rounded-lg hover:bg-ink/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Privacy Modal */}
        {showPrivacyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowPrivacyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Privacy Settings</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Manage your privacy preferences</p>
                </div>
                <EyeIcon className="w-6 h-6 text-emerald-500" />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700">
                  <div>
                    <p className="text-slate-900 dark:text-white font-medium">Share my location</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Allow nearby riders to see your location</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.locationSharing}
                      onChange={(e) => updateSettings('locationSharing', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200/70 dark:bg-slate-700 ring-1 ring-slate-300/40 dark:ring-slate-600/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700">
                  <div>
                    <p className="text-slate-900 dark:text-white font-medium">Receive emergency alerts</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Get notified about nearby emergencies</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.emergencyAlerts}
                      onChange={(e) => updateSettings('emergencyAlerts', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200/70 dark:bg-slate-700 ring-1 ring-slate-300/40 dark:ring-slate-600/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700">
                  <div>
                    <p className="text-slate-900 dark:text-white font-medium">Profile visibility</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Allow others to view your profile</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications !== false}
                      onChange={(e) => updateSettings('notifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200/70 dark:bg-slate-700 ring-1 ring-slate-300/40 dark:ring-slate-600/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <button 
                  onClick={() => setShowPrivacyModal(false)} 
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Two-Factor Modal */}
        {show2FAModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShow2FAModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Two-Factor Authentication</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                {twoFAEnabled ? 'Manage your 2FA settings' : 'Add an extra layer of security to your account'}
              </p>

              {twoFAStep === 'setup' && !twoFAEnabled && (
                <div>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    Click below to set up Two-Factor Authentication using an authenticator app like Google Authenticator or Authy.
                  </p>
                  <button
                    onClick={handle2FASetup}
                    className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-cyan-600 text-white font-medium rounded-lg hover:from-emerald-400 hover:to-cyan-500 transition-all shadow-lg"
                  >
                    Set Up 2FA
                  </button>
                </div>
              )}

              {twoFAStep === 'verify' && (
                <div>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    Scan this QR code with your authenticator app:
                  </p>
                  {twoFAQrCode && (
                    <div className="flex justify-center mb-4">
                      <img src={twoFAQrCode} alt="2FA QR Code" className="w-48 h-48 border-2 border-slate-300 dark:border-slate-600 rounded-lg" />
                    </div>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 text-center">
                    Or enter this secret manually: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{twoFASecret}</span>
                  </p>
                  <input
                    type="text"
                    value={twoFAToken}
                    onChange={(e) => setTwoFAToken(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg mb-4 focus:ring-2 focus:ring-emerald-500 outline-none"
                    maxLength={6}
                  />
                  <button
                    onClick={handle2FAVerify}
                    className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-cyan-600 text-white font-medium rounded-lg hover:from-emerald-400 hover:to-cyan-500 transition-all shadow-lg"
                  >
                    Verify and Enable 2FA
                  </button>
                </div>
              )}

              {twoFAStep === 'disable' && twoFAEnabled && (
                <div>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    To disable Two-Factor Authentication, enter your current 2FA code:
                  </p>
                  <input
                    type="text"
                    value={twoFAToken}
                    onChange={(e) => setTwoFAToken(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg mb-4 focus:ring-2 focus:ring-red-500 outline-none"
                    maxLength={6}
                  />
                  <button
                    onClick={handle2FADisable}
                    className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white font-medium rounded-lg hover:from-red-400 hover:to-orange-500 transition-all shadow-lg"
                  >
                    Disable 2FA
                  </button>
                </div>
              )}

              <div className="flex justify-end space-x-2 mt-6">
                <button 
                  onClick={() => {
                    setShow2FAModal(false)
                    setTwoFAToken('')
                    setTwoFAQrCode('')
                    setTwoFASecret('')
                    setTwoFAStep('setup')
                  }} 
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default Profile