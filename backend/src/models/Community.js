import mongoose from 'mongoose';

const communitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Community name is required'],
    trim: true,
    unique: true,
    minlength: 3,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 1000
  },
  avatar: {
    type: String
  },
  banner: {
    type: String
  },
  type: {
    type: String,
    enum: ['city', 'topic', 'route', 'event', 'general'],
    default: 'general'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  verified: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  rules: [{
    title: String,
    description: String
  }],
  settings: {
    isPrivate: {
      type: Boolean,
      default: false
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    allowVlogs: {
      type: Boolean,
      default: true
    },
    allowPolls: {
      type: Boolean,
      default: true
    }
  },
  stats: {
    totalPosts: {
      type: Number,
      default: 0
    },
    totalMembers: {
      type: Number,
      default: 0
    },
    totalVlogs: {
      type: Number,
      default: 0
    }
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
communitySchema.index({ name: 'text', description: 'text' });
communitySchema.index({ type: 1, isActive: 1 });
communitySchema.index({ members: 1 });
communitySchema.index({ verified: 1 });

// Methods
communitySchema.methods.addMember = function(userId) {
  if (!this.members.includes(userId)) {
    this.members.push(userId);
    this.stats.totalMembers = this.members.length;
    this.lastActivity = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

communitySchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(id => id.toString() !== userId.toString());
  this.moderators = this.moderators.filter(id => id.toString() !== userId.toString());
  this.stats.totalMembers = this.members.length;
  this.lastActivity = new Date();
  return this.save();
};

communitySchema.methods.isMember = function(userId) {
  return this.members.some(id => id.toString() === userId.toString());
};

communitySchema.methods.isModerator = function(userId) {
  return this.moderators.some(id => id.toString() === userId.toString()) ||
         this.creator.toString() === userId.toString();
};

const Community = mongoose.model('Community', communitySchema);

export default Community;
