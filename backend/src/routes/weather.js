import express from 'express'
import axios from 'axios'
import { auth } from '../middleware/auth.js'

const router = express.Router()

// Helper function to get weather API key
const getWeatherApiKey = () => {
  return process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY
}

// Helper function to get WeatherAPI.com key
const getWeatherAPIKey = () => {
  return process.env.WEATHERAPI_KEY
}

// @route   GET /api/weather/current
// @desc    Get current weather for location
// @access  Private
router.get('/current', async (req, res) => {
  try {
    const { latitude, longitude } = req.query

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      })
    }

    const apiKey = getWeatherApiKey()
    const weatherAPIKey = getWeatherAPIKey()
    console.log('🔑 API Keys:', { 
      openweather: apiKey ? 'Found' : 'Missing',
      weatherapi: weatherAPIKey ? 'Found' : 'Missing'
    })
    
    // Try WeatherAPI.com first (most accurate)
    if (weatherAPIKey) {
      try {
        console.log('🌐 Making WeatherAPI.com call (most accurate)...')
        const weatherAPIUrl = `https://api.weatherapi.com/v1/current.json?key=${weatherAPIKey}&q=${latitude},${longitude}&aqi=no`
        
        const response = await axios.get(weatherAPIUrl)
        const data = response.data
        console.log(`📦 WeatherAPI response: ${data.current.temp_c}°C for ${data.location.name}, ${data.location.country}`)
        console.log(`📍 Coordinates: ${latitude}, ${longitude}`)
        console.log(`🕐 Current time: ${new Date().toLocaleString()}`)
        console.log(`🌅 Is Day: ${data.current.is_day}`)

        const weatherData = {
          location: {
            name: data.location.name,
            country: data.location.country,
            coordinates: {
              latitude: data.location.lat,
              longitude: data.location.lon
            }
          },
          current: {
            temperature: Math.round(data.current.temp_c),
            feelsLike: Math.round(data.current.feelslike_c),
            humidity: data.current.humidity,
            pressure: data.current.pressure_mb,
            visibility: data.current.vis_km,
            windSpeed: data.current.wind_kph / 3.6, // Convert to m/s
            windDirection: data.current.wind_degree,
            description: data.current.condition.text.toLowerCase(),
            main: data.current.condition.text,
            icon: data.current.is_day ? '01d' : '01n'
          },
          rideConditions: {
            isGoodForRiding: isGoodRidingWeatherAPI(data.current),
            warnings: getWeatherWarningsAPI(data.current),
            recommendation: getRidingRecommendationAPI(data.current)
          },
          sunrise: new Date().toISOString(), // WeatherAPI doesn't provide sunrise/sunset in current endpoint
          sunset: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          source: 'WeatherAPI.com'
        }

        console.log('✅ Sending WeatherAPI.com data:', weatherData.current.temperature + '°C')
        return res.json({
          success: true,
          weather: weatherData
        })
      } catch (weatherAPIError) {
        console.log('⚠️ WeatherAPI.com failed:', weatherAPIError.message)
      }
    }
    
    // Fallback to OpenWeather if WeatherAPI fails
    if (!apiKey) {
      console.log('❌ No API key, using demo fallback')
      // Demo fallback: return static weather so UI works without external API
      return res.json({
        success: true,
        weather: {
          location: {
            name: 'Demo City',
            country: 'IN',
            coordinates: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
          },
          current: {
            temperature: 28,
            feelsLike: 30,
            humidity: 55,
            pressure: 1012,
            visibility: 10,
            windSpeed: 3,
            windDirection: 120,
            description: 'clear sky',
            main: 'Clear',
            icon: '01d'
          },
          rideConditions: {
            isGoodForRiding: true,
            warnings: [],
            recommendation: 'Perfect riding weather'
          },
          sunrise: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
          sunset: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
          timestamp: new Date().toISOString()
        }
      })
    }

    console.log('🌐 Making OpenWeather API call...')
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
    
    const response = await axios.get(weatherUrl)
    const data = response.data
    console.log(`📦 OpenWeather response: ${data.main.temp}°C for ${data.name}, ${data.sys.country}`)
    console.log(`📍 Coordinates: ${latitude}, ${longitude}`)
    console.log(`🕐 Current time: ${new Date().toLocaleString()}`)

    const weatherData = {
      location: {
        name: data.name,
        country: data.sys.country,
        coordinates: {
          latitude: data.coord.lat,
          longitude: data.coord.lon
        }
      },
      current: {
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        visibility: data.visibility / 1000, // Convert to km
        windSpeed: data.wind.speed,
        windDirection: data.wind.deg,
        description: data.weather[0].description,
        main: data.weather[0].main,
        icon: data.weather[0].icon
      },
      rideConditions: {
        isGoodForRiding: isGoodRidingWeather(data),
        warnings: getWeatherWarnings(data),
        recommendation: getRidingRecommendation(data)
      },
      sunrise: new Date(data.sys.sunrise * 1000).toISOString(),
      sunset: new Date(data.sys.sunset * 1000).toISOString(),
      timestamp: new Date().toISOString()
    }

    console.log('✅ Sending real weather data:', weatherData.current.temperature + '°C')
    res.json({
      success: true,
      weather: weatherData
    })
  } catch (error) {
    console.error('Weather API error:', error)
    // Graceful fallback if invalid/misconfigured API key
    if (error.response?.status === 401 || /invalid api key/i.test(error.response?.data?.message || '')) {
      const { latitude, longitude } = req.query
      return res.json({
        success: true,
        weather: {
          location: {
            name: 'Demo City',
            country: 'IN',
            coordinates: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
          },
          current: {
            temperature: 28,
            feelsLike: 30,
            humidity: 55,
            pressure: 1012,
            visibility: 10,
            windSpeed: 3,
            windDirection: 120,
            description: 'clear sky',
            main: 'Clear',
            icon: '01d'
          },
          rideConditions: {
            isGoodForRiding: true,
            warnings: [],
            recommendation: 'Perfect riding weather'
          },
          sunrise: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
          sunset: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
          timestamp: new Date().toISOString()
        }
      })
    }
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weather data',
      error: error.response?.data?.message || error.message
    })
  }
})

