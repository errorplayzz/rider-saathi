import express from 'express';
import { protect } from '../middleware/auth.js';
import Group from '../models/Group.js';
import Message from '../models/Message.js';

const router = express.Router();

// Create group
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, type = 'private', city, route, memberIds = [] } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Group name is required' });
    }

    // Create group with creator as first admin
    const group = await Group.create({
      name,
      description,
      creator: req.user._id,
      admins: [req.user._id],
      members: [
        { user: req.user._id, role: 'admin' }
      ],
      type,
      city,
      route
    });

    // Add other members
    if (memberIds.length > 0) {
      for (const memberId of memberIds) {
        await group.addMember(memberId);
      }
    }

    await group.populate('members.user', 'name avatar bike city');

    res.status(201).json({ success: true, data: group });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's groups
router.get('/my-groups', protect, async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.user._id,
      isActive: true
    })
    .populate('creator', 'name avatar')
    .populate('members.user', 'name avatar')
    .populate('lastMessage')
    .sort({ lastActivity: -1 });

    res.json({ success: true, data: groups });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get group details
router.get('/:groupId', protect, async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId)
      .populate('creator', 'name avatar bike city')
      .populate('admins', 'name avatar')
      .populate('members.user', 'name avatar bike city isOnline lastSeen');

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    if (!group.isMember(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Not a member of this group' });
    }

    res.json({ success: true, data: group });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get group messages
router.get('/:groupId/messages', protect, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const group = await Group.findById(groupId);
    if (!group || !group.isMember(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const messages = await Message.find({
      group: groupId,
      messageType: 'group',
      isDeleted: false
    })
    .populate('sender', 'name avatar')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Message.countDocuments({
      group: groupId,
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

// Add member to group
router.post('/:groupId/members', protect, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    if (!group.isAdmin(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Only admins can add members' });
    }

    await group.addMember(userId);
    await group.populate('members.user', 'name avatar');

    // Emit socket event
    req.app.get('socketService')?.io.to(`group:${groupId}`).emit('member-added', {
      groupId,
      userId
    });

    res.json({ success: true, data: group });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove member from group
router.delete('/:groupId/members/:userId', protect, async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    // Admins can remove others, users can remove themselves
    if (!group.isAdmin(req.user._id) && userId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Permission denied' });
    }

    await group.removeMember(userId);

    // Emit socket event
    req.app.get('socketService')?.io.to(`group:${groupId}`).emit('member-removed', {
      groupId,
      userId
    });

    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Make user admin
router.put('/:groupId/admins/:userId', protect, async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    if (!group.isAdmin(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Only admins can promote members' });
    }

    await group.makeAdmin(userId);

    res.json({ success: true, message: 'User promoted to admin' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update group settings
router.put('/:groupId', protect, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, avatar, settings } = req.body;

    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    if (!group.isAdmin(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Only admins can update group' });
    }

    if (name) group.name = name;
    if (description) group.description = description;
    if (avatar) group.avatar = avatar;
    if (settings) group.settings = { ...group.settings, ...settings };

    await group.save();

    res.json({ success: true, data: group });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete group
router.delete('/:groupId', protect, async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    if (group.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Only group creator can delete' });
    }

    group.isActive = false;
    await group.save();

    res.json({ success: true, message: 'Group deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
