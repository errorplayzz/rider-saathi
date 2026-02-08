import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon URLs used by React Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const LeafletMap = () => {
  console.log('🗺️ LEAFLET MAP: Starting with React-Leaflet')
  
  const [userLocation, setUserLocation] = useState(null)
  const [mapReady, setMapReady] = useState(false)
  const [locationError, setLocationError] = useState(null)
  
  // Default location (Delhi)
  const defaultLocation = [28.6139, 77.2090]
  const mapCenter = userLocation ? [userLocation.lat, userLocation.lng] : defaultLocation
  
  // Get user location
  useEffect(() => {
    console.log('🗺️ LEAFLET MAP: Getting user location...')
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          console.log('🗺️ LEAFLET MAP: Location found:', location)
          setUserLocation(location)
          setMapReady(true)
        },
        (error) => {
          console.log('🗺️ LEAFLET MAP: Location error, using default:', error.message)
          setLocationError(error.message)
          setMapReady(true) // Still show map with default location
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      )
    } else {
      console.log('🗺️ LEAFLET MAP: Geolocation not supported, using default')
      setLocationError('Geolocation not supported')
      setMapReady(true)
    }
  }, [])
  
  if (!mapReady) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="text-cyan-400">Getting your location...</p>
        </div>
      </div>
    )
  }
  
  console.log('🗺️ LEAFLET MAP: Rendering map component')
  
  return (
    <div className="h-screen w-full relative">
      <div className="absolute top-4 left-4 z-[1000] bg-black/70 text-white p-3 rounded-lg">
        <h3 className="text-sm font-bold">🗺️ Leaflet Map Test</h3>
        <p className="text-xs">
          {userLocation ? 
            `📍 Your location: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` :
            `📍 Default: Delhi, India`
          }
        </p>
        {locationError && (
          <p className="text-xs text-yellow-400">⚠️ {locationError}</p>
        )}
      </div>
      
      <MapContainer
        center={mapCenter}
        zoom={userLocation ? 15 : 10}
        className="h-full w-full"
        style={{ height: '100vh', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]}>
            <Popup>
              <div className="text-center">
                <strong>📍 Your Location</strong><br />
                Lat: {userLocation.lat.toFixed(6)}<br />
                Lng: {userLocation.lng.toFixed(6)}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}

export default LeafletMap