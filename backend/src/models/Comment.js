import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['like', 'love', 'laugh', 'agree']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  replyCount: {
    type: Number,
    default: 0
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
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1, createdAt: -1 });
commentSchema.index({ author: 1 });

// Methods
commentSchema.methods.addReaction = function(userId, reactionType) {
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  this.reactions.push({ user: userId, type: reactionType });
  return this.save();
};

commentSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  return this.save();
};

commentSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = '[Comment deleted]';
  return this.save();
};

// Update parent comment's reply count
commentSchema.post('save', async function() {
  if (this.parentComment && !this.isDeleted) {
    await this.model('Comment').findByIdAndUpdate(
      this.parentComment,
      { $inc: { replyCount: 1 } }
    );
  }
});

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;
