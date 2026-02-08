import express from 'express'
import { auth } from '../middleware/auth.js'
import Blog from '../models/Blog.js'
import { body, query, validationResult } from 'express-validator'

const router = express.Router()

// Blog categories with metadata
const categories = [
  { 
    id: 'riding-tips', 
    name: 'Riding Tips', 
    icon: '🏍️',
    description: 'Expert advice and techniques for better riding'
  },
  { 
    id: 'travel-stories', 
    name: 'Travel Stories', 
    icon: '🗺️',
    description: 'Share your epic journeys and adventures'
  },
  { 
    id: 'bike-reviews', 
    name: 'Bike Reviews', 
    icon: '⭐',
    description: 'Honest reviews and comparisons of motorcycles'
  },
  { 
    id: 'maintenance', 
    name: 'Maintenance', 
    icon: '🔧',
    description: 'Keep your bike running smoothly with maintenance tips'
  },
  { 
    id: 'safety', 
    name: 'Safety & Gear', 
    icon: '🦺',
    description: 'Essential safety tips and gear recommendations'
  },
  { 
    id: 'community-events', 
    name: 'Community Events', 
    icon: '🎉',
    description: 'Upcoming rides and community gatherings'
  },
  { 
    id: 'rider-news', 
    name: 'Rider News', 
    icon: '📰',
    description: 'Latest news and updates from the riding world'
  }
]

// @route   GET /api/blogs
// @desc    Get all blogs with filters, search, and pagination
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().custom(value => {
    if (!value || value === '' || value === 'all') return true
    return categories.map(c => c.id).includes(value)
  }),
  query('search').optional().isLength({ max: 200 }),
  query('sortBy').optional().isIn(['latest', 'popular', 'mostViewed', 'trending'])
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array())
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: errors.array()
      })
    }

    const {
      page = 1,
      limit = 10,
      category = 'all',
      search = '',
      sortBy = 'latest',
      featured
    } = req.query

    // Build query
    let query = { status: 'published' }
    
    if (category && category !== 'all') {
      query.category = category
    }

    if (featured === 'true') {
      query.featured = true
    }

    if (search) {
      query.$text = { $search: search }
    }

    // Build sort
    let sort = {}
    switch (sortBy) {
      case 'latest':
        sort = { createdAt: -1 }
        break
      case 'popular':
        sort = { likes: -1, createdAt: -1 }
        break
      case 'mostViewed':
        sort = { views: -1, createdAt: -1 }
        break
      case 'trending':
        // Trending = combination of likes, views, and recency
        sort = { 
          $expr: {
            $add: [
              { $multiply: ['$likes', 2] },
              '$views',
              { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 86400000] }
            ]
          }
        }
        break
      default:
        sort = { createdAt: -1 }
    }

    // Execute query with pagination
    const skip = (page - 1) * limit
    
    const [blogs, totalCount] = await Promise.all([
      Blog.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Blog.countDocuments(query)
    ])

    const totalPages = Math.ceil(totalCount / limit)

    res.json({
      success: true,
      data: {
        blogs,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        filters: {
          category,
          search,
          sortBy
        }
      }
    })
  } catch (error) {
    console.error('Error fetching blogs:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blogs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// @route   GET /api/blogs/featured
// @desc    Get featured blogs
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const featuredBlogs = await Blog.find({ 
      status: 'published', 
      featured: true 
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean()

    res.json({
      success: true,
      data: featuredBlogs
    })
  } catch (error) {
    console.error('Error fetching featured blogs:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured blogs'
    })
  }
})

// @route   GET /api/blogs/categories
// @desc    Get all blog categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    res.json({
      success: true,
      data: categories
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    })
  }
})

// @route   GET /api/blogs/stats
// @desc    Get blog statistics
// @access  Public  
router.get('/stats', async (req, res) => {
  try {
    const stats = await Blog.getStats()
    const popularTags = await Blog.getPopularTags()
    
    res.json({
      success: true,
      data: {
        ...stats,
        popularTags
      }
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    })
  }
})

// @route   POST /api/blogs
// @desc    Create new blog
// @access  Private
router.post('/', [
  auth,
  body('title').notEmpty().trim().isLength({ min: 5, max: 200 }),
  body('content').notEmpty().trim().isLength({ min: 50, max: 50000 }),
  body('category').isIn(categories.map(c => c.id)),
  body('tags').optional().isArray(),
  body('image').optional().isURL(),
  body('excerpt').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      })
    }

    const { title, content, category, tags, image, excerpt, featured } = req.body
    
    // Create new blog
    const blog = new Blog({
      title: title.trim(),
      content: content.trim(),
      excerpt: excerpt?.trim(),
      author: {
        id: req.user.id,
        name: req.user.name || req.user.email || 'Anonymous User',
        avatar: req.user.avatar || `https://ui-avatars.io/api/?name=${encodeURIComponent(req.user.name || req.user.email)}&background=0ea5e9&color=fff`
      },
      category,
      tags: tags || [],
      image: image || `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000000000)}?w=800&h=400&fit=crop&auto=format`,
      featured: featured || false
    })

    await blog.save()

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: blog
    })
  } catch (error) {
    console.error('Error creating blog:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create blog',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// @route   GET /api/blogs/:id
// @desc    Get single blog by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
    
    if (!blog || blog.status !== 'published') {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      })
    }

    // Increment view count
    blog.views += 1
    await blog.save()

    res.json({
      success: true,
      data: blog
    })
  } catch (error) {
    console.error('Error fetching blog:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog'
    })
  }
})

