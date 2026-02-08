/**
 * Geo-spatial utility functions for distance calculations and radius filtering
 */

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate bearing (direction) from point A to point B
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Bearing in degrees (0-360)
 */
function calculateBearing(lat1, lng1, lat2, lng2) {
  const dLng = toRadians(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRadians(lat2));
  const x = Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
            Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLng);
  
  let bearing = toDegrees(Math.atan2(y, x));
  bearing = (bearing + 360) % 360; // Normalize to 0-360
  
  return Math.round(bearing);
}

/**
 * Get compass direction from bearing
 * @param {number} bearing - Bearing in degrees (0-360)
 * @returns {string} Compass direction (N, NE, E, SE, S, SW, W, NW)
 */
function getCompassDirection(bearing) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((bearing % 360) / 45)) % 8;
  return directions[index];
}

/**
 * Check if a point is within radius of another point
 * @param {number} lat1 - Latitude of center point
 * @param {number} lng1 - Longitude of center point
 * @param {number} lat2 - Latitude of point to check
 * @param {number} lng2 - Longitude of point to check
 * @param {number} radiusKm - Radius in kilometers
 * @returns {boolean} True if point is within radius
 */
function isWithinRadius(lat1, lng1, lat2, lng2, radiusKm) {
  const distance = calculateDistance(lat1, lng1, lat2, lng2);
  return distance <= radiusKm;
}

/**
 * Filter riders by relationship and distance rules
 * @param {Object} currentUser - Current user object with location
 * @param {Array} riders - Array of rider objects with location
 * @param {Array} friendIds - Array of friend user IDs
 * @returns {Array} Filtered riders with distance and relationship info
 */
function filterRidersByProximity(currentUser, riders, friendIds = []) {
  const STRANGER_RADIUS_KM = 5;
  const FRIEND_RADIUS_KM = 15;
  
  const userLat = currentUser.location?.coordinates[1];
  const userLng = currentUser.location?.coordinates[0];
  
  if (!userLat || !userLng) {
    return [];
  }
  
  return riders
    .map(rider => {
      const riderLat = rider.location?.coordinates[1];
      const riderLng = rider.location?.coordinates[0];
      
      if (!riderLat || !riderLng) {
        return null;
      }
      
      const distance = calculateDistance(userLat, userLng, riderLat, riderLng);
      const isFriend = friendIds.includes(rider.userId?._id?.toString() || rider.userId?.toString());
      const maxRadius = isFriend ? FRIEND_RADIUS_KM : STRANGER_RADIUS_KM;
      
      // Check visibility
      if (!rider.visibility?.visibleToNearby && !isFriend) {
        return null;
      }
      
      if (!rider.visibility?.visibleToFriends && isFriend) {
        return null;
      }
      
      // Apply radius rules
      if (distance > maxRadius) {
        return null;
      }
      
      const bearing = calculateBearing(userLat, userLng, riderLat, riderLng);
      const direction = getCompassDirection(bearing);
      
      return {
        userId: rider.userId?._id || rider.userId,
        name: isFriend ? rider.userId?.name : anonymizeName(rider.userId?.name),
        distance: distance,
        distanceText: formatDistance(distance),
        direction,
        bearing,
        isFriend,
        location: {
          lat: riderLat,
          lng: riderLng
        },
        heading: rider.heading,
        speed: rider.speed,
        status: rider.status,
        bike: isFriend ? rider.userId?.bike : null,
        avatar: isFriend ? rider.userId?.avatar : null,
        isOnline: rider.userId?.isOnline || false,
        lastUpdate: rider.updatedAt
      };
    })
    .filter(rider => rider !== null)
    .sort((a, b) => a.distance - b.distance); // Sort by distance
}

/**
 * Anonymize name for strangers
 * @param {string} name - Full name
 * @returns {string} Anonymized name
 */
function anonymizeName(name) {
  if (!name) return 'Rider';
  const parts = name.split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0) + '***';
  }
  return parts[0].charAt(0) + '*** ' + parts[parts.length - 1].charAt(0) + '***';
}

/**
 * Format distance for display
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted distance string
 */
function formatDistance(distanceKm) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Validate coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} True if valid
 */
function isValidCoordinates(lat, lng) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export {
  calculateDistance,
  calculateBearing,
  getCompassDirection,
  isWithinRadius,
  filterRidersByProximity,
  anonymizeName,
  formatDistance,
  isValidCoordinates
};
