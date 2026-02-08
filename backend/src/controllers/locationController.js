import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import LiveLocation from '../models/LiveLocation.js';
const FriendRequest = require('../models/FriendRequest.js');

import { calculateDistance, filterRidersByProximity, isValidCoordinates } from '../utils/geoUtils.js';

/**
 * Update user's live location
 * @route POST /api/location/update
 */
export const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude, heading, speed, accuracy } = req.body;
    const userId = req.user._id;

    // Validate coordinates
    if (!isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates provided'
      });
    }

    // Find or create live location record
    let liveLocation = await LiveLocation.findOne({ userId });

    if (liveLocation) {
      // Update existing location
      liveLocation.location.coordinates = [longitude, latitude];
      liveLocation.heading = heading || liveLocation.heading;
      liveLocation.speed = speed !== undefined ? speed : liveLocation.speed;
      liveLocation.accuracy = accuracy || liveLocation.accuracy;
      
      // Auto-update status based on speed
      if (speed !== undefined) {
        liveLocation.status = speed > 5 ? 'moving' : speed > 0 ? 'stopped' : 'idle';
      }
      
      await liveLocation.save();
    } else {
      // Create new location record
      liveLocation = await LiveLocation.create({
        userId,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        heading: heading || 0,
        speed: speed || 0,
        accuracy: accuracy || 10,
        status: speed > 5 ? 'moving' : 'idle'
      });
    }

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('location:updated', {
        userId: userId.toString(),
        location: {
          lat: latitude,
          lng: longitude
        },
        heading: liveLocation.heading,
        speed: liveLocation.speed,
        status: liveLocation.status
      });
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        latitude,
        longitude,
        heading: liveLocation.heading,
        speed: liveLocation.speed,
        status: liveLocation.status,
        updatedAt: liveLocation.updatedAt
      }
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  }
};

/**
 * Get nearby riders with friend/stranger filtering
 * @route GET /api/location/nearby
 */
export const getNearbyRiders = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get current user's location
    const currentLocation = await LiveLocation.findOne({ userId })
      .populate('userId', 'name email bike avatar isOnline');
    
    if (!currentLocation) {
      return res.status(404).json({
        success: false,
        message: 'Your location not found. Please update your location first.'
      });
    }

    const userLat = currentLocation.location.coordinates[1];
    const userLng = currentLocation.location.coordinates[0];

    // Get user's friends
    const friendRequests = await FriendRequest.find({
      $or: [
        { senderId: userId, status: 'accepted' },
        { receiverId: userId, status: 'accepted' }
      ]
    });

    const friendIds = friendRequests.map(fr => 
      fr.senderId.toString() === userId.toString() 
        ? fr.receiverId.toString() 
        : fr.senderId.toString()
    );

    // Get all nearby riders (max 15km for friends)
    const nearbyRiders = await LiveLocation.findNearby(userLat, userLng, 15, {
      excludeUserId: userId,
      visibleOnly: true
    });

    // Filter and format riders based on friend/stranger rules
    const filteredRiders = filterRidersByProximity(
      currentLocation,
      nearbyRiders,
      friendIds
    );

    res.json({
      success: true,
      data: {
        riders: filteredRiders,
        total: filteredRiders.length,
        friends: filteredRiders.filter(r => r.isFriend).length,
        strangers: filteredRiders.filter(r => !r.isFriend).length
      }
    });
  } catch (error) {
    console.error('Get nearby riders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get nearby riders',
      error: error.message
    });
  }
};

/**
 * Get specific rider's location (if visible)
 * @route GET /api/location/rider/:riderId
 */
export const getRiderLocation = async (req, res) => {
  try {
    const { riderId } = req.params;
    const userId = req.user._id;

    // Get current user's location
    const currentLocation = await LiveLocation.findOne({ userId });
    
    if (!currentLocation) {
      return res.status(404).json({
        success: false,
        message: 'Your location not found'
      });
    }

    // Get rider's location
    const riderLocation = await LiveLocation.findByUserId(riderId);
    
    if (!riderLocation) {
      return res.status(404).json({
        success: false,
        message: 'Rider location not found'
      });
    }

    // Check if they are friends
    const friendship = await FriendRequest.findOne({
      $or: [
        { senderId: userId, receiverId: riderId, status: 'accepted' },
        { senderId: riderId, receiverId: userId, status: 'accepted' }
      ]
    });

    const isFriend = !!friendship;
    const maxRadius = isFriend ? 15 : 5;

    // Calculate distance
    const userLat = currentLocation.location.coordinates[1];
    const userLng = currentLocation.location.coordinates[0];
    const riderLat = riderLocation.location.coordinates[1];
    const riderLng = riderLocation.location.coordinates[0];
    
    const distance = calculateDistance(userLat, userLng, riderLat, riderLng);

    // Check visibility
    if (distance > maxRadius) {
      return res.status(403).json({
        success: false,
        message: 'Rider is outside your visibility range'
      });
    }

    if (!riderLocation.visibility.visibleToNearby && !isFriend) {
      return res.status(403).json({
        success: false,
        message: 'Rider has disabled visibility to nearby riders'
      });
    }

    res.json({
      success: true,
      data: {
        userId: riderLocation.userId._id,
        name: isFriend ? riderLocation.userId.name : null,
        location: {
          lat: riderLat,
          lng: riderLng
        },
        distance,
        isFriend,
        heading: riderLocation.heading,
        speed: riderLocation.speed,
        status: riderLocation.status,
        bike: isFriend ? riderLocation.userId.bike : null,
        lastUpdate: riderLocation.updatedAt
      }
    });
  } catch (error) {
    console.error('Get rider location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get rider location',
      error: error.message
    });
  }
};

/**
 * Update visibility settings
 * @route PUT /api/location/visibility
 */
export const updateVisibility = async (req, res) => {
  try {
    const { visibleToFriends, visibleToNearby, emergencyMode } = req.body;
    const userId = req.user._id;

    const liveLocation = await LiveLocation.findOne({ userId });

    if (!liveLocation) {
      return res.status(404).json({
        success: false,
        message: 'Location record not found. Please update your location first.'
      });
    }

    // Update visibility settings
    if (visibleToFriends !== undefined) {
      liveLocation.visibility.visibleToFriends = visibleToFriends;
    }
    
    if (visibleToNearby !== undefined) {
      liveLocation.visibility.visibleToNearby = visibleToNearby;
    }
    
    if (emergencyMode !== undefined) {
      liveLocation.visibility.emergencyMode = emergencyMode;
      
      // In emergency mode, override visibility settings
      if (emergencyMode) {
        liveLocation.visibility.visibleToFriends = true;
        liveLocation.visibility.visibleToNearby = true;
      }
    }

    await liveLocation.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('visibility:updated', {
        userId: userId.toString(),
        visibility: liveLocation.visibility
      });
    }

    res.json({
      success: true,
      message: 'Visibility settings updated',
      data: {
        visibility: liveLocation.visibility
      }
    });
  } catch (error) {
    console.error('Update visibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update visibility settings',
      error: error.message
    });
  }
};

/**
 * Delete user's location (stop sharing)
 * @route DELETE /api/location
 */
export const deleteLocation = async (req, res) => {
  try {
    const userId = req.user._id;

    await LiveLocation.findOneAndDelete({ userId });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('location:removed', {
        userId: userId.toString()
      });
    }

    res.json({
      success: true,
      message: 'Location sharing stopped'
    });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete location',
      error: error.message
    });
  }
};

/**
 * Get own location status
 * @route GET /api/location/status
 */
export const getLocationStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const liveLocation = await LiveLocation.findOne({ userId });

    if (!liveLocation) {
      return res.json({
        success: true,
        data: {
          sharing: false
        }
      });
    }

    res.json({
      success: true,
      data: {
        sharing: true,
        location: {
          lat: liveLocation.location.coordinates[1],
          lng: liveLocation.location.coordinates[0]
        },
        heading: liveLocation.heading,
        speed: liveLocation.speed,
        status: liveLocation.status,
        visibility: liveLocation.visibility,
        lastUpdate: liveLocation.updatedAt
      }
    });
  } catch (error) {
    console.error('Get location status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get location status',
      error: error.message
    });
  }
};
