import express from 'express';
import { protect } from '../middleware/auth.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

const router = express.Router();

// Get conversation with a user (paginated)
router.get('/conversation/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({
      messageType: 'direct',
      $or: [
        { sender: req.user._id, recipient: userId },
        { sender: userId, recipient: req.user._id }
      ],
      isDeleted: false
    })
    .populate('sender', 'name avatar')
    .populate('recipient', 'name avatar')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Message.countDocuments({
      messageType: 'direct',
      $or: [
        { sender: req.user._id, recipient: userId },
        { sender: userId, recipient: req.user._id }
      ],
      isDeleted: false
    });

    res.json({
      success: true,
      data: messages.reverse(),
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all conversations (list of recent chats)
router.get('/conversations', protect, async (req, res) => {
  try {
    // Get all unique conversation partners
    const messages = await Message.aggregate([
      {
        $match: {
          messageType: 'direct',
          $or: [
            { sender: req.user._id },
            { recipient: req.user._id }
          ],
          isDeleted: false
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', req.user._id] },
              '$recipient',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$recipient', req.user._id] },
                    { $ne: ['$status', 'read'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    // Populate user details
    const conversations = await Promise.all(
      messages.map(async (conv) => {
        const user = await User.findById(conv._id).select('name avatar bike city isOnline lastSeen');
        return {
          user,
          lastMessage: conv.lastMessage,
          unreadCount: conv.unreadCount
        };
      })
    );

    res.json({ success: true, data: conversations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send message (REST endpoint - Socket.IO preferred for real-time)
router.post('/send', protect, async (req, res) => {
  try {
    const { recipientId, content, contentType = 'text', mediaUrl, replyTo } = req.body;

    if (!recipientId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Recipient and content are required'
      });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ success: false, error: 'Recipient not found' });
    }

    // Check if blocked
    if (recipient.blockedUsers && recipient.blockedUsers.includes(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Cannot send message to this user' });
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient: recipientId,
      messageType: 'direct',
      content,
      contentType,
      mediaUrl,
      replyTo,
      status: 'sent'
    });

    await message.populate('sender', 'name avatar');
    await message.populate('recipient', 'name avatar');

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark message as read
router.put('/:messageId/read', protect, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findOne({
      _id: messageId,
      recipient: req.user._id
    });

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    await message.markAsRead();

    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete message
router.delete('/:messageId', protect, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findOne({
      _id: messageId,
      sender: req.user._id
    });

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found or unauthorized' });
    }

    await message.softDelete();

    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get unread message count
router.get('/unread/count', protect, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user._id,
      status: { $ne: 'read' },
      isDeleted: false
    });

    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
