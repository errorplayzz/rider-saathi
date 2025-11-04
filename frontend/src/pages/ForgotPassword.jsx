// Template for ForgotPassword Page with Supabase

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ForgotPassword = () => {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const result = await resetPassword(email)
      
      if (result.success) {
        setSuccess(true)
        setEmail('')
      } else {
        setError(result.error || 'Failed to send reset email')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-glow max-w-md w-full p-8"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-2">Forgot Password</h1>
          <p className="text-gray-400">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">✉️</div>
            <p className="text-green-500 font-semibold">
              Password reset email sent!
            </p>
            <p className="text-gray-400 text-sm">
              Check your inbox for the password reset link.
              It may take a few minutes to arrive.
            </p>
            <Link
              to="/login"
              className="inline-block btn-neon mt-4"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500 rounded text-red-500 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-glow w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg focus:outline-none focus:border-accent-neon text-white"
                placeholder="Enter your email"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-neon py-3 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="text-center text-sm">
              <Link
                to="/login"
                className="text-accent-neon hover:underline"
              >
                ← Back to Login
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  )
}

export default ForgotPassword
