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
  
  const { user, profile, logout, refreshProfile } = useAuth()
  const { socket } = useSocket()

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
      setTwoFAEnabled(!!(prefs && prefs.twoFactorEnabled))
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Profile Header */}
            <div className="card-glow text-center">
              <div className="relative inline-block mb-4">
                {/* Avatar display: prefer preview or profileForm.avatar, fallback to initial */}
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
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

                    // Preview locally
                    const reader = new FileReader()
                    reader.onload = () => setAvatarPreview(reader.result)
                    reader.readAsDataURL(file)

                    // Upload to Supabase Storage
                    try {
                      const avatarUrl = await uploadAvatar(user.id, file)

                      if (avatarUrl) {
                        // Update profile with new avatar URL
                        await updateProfileHelper(user.id, { avatar_url: avatarUrl })
                        setProfileForm(p => ({ ...p, avatar: avatarUrl }))
                        // Refresh profile immediately
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

                <button
                  onClick={() => document.getElementById('avatar-input').click()}
                  className="absolute bottom-0 right-0 p-2 bg-neon-cyan text-dark-800 rounded-full hover:bg-neon-cyan/80 transition-colors"
                  title="Change avatar"
                >
                  <CameraIcon className="w-4 h-4" />
                </button>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{profile?.name || user?.user_metadata?.name || 'Anonymous Rider'}</h2>
              <p className="text-gray-400">Rider since {formatDate(profile?.created_at || new Date())}</p>
              <div className="flex items-center justify-center space-x-4 mt-4 text-sm">
                <div className="flex items-center space-x-1 text-yellow-400">
                  <StarIcon className="w-4 h-4" />
                  <span>{userStats?.rating || '5.0'}</span>
                </div>
                <div className="text-gray-400">•</div>
                <div className="text-neon-cyan">
                  {userStats?.rewardPoints || 0} points
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={async () => {
                    const confirmed = window.confirm('Log out now?')
                    if (!confirmed) return

                    // Logout using AuthContext
                    await logout()
                    navigate('/login')
                  }}
                  className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>

            {/* Profile Details */}
            <div className="card-glow">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Personal Information</h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-neon-cyan hover:text-neon-purple transition-colors"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                      className="w-full px-4 py-2 bg-dark-600 border border-gray-600 rounded text-white focus:border-neon-cyan focus:outline-none"
                    />
                  ) : (
                    <p className="text-white">{profileForm.name || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <p className="text-white">{profileForm.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                      className="w-full px-4 py-2 bg-dark-600 border border-gray-600 rounded text-white focus:border-neon-cyan focus:outline-none"
                    />
                  ) : (
                    <p className="text-white">{profileForm.phone || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Emergency Contact</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profileForm.emergencyContact}
                      onChange={(e) => setProfileForm({...profileForm, emergencyContact: e.target.value})}
                      className="w-full px-4 py-2 bg-dark-600 border border-gray-600 rounded text-white focus:border-neon-cyan focus:outline-none"
                    />
                  ) : (
                    <p className="text-white">{profileForm.emergencyContact || 'Not provided'}</p>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex space-x-4 mt-6">
                  <button
                    onClick={updateProfile}
                    className="px-6 py-2 bg-neon-cyan text-dark-800 rounded hover:bg-neon-cyan/80 transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Bike Details */}
            <div className="card-glow">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Bike Details</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsEditingBike(!isEditingBike)}
                    className="text-neon-cyan hover:text-neon-purple transition-colors"
                    title="Edit bike details"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
                  {(isEditing || isEditingBike) ? (
                    <input
                      type="text"
                      value={profileForm.bikeModel}
                      onChange={(e) => setProfileForm({...profileForm, bikeModel: e.target.value})}
                      className="w-full px-4 py-2 bg-dark-600 border border-gray-600 rounded text-white focus:border-neon-cyan focus:outline-none"
                    />
                  ) : (
                    <p className="text-white">{profileForm.bikeModel || 'Not specified'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Year</label>
                  {(isEditing || isEditingBike) ? (
                    <input
                      type="number"
                      value={profileForm.bikeYear}
                      onChange={(e) => setProfileForm({...profileForm, bikeYear: e.target.value})}
                      className="w-full px-4 py-2 bg-dark-600 border border-gray-600 rounded text-white focus:border-neon-cyan focus:outline-none"
                    />
                  ) : (
                    <p className="text-white">{profileForm.bikeYear || 'Not specified'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
                  {(isEditing || isEditingBike) ? (
                    <input
                      type="text"
                      value={profileForm.bikeColor}
                      onChange={(e) => setProfileForm({...profileForm, bikeColor: e.target.value})}
                      className="w-full px-4 py-2 bg-dark-600 border border-gray-600 rounded text-white focus:border-neon-cyan focus:outline-none"
                    />
                  ) : (
                    <p className="text-white">{profileForm.bikeColor || 'Not specified'}</p>
                  )}
                </div>
              </div>

              {(isEditingBike) && (
                <div className="flex space-x-4 mt-6">
                  <button
                    onClick={saveBikeDetails}
                    disabled={bikeSaving}
                    className="px-6 py-2 bg-neon-cyan text-dark-800 rounded hover:bg-neon-cyan/80 transition-colors disabled:opacity-50"
                  >
                    {bikeSaving ? 'Saving...' : 'Save Bike'}
                  </button>
                  <button
                    onClick={() => {
                      // reset the bike inputs to current saved values
                      setProfileForm({ ...profileForm, bikeModel: bikeDetails?.model || '', bikeYear: bikeDetails?.year || '', bikeColor: bikeDetails?.color || '' })
                      setIsEditingBike(false)
                    }}
                    className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )

      case 'stats':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card-glow text-center">
                <MapPinIcon className="w-8 h-8 text-neon-cyan mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{userStats?.totalRides || 0}</p>
                <p className="text-sm text-gray-400">Total Rides</p>
              </div>
              <div className="card-glow text-center">
                <ChartBarIcon className="w-8 h-8 text-neon-purple mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">
                  {userStats?.totalDistance ? (userStats.totalDistance / 1000).toFixed(1) : '0'}
                </p>
                <p className="text-sm text-gray-400">Total KM</p>
              </div>
              <div className="card-glow text-center">
                <TrophyIcon className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{userStats?.rewardPoints || 0}</p>
                <p className="text-sm text-gray-400">Reward Points</p>
              </div>
              <div className="card-glow text-center">
                <StarIcon className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{userStats?.helpCount || 0}</p>
                <p className="text-sm text-gray-400">People Helped</p>
              </div>
            </div>

            <div className="card-glow">
              <h3 className="text-xl font-semibold text-white mb-4">Monthly Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">This Month's Rides</span>
                  <span className="text-white font-semibold">{userStats?.monthlyRides || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Distance Covered</span>
                  <span className="text-white font-semibold">
                    {userStats?.monthlyDistance ? (userStats.monthlyDistance / 1000).toFixed(1) : '0'} km
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Average Rating</span>
                  <span className="text-white font-semibold">{userStats?.rating || '5.0'} ⭐</span>
                </div>
              </div>
            </div>
          </motion.div>
        )

      case 'achievements':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Achievement Stats Summary */}
            {achievements.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                <div className="card-glow text-center">
                  <p className="text-3xl font-bold text-neon-cyan">
                    {achievements.filter(a => a.isCompleted).length}
                  </p>
                  <p className="text-sm text-gray-400">Unlocked</p>
                </div>
                <div className="card-glow text-center">
                  <p className="text-3xl font-bold text-yellow-400">
                    {achievements.length}
                  </p>
                  <p className="text-sm text-gray-400">Total</p>
                </div>
                <div className="card-glow text-center">
                  <p className="text-3xl font-bold text-neon-purple">
                    {achievements.filter(a => a.isCompleted).reduce((sum, a) => sum + (a.rewardPoints || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-400">Points Earned</p>
                </div>
              </div>
            )}

            {/* Achievement Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.length > 0 ? achievements.map((achievement, index) => {
                const completed = achievement.isCompleted
                const progress = achievement.progress?.current || 0
                const target = achievement.progress?.target || 1
                const progressPercent = Math.min((progress / target) * 100, 100)
                
                // Tier colors
                const tierColors = {
                  bronze: 'from-orange-700 to-orange-900',
                  silver: 'from-gray-400 to-gray-600',
                  gold: 'from-yellow-400 to-yellow-600',
                  platinum: 'from-blue-400 to-purple-500',
                  diamond: 'from-cyan-400 to-blue-600'
                }
                
                const tierColor = tierColors[achievement.tier] || tierColors.bronze
                
                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`card-glow text-center relative overflow-hidden ${
                      !completed ? 'opacity-70' : ''
                    }`}
                  >
                    {/* Tier Badge */}
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${tierColor} text-white`}>
                      {achievement.tier?.toUpperCase()}
                    </div>
                    
                    {/* Achievement Icon */}
                    <div className={`text-5xl mb-3 ${completed ? '' : 'grayscale opacity-50'}`}>
                      {achievement.icon || '🏆'}
                    </div>
                    
                    {/* Achievement Name */}
                    <h3 className={`text-lg font-semibold mb-2 ${
                      completed ? 'text-white' : 'text-gray-400'
                    }`}>
                      {achievement.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-sm text-gray-400 mb-3 px-2">
                      {achievement.description}
                    </p>
                    
                    {/* Progress Bar */}
                    {!completed && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Progress</span>
                          <span>{progress} / {target} {achievement.progress?.unit || ''}</span>
                        </div>
                        <div className="w-full bg-dark-600 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-neon-cyan to-neon-purple h-2 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Completion Status */}
                    {completed ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-center space-x-1 text-green-400 text-sm">
                          <span>✓</span>
                          <span>Completed</span>
                        </div>
                        <div className="text-xs text-neon-cyan">
                          {achievement.completedAt && formatDate(achievement.completedAt)}
                        </div>
                        <div className="text-xs text-yellow-400 font-bold">
                          +{achievement.rewardPoints} points
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">
                        Locked • {achievement.rewardPoints} points when unlocked
                      </div>
                    )}
                  </motion.div>
                )
              }) : (
                <div className="col-span-full card-glow text-center py-12">
                  <TrophyIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Achievements Yet</h3>
                  <p className="text-gray-400">Complete activities to unlock achievements</p>
                </div>
              )}
            </div>
          </motion.div>
        )

      case 'history':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {rideHistory.length > 0 ? rideHistory.map((ride, index) => (
              <div key={index} className="card-glow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-neon-cyan to-neon-purple rounded-full flex items-center justify-center">
                      <MapPinIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">
                        {ride.type === 'solo' ? 'Solo Ride' : 'Group Ride'}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {formatDate(getRideStart(ride))} • {formatDuration(getRideDurationSeconds(ride))}
                      </p>
                      <p className="text-xs text-neon-cyan">
                        {(() => {
                          const meters = getRideDistanceMeters(ride)
                          return meters !== null ? `${(meters / 1000).toFixed(1)} km` : 'N/A'
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">+{ride.pointsEarned || 0} points</p>
                    <p className="text-xs text-gray-400">Rating: {ride.rating || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="card-glow text-center py-12">
                <MapPinIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Rides Yet</h3>
                <p className="text-gray-400">Start your first ride to see your history here</p>
              </div>
            )}
          </motion.div>
        )

      case 'settings':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Notification Settings */}
            <div className="card-glow">
              <h3 className="text-xl font-semibold text-white mb-6">Notification Preferences</h3>
              <div className="space-y-4">
                {Object.entries(settings).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </p>
                      <p className="text-sm text-gray-400">
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
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-cyan"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Settings */}
            <div className="card-glow">
              <h3 className="text-xl font-semibold text-white mb-6">Security & Privacy</h3>
              <div className="space-y-4">
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="w-full flex items-center justify-between p-4 bg-dark-600 hover:bg-dark-500 rounded transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <KeyIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-white">Change Password</span>
                  </div>
                  <span className="text-gray-400">›</span>
                </button>

                <button
                  onClick={() => setShowPrivacyModal(true)}
                  className="w-full flex items-center justify-between p-4 bg-dark-600 hover:bg-dark-500 rounded transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <EyeIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-white">Privacy Settings</span>
                  </div>
                  <span className="text-gray-400">›</span>
                </button>
                <button
                  onClick={() => setShow2FAModal(true)}
                  className="w-full flex items-center justify-between p-4 bg-dark-600 hover:bg-dark-500 rounded transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <ShieldCheckIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-white">Two-Factor Authentication</span>
                  </div>
                  <span className="text-gray-400">›</span>
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="card-glow border-red-500/30">
              <h3 className="text-xl font-semibold text-red-400 mb-6">Danger Zone</h3>
              <button
                onClick={deleteAccount}
                className="w-full flex items-center justify-center space-x-2 p-4 bg-red-600 hover:bg-red-700 rounded transition-colors"
              >
                <TrashIcon className="w-5 h-5" />
                <span>Delete Account</span>
              </button>
              <p className="text-sm text-gray-400 mt-2 text-center">
                This action cannot be undone. All your data will be permanently deleted.
              </p>
            </div>
          </motion.div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen pt-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-orbitron font-bold text-white mb-2">
            Profile & Settings
          </h1>
          <p className="text-gray-300">Manage your account and preferences</p>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 overflow-x-auto"
        >
          <div className="flex space-x-1 bg-dark-600 p-1 rounded-lg min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded transition-colors ${
                    activeTab === tab.id
                      ? 'bg-neon-cyan text-dark-800'
                      : 'text-gray-300 hover:text-white'
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
              className="bg-dark-800 rounded-lg p-6 w-full max-w-md"
            >
              <h3 className="text-xl font-bold text-white mb-4">Change Password</h3>
              <div className="space-y-4">
                <input
                  type="password"
                  placeholder="Current Password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  className="w-full px-4 py-2 bg-dark-600 border border-gray-600 rounded text-white focus:border-neon-cyan focus:outline-none"
                />
                <input
                  type="password"
                  placeholder="New Password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  className="w-full px-4 py-2 bg-dark-600 border border-gray-600 rounded text-white focus:border-neon-cyan focus:outline-none"
                />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  className="w-full px-4 py-2 bg-dark-600 border border-gray-600 rounded text-white focus:border-neon-cyan focus:outline-none"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={changePassword}
                    className="flex-1 px-4 py-2 bg-neon-cyan text-dark-800 rounded hover:bg-neon-cyan/80 transition-colors"
                  >
                    Update Password
                  </button>
                  <button
                    onClick={() => setShowChangePassword(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
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
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-dark-800 rounded-lg p-6 w-full max-w-lg"
            >
              <h3 className="text-xl font-bold text-white mb-4">Privacy Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Share my location</p>
                    <p className="text-sm text-gray-400">Allow nearby riders to see your location</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.locationSharing}
                      onChange={(e) => updateSettings('locationSharing', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-cyan"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Receive emergency alerts</p>
                    <p className="text-sm text-gray-400">Allow system to send you emergency alerts from other riders</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.emergencyAlerts}
                      onChange={(e) => updateSettings('emergencyAlerts', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-cyan"></div>
                  </label>
                </div>

                <div className="flex justify-end space-x-2 mt-4">
                  <button onClick={() => setShowPrivacyModal(false)} className="px-4 py-2 bg-gray-600 text-white rounded">Close</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Two-Factor Modal */}
        {show2FAModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-dark-800 rounded-lg p-6 w-full max-w-md"
            >
              <h3 className="text-xl font-bold text-white mb-4">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-400 mb-4">Enable Two-Factor Authentication for added account security.</p>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-400">Use an authentication app or SMS for login verification.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={twoFAEnabled}
                    onChange={async (e) => {
                      const enabled = e.target.checked
                      try {
                        // Update 2FA preference in profile
                        const preferences = profile?.preferences || {}
                        const updatedPreferences = { ...preferences, twoFactorEnabled: enabled }
                        await updateProfileHelper(user.id, { preferences: updatedPreferences })
                        setTwoFAEnabled(enabled)
                        setSettings({ ...settings, twoFactorEnabled: enabled })
                      } catch (err) {
                        console.error('2FA toggle error:', err)
                        alert('Failed to update 2FA setting')
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-cyan"></div>
                </label>
              </div>

              <div className="flex justify-end space-x-2 mt-4">
                <button onClick={() => setShow2FAModal(false)} className="px-4 py-2 bg-gray-600 text-white rounded">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default Profile