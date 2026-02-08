import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  UserIcon,
  EnvelopeIcon, 
  LockClosedIcon,
  PhoneIcon,
  EyeIcon,
  EyeSlashIcon,
  SparklesIcon,
  CheckCircleIcon
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
  const [focusedField, setFocusedField] = useState(null)

  const { register } = useAuth()
  const navigate = useNavigate()

  const DEFAULT_OTP = '654321'

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
    <div className="min-h-screen relative flex items-center justify-center px-4 py-20 overflow-hidden">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-blue-950/30 dark:to-slate-950" />
        <motion.div
          animate={{
            background: [
              'radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 80%, rgba(14, 165, 233, 0.08) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)'
            ]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDIpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header - Only show when NOT in email verification state */}
        {!showEmailVerification && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-2"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 backdrop-blur-xl border border-cyan-500/20 mb-4"
            >
              <SparklesIcon className="w-8 h-8 text-cyan-400" />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Join Rider Saathi
            </h1>
            <p className="text-slate-400 text-sm">
              Create your safety command center
            </p>
          </motion.div>
        )}

        {/* Email Verification Screen */}
        {showEmailVerification ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="relative group">
              {/* Glow Effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-cyan-600/20 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500" />
              
              {/* Glass Card */}
              <div className="relative bg-slate-900/40 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 shadow-2xl space-y-6">
                {/* Success Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="flex justify-center"
                >
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center ring-4 ring-emerald-500/10">
                    <CheckCircleIcon className="w-10 h-10 text-emerald-400" />
                  </div>
                </motion.div>

                {/* Title */}
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">
                    Verify Your Email
                  </h2>
                  <p className="text-slate-400 text-sm">
                    We've sent a verification link to
                  </p>
                  <p className="text-cyan-400 font-semibold text-sm">
                    {registeredEmail}
                  </p>
                </div>

                {/* Instructions */}
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 text-left space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">📧</span>
                    <div>
                      <p className="text-sm font-semibold text-white">Step 1</p>
                      <p className="text-xs text-slate-400">Check your email inbox</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-lg">🔗</span>
                    <div>
                      <p className="text-sm font-semibold text-white">Step 2</p>
                      <p className="text-xs text-slate-400">Click the verification link</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-lg">✅</span>
                    <div>
                      <p className="text-sm font-semibold text-white">Step 3</p>
                      <p className="text-xs text-slate-400">You'll be redirected to login</p>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="text-sm text-slate-400 space-y-1">
                  <p>Didn't receive the email?</p>
                  <p className="text-xs">Check your spam folder or{' '}
                    <button 
                      onClick={() => setShowEmailVerification(false)}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors underline"
                    >
                      try registering again
                    </button>
                  </p>
                </div>

                {/* Go to Login Button */}
                <motion.button
                  onClick={() => navigate('/login')}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full relative group overflow-hidden rounded-xl py-3.5 font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all duration-200"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600" />
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  <span className="relative text-white">Go to Login Page</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Registration Form */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <div className="relative group">
                {/* Glow Effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500" />
                
                {/* Glass Card */}
                <form
                  onSubmit={handleSubmit}
                  className="relative bg-slate-900/40 dark:bg-slate-950/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 shadow-2xl space-y-5"
                >
                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm overflow-hidden"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Name Input */}
                  <div className="space-y-2">
                    <label 
                      htmlFor="name" 
                      className="block text-xs font-medium text-slate-400 uppercase tracking-wider"
                    >
                      Full Name
                    </label>
                    <div className="relative group">
                      <UserIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200 ${
                        focusedField === 'name' ? 'text-cyan-400' : 'text-slate-500'
                      }`} />
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:bg-slate-900/70 outline-none transition-all duration-200"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

                  {/* Email Input */}
                  <div className="space-y-2">
                    <label 
                      htmlFor="email" 
                      className="block text-xs font-medium text-slate-400 uppercase tracking-wider"
                    >
                      Email Address
                    </label>
                    <div className="relative group">
                      <EnvelopeIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200 ${
                        focusedField === 'email' ? 'text-cyan-400' : 'text-slate-500'
                      }`} />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:bg-slate-900/70 outline-none transition-all duration-200"
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>

                  {/* Phone Input with OTP */}
                  <div className="space-y-2">
                    <label 
                      htmlFor="phone" 
                      className="block text-xs font-medium text-slate-400 uppercase tracking-wider"
                    >
                      Phone Number 
                      {isOtpVerified && (
                        <span className="ml-2 text-emerald-400 text-xs normal-case">
                          <CheckCircleIcon className="w-4 h-4 inline-block mr-1" />
                          Verified
                        </span>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1 group">
                        <PhoneIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200 ${
                          focusedField === 'phone' ? 'text-cyan-400' : 'text-slate-500'
                        }`} />
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={handleChange}
                          onFocus={() => setFocusedField('phone')}
                          onBlur={() => setFocusedField(null)}
                          disabled={isOtpVerified}
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:bg-slate-900/70 outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Your phone number"
                        />
                      </div>
                      <motion.button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isOtpVerified || !formData.phone}
                        whileHover={{ scale: isOtpVerified ? 1 : 1.02 }}
                        whileTap={{ scale: isOtpVerified ? 1 : 0.98 }}
                        className={`px-5 py-3.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
                          isOtpVerified 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20'
                        }`}
                      >
                        {isOtpVerified ? 'Verified' : 'Send OTP'}
                      </motion.button>
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-2">
                    <label 
                      htmlFor="password" 
                      className="block text-xs font-medium text-slate-400 uppercase tracking-wider"
                    >
                      Password
                    </label>
                    <div className="relative group">
                      <LockClosedIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200 ${
                        focusedField === 'password' ? 'text-cyan-400' : 'text-slate-500'
                      }`} />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={handleChange}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        className="w-full pl-12 pr-12 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:bg-slate-900/70 outline-none transition-all duration-200"
                        placeholder="Create a strong password"
                      />
                      <motion.button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
                      >
                        {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                      </motion.button>
                    </div>
                  </div>

                  {/* Confirm Password Input */}
                  <div className="space-y-2">
                    <label 
                      htmlFor="confirmPassword" 
                      className="block text-xs font-medium text-slate-400 uppercase tracking-wider"
                    >
                      Confirm Password
                    </label>
                    <div className="relative group">
                      <LockClosedIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200 ${
                        focusedField === 'confirmPassword' ? 'text-cyan-400' : 'text-slate-500'
                      }`} />
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        onFocus={() => setFocusedField('confirmPassword')}
                        onBlur={() => setFocusedField(null)}
                        className="w-full pl-12 pr-12 py-3.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:bg-slate-900/70 outline-none transition-all duration-200"
                        placeholder="Re-enter your password"
                      />
                      <motion.button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
                      >
                        {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                      </motion.button>
                    </div>
                  </div>

                  {/* Terms Checkbox */}
                  <div className="flex items-start gap-3">
                    <input
                      id="terms"
                      type="checkbox"
                      required
                      className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/20 focus:ring-2 transition-all"
                    />
                    <label htmlFor="terms" className="text-sm text-slate-400 cursor-pointer hover:text-slate-300 transition-colors">
                      I agree to the{' '}
                      <Link to="/terms" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.02, y: loading ? 0 : -2 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    className={`w-full relative group overflow-hidden rounded-xl py-3.5 font-semibold transition-all duration-200 ${
                      loading ? 'opacity-60 cursor-not-allowed' : 'shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600" />
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <span className="relative text-white flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Creating Account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </span>
                  </motion.button>
                </form>
              </div>
            </motion.div>

            {/* Footer Links */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center text-sm"
            >
              <p className="text-slate-400">
                Already have an account?{' '}
                <Link 
                  to="/login" 
                  className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </motion.div>
          </>
        )}

        {/* OTP Verification Modal */}
        <AnimatePresence>
          {showOtpVerification && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md"
              >
                <div className="relative group">
                  {/* Glow Effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/30 to-blue-600/30 rounded-2xl blur opacity-50 group-hover:opacity-75 transition duration-500" />
                  
                  {/* Glass Card */}
                  <div className="relative bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 shadow-2xl space-y-6">
                    <h3 className="text-2xl font-bold text-white">Verify Phone Number</h3>
                    
                    <p className="text-slate-400 text-sm">
                      Enter the 6-digit OTP sent to{' '}
                      <span className="text-cyan-400 font-semibold">{formData.phone}</span>
                    </p>

                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
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
                        placeholder="000000"
                        className="w-full px-4 py-4 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white text-center text-2xl tracking-widest placeholder-slate-600 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                        autoFocus
                      />
                    </div>

                    {otpError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-sm overflow-hidden"
                      >
                        {otpError}
                      </motion.div>
                    )}

                    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3">
                      <p className="text-xs text-slate-300">
                        <span className="text-cyan-400 font-bold">💡 Test Mode:</span> Use OTP{' '}
                        <span className="font-mono text-cyan-400 font-bold">654321</span> for verification
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <motion.button
                        onClick={handleVerifyOtp}
                        disabled={otp.length !== 6}
                        whileHover={{ scale: otp.length === 6 ? 1.02 : 1 }}
                        whileTap={{ scale: otp.length === 6 ? 0.98 : 1 }}
                        className={`flex-1 relative group overflow-hidden rounded-xl py-3.5 font-semibold transition-all ${
                          otp.length !== 6 ? 'opacity-50 cursor-not-allowed' : 'shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40'
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600" />
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        <span className="relative text-white">Verify OTP</span>
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          setShowOtpVerification(false)
                          setOtp('')
                          setOtpError('')
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
                      >
                        Cancel
                      </motion.button>
                    </div>

                    <button
                      onClick={handleSendOtp}
                      className="w-full text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Resend OTP
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default Register