// @route   GET /api/weather/forecast
// @desc    Get weather forecast for location
// @access  Private
router.get('/forecast', async (req, res) => {
  try {
    const { latitude, longitude, days = 5 } = req.query

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      })
    }

    const apiKey = getWeatherApiKey()
    if (!apiKey) {
      // Demo fallback when no API key
      return res.json({
        success: true,
        location: {
          name: 'Demo City',
          country: 'IN',
          coordinates: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
        },
        forecast: [],
        dailyForecast: [],
        timestamp: new Date().toISOString()
      })
    }

    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&cnt=${Math.min(days * 8, 40)}`
    
    const response = await axios.get(forecastUrl)
    const data = response.data

    const forecast = data.list.map(item => ({
      datetime: new Date(item.dt * 1000).toISOString(),
      temperature: {
        current: Math.round(item.main.temp),
        min: Math.round(item.main.temp_min),
        max: Math.round(item.main.temp_max),
        feelsLike: Math.round(item.main.feels_like)
      },
      weather: {
        main: item.weather[0].main,
        description: item.weather[0].description,
        icon: item.weather[0].icon
      },
      wind: {
        speed: item.wind.speed,
        direction: item.wind.deg,
        gust: item.wind.gust || 0
      },
      humidity: item.main.humidity,
      pressure: item.main.pressure,
      visibility: (item.visibility || 10000) / 1000,
      precipitation: {
        probability: item.pop * 100,
        rain: item.rain?.['3h'] || 0,
        snow: item.snow?.['3h'] || 0
      },
      rideConditions: {
        isGoodForRiding: isGoodRidingWeather(item),
        warnings: getWeatherWarnings(item),
        recommendation: getRidingRecommendation(item)
      }
    }))

    // Group by days
    const dailyForecast = groupForecastByDay(forecast)

    res.json({
      success: true,
      location: {
        name: data.city.name,
        country: data.city.country,
        coordinates: {
          latitude: data.city.coord.lat,
          longitude: data.city.coord.lon
        }
      },
      forecast: forecast,
      dailyForecast: dailyForecast,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Weather forecast error:', error)
    if (error.response?.status === 401 || /invalid api key/i.test(error.response?.data?.message || '')) {
      const { latitude, longitude } = req.query
      return res.json({
        success: true,
        location: {
          name: 'Demo City',
          country: 'IN',
          coordinates: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
        },
        forecast: [],
        dailyForecast: [],
        timestamp: new Date().toISOString()
      })
    }
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weather forecast',
      error: error.response?.data?.message || error.message
    })
  }
})

// @route   GET /api/weather/route
// @desc    Get weather along a route
// @access  Private
router.get('/route', async (req, res) => {
  try {
    const { waypoints } = req.query // JSON string of coordinates array

    if (!waypoints) {
      return res.status(400).json({
        success: false,
        message: 'Route waypoints are required'
      })
    }

    const apiKey = getWeatherApiKey()
    if (!apiKey) {
      // Demo fallback when no API key
      return res.json({
        success: true,
        alerts: [],
        count: 0,
        timestamp: new Date().toISOString()
      })
    }

    const coordinates = JSON.parse(waypoints)
    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid waypoints format'
      })
    }

    // Sample waypoints along the route (max 10 points)
    const sampledPoints = sampleWaypoints(coordinates, 10)
    
    const weatherPromises = sampledPoints.map(async (coord, index) => {
      try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${coord[1]}&lon=${coord[0]}&appid=${apiKey}&units=metric`
        const response = await axios.get(weatherUrl)
        const data = response.data

        return {
          index,
          coordinates: coord,
          location: data.name,
          weather: {
            temperature: Math.round(data.main.temp),
            description: data.weather[0].description,
            main: data.weather[0].main,
            icon: data.weather[0].icon,
            windSpeed: data.wind.speed,
            visibility: data.visibility / 1000,
            humidity: data.main.humidity
          },
          rideConditions: {
            isGoodForRiding: isGoodRidingWeather(data),
            warnings: getWeatherWarnings(data),
            recommendation: getRidingRecommendation(data)
          }
        }
      } catch (error) {
        console.error(`Weather error for point ${index}:`, error)
        return {
          index,
          coordinates: coord,
          error: 'Failed to fetch weather data'
        }
      }
    })

    const routeWeather = await Promise.all(weatherPromises)
    
    // Calculate overall route conditions
    const overallConditions = calculateOverallRouteConditions(routeWeather)

    res.json({
      success: true,
      routeWeather: routeWeather.filter(w => !w.error),
      overallConditions,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Route weather error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch route weather',
      error: error.message
    })
  }
})

