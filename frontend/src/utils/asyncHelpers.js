/**
 * Async utilities for safe operations with timeouts and error handling
 */

/**
 * Wraps a promise with a timeout to prevent infinite loading
 * @param {Promise} promise - The promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds (default: 10000)
 * @param {string} operation - Name of the operation for error messages
 * @returns {Promise} Promise that resolves or rejects within the timeout
 */
export const withTimeout = (promise, timeoutMs = 10000, operation = 'operation') => {
  return new Promise((resolve, reject) => {
    // Set up timeout
    const timeoutId = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    // Race between promise and timeout
    promise
      .then((result) => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

/**
 * Creates a safe async function that always completes within a timeout
 * @param {Function} asyncFn - The async function to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {any} fallbackValue - Value to return if timeout or error occurs
 * @param {string} operation - Name of the operation for logging
 * @returns {Function} Safe async function
 */
export const createSafeAsync = (asyncFn, timeoutMs = 10000, fallbackValue = null, operation = 'operation') => {
  return async (...args) => {
    try {
      return await withTimeout(asyncFn(...args), timeoutMs, operation)
    } catch (error) {
      console.warn(`Safe async ${operation} failed:`, error.message)
      return fallbackValue
    }
  }
}

/**
 * Safe fetch with timeout and retry logic
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise} Fetch promise with timeout
 */
export const safeFetch = async (url, options = {}, timeoutMs = 8000, maxRetries = 2) => {
  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return response
    } catch (error) {
      lastError = error
      
      if (attempt < maxRetries) {
        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
    }
  }

  throw lastError
}

/**
 * Debounce function to prevent excessive API calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Creates a geolocation promise with timeout
 * @param {object} options - Geolocation options
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise} Geolocation promise
 */
export const getLocationWithTimeout = (options = {}, timeoutMs = 10000) => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'))
      return
    }

    const timeoutId = setTimeout(() => {
      reject(new Error(`Geolocation timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId)
        resolve(position)
      },
      (error) => {
        clearTimeout(timeoutId)
        reject(error)
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs - 1000, // Leave buffer for our timeout
        maximumAge: 300000, // 5 minutes cache
        ...options
      }
    )
  })
}