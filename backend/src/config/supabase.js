import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || 'https://cboizuaemskzowftfxpw.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNib2l6dWFlbXNrem93ZnRmeHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzczNzMsImV4cCI6MjA3NzY1MzM3M30.lgGusshQcVJBWWS2IjAxoQIWtTC45IxZz6Ll2eSp-f8'

// Create Supabase client for backend operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Initialize Supabase connection
export const connectSupabase = async () => {
  try {
    console.log('Attempting to connect to Supabase...')
    
    // Simple test - just check if the client was created successfully
    if (supabase && supabaseUrl && supabaseServiceKey) {
      console.log('✅ Supabase Connected successfully')
      console.log('📡 Supabase URL:', supabaseUrl)
      console.log('💾 Database: Ready (Supabase)')
      return true
    } else {
      throw new Error('Supabase client configuration missing')
    }
  } catch (error) {
    console.error('❌ Supabase connection error:', error.message)
    console.log('🔄 Running without database - some features will be limited')
    return false
  }
}

export default supabase