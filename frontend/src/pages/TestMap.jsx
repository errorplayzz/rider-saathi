import React from 'react'
import { useAuth } from '../contexts/AuthContext'

const TestMap = () => {
  const { user, profile } = useAuth()
  
  console.log('🧪 TEST MAP COMPONENT LOADED')
  console.log('🧪 Current URL:', window.location.pathname)
  console.log('🧪 Auth state:', { user: !!user, profile: !!profile })
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-cyan-400">🗺️ Test Map Page</h1>
        <p className="text-lg">This is a simplified test of the Map route</p>
        <div className="bg-slate-800 p-4 rounded-lg">
          <p>✅ Map route is working!</p>
          <p>✅ Authentication: {user ? 'Active' : 'None'}</p>
          <p>✅ Profile: {profile ? 'Loaded' : 'Loading...'}</p>
        </div>
        <button 
          onClick={() => console.log('🧪 Map button clicked, no redirects!')}
          className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg"
        >
          Test Button (Check Console)
        </button>
      </div>
    </div>
  )
}

export default TestMap