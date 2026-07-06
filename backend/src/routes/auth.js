import express from 'express'
import multer from 'multer'
import path from 'path'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import speakeasy from 'speakeasy'
import qrcode from 'qrcode'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import User from '../models/User.js'
import { auth } from '../middleware/auth.js'

const router = express.Router()

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
})

// Multer setup for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads', 'avatars'))
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const base = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`
    cb(null, `${base}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'))
    }
    cb(null, true)
  }
})

// Use a safe default secret in development if none is provided
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret'
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/

// In-memory store for demo emergency contacts when DB is disconnected
const demoEmergencyContacts = new Map()

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '12h'
  })
}

// @route   GET /api/auth/check-username/:username
// @desc    Check username availability
// @access  Public
router.get('/check-username/:username', async (req, res) => {
  try {
    const rawUsername = (req.params.username || '').toLowerCase().trim()
    if (!USERNAME_REGEX.test(rawUsername)) {
      return res.status(400).json({
        success: false,
        available: false,
        message: 'Username must be 3-20 chars and contain only lowercase letters, numbers, and underscore'
      })
    }

    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, available: true, message: 'Available (demo mode)' })
    }

    const existing = await User.findOne({ username: rawUsername }).select('_id')
    return res.json({
      success: true,
      available: !existing,
      message: existing ? 'Username already taken' : 'Username available'
    })
  } catch (error) {
    return res.status(500).json({ success: false, available: false, message: 'Failed to check username', error: error.message })
  }
})

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, phone, bikeDetails, username, state } = req.body
    const normalizedUsername = (username || '').toLowerCase().trim()

    if (!USERNAME_REGEX.test(normalizedUsername)) {
      return res.status(400).json({
        success: false,
        message: 'Valid username is required (3-20 lowercase letters/numbers/underscore)'
      })
    }

    // Ensure database is connected for real registrations
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database is not connected. Registration is unavailable.'
      })
    }

    // Regular database mode
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      })
    }

    const existingUsername = await User.findOne({ username: normalizedUsername }).select('_id')
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken'
      })
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      phone,
      bikeDetails,
      username: normalizedUsername,
      usernameLocked: true,
      state
    })

    await user.save()

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: user.getPublicProfile()
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    })
  }
})

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body

    // Require DB for real logins
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database is not connected. Login is unavailable.'
      })
    }

    // Regular database mode
    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      })
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      })
    }

    // Validate password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      })
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      return res.json({
        success: true,
        requires2FA: true,
        message: 'Please enter your 2FA code',
        email: user.email
      })
    }

    // Update user status
    user.isOnline = true
    await user.updateLastSeen()

    // Generate token
    const token = generateToken(user._id)

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.getPublicProfile()
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    })
  }
})

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      // Demo profile when DB disconnected
      return res.json({
        success: true,
        user: {
          _id: req.user.id || 'demo-user-id',
          id: req.user.id || 'demo-user-id',
          name: 'Demo Rider',
          email: 'demo@ridersathi.com',
          phone: '+1234567890',
          isActive: true,
          createdAt: new Date(),
          stats: { totalRides: 12, totalDistance: 24500, helpCount: 3, rewardPoints: 180 }
        }
      })
    }

    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    res.json({
      success: true,
      user: user.getPublicProfile()
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile',
      error: error.message
    })
  }
})

// @route   GET /api/auth/emergency-contacts
// @desc    Get user's emergency contacts
// @access  Private
router.get('/emergency-contacts', auth, async (req, res) => {
  try {
    // Demo mode: serve from in-memory map
    if (mongoose.connection.readyState !== 1) {
      const existing = demoEmergencyContacts.get(req.user.id) || [
        { name: 'Alice', phone: '+1234567890', relationship: 'Friend' },
        { name: 'Bob', phone: '+1987654321', relationship: 'Family' }
      ]
      demoEmergencyContacts.set(req.user.id, existing)
      return res.json({ success: true, contacts: existing })
    }

    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    return res.json({ success: true, contacts: user.emergencyContacts || [] })
  } catch (error) {
    console.error('Emergency contacts fetch error:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch contacts', error: error.message })
  }
})

