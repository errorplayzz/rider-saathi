import express from 'express';
import { protect } from '../middleware/auth.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Community from '../models/Community.js';

const router = express.Router();

// Create post
router.post('/', protect, async (req, res) => {
  try {
    const {
      communityId,
      title,
      content,
      contentType = 'text',
      mediaUrls,
      externalLink,
      tags,
      isVlog = false,
      isSafetyAlert = false
    } = req.body;

    if (!communityId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Community ID and content are required'
      });
    }

    // Check if user is member of community
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ success: false, error: 'Community not found' });
    }

    if (!community.isMember(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Must be a member to post' });
    }

    const post = await Post.create({
      author: req.user._id,
      community: communityId,
      title,
      content,
      contentType,
      mediaUrls,
      externalLink,
      tags,
      isVlog,
      isSafetyAlert
    });

    // Update community stats
    community.stats.totalPosts += 1;
    if (isVlog) community.stats.totalVlogs += 1;
    community.lastActivity = new Date();
    await community.save();

    await post.populate('author', 'name avatar bike city verified');

    // Emit socket event
    req.app.get('socketService')?.io.to(`community:${communityId}`).emit('new-post', {
      post
    });

    res.status(201).json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get community feed
router.get('/feed/:communityId', protect, async (req, res) => {
  try {
    const { communityId } = req.params;
    const { page = 1, limit = 20, filter = 'all' } = req.query;

    const query = {
      community: communityId,
      isDeleted: false
    };

    if (filter === 'vlogs') {
      query.isVlog = true;
    } else if (filter === 'pinned') {
      query.isPinned = true;
    }

    const posts = await Post.find(query)
      .populate('author', 'name avatar bike city verified')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Post.countDocuments(query);

    res.json({
      success: true,
      data: posts,
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

// Get single post
router.get('/:postId', protect, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId)
      .populate('author', 'name avatar bike city verified');

    if (!post || post.isDeleted) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // Increment views
    await post.incrementViews();

    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add reaction to post
router.post('/:postId/react', protect, async (req, res) => {
  try {
    const { postId } = req.params;
    const { type } = req.body;

    if (!['fire', 'heart', 'eyes', 'road', 'warning'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid reaction type' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    await post.addReaction(req.user._id, type);

    // Emit socket event
    req.app.get('socketService')?.io.to(`community:${post.community}`).emit('post-reaction', {
      postId,
      userId: req.user._id,
      type
    });

    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove reaction from post
router.delete('/:postId/react', protect, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    await post.removeReaction(req.user._id);

    res.json({ success: true, message: 'Reaction removed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add comment to post
router.post('/:postId/comments', protect, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentCommentId, mentions } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const comment = await Comment.create({
      post: postId,
      author: req.user._id,
      content,
      parentComment: parentCommentId || null,
      mentions
    });

    await comment.populate('author', 'name avatar');

    // Update post stats
    post.stats.comments += 1;
    await post.save();

    // Emit socket event
    req.app.get('socketService')?.io.to(`community:${post.community}`).emit('new-comment', {
      postId,
      comment
    });

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get post comments (with threading)
router.get('/:postId/comments', protect, async (req, res) => {
  try {
    const { postId } = req.params;

    // Get top-level comments
    const comments = await Comment.find({
      post: postId,
      parentComment: null,
      isDeleted: false
    })
    .populate('author', 'name avatar')
    .sort({ createdAt: -1 });

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({
          parentComment: comment._id,
          isDeleted: false
        })
        .populate('author', 'name avatar')
        .sort({ createdAt: 1 });

        return {
          ...comment.toObject(),
          replies
        };
      })
    );

    res.json({ success: true, data: commentsWithReplies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update post (author only)
router.put('/:postId', protect, async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, content } = req.body;

    const post = await Post.findOne({
      _id: postId,
      author: req.user._id
    });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found or unauthorized' });
    }

    if (title) post.title = title;
    if (content) post.content = content;
    post.isEdited = true;
    post.editedAt = new Date();

    await post.save();

    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete post (author or moderator)
router.delete('/:postId', protect, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId).populate('community');

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const isAuthor = post.author.toString() === req.user._id.toString();
    const isModerator = post.community.isModerator(req.user._id);

    if (!isAuthor && !isModerator) {
      return res.status(403).json({ success: false, error: 'Permission denied' });
    }

    await post.softDelete();

    // Update community stats
    const community = await Community.findById(post.community);
    if (community) {
      community.stats.totalPosts = Math.max(0, community.stats.totalPosts - 1);
      if (post.isVlog) {
        community.stats.totalVlogs = Math.max(0, community.stats.totalVlogs - 1);
      }
      await community.save();
    }

    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Pin post (moderator only)
router.put('/:postId/pin', protect, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId).populate('community');

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    if (!post.community.isModerator(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Only moderators can pin posts' });
    }

    post.isPinned = !post.isPinned;
    await post.save();

    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
