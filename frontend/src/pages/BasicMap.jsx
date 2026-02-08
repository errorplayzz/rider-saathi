import React, { useState, useEffect } from 'react'

const BasicMap = () => {
  console.log('🗺️ BASIC MAP: Component starting')
  
  const [isMapReady, setIsMapReady] = useState(false)
  
  useEffect(() => {
    console.log('🗺️ BASIC MAP: Component mounted')
    
    // Simulate map loading
    const timer = setTimeout(() => {
      setIsMapReady(true)
      console.log('🗺️ BASIC MAP: Ready!')
    }, 1000)
    
    return () => {
      console.log('🗺️ BASIC MAP: Component unmounting')
      clearTimeout(timer)
    }
  }, [])
  
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-cyan-400">🗺️ Basic Map</h1>
        
        {isMapReady ? (
          <div className="space-y-4">
            <p className="text-green-400 text-xl">✅ Map is Ready!</p>
            <div className="bg-slate-800 p-6 rounded-lg space-y-2">
              <p>🛣️ Roads loading...</p>
              <p>📍 Getting location...</p>
              <p>🌐 Network connected</p>
            </div>
            
            <div className="bg-blue-900 p-4 rounded-lg">
              <p className="text-sm">Actual map will load here</p>
              <p className="text-xs text-gray-400">
                Component successfully mounted without crashes
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto"></div>
            <p className="text-cyan-400">Loading map...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default BasicMap