// @route   POST /api/auth/emergency-contacts
// @desc    Add a new emergency contact
// @access  Private
router.post('/emergency-contacts', auth, async (req, res) => {
  try {
    const { name, phone, relationship } = req.body
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' })
    }

    // Demo mode: update in-memory list
    if (mongoose.connection.readyState !== 1) {
      const list = demoEmergencyContacts.get(req.user.id) || []
      list.push({ name, phone, relationship: relationship || 'Contact' })
      demoEmergencyContacts.set(req.user.id, list)
      return res.status(201).json({ success: true, contacts: list })
    }

    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    user.emergencyContacts = user.emergencyContacts || []
    user.emergencyContacts.push({ name, phone, relationship })
    await user.save()

    return res.status(201).json({ success: true, contacts: user.emergencyContacts })
  } catch (error) {
    console.error('Emergency contact add error:', error)
    res.status(500).json({ success: false, message: 'Failed to add contact', error: error.message })
  }
})

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const allowedUpdates = ['name', 'phone', 'bikeDetails', 'emergencyContacts', 'preferences', 'username', 'state']
    const updates = Object.keys(req.body)
    const isValidOperation = updates.every(update => allowedUpdates.includes(update))

    if (!isValidOperation) {
      return res.status(400).json({
        success: false,
        message: 'Invalid updates'
      })
    }

    if (mongoose.connection.readyState !== 1) {
      return res.json({
        success: true,
        message: 'Profile updated (demo mode)',
        user: {
          _id: req.user.id,
          id: req.user.id,
          name: req.body.name || 'Demo Rider',
          username: req.body.username || null,
          usernameLocked: !!req.body.username,
          state: req.body.state || null
        }
      })
    }

    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    if (updates.includes('username')) {
      const requestedUsername = (req.body.username || '').toLowerCase().trim()

      if (!USERNAME_REGEX.test(requestedUsername)) {
        return res.status(400).json({
          success: false,
          message: 'Username must be 3-20 chars and contain only lowercase letters, numbers and underscore'
        })
      }

      if (user.username && user.usernameLocked && user.username !== requestedUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username can be set only once and cannot be changed'
        })
      }

      const existing = await User.findOne({ username: requestedUsername, _id: { $ne: user._id } }).select('_id')
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        })
      }

      user.username = requestedUsername
      user.usernameLocked = true
    }

    updates.forEach(update => {
      if (update === 'username') return
      user[update] = req.body[update]
    })

    await user.save()

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    })
  } catch (error) {
    console.error('Profile update error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error updating profile',
      error: error.message
    })
  }
})

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (user) {
      user.isOnline = false
      user.isRiding = false
      await user.updateLastSeen()
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: error.message
    })
  }
})

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      })
    }

    const user = await User.findById(req.user.id).select('+password')
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      })
    }

    // Update password
    user.password = newPassword
    await user.save()

    res.json({
      success: true,
      message: 'Password changed successfully'
    })
  } catch (error) {
    console.error('Password change error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error changing password',
      error: error.message
    })
  }
})

// @route   PUT /api/auth/settings
// @desc    Update user settings/preferences
// @access  Private
router.put('/settings', auth, async (req, res) => {
  try {
    const { settings } = req.body

    if (!settings) {
      return res.status(400).json({ success: false, message: 'Settings are required' })
    }

    // Demo mode: store in in-memory map or return success when DB disconnected
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, message: 'Settings updated (demo mode)' })
    }

    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Map known frontend keys to stored preference fields
    const prefs = user.preferences || {}
    if (typeof settings.notifications !== 'undefined') prefs.notifications = !!settings.notifications
    if (typeof settings.locationSharing !== 'undefined') prefs.shareLocation = !!settings.locationSharing
    if (typeof settings.emergencyAlerts !== 'undefined') prefs.emergencyAlerts = !!settings.emergencyAlerts
    if (typeof settings.groupInvites !== 'undefined') prefs.groupInvites = !!settings.groupInvites
    if (typeof settings.rideRequests !== 'undefined') prefs.rideRequests = !!settings.rideRequests
    if (typeof settings.twoFactorEnabled !== 'undefined') prefs.twoFactorEnabled = !!settings.twoFactorEnabled

    user.preferences = prefs
    await user.save()

    res.json({ success: true, message: 'Settings updated successfully', preferences: user.preferences })
  } catch (error) {
    console.error('Settings update error:', error)
    res.status(500).json({ success: false, message: 'Failed to update settings', error: error.message })
  }
})

// @route   DELETE /api/auth/account
// @desc    Delete user account (Cascade delete associated data)
// @access  Private
router.delete('/account', auth, async (req, res) => {
  try {
    // In demo mode, return success
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, message: 'Account deleted (demo mode)' })
    }

    // Cascade delete associated data (GDPR Right to Erasure)
    const userId = req.user.id;
    
    // Dynamic import to prevent circular dependencies if they exist
    const EmergencyAlert = (await import('../models/EmergencyAlert.js')).default;
    const Blog = (await import('../models/Blog.js')).default;
    const MarketplaceListing = (await import('../models/MarketplaceListing.js')).default;
    const Message = (await import('../models/Message.js')).default;
    
    if (EmergencyAlert) await EmergencyAlert.deleteMany({ user: userId });
    if (Blog) await Blog.deleteMany({ author: userId });
    if (MarketplaceListing) await MarketplaceListing.deleteMany({ 'provider.user': userId });
    if (Message) await Message.deleteMany({ $or: [{ sender: userId }, { recipient: userId }] });

    // Remove user
    await User.findByIdAndDelete(userId)

    res.json({ success: true, message: 'Account and associated data deleted successfully' })
  } catch (error) {
    console.error('Account deletion error:', error)
    res.status(500).json({ success: false, message: 'Failed to delete account', error: error.message })
  }
})

// @route   GET /api/auth/export-data
// @desc    Export all user data (GDPR Right to Data Portability)
// @access  Private
router.get('/export-data', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const EmergencyAlert = (await import('../models/EmergencyAlert.js')).default;
    const alerts = EmergencyAlert ? await EmergencyAlert.find({ user: req.user.id }) : [];
    
    res.setHeader('Content-disposition', 'attachment; filename=userdata.json');
    res.setHeader('Content-type', 'application/json');
    
    const exportData = {
      profile: user,
      alerts
    };
    
    res.write(JSON.stringify(exportData, null, 2));
    res.end();
  } catch (error) {
    console.error('Data export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export data', error: error.message });
  }
})

// @route   POST /api/auth/forgot-password
// @desc    Trigger forgot password flow (sends reset email in production)
// @access  Public
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' })
    }

    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, message: 'If an account exists, a reset link has been sent to the provided email.' })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      // Return success anyway to prevent email enumeration
      return res.json({ success: true, message: 'If an account exists, a reset link has been sent to the provided email.' })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex')

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    // Set expire (15 minutes)
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000

    await user.save()

    // Create reset url
    const frontendURL = process.env.VITE_FRONTEND_URL || 'http://localhost:5173'
    const resetUrl = `${frontendURL}/reset-password/${resetToken}`

    // In a production app, send this via email. For now, log it.
    console.log(`[DEV MODE] Password Reset Link for ${user.email}: \n${resetUrl}`)

    return res.json({ success: true, message: 'If an account exists, a reset link has been sent to the provided email.' })
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({ success: false, message: 'Failed to process forgot password request', error: error.message })
  }
})

// @route   PUT /api/auth/reset-password/:resettoken
// @desc    Reset password using token
// @access  Public
router.put('/reset-password/:resettoken', async (req, res) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex')

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    })

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' })
    }

    const { password } = req.body
    if (!password) {
      return res.status(400).json({ success: false, message: 'New password is required' })
    }

    // Set new password (the pre-save hook will hash it and run validation)
    user.password = password
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined

    await user.save()

    res.json({ success: true, message: 'Password reset successful' })
  } catch (error) {
    // Check for validation error (e.g. password strength)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message)
      return res.status(400).json({ success: false, message: messages.join('. ') })
    }
    console.error('Reset password error:', error)
    res.status(500).json({ success: false, message: 'Failed to reset password', error: error.message })
  }
})