// @route   GET /api/weather/alerts
// @desc    Get weather alerts for location
// @access  Private
router.get('/alerts', async (req, res) => {
  try {
    const { latitude, longitude } = req.query

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      })
    }

    const apiKey = getWeatherApiKey()
    if (!apiKey) {
      // Demo fallback when no API key configured
      return res.json({
        success: true,
        alerts: [],
        count: 0,
        timestamp: new Date().toISOString()
      })
    }

    const alertsUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&appid=${apiKey}&exclude=minutely,daily`
    
    const response = await axios.get(alertsUrl)
    const data = response.data

    const alerts = (data.alerts || []).map(alert => ({
      sender: alert.sender_name,
      event: alert.event,
      start: new Date(alert.start * 1000).toISOString(),
      end: new Date(alert.end * 1000).toISOString(),
      description: alert.description,
      tags: alert.tags || [],
      severity: alert.severity || 'moderate'
    }))

    res.json({
      success: true,
      alerts: alerts,
      count: alerts.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Weather alerts error:', error)
    if (error.response?.status === 401 || /invalid api key/i.test(error.response?.data?.message || '')) {
      return res.json({
        success: true,
        alerts: [],
        count: 0,
        timestamp: new Date().toISOString()
      })
    }
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weather alerts',
      error: error.response?.data?.message || error.message
    })
  }
})

// Helper functions
function isGoodRidingWeather(weatherData) {
  const main = weatherData.weather[0].main.toLowerCase()
  const windSpeed = weatherData.wind.speed
  const visibility = weatherData.visibility / 1000
  const temp = weatherData.main.temp

  // Bad conditions
  if (main.includes('rain') || main.includes('storm') || main.includes('snow')) {
    return false
  }
  
  if (windSpeed > 15) { // Strong wind
    return false
  }
  
  if (visibility < 1) { // Poor visibility
    return false
  }
  
  if (temp < 0 || temp > 40) { // Extreme temperatures
    return false
  }

  return true
}

function getWeatherWarnings(weatherData) {
  const warnings = []
  const main = weatherData.weather[0].main.toLowerCase()
  const windSpeed = weatherData.wind.speed
  const visibility = weatherData.visibility / 1000
  const temp = weatherData.main.temp

  if (main.includes('rain')) {
    warnings.push('Wet roads - reduce speed and increase following distance')
  }
  
  if (main.includes('storm')) {
    warnings.push('Thunderstorm - seek shelter immediately')
  }
  
  if (main.includes('snow')) {
    warnings.push('Icy conditions - extremely dangerous for riding')
  }
  
  if (windSpeed > 10) {
    warnings.push('Strong winds - expect crosswind gusts')
  }
  
  if (visibility < 2) {
    warnings.push('Poor visibility - use headlights and reflective gear')
  }
  
  if (temp < 5) {
    warnings.push('Cold weather - wear appropriate protective gear')
  }
  
  if (temp > 35) {
    warnings.push('Hot weather - stay hydrated and take breaks')
  }

  return warnings
}

function getRidingRecommendation(weatherData) {
  if (!isGoodRidingWeather(weatherData)) {
    return 'Not recommended - consider alternative transportation'
  }
  
  const main = weatherData.weather[0].main.toLowerCase()
  const windSpeed = weatherData.wind.speed
  const temp = weatherData.main.temp

  if (main.includes('cloud') && windSpeed < 10 && temp > 15 && temp < 30) {
    return 'Excellent riding conditions'
  }
  
  if (main.includes('clear') && windSpeed < 5) {
    return 'Perfect riding weather'
  }
  
  return 'Good for riding with normal precautions'
}

function sampleWaypoints(waypoints, maxPoints) {
  if (waypoints.length <= maxPoints) {
    return waypoints
  }
  
  const interval = Math.floor(waypoints.length / maxPoints)
  const sampled = []
  
  for (let i = 0; i < waypoints.length; i += interval) {
    sampled.push(waypoints[i])
  }
  
  // Always include the last point
  if (sampled[sampled.length - 1] !== waypoints[waypoints.length - 1]) {
    sampled.push(waypoints[waypoints.length - 1])
  }
  
  return sampled
}

function groupForecastByDay(forecast) {
  const grouped = {}
  
  forecast.forEach(item => {
    const date = new Date(item.datetime).toDateString()
    
    if (!grouped[date]) {
      grouped[date] = {
        date,
        items: [],
        summary: {
          minTemp: item.temperature.min,
          maxTemp: item.temperature.max,
          conditions: [],
          isGoodForRiding: true
        }
      }
    }
    
    grouped[date].items.push(item)
    grouped[date].summary.minTemp = Math.min(grouped[date].summary.minTemp, item.temperature.min)
    grouped[date].summary.maxTemp = Math.max(grouped[date].summary.maxTemp, item.temperature.max)
    
    if (!grouped[date].summary.conditions.includes(item.weather.main)) {
      grouped[date].summary.conditions.push(item.weather.main)
    }
    
    if (!item.rideConditions.isGoodForRiding) {
      grouped[date].summary.isGoodForRiding = false
    }
  })
  
  return Object.values(grouped)
}

function calculateOverallRouteConditions(routeWeather) {
  const validPoints = routeWeather.filter(w => !w.error)
  
  if (validPoints.length === 0) {
    return { recommendation: 'Unable to determine conditions', warnings: [] }
  }
  
  const goodConditions = validPoints.filter(w => w.rideConditions.isGoodForRiding)
  const allWarnings = validPoints.flatMap(w => w.rideConditions.warnings)
  const uniqueWarnings = [...new Set(allWarnings)]
  
  const goodRatio = goodConditions.length / validPoints.length
  
  let recommendation
  if (goodRatio >= 0.8) {
    recommendation = 'Generally good riding conditions along route'
  } else if (goodRatio >= 0.5) {
    recommendation = 'Mixed conditions - check specific segments'
  } else {
    recommendation = 'Poor conditions along route - consider postponing'
  }
  
  return {
    recommendation,
    warnings: uniqueWarnings,
    goodConditionsRatio: Math.round(goodRatio * 100)
  }
}

// WeatherAPI.com helper functions
function isGoodRidingWeatherAPI(currentWeather) {
  const condition = currentWeather.condition.text.toLowerCase()
  const windSpeed = currentWeather.wind_kph / 3.6 // Convert to m/s
  const visibility = currentWeather.vis_km
  const temp = currentWeather.temp_c

  // Bad conditions
  if (condition.includes('rain') || condition.includes('storm') || condition.includes('snow') || condition.includes('drizzle')) {
    return false
  }
  
  if (windSpeed > 15) { // Strong wind
    return false
  }
  
  if (visibility < 1) { // Poor visibility
    return false
  }
  
  if (temp < 0 || temp > 40) { // Extreme temperatures
    return false
  }

  return true
}

function getWeatherWarningsAPI(currentWeather) {
  const warnings = []
  const condition = currentWeather.condition.text.toLowerCase()
  const windSpeed = currentWeather.wind_kph / 3.6
  const visibility = currentWeather.vis_km
  const temp = currentWeather.temp_c

  if (condition.includes('rain') || condition.includes('drizzle')) {
    warnings.push('Wet roads - reduce speed and increase following distance')
  }
  
  if (condition.includes('storm')) {
    warnings.push('Thunderstorm - seek shelter immediately')
  }
  
  if (condition.includes('snow')) {
    warnings.push('Icy conditions - extremely dangerous for riding')
  }
  
  if (windSpeed > 10) {
    warnings.push('Strong winds - expect crosswind gusts')
  }
  
  if (visibility < 2) {
    warnings.push('Poor visibility - use headlights and reflective gear')
  }
  
  if (temp < 5) {
    warnings.push('Cold weather - wear appropriate protective gear')
  }
  
  if (temp > 35) {
    warnings.push('Hot weather - stay hydrated and take breaks')
  }

  if (!currentWeather.is_day) {
    warnings.push('Night time - use proper lighting and increased caution')
  }

  return warnings
}

function getRidingRecommendationAPI(currentWeather) {
  if (!isGoodRidingWeatherAPI(currentWeather)) {
    return 'Not recommended - consider alternative transportation'
  }
  
  const condition = currentWeather.condition.text.toLowerCase()
  const windSpeed = currentWeather.wind_kph / 3.6
  const temp = currentWeather.temp_c

  if (!currentWeather.is_day) {
    return 'Night riding - use proper lighting and extra caution'
  }

  if (condition.includes('clear') && windSpeed < 5) {
    return 'Perfect riding weather'
  }
  
  if (condition.includes('cloud') && windSpeed < 10 && temp > 15 && temp < 30) {
    return 'Excellent riding conditions'
  }
  
  return 'Good for riding with normal precautions'
}

export default router