// @route   PUT /api/blogs/:id
// @desc    Update blog
// @access  Private (author only)
router.put('/:id', [
  auth,
  body('title').optional().trim().isLength({ min: 5, max: 200 }),
  body('content').optional().trim().isLength({ min: 50, max: 50000 }),
  body('category').optional().isIn(categories.map(c => c.id))
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      })
    }

    const blog = await Blog.findById(req.params.id)
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      })
    }

    // Check if user is author
    if (blog.author.id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this blog'
      })
    }

    // Update fields
    const updateFields = ['title', 'content', 'category', 'tags', 'image', 'excerpt', 'featured']
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        blog[field] = req.body[field]
      }
    })

    await blog.save()

    res.json({
      success: true,
      message: 'Blog updated successfully',
      data: blog
    })
  } catch (error) {
    console.error('Error updating blog:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update blog'
    })
  }
})

// @route   DELETE /api/blogs/clear-all
// @desc    Clear all blogs from database (development only)
// @access  Public (development)
router.delete('/clear-all', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Clear endpoint only available in development'
      })
    }

    const result = await Blog.deleteMany({})
    
    res.json({
      success: true,
      message: `All blogs cleared. ${result.deletedCount} blogs deleted.`,
      data: { deletedCount: result.deletedCount }
    })
  } catch (error) {
    console.error('Error clearing blogs:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to clear blogs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// @route   DELETE /api/blogs/:id
// @desc    Delete blog
// @access  Private (author only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      })
    }

    // Check if user is author
    if (blog.author.id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this blog'
      })
    }

    await Blog.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'Blog deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting blog:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete blog'
    })
  }
})

// @route   POST /api/blogs/:id/like
// @desc    Like/Unlike blog
// @access  Private
router.post('/:id/like', auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      })
    }

    const userId = req.user.id
    const hasLiked = blog.likedBy.includes(userId)

    if (hasLiked) {
      // Unlike
      blog.likedBy = blog.likedBy.filter(id => id !== userId)
      blog.likes = Math.max(0, blog.likes - 1)
    } else {
      // Like
      blog.likedBy.push(userId)
      blog.likes += 1
    }

    await blog.save()

    res.json({
      success: true,
      data: {
        liked: !hasLiked,
        likes: blog.likes
      }
    })
  } catch (error) {
    console.error('Error toggling like:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like'
    })
  }
})

// @route   POST /api/blogs/seed
// @desc    Seed database with sample blogs (development only)
// @access  Public
router.post('/seed', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Seed endpoint only available in development'
      })
    }

    // Clear existing blogs
    await Blog.deleteMany({})

    // Sample blog data
    const sampleBlogs = [
      {
        title: "Top 10 Riding Safety Tips for New Riders",
        content: "Safety should always be your top priority when riding. Here are essential tips that every new rider should know to stay safe on the road...\n\n1. Always wear a helmet - Your head is irreplaceable\n2. Invest in proper gear - Jacket, gloves, boots\n3. Take a riding course - Professional training saves lives\n4. Check your bike before every ride\n5. Stay visible - Bright colors, reflective gear\n6. Follow traffic rules religiously\n7. Maintain safe distance from vehicles\n8. Avoid riding in bad weather initially\n9. Regular bike maintenance is crucial\n10. Never ride under influence of anything",
        author: {
          id: "user123",
          name: "Rajesh Kumar",
          avatar: "https://ui-avatars.io/api/?name=Rajesh+Kumar&background=0ea5e9&color=fff"
        },
        category: "safety",
        tags: ["safety", "beginner", "tips"],
        image: "https://images.unsplash.com/photo-1558618666-c0a6c12edc6e?w=800&h=400&fit=crop",
        likes: 47,
        views: 234,
        featured: true
      },
      {
        title: "My Epic Journey Through Ladakh - Day 1",
        content: "The journey of a thousand miles begins with a single step... or in this case, the roar of an engine. My adventure through Ladakh started early morning from Delhi at 4 AM, with my trusty Royal Enfield Himalayan loaded with all essentials.\n\nThe first challenge was navigating through Delhi traffic even at that early hour. But once we hit the highway towards Chandigarh, the real journey began. The cool morning breeze, the open road, and the excitement of what lay ahead made every kilometer special.\n\nLunch was at a dhaba near Chandigarh, where I met three other riders on similar journeys. We decided to ride together for safety and companionship. The camaraderie among riders is something truly special - strangers become family on the road.\n\nReached Manali by evening, tired but exhilarated. Tomorrow, we tackle the challenging route to Sarchu. Can't wait!",
        author: {
          id: "user456",
          name: "Priya Sharma",
          avatar: "https://ui-avatars.io/api/?name=Priya+Sharma&background=10b981&color=fff"
        },
        category: "travel-stories",
        tags: ["ladakh", "adventure", "travel", "himalayan"],
        image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop",
        likes: 89,
        views: 456
      },
      {
        title: "KTM Duke 390 vs Royal Enfield Classic - Detailed Review",
        content: "Choosing between a sporty KTM Duke 390 and the classic Royal Enfield Classic? Here's my detailed comparison after riding both for 6 months. Both bikes have their unique charm and serve different purposes...",
        author: {
          id: "user789",
          name: "Amit Singh",
          avatar: "https://ui-avatars.io/api/?name=Amit+Singh&background=f59e0b&color=fff"
        },
        category: "bike-reviews",
        tags: ["ktm", "royal-enfield", "comparison", "review"],
        image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&h=400&fit=crop",
        likes: 156,
        views: 789
      }
    ]

    // Create blogs
    const blogs = await Blog.create(sampleBlogs)

    res.json({
      success: true,
      message: `${blogs.length} sample blogs created successfully`,
      data: blogs
    })
  } catch (error) {
    console.error('Error seeding blogs:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to seed blogs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

export default router