// @route   POST /api/auth/avatar
// @desc    Upload or update user avatar
// @access  Private
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' })
    }

    // Build accessible URL for frontend
    const avatarPath = `/uploads/avatars/${req.file.filename}`

    // Demo mode: if DB not connected, return the path
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, message: 'Avatar uploaded (demo)', avatar: avatarPath })
    }

    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    user.avatar = avatarPath
    await user.save()

    res.json({ success: true, message: 'Avatar updated', avatar: avatarPath })
  } catch (error) {
    console.error('Avatar upload error:', error)
    res.status(500).json({ success: false, message: 'Failed to upload avatar', error: error.message })
  }
})

// @route   GET /api/auth/nearby-users
// @desc    Get nearby online users
// @access  Private
router.get('/nearby-users', auth, async (req, res) => {
  try {
    const { longitude, latitude, radius = 10000 } = req.query

    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Longitude and latitude are required'
      })
    }

    const includeOffline = req.query.includeOffline === 'true' || req.query.includeOffline === '1'
    const nearbyUsers = await User.findNearby(
      parseFloat(longitude),
      parseFloat(latitude),
      parseInt(radius),
      { includeOffline }
    )

    // Filter out current user
    const filteredUsers = nearbyUsers.filter(user => 
      user._id.toString() !== req.user.id
    )

    res.json({
      success: true,
      users: filteredUsers,
      count: filteredUsers.length
    })
  } catch (error) {
    console.error('Nearby users error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error fetching nearby users',
      error: error.message
    })
  }
})

// @route   POST /api/auth/2fa/enable
// @desc    Enable 2FA and generate QR code
// @access  Private
router.post('/2fa/enable', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('+twoFactorSecret')
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is already enabled'
      })
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Rider Saathi (${user.email})`,
      issuer: 'Rider Saathi'
    })

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url)

    // Save secret temporarily (not enabled yet until verified)
    user.twoFactorSecret = secret.base32
    await user.save()

    res.json({
      success: true,
      message: '2FA secret generated. Please scan QR code and verify.',
      secret: secret.base32,
      qrCode: qrCodeUrl
    })
  } catch (error) {
    console.error('2FA enable error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error enabling 2FA',
      error: error.message
    })
  }
})

// @route   POST /api/auth/2fa/verify
// @desc    Verify and enable 2FA
// @access  Private
router.post('/2fa/verify', auth, async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      })
    }

    const user = await User.findById(req.user.userId).select('+twoFactorSecret')
    
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: 'Please enable 2FA first'
      })
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    })

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      })
    }

    // Enable 2FA
    user.twoFactorEnabled = true
    await user.save()

    res.json({
      success: true,
      message: '2FA enabled successfully'
    })
  } catch (error) {
    console.error('2FA verify error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error verifying 2FA',
      error: error.message
    })
  }
})

// @route   POST /api/auth/2fa/disable
// @desc    Disable 2FA
// @access  Private
router.post('/2fa/disable', auth, async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required to disable 2FA'
      })
    }

    const user = await User.findById(req.user.userId).select('+twoFactorSecret')
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled'
      })
    }

    // Verify token before disabling
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    })

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      })
    }

    // Disable 2FA
    user.twoFactorEnabled = false
    user.twoFactorSecret = undefined
    await user.save()

    res.json({
      success: true,
      message: '2FA disabled successfully'
    })
  } catch (error) {
    console.error('2FA disable error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error disabling 2FA',
      error: error.message
    })
  }
})

// @route   POST /api/auth/2fa/validate
// @desc    Validate 2FA token during login
// @access  Public (but requires email/password first)
router.post('/2fa/validate', async (req, res) => {
  try {
    const { email, token } = req.body

    if (!email || !token) {
      return res.status(400).json({
        success: false,
        message: 'Email and token are required'
      })
    }

    const user = await User.findOne({ email }).select('+twoFactorSecret')
    
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request'
      })
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    })

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      })
    }

    // Generate JWT token
    const jwtToken = generateToken(user._id)

    res.json({
      success: true,
      message: '2FA validation successful',
      token: jwtToken,
      user: user.getPublicProfile()
    })
  } catch (error) {
    console.error('2FA validate error:', error)
    res.status(500).json({
      success: false,
      message: 'Server error validating 2FA',
      error: error.message
    })
  }
})

export default router