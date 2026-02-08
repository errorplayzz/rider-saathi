import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  avatar: {
    type: String
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    }
  }],
  type: {
    type: String,
    enum: ['private', 'public'],
    default: 'private'
  },
  city: {
    type: String,
    trim: true
  },
  route: {
    type: String,
    trim: true
  },
  maxMembers: {
    type: Number,
    default: 256
  },
  settings: {
    onlyAdminsCanPost: {
      type: Boolean,
      default: false
    },
    allowMediaSharing: {
      type: Boolean,
      default: true
    },
    allowMemberInvites: {
      type: Boolean,
      default: true
    }
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
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
groupSchema.index({ name: 'text', description: 'text' });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ creator: 1 });
groupSchema.index({ type: 1, isActive: 1 });

// Virtual for member count
groupSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Methods
groupSchema.methods.addMember = function(userId, role = 'member') {
  const exists = this.members.some(m => m.user.toString() === userId.toString());
  if (!exists && this.members.length < this.maxMembers) {
    this.members.push({ user: userId, role });
    this.lastActivity = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

groupSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(m => m.user.toString() !== userId.toString());
  this.admins = this.admins.filter(id => id.toString() !== userId.toString());
  this.lastActivity = new Date();
  return this.save();
};

groupSchema.methods.makeAdmin = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (member) {
    member.role = 'admin';
    if (!this.admins.includes(userId)) {
      this.admins.push(userId);
    }
    return this.save();
  }
  return Promise.resolve(this);
};

groupSchema.methods.isAdmin = function(userId) {
  return this.admins.some(id => id.toString() === userId.toString()) || 
         this.creator.toString() === userId.toString();
};

groupSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.user.toString() === userId.toString());
};

const Group = mongoose.model('Group', groupSchema);

export default Group;
