import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  UserIcon,
  EnvelopeIcon, 
  LockClosedIcon,
  PhoneIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [showOtpVerification, setShowOtpVerification] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [isOtpVerified, setIsOtpVerified] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  const DEFAULT_OTP = '654321' // default OTP for testing only (do not use in production)

  const handleSendOtp = () => {
  // Basic phone number validation
    if (!formData.phone || formData.phone.length < 10) {
      setError('Please enter a valid phone number')
      return
    }

  // Show the OTP verification modal to enter the code
    setShowOtpVerification(true)
    setError('')
  // In production, send the OTP using an SMS provider or verification service
    console.log('OTP sent to:', formData.phone, 'OTP:', DEFAULT_OTP)
    alert(`OTP sent to ${formData.phone}. For testing, use: ${DEFAULT_OTP}`)
  }

  const handleVerifyOtp = () => {
    if (otp === DEFAULT_OTP) {
      setIsOtpVerified(true)
      setShowOtpVerification(false)
      setOtpError('')
      setOtp('')
      alert('✅ Phone number verified successfully!')
    } else {
      setOtpError('Invalid OTP. Please try again.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

  // Ensure the phone OTP has been verified before allowing registration
    if (!isOtpVerified) {
      setError('Please verify your phone number with OTP first')
      return
    }

  // Validate password and other form fields
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)

    const result = await register({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password
    })
    
    if (result.success) {
  // Show an email verification message instead of navigating immediately
      setRegisteredEmail(formData.email)
      setShowEmailVerification(true)
    } else {
      setError(result.error || 'Registration failed')
    }
    
    setLoading(false)
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full space-y-8">
        {/* Email Verification Screen */}
        {showEmailVerification ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="card-glow p-8 space-y-6">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Verify Your Email
                </h2>
                <p className="text-gray-400">
                  We've sent a verification link to
                </p>
                <p className="text-accent-neon font-semibold mt-1">
                  {registeredEmail}
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-dark-800 border border-gray-700 rounded-lg p-4 text-left space-y-2">
                <p className="text-sm text-gray-300">
                  <span className="font-semibold text-white">📧 Step 1:</span> Check your email inbox
                </p>
                <p className="text-sm text-gray-300">
                  <span className="font-semibold text-white">🔗 Step 2:</span> Click the verification link
                </p>
                <p className="text-sm text-gray-300">
                  <span className="font-semibold text-white">✅ Step 3:</span> You'll be redirected to login
                </p>
              </div>

              {/* Additional Info */}
              <div className="text-sm text-gray-400">
                <p>Didn't receive the email?</p>
                <p className="mt-1">Check your spam folder or</p>
                <button 
                  onClick={() => setShowEmailVerification(false)}
                  className="text-accent-neon hover:underline mt-2"
                >
                  try registering again
                </button>
              </div>

              {/* Go to Login Button */}
              <div className="pt-4">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full btn-neon bg-accent-neon hover:bg-accent-neon/80 text-dark-900 font-semibold py-3 rounded-lg transition-all"
                >
                  Go to Login Page
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Registration Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h2 className="text-3xl font-orbitron font-bold text-white">
                Join Rider Saathi
              </h2>
              <p className="mt-2 text-gray-400">
                Create your account to start riding smart
              </p>
            </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="card-glow space-y-6"
        >
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 bg-dark-600 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-neon-cyan focus:outline-none transition-colors"
                placeholder="Enter your full name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <EnvelopeIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 bg-dark-600 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-neon-cyan focus:outline-none transition-colors"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number {isOtpVerified && <span className="text-green-400 text-xs ml-2">✓ Verified</span>}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <PhoneIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isOtpVerified}
                  className="w-full pl-10 pr-4 py-3 bg-dark-600 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-neon-cyan focus:outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="Enter your phone number"
                />
              </div>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isOtpVerified || !formData.phone}
                className="px-4 py-3 bg-neon-cyan text-dark-800 font-semibold rounded hover:bg-opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isOtpVerified ? 'Verified' : 'Send OTP'}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <LockClosedIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-12 py-3 bg-dark-600 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-neon-cyan focus:outline-none transition-colors"
                placeholder="Create a password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <LockClosedIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-12 py-3 bg-dark-600 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-neon-cyan focus:outline-none transition-colors"
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="terms"
              type="checkbox"
              required
              className="w-4 h-4 text-neon-cyan bg-dark-600 border-gray-600 rounded focus:ring-neon-cyan focus:ring-2"
            />
            <label htmlFor="terms" className="ml-2 text-sm text-gray-300">
              I agree to the{' '}
              <Link to="/terms" className="text-neon-cyan hover:text-neon-purple transition-colors">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-neon-cyan hover:text-neon-purple transition-colors">
                Privacy Policy
              </Link>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 bg-neon-cyan text-dark-800 font-semibold rounded hover:bg-neon-cyan/80 transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <p className="text-gray-400">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="text-neon-cyan hover:text-neon-purple transition-colors font-medium"
            >
              Sign in here
            </Link>
          </p>
        </motion.div>

        {/* Features Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-glow border-neon-purple/30"
        >
          <h3 className="text-sm font-semibold text-neon-purple mb-3">What you'll get:</h3>
          <ul className="text-xs text-gray-300 space-y-1">
            <li>• Real-time GPS tracking and navigation</li>
            <li>• Emergency assistance and alerts</li>
            <li>• Group chat with nearby riders</li>
            <li>• Weather and road condition updates</li>
            <li>• Rewards for helping other riders</li>
            <li>• AI-powered ride companion</li>
          </ul>
        </motion.div>
          </>
        )}

        {/* OTP Verification Modal */}
        {showOtpVerification && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-dark-800 rounded-lg p-6 w-full max-w-md border border-neon-cyan/30"
            >
              <h3 className="text-xl font-bold text-white mb-4">Verify Phone Number</h3>
              
              <p className="text-gray-300 text-sm mb-4">
                Enter the 6-digit OTP sent to <span className="text-neon-cyan font-semibold">{formData.phone}</span>
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Enter OTP
                </label>
                <input
                  type="text"
                  maxLength="6"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ''))
                    setOtpError('')
                  }}
                  placeholder="654321"
                  className="w-full px-4 py-3 bg-dark-600 border border-gray-600 rounded text-white text-center text-2xl tracking-widest placeholder-gray-500 focus:border-neon-cyan focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              {otpError && (
                <div className="mb-4 bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-2 rounded text-sm">
                  {otpError}
                </div>
              )}

              <div className="bg-neon-cyan/10 border border-neon-cyan/30 rounded p-3 mb-4">
                <p className="text-xs text-gray-300">
                  💡 <strong>Test Mode:</strong> Use OTP <span className="font-mono text-neon-cyan font-bold">654321</span> for verification
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleVerifyOtp}
                  disabled={otp.length !== 6}
                  className="flex-1 px-4 py-3 bg-neon-cyan text-dark-800 font-semibold rounded hover:bg-opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify OTP
                </button>
                <button
                  onClick={() => {
                    setShowOtpVerification(false)
                    setOtp('')
                    setOtpError('')
                  }}
                  className="px-4 py-3 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>

              <button
                onClick={handleSendOtp}
                className="w-full mt-3 text-sm text-neon-cyan hover:text-neon-purple transition-colors"
              >
                Resend OTP
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Register