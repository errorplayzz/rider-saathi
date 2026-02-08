import mongoose from 'mongoose'

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 50000
  },
  excerpt: {
    type: String,
    maxlength: 500
  },
  author: {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    avatar: {
      type: String
    }
  },
  category: {
    type: String,
    required: true,
    enum: [
      'riding-tips',
      'travel-stories', 
      'bike-reviews',
      'maintenance',
      'safety',
      'community-events',
      'rider-news'
    ]
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  image: {
    type: String
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  featured: {
    type: Boolean,
    default: false
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: String
  }],
  views: {
    type: Number,
    default: 0
  },
  comments: [{
    id: String,
    author: {
      id: String,
      name: String,
      avatar: String
    },
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  readTime: {
    type: Number, // in minutes
    default: 1
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  }
}, {
  timestamps: true
})

// Indexes for better performance
blogSchema.index({ category: 1, status: 1 })
blogSchema.index({ 'author.id': 1 })
blogSchema.index({ tags: 1 })
blogSchema.index({ createdAt: -1 })
blogSchema.index({ likes: -1 })
blogSchema.index({ views: -1 })
blogSchema.index({ 
  title: 'text', 
  content: 'text', 
  tags: 'text',
  'author.name': 'text'
})

// Virtual for URL slug
blogSchema.virtual('slug').get(function() {
  return this.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
})

// Method to calculate read time
blogSchema.methods.calculateReadTime = function() {
  const wordsPerMinute = 200
  const wordCount = this.content.split(/\s+/).length
  this.readTime = Math.ceil(wordCount / wordsPerMinute)
  return this.readTime
}

// Pre-save hook to calculate read time and excerpt
blogSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    // Calculate read time
    this.calculateReadTime()
    
    // Generate excerpt if not provided
    if (!this.excerpt) {
      this.excerpt = this.content
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .substring(0, 300)
        .trim() + '...'
    }
  }
  next()
})

// Static method to get blog statistics
blogSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalBlogs: { $sum: 1 },
        totalViews: { $sum: '$views' },
        totalLikes: { $sum: '$likes' },
        avgReadTime: { $avg: '$readTime' }
      }
    }
  ])
  return stats[0] || { totalBlogs: 0, totalViews: 0, totalLikes: 0, avgReadTime: 0 }
}

// Static method to get popular tags
blogSchema.statics.getPopularTags = async function(limit = 10) {
  const tags = await this.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ])
  return tags.map(tag => ({ name: tag._id, count: tag.count }))
}

const Blog = mongoose.model('Blog', blogSchema)

export default Blog