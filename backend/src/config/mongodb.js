import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rider-sathi'

export const connectMongoDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...')
    
    await mongoose.connect(MONGODB_URI, {
      // Remove deprecated options
      // useNewUrlParser and useUnifiedTopology are no longer needed in Mongoose 6+
    })
    
    console.log('✅ MongoDB Connected successfully')
    console.log('📡 MongoDB URI:', MONGODB_URI.replace(/\/\/.*@/, '//***@')) // Hide credentials in log
    console.log('💾 Database: Ready (MongoDB)')
    return true
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message)
    console.log('🔄 Running without MongoDB - 2FA and user auth features will be limited')
    return false
  }
}

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB')
})

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err)
})

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB')
})

// Handle process termination
process.on('SIGINT', async () => {
  await mongoose.connection.close()
  console.log('MongoDB connection closed due to app termination')
  process.exit(0)
})

export default mongoose
