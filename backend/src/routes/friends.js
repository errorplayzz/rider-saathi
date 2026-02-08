import express from 'express';
import { protect } from '../middleware/auth.js';
import { validateFriendRequest, validateRequestId } from '../middleware/validators.js';
import FriendRequest from '../models/FriendRequest.js';
import User from '../models/User.js';

const router = express.Router();

// Get all friend requests for current user
router.get('/requests', protect, async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      receiver: req.user._id,
      status: 'pending'
    })
    .populate('sender', 'name email avatar bike city')
    .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send friend request
router.post('/request', protect, async (req, res) => {
  try {
    const { receiverId, userId, message } = req.body;
    const targetUserId = receiverId || userId;

    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'Receiver ID is required' });
    }

    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({ success: false, error: 'Cannot send friend request to yourself' });
    }

    // Check if receiver exists
    const receiver = await User.findById(targetUserId);
    if (!receiver) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check if already friends
    const user = await User.findById(req.user._id);
    if (user.friends && user.friends.includes(targetUserId)) {
      return res.status(400).json({ success: false, error: 'Already friends' });
    }

    // Check if request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: req.user._id, receiver: targetUserId },
        { sender: targetUserId, receiver: req.user._id }
      ],
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ success: false, error: 'Friend request already exists' });
    }

    // Create friend request
    const friendRequest = await FriendRequest.create({
      sender: req.user._id,
      receiver: targetUserId,
      message
    });

    await friendRequest.populate('sender', 'name email avatar bike city');

    // Emit socket event to receiver
    req.app.get('socketService')?.io.to(`user:${targetUserId}`).emit('new-friend-request', {
      request: friendRequest
    });

    res.status(201).json({ success: true, data: friendRequest });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Accept friend request
router.put('/request/:requestId/accept', protect, async (req, res) => {
  try {
    const { requestId } = req.params;

    const friendRequest = await FriendRequest.findOne({
      _id: requestId,
      receiver: req.user._id,
      status: 'pending'
    });

    if (!friendRequest) {
      return res.status(404).json({ success: false, error: 'Friend request not found' });
    }

    // Update request status
    friendRequest.status = 'accepted';
    await friendRequest.save();

    // Add to friends list for both users
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { friends: friendRequest.sender }
    });

    await User.findByIdAndUpdate(friendRequest.sender, {
      $addToSet: { friends: req.user._id }
    });

    // Populate and return
    await friendRequest.populate('sender', 'name email avatar bike city');

    // Emit socket event
    req.app.get('socketService')?.io.to(`user:${friendRequest.sender}`).emit('friend-request-accepted', {
      userId: req.user._id,
      requestId
    });

    res.json({ success: true, data: friendRequest });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reject friend request
router.put('/request/:requestId/reject', protect, async (req, res) => {
  try {
    const { requestId } = req.params;

    const friendRequest = await FriendRequest.findOne({
      _id: requestId,
      receiver: req.user._id,
      status: 'pending'
    });

    if (!friendRequest) {
      return res.status(404).json({ success: false, error: 'Friend request not found' });
    }

    friendRequest.status = 'rejected';
    await friendRequest.save();

    res.json({ success: true, message: 'Friend request rejected' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get friends list
router.get('/list', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends', 'name email avatar bikeDetails city isOnline lastSeen');

    if (!user) {
      return res.json({ success: true, data: [] });
    }

    res.json({ success: true, data: user.friends || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove friend
router.delete('/:friendId', protect, async (req, res) => {
  try {
    const { friendId } = req.params;

    // Remove from both users' friends lists
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { friends: friendId }
    });

    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: req.user._id }
    });

    res.json({ success: true, message: 'Friend removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Block user
router.post('/block/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { blockedUsers: userId },
      $pull: { friends: userId }
    });

    await User.findByIdAndUpdate(userId, {
      $pull: { friends: req.user._id }
    });

    res.json({ success: true, message: 'User blocked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Unblock user
router.post('/unblock/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { blockedUsers: userId }
    });

    res.json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Find nearby riders
router.get('/nearby', protect, async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000 } = req.query; // radius in meters, default 5km

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        error: 'Latitude and longitude are required' 
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusInMeters = parseInt(radius);

    // Find users within radius (excluding current user and existing friends)
    const currentUser = await User.findById(req.user._id).select('friends');
    if (!currentUser) {
      return res.json({ success: true, data: [] });
    }

    const excludeIds = [req.user._id, ...(currentUser.friends || [])];

    // MongoDB geospatial query for nearby users
    const nearbyUsers = await User.find({
      _id: { $nin: excludeIds },
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radiusInMeters
        }
      },
      isOnline: true, // Only show online users
      'preferences.shareLocation': { $ne: false }
    })
    .select('name email avatar bikeDetails city preferences currentLocation')
    .limit(20); // Limit to 20 nearby users

    // Calculate distance for each user
    const usersWithDistance = nearbyUsers.map(user => {
      const userLat = user.currentLocation?.coordinates[1];
      const userLng = user.currentLocation?.coordinates[0];
      
      let distance = 0;
      if (userLat && userLng) {
        // Haversine formula for distance calculation
        const R = 6371000; // Earth's radius in meters
        const dLat = (userLat - lat) * Math.PI / 180;
        const dLng = (userLng - lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat * Math.PI / 180) * Math.cos(userLat * Math.PI / 180) * 
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distance = Math.round(R * c);
      }

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bike: user.bike,
        city: user.city,
        distance: distance < 1000 ? `${distance}m` : `${(distance/1000).toFixed(1)}km`,
        online: true,
        profile: user.profile
      };
    });

    res.json({ 
      success: true, 
      data: usersWithDistance.sort((a, b) => {
        // Sort by distance (convert back to numbers for sorting)
        const aDistance = a.distance.includes('km') 
          ? parseFloat(a.distance) * 1000 
          : parseInt(a.distance);
        const bDistance = b.distance.includes('km') 
          ? parseFloat(b.distance) * 1000 
          : parseInt(b.distance);
        return aDistance - bDistance;
      })
    });
    
  } catch (error) {
    console.error('Find nearby riders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
