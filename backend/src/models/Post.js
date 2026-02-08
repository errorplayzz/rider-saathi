import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: 300
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  contentType: {
    type: String,
    enum: ['text', 'image', 'video', 'link'],
    default: 'text'
  },
  mediaUrls: [{
    type: String
  }],
  externalLink: {
    url: String,
    title: String,
    description: String,
    thumbnail: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: [Number],
    address: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  isVlog: {
    type: Boolean,
    default: false
  },
  isSafetyAlert: {
    type: Boolean,
    default: false
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['fire', 'heart', 'eyes', 'road', 'warning']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  stats: {
    views: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    }
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
postSchema.index({ community: 1, createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ isVlog: 1, createdAt: -1 });
postSchema.index({ isPinned: 1, createdAt: -1 });
postSchema.index({ 'reactions.user': 1 });
postSchema.index({ tags: 1 });

// Virtual for reaction counts
postSchema.virtual('reactionCounts').get(function() {
  const counts = {};
  this.reactions.forEach(r => {
    counts[r.type] = (counts[r.type] || 0) + 1;
  });
  return counts;
});

// Methods
postSchema.methods.addReaction = function(userId, reactionType) {
  // Remove existing reaction from same user
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  // Add new reaction
  this.reactions.push({ user: userId, type: reactionType });
  return this.save();
};

postSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  return this.save();
};

postSchema.methods.getUserReaction = function(userId) {
  return this.reactions.find(r => r.user.toString() === userId.toString());
};

postSchema.methods.incrementViews = function() {
  this.stats.views += 1;
  return this.save({ validateBeforeSave: false });
};

postSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

const Post = mongoose.model('Post', postSchema);

export default Post;
