import express from 'express';
import { protect } from '../middleware/auth.js';
import Community from '../models/Community.js';
import Post from '../models/Post.js';

const router = express.Router();

// Create community
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, type, tags, rules, settings } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Community name is required' });
    }

    const community = await Community.create({
      name,
      description,
      type,
      tags,
      rules,
      settings,
      creator: req.user._id,
      moderators: [req.user._id],
      members: [req.user._id]
    });

    res.status(201).json({ success: true, data: community });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Community name already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all communities (public + joined)
router.get('/', protect, async (req, res) => {
  try {
    const { type, search } = req.query;

    const query = { isActive: true };
    
    if (type) {
      query.type = type;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const communities = await Community.find(query)
      .populate('creator', 'name avatar')
      .sort({ 'stats.totalMembers': -1, lastActivity: -1 })
      .limit(50);

    res.json({ success: true, data: communities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's joined communities
router.get('/my-communities', protect, async (req, res) => {
  try {
    const communities = await Community.find({
      members: req.user._id,
      isActive: true
    })
    .populate('creator', 'name avatar')
    .sort({ lastActivity: -1 });

    res.json({ success: true, data: communities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get community details
router.get('/:communityId', protect, async (req, res) => {
  try {
    const { communityId } = req.params;

    const community = await Community.findById(communityId)
      .populate('creator', 'name avatar')
      .populate('moderators', 'name avatar');

    if (!community) {
      return res.status(404).json({ success: false, error: 'Community not found' });
    }

    const isMember = community.isMember(req.user._id);

    res.json({
      success: true,
      data: {
        ...community.toObject(),
        isMember,
        isModerator: community.isModerator(req.user._id)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Join community
router.post('/:communityId/join', protect, async (req, res) => {
  try {
    const { communityId } = req.params;

    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({ success: false, error: 'Community not found' });
    }

    await community.addMember(req.user._id);

    res.json({ success: true, message: 'Joined community successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Leave community
router.post('/:communityId/leave', protect, async (req, res) => {
  try {
    const { communityId } = req.params;

    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({ success: false, error: 'Community not found' });
    }

    if (community.creator.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, error: 'Creator cannot leave community' });
    }

    await community.removeMember(req.user._id);

    res.json({ success: true, message: 'Left community successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update community (moderator only)
router.put('/:communityId', protect, async (req, res) => {
  try {
    const { communityId } = req.params;
    const { description, rules, settings, avatar, banner } = req.body;

    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({ success: false, error: 'Community not found' });
    }

    if (!community.isModerator(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Only moderators can update community' });
    }

    if (description) community.description = description;
    if (rules) community.rules = rules;
    if (settings) community.settings = { ...community.settings, ...settings };
    if (avatar) community.avatar = avatar;
    if (banner) community.banner = banner;

    await community.save();

    res.json({ success: true, data: community });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
