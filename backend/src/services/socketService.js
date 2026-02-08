import { socketAuth } from '../middleware/auth.js'
import User from '../models/User.js'
import EmergencyAlert from '../models/EmergencyAlert.js'
import { ChatMessage, ChatRoom } from '../models/Chat.js'
import { Reward } from '../models/Reward.js'
import Message from '../models/Message.js'
import Group from '../models/Group.js'
import LiveLocation from '../models/LiveLocation.js'
// CommonJS imports for models using module.exports
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const FriendRequest = require('../models/FriendRequest.js')
import { calculateDistance, filterRidersByProximity } from '../utils/geoUtils.js'

// Store connected users
const connectedUsers = new Map()
const userRooms = new Map()
const userLocations = new Map() // Track user locations for real-time updates

export const handleSocketConnection = (io) => {
  // Authentication middleware
  io.use(socketAuth)

  io.on('connection', async (socket) => {
    console.log(`User ${socket.userId} connected`)

    try {
      // Update user online status
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastSeen: new Date()
      })

      // Store connected user
      connectedUsers.set(socket.userId, {
        socketId: socket.id,
        userId: socket.userId,
        email: socket.userEmail,
        connectedAt: new Date()
      })

      // Broadcast online status to relevant users
      socket.broadcast.emit('user-online', socket.userId)

      // Emit full online users list to all connected clients
      const onlineList = Array.from(connectedUsers.values()).map(u => ({ userId: u.userId, email: u.email }))
      io.emit('online-users', onlineList)

    } catch (error) {
      console.error('Socket connection error:', error)
    }

    // Join user to their personal room
    socket.on('join-user-room', (userId) => {
      if (userId === socket.userId) {
        socket.join(`user_${userId}`)
        console.log(`User ${userId} joined personal room`)
      }
    })

    // ═══════════════════════════════════════════════════════════════
    // REAL-TIME LOCATION TRACKING FOR MAP
    // ═══════════════════════════════════════════════════════════════

    /**
     * User updates their location - triggers real-time map updates
     * This replaces the old basic location-update event
     */
    socket.on('location:update', async (data) => {
      try {
        const { latitude, longitude, heading, speed, accuracy } = data

        // Validate coordinates
        if (!latitude || !longitude || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          return socket.emit('location:error', { message: 'Invalid coordinates' })
        }

        // Update LiveLocation in database
        let liveLocation = await LiveLocation.findOne({ userId: socket.userId })

        if (liveLocation) {
          liveLocation.location.coordinates = [longitude, latitude]
          liveLocation.heading = heading || liveLocation.heading
          liveLocation.speed = speed !== undefined ? speed : liveLocation.speed
          liveLocation.accuracy = accuracy || liveLocation.accuracy
          
          // Auto-update status based on speed
          if (speed !== undefined) {
            liveLocation.status = speed > 5 ? 'moving' : speed > 0 ? 'stopped' : 'idle'
          }
          
          await liveLocation.save()
        } else {
          liveLocation = await LiveLocation.create({
            userId: socket.userId,
            location: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            heading: heading || 0,
            speed: speed || 0,
            accuracy: accuracy || 10,
            status: speed > 5 ? 'moving' : 'idle'
          })
        }

        // Store in memory for fast access
        userLocations.set(socket.userId, {
          lat: latitude,
          lng: longitude,
          heading: liveLocation.heading,
          speed: liveLocation.speed,
          status: liveLocation.status,
          updatedAt: new Date()
        })

        // Get user's friends
        const friendRequests = await FriendRequest.find({
          $or: [
            { senderId: socket.userId, status: 'accepted' },
            { receiverId: socket.userId, status: 'accepted' }
          ]
        })

        const friendIds = friendRequests.map(fr => 
          fr.senderId.toString() === socket.userId 
            ? fr.receiverId.toString() 
            : fr.senderId.toString()
        )

        // Find nearby riders within 15km (max friend radius)
        const nearbyRiders = await LiveLocation.findNearby(latitude, longitude, 15, {
          excludeUserId: socket.userId,
          visibleOnly: true
        })

        // Filter by friend/stranger rules
        const visibleRiders = filterRidersByProximity(
          liveLocation,
          nearbyRiders,
          friendIds
        )

        // Notify riders who can see this user
        visibleRiders.forEach(rider => {
          const riderConnection = connectedUsers.get(rider.userId.toString())
          if (riderConnection) {
            const isFriend = friendIds.includes(rider.userId.toString())
            
            // Send update to rider
            io.to(riderConnection.socketId).emit('rider:location:update', {
              userId: socket.userId,
              location: {
                lat: latitude,
                lng: longitude
              },
              heading: liveLocation.heading,
              speed: liveLocation.speed,
              status: liveLocation.status,
              distance: rider.distance,
              isFriend: rider.isFriend
            })
          }
        })

        // Check for riders entering/exiting radius
        await handleRiderProximityChanges(socket, liveLocation, friendIds, io)

        socket.emit('location:updated', {
          success: true,
          location: { lat: latitude, lng: longitude },
          nearbyCount: visibleRiders.length
        })

      } catch (error) {
        console.error('Location update error:', error)
        socket.emit('location:error', { message: 'Failed to update location' })
      }
    })

    /**
     * User requests nearby riders (initial load or refresh)
     */
    socket.on('location:get-nearby', async () => {
      try {
        const liveLocation = await LiveLocation.findOne({ userId: socket.userId })
          .populate('userId', 'name email bike avatar isOnline')
        
        if (!liveLocation) {
          return socket.emit('riders:nearby', { riders: [] })
        }

        const userLat = liveLocation.location.coordinates[1]
        const userLng = liveLocation.location.coordinates[0]

        // Get friends
        const friendRequests = await FriendRequest.find({
          $or: [
            { senderId: socket.userId, status: 'accepted' },
            { receiverId: socket.userId, status: 'accepted' }
          ]
        })

        const friendIds = friendRequests.map(fr => 
          fr.senderId.toString() === socket.userId 
            ? fr.receiverId.toString() 
            : fr.senderId.toString()
        )

        // Get nearby riders
        const nearbyRiders = await LiveLocation.findNearby(userLat, userLng, 15, {
          excludeUserId: socket.userId,
          visibleOnly: true
        })

        const filteredRiders = filterRidersByProximity(
          liveLocation,
          nearbyRiders,
          friendIds
        )

        socket.emit('riders:nearby', {
          riders: filteredRiders,
          total: filteredRiders.length,
          friends: filteredRiders.filter(r => r.isFriend).length,
          strangers: filteredRiders.filter(r => !r.isFriend).length
        })

      } catch (error) {
        console.error('Get nearby riders error:', error)
        socket.emit('location:error', { message: 'Failed to get nearby riders' })
      }
    })

    /**
     * User joins map tracking (starts receiving live updates)
     */
    socket.on('map:join', async () => {
      socket.join('map_tracking')
      console.log(`User ${socket.userId} joined map tracking`)
      
      // Send initial nearby riders
      socket.emit('map:joined', { success: true })
    })

    /**
     * User leaves map tracking
     */
    socket.on('map:leave', () => {
      socket.leave('map_tracking')
      console.log(`User ${socket.userId} left map tracking`)
    })

    // ═══════════════════════════════════════════════════════════════
    // END LOCATION TRACKING
    // ═══════════════════════════════════════════════════════════════

    // Old location tracking (kept for backward compatibility with ride groups)
    socket.on('location-update', async (data) => {
      try {
        const { location, timestamp } = data

        if (!location || !location.latitude || !location.longitude) {
          return socket.emit('error', { message: 'Invalid location data' })
        }

        // Update user location in database
        await User.findByIdAndUpdate(socket.userId, {
          currentLocation: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude],
            address: location.address,
            lastUpdated: new Date(timestamp)
          }
        })

        // Broadcast location to ride group if user is in one
        const userRooms = Array.from(socket.rooms)
        userRooms.forEach(room => {
          if (room.startsWith('ride_')) {
            socket.to(room).emit('location-update', {
              userId: socket.userId,
              location,
              timestamp
            })
          }
        })

        socket.emit('location-update-success', { timestamp })
      } catch (error) {
        console.error('Location update error:', error)
        socket.emit('error', { message: 'Failed to update location' })
      }
    })

    // Ride group management
    socket.on('join-ride-group', (groupId) => {
      socket.join(`ride_${groupId}`)
      socket.to(`ride_${groupId}`).emit('user-joined-ride', {
        userId: socket.userId,
        timestamp: new Date()
      })
      console.log(`User ${socket.userId} joined ride group ${groupId}`)
    })

    socket.on('leave-ride-group', (groupId) => {
      socket.leave(`ride_${groupId}`)
      socket.to(`ride_${groupId}`).emit('user-left-ride', {
        userId: socket.userId,
        timestamp: new Date()
      })
      console.log(`User ${socket.userId} left ride group ${groupId}`)
    })

    // Emergency alerts
    socket.on('emergency-alert', async (alertData) => {
      try {
        const { type, severity, location, description } = alertData

        // Create emergency alert
        const emergency = new EmergencyAlert({
          user: socket.userId,
          type,
          severity,
          location: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude],
            address: location.address
          },
          description
        })

        await emergency.save()

        // Find nearby users (within 10km)
        const nearbyUsers = await User.findNearby(
          location.longitude,
          location.latitude,
          10000
        )

        // Notify nearby users
        nearbyUsers.forEach(user => {
          const userConnection = connectedUsers.get(user._id.toString())
          if (userConnection && user._id.toString() !== socket.userId) {
            io.to(userConnection.socketId).emit('emergency-alert', {
              alertId: emergency._id,
              type,
              severity,
              location,
              description,
              userId: socket.userId,
              distance: calculateDistance(
                location.latitude, location.longitude,
                user.currentLocation.coordinates[1],
                user.currentLocation.coordinates[0]
              )
            })
          }
        })

        // Schedule auto-resolve
        emergency.scheduleAutoResolve()

        socket.emit('emergency-alert-sent', {
          alertId: emergency._id,
          notifiedUsers: nearbyUsers.length
        })

        console.log(`Emergency alert sent by ${socket.userId}`)
      } catch (error) {
        console.error('Emergency alert error:', error)
        socket.emit('error', { message: 'Failed to send emergency alert' })
      }
    })

    // Emergency response
    socket.on('emergency-response', async (data) => {
      try {
        const { alertId, message, estimatedArrival } = data

        const alert = await EmergencyAlert.findById(alertId)
        if (!alert || alert.status !== 'active') {
          return socket.emit('error', { message: 'Emergency alert not found or not active' })
        }

        // Add responder
        alert.responders.push({
          user: socket.userId,
          message,
          estimatedArrival
        })

        if (alert.status === 'active') {
          alert.status = 'responded'
        }

        await alert.save()

        // Notify alert creator
        const alertCreatorConnection = connectedUsers.get(alert.user.toString())
        if (alertCreatorConnection) {
          io.to(alertCreatorConnection.socketId).emit('emergency-response', {
            alertId,
            responderId: socket.userId,
            message,
            estimatedArrival
          })
        }

        // Award points to responder
        const reward = new Reward({
          user: socket.userId,
          activityType: 'emergency_response',
          points: 50,
          description: 'Responded to emergency alert',
          relatedActivity: alertId,
          relatedModel: 'EmergencyAlert'
        })
        await reward.save()

        // Update user stats
        await User.findByIdAndUpdate(socket.userId, {
          $inc: { 
            'stats.helpCount': 1,
            'stats.rewardPoints': 50
          }
        })

        socket.emit('emergency-response-sent', { alertId, pointsEarned: 50 })
      } catch (error) {
        console.error('Emergency response error:', error)
        socket.emit('error', { message: 'Failed to send emergency response' })
      }
    })

    // Chat functionality
    socket.on('join-chat-room', async (roomId) => {
      try {
        const room = await ChatRoom.findById(roomId)
        if (!room) {
          return socket.emit('error', { message: 'Chat room not found' })
        }

        // Check if user is participant
        const isParticipant = room.participants.some(
          p => p.user.toString() === socket.userId
        )

        if (!isParticipant && !room.settings.allowNewMembers) {
          return socket.emit('error', { message: 'Not authorized to join this room' })
        }

        socket.join(`chat_${roomId}`)
        
        // Add user as participant if not already
        if (!isParticipant) {
          room.participants.push({ user: socket.userId })
          await room.save()
        }

        socket.emit('joined-chat-room', { roomId })
        socket.to(`chat_${roomId}`).emit('user-joined-chat', {
          userId: socket.userId,
          timestamp: new Date()
        })
      } catch (error) {
        console.error('Join chat room error:', error)
        socket.emit('error', { message: 'Failed to join chat room' })
      }
    })

    // Leave chat room
    socket.on('leave-chat-room', (roomId) => {
      try {
        if (!roomId) {
          return socket.emit('error', { message: 'Room ID is required' })
        }

        console.log(`[Socket] User ${socket.userId} leaving room ${roomId}`)
        socket.leave(`chat_${roomId}`)
        socket.emit('left-chat-room', { roomId })
      } catch (error) {
        console.error('Leave chat room error:', error)
        socket.emit('error', { message: 'Failed to leave chat room' })
      }
    })

    socket.on('send-message', async (data) => {
      try {
        const { roomId, message, messageType = 'text', media, location } = data

        console.log(`[Socket] User ${socket.userId} sending message to room ${roomId}`)

        // Validate room membership
        const room = await ChatRoom.findById(roomId)
        if (!room) {
          return socket.emit('error', { message: 'Chat room not found' })
        }

        const isParticipant = room.participants.some(
          p => p.user.toString() === socket.userId
        )

        if (!isParticipant) {
          return socket.emit('error', { message: 'Not authorized to send messages' })
        }

        // Create message
        const chatMessage = new ChatMessage({
          sender: socket.userId,
          room: roomId,
          message,
          messageType,
          media,
          location
        })

        await chatMessage.save()
        await chatMessage.populate('sender', 'name avatar')

        // Update room last activity and message
        room.lastMessage = chatMessage._id
        room.lastActivity = new Date()
        await room.save()

        console.log(`[Socket] Broadcasting message ${chatMessage._id} to room chat_${roomId}`)

        // Broadcast message to room with a consistent payload shape
        io.to(`chat_${roomId}`).emit('new-message', {
          chatId: roomId,
          message: {
            _id: chatMessage._id,
            sender: chatMessage.sender,
            content: chatMessage.message,
            type: chatMessage.messageType,
            media: chatMessage.media,
            location: chatMessage.location,
            timestamp: chatMessage.createdAt
          }
        })

        // Send acknowledgment to sender
        socket.emit('message-sent', {
          tempId: data.tempId,
          messageId: chatMessage._id,
          timestamp: chatMessage.createdAt
        })

      } catch (error) {
        console.error('Send message error:', error)
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    // Battery alerts
    socket.on('battery-alert', async (data) => {
      try {
        const { batteryLevel, location } = data

        if (batteryLevel <= 20) {
          // Find nearby users
          const nearbyUsers = await User.findNearby(
            location.longitude,
            location.latitude,
            5000 // 5km radius
          )

          // Notify nearby users about low battery
          nearbyUsers.forEach(user => {
            const userConnection = connectedUsers.get(user._id.toString())
            if (userConnection && user._id.toString() !== socket.userId) {
              io.to(userConnection.socketId).emit('nearby-battery-alert', {
                userId: socket.userId,
                batteryLevel,
                location,
                timestamp: new Date()
              })
            }
          })

          socket.emit('battery-alert-sent', { notifiedUsers: nearbyUsers.length })
        }
      } catch (error) {
        console.error('Battery alert error:', error)
        socket.emit('error', { message: 'Failed to send battery alert' })
      }
    })

    // Voice call signaling
    socket.on('call-user', (data) => {
      const { targetUserId, offer, callType } = data
      const targetConnection = connectedUsers.get(targetUserId)
      
      if (targetConnection) {
        io.to(targetConnection.socketId).emit('incoming-call', {
          callerId: socket.userId,
          offer,
          callType
        })
      } else {
        socket.emit('call-failed', { reason: 'User not online' })
      }
    })

    socket.on('answer-call', (data) => {
      const { callerId, answer } = data
      const callerConnection = connectedUsers.get(callerId)
      
      if (callerConnection) {
        io.to(callerConnection.socketId).emit('call-answered', {
          answer,
          answererId: socket.userId
        })
      }
    })

    socket.on('ice-candidate', (data) => {
      const { targetUserId, candidate } = data
      const targetConnection = connectedUsers.get(targetUserId)
      
      if (targetConnection) {
        io.to(targetConnection.socketId).emit('ice-candidate', {
          candidate,
          senderId: socket.userId
        })
      }
    })

    socket.on('end-call', (data) => {
      const { targetUserId } = data
      const targetConnection = connectedUsers.get(targetUserId)
      
      if (targetConnection) {
        io.to(targetConnection.socketId).emit('call-ended', {
          endedBy: socket.userId
        })
      }
    })

    // ========================================
    // NEW CHAT SYSTEM SOCKET HANDLERS
    // ========================================

    // Direct messaging
    socket.on('send-direct-message', async (data) => {
      try {
        const { recipientId, content, contentType = 'text', mediaUrl, location, replyTo } = data

        // Create message
        const message = new Message({
          sender: socket.userId,
          recipient: recipientId,
          messageType: 'direct',
          content,
          contentType,
          mediaUrl,
          location,
          replyTo,
          status: 'sent'
        })

        await message.save()
        await message.populate('sender', 'name avatar')

        // Check if recipient is online
        const recipientConnection = connectedUsers.get(recipientId)
        
        if (recipientConnection) {
          // Recipient is online - deliver immediately
          message.status = 'delivered'
          message.deliveredAt = new Date()
          await message.save()

          io.to(recipientConnection.socketId).emit('new-direct-message', {
            message: {
              _id: message._id,
              sender: message.sender,
              content: message.content,
              contentType: message.contentType,
              mediaUrl: message.mediaUrl,
              location: message.location,
              replyTo: message.replyTo,
              status: message.status,
              createdAt: message.createdAt
            }
          })

          // Send delivery confirmation to sender
          socket.emit('message-delivered', {
            messageId: message._id,
            deliveredAt: message.deliveredAt
          })
        }

        // Send acknowledgment to sender
        socket.emit('message-sent', {
          tempId: data.tempId,
          messageId: message._id,
          status: message.status,
          timestamp: message.createdAt
        })

      } catch (error) {
        console.error('Send direct message error:', error)
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    // Mark message as read
    socket.on('mark-as-read', async (data) => {
      try {
        const { messageId } = data

        const message = await Message.findById(messageId)
        if (!message || message.recipient.toString() !== socket.userId) {
          return socket.emit('error', { message: 'Message not found' })
        }

        await message.markAsRead()

        // Notify sender about read receipt
        const senderConnection = connectedUsers.get(message.sender.toString())
        if (senderConnection) {
          io.to(senderConnection.socketId).emit('message-read', {
            messageId,
            readAt: message.readAt,
            readBy: socket.userId
          })
        }

        socket.emit('message-marked-read', { messageId })

      } catch (error) {
        console.error('Mark as read error:', error)
        socket.emit('error', { message: 'Failed to mark message as read' })
      }
    })

    // Typing indicators for direct messages
    socket.on('typing-direct', (data) => {
      const { recipientId } = data
      const recipientConnection = connectedUsers.get(recipientId)
      
      if (recipientConnection) {
        io.to(recipientConnection.socketId).emit('user-typing-direct', {
          userId: socket.userId,
          isTyping: true
        })
      }
    })

    socket.on('stop-typing-direct', (data) => {
      const { recipientId } = data
      const recipientConnection = connectedUsers.get(recipientId)
      
      if (recipientConnection) {
        io.to(recipientConnection.socketId).emit('user-typing-direct', {
          userId: socket.userId,
          isTyping: false
        })
      }
    })

    // Group messaging
    socket.on('join-group', async (groupId) => {
      try {
        const group = await Group.findById(groupId)
        if (!group) {
          return socket.emit('error', { message: 'Group not found' })
        }

        if (!group.isMember(socket.userId)) {
          return socket.emit('error', { message: 'Not a group member' })
        }

        socket.join(`group_${groupId}`)
        
        // Notify other members
        socket.to(`group_${groupId}`).emit('user-joined-group', {
          groupId,
          userId: socket.userId,
          timestamp: new Date()
        })

        socket.emit('joined-group', { groupId })
      } catch (error) {
        console.error('Join group error:', error)
        socket.emit('error', { message: 'Failed to join group' })
      }
    })

    socket.on('send-group-message', async (data) => {
      try {
        const { groupId, content, contentType = 'text', mediaUrl, location, replyTo } = data

        const group = await Group.findById(groupId)
        if (!group || !group.isMember(socket.userId)) {
          return socket.emit('error', { message: 'Not authorized' })
        }

        const message = new Message({
          sender: socket.userId,
          group: groupId,
          messageType: 'group',
          content,
          contentType,
          mediaUrl,
          location,
          replyTo,
          status: 'sent'
        })

        await message.save()
        await message.populate('sender', 'name avatar')

        // Update group last message
        group.lastMessage = message._id
        await group.save()

        // Broadcast to all group members
        io.to(`group_${groupId}`).emit('new-group-message', {
          groupId,
          message: {
            _id: message._id,
            sender: message.sender,
            content: message.content,
            contentType: message.contentType,
            mediaUrl: message.mediaUrl,
            location: message.location,
            replyTo: message.replyTo,
            createdAt: message.createdAt
          }
        })

        socket.emit('message-sent', {
          tempId: data.tempId,
          messageId: message._id,
          timestamp: message.createdAt
        })

      } catch (error) {
        console.error('Send group message error:', error)
        socket.emit('error', { message: 'Failed to send group message' })
      }
    })

    // Typing indicators for groups
    socket.on('typing-group', (data) => {
      const { groupId } = data
      socket.to(`group_${groupId}`).emit('user-typing-group', {
        groupId,
        userId: socket.userId,
        isTyping: true
      })
    })

    socket.on('stop-typing-group', (data) => {
      const { groupId } = data
      socket.to(`group_${groupId}`).emit('user-typing-group', {
        groupId,
        userId: socket.userId,
        isTyping: false
      })
    })

    // Leave group room
    socket.on('leave-group', (groupId) => {
      socket.leave(`group_${groupId}`)
      socket.to(`group_${groupId}`).emit('user-left-group', {
        groupId,
        userId: socket.userId,
        timestamp: new Date()
      })
    })

    // Post reactions real-time
    socket.on('post-reaction', (data) => {
      const { postId, communityId, reactionType, action } = data
      
      // Broadcast to community members
      socket.to(`community_${communityId}`).emit('post-reaction-update', {
        postId,
        userId: socket.userId,
        reactionType,
        action, // 'add' or 'remove'
        timestamp: new Date()
      })
    })

    // Comment notifications
    socket.on('new-comment', (data) => {
      const { postId, commentId, authorId, communityId } = data
      
      // Notify post author
      const authorConnection = connectedUsers.get(authorId)
      if (authorConnection && authorId !== socket.userId) {
        io.to(authorConnection.socketId).emit('comment-notification', {
          postId,
          commentId,
          commenterId: socket.userId,
          timestamp: new Date()
        })
      }

      // Broadcast to community
      socket.to(`community_${communityId}`).emit('post-comment-update', {
        postId,
        commentId,
        timestamp: new Date()
      })
    })

    // Join community room for real-time updates
    socket.on('join-community', (communityId) => {
      socket.join(`community_${communityId}`)
      socket.emit('joined-community', { communityId })
    })

    socket.on('leave-community', (communityId) => {
      socket.leave(`community_${communityId}`)
    })

    // Disconnect handling
    socket.on('disconnect', async () => {
      console.log(`User ${socket.userId} disconnected`)

      try {
        // Update user offline status
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: new Date()
        })

        // Remove from connected users
        connectedUsers.delete(socket.userId)

        // Broadcast offline status
  socket.broadcast.emit('user-offline', socket.userId)
  const onlineList = Array.from(connectedUsers.values()).map(u => ({ userId: u.userId, email: u.email }))
  io.emit('online-users', onlineList)

        // Leave all rooms
        const rooms = Array.from(socket.rooms)
        rooms.forEach(room => {
          if (room.startsWith('ride_')) {
            socket.to(room).emit('user-left-ride', {
              userId: socket.userId,
              timestamp: new Date()
            })
          }
        })

      } catch (error) {
        console.error('Disconnect handling error:', error)
      }
    })
  })
}

/**
 * Handle rider proximity changes (entering/exiting radius)
 * Emits rider:enter and rider:exit events
 */
async function handleRiderProximityChanges(socket, currentLocation, friendIds, io) {
  try {
    const userId = socket.userId
    const userLat = currentLocation.location.coordinates[1]
    const userLng = currentLocation.location.coordinates[0]

    // Get previous location from memory
    const previousLocation = userLocations.get(userId + '_nearby') || new Set()
    
    // Get current nearby riders
    const nearbyRiders = await LiveLocation.findNearby(userLat, userLng, 15, {
      excludeUserId: userId,
      visibleOnly: true
    })

    const filteredRiders = filterRidersByProximity(
      currentLocation,
      nearbyRiders,
      friendIds
    )

    const currentNearby = new Set(filteredRiders.map(r => r.userId.toString()))

    // Find riders who entered radius
    currentNearby.forEach(riderId => {
      if (!previousLocation.has(riderId)) {
        const rider = filteredRiders.find(r => r.userId.toString() === riderId)
        if (rider) {
          socket.emit('rider:enter', {
            rider: {
              userId: rider.userId,
              name: rider.name,
              location: rider.location,
              distance: rider.distance,
              direction: rider.direction,
              isFriend: rider.isFriend,
              bike: rider.bike,
              avatar: rider.avatar,
              status: rider.status,
              heading: rider.heading,
              speed: rider.speed
            }
          })
        }
      }
    })

    // Find riders who exited radius
    previousLocation.forEach(riderId => {
      if (!currentNearby.has(riderId)) {
        socket.emit('rider:exit', {
          userId: riderId
        })
      }
    })

    // Update memory
    userLocations.set(userId + '_nearby', currentNearby)

  } catch (error) {
    console.error('Proximity change handling error:', error)
  }
}

// Helper function to calculate distance (legacy - kept for backward compatibility)
function calculateDistanceLegacy(lat1, lon1, lat2, lon2) {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c
}