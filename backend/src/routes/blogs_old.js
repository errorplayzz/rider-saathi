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
  query('category').optional().isIn(categories.map(c => c.id).concat('all')),
  query('search').optional().isLength({ max: 200 }),
  query('sortBy').optional().isIn(['latest', 'popular', 'mostViewed', 'trending'])
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
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
// @desc    Get all blogs with pagination and filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      search,
      sortBy = 'latest',
      author
    } = req.query

    let filteredBlogs = [...blogs]

    // Filter by category
    if (category && category !== 'all') {
      filteredBlogs = filteredBlogs.filter(blog => blog.category === category)
    }

    // Filter by author
    if (author) {
      filteredBlogs = filteredBlogs.filter(blog => 
        blog.author.id === author || 
        blog.author.name.toLowerCase().includes(author.toLowerCase())
      )
    }

    // Search functionality
    if (search) {
      const searchTerm = search.toLowerCase()
      filteredBlogs = filteredBlogs.filter(blog =>
        blog.title.toLowerCase().includes(searchTerm) ||
        blog.content.toLowerCase().includes(searchTerm) ||
        blog.author.name.toLowerCase().includes(searchTerm) ||
        blog.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      )
    }

    // Sort blogs
    switch (sortBy) {
      case 'latest':
        filteredBlogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        break
      case 'popular':
        filteredBlogs.sort((a, b) => b.likes - a.likes)
        break
      case 'mostViewed':
        filteredBlogs.sort((a, b) => b.views - a.views)
        break
      case 'oldest':
        filteredBlogs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        break
      default:
        break
    }

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit)
    const endIndex = startIndex + parseInt(limit)
    const paginatedBlogs = filteredBlogs.slice(startIndex, endIndex)

    // Add user-specific data (likes, etc.) if authenticated
    const userId = req.user?.id
    const blogsWithUserData = paginatedBlogs.map(blog => ({
      ...blog,
      isLiked: userId ? blog.likedBy.includes(userId) : false,
      commentsCount: blog.comments?.length || 0
    }))

    res.json({
      success: true,
      data: {
        blogs: blogsWithUserData,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredBlogs.length / parseInt(limit)),
          totalBlogs: filteredBlogs.length,
          hasNextPage: endIndex < filteredBlogs.length,
          hasPrevPage: startIndex > 0
        },
        filters: {
          category: category || 'all',
          search: search || '',
          sortBy: sortBy || 'latest'
        }
      }
    })
  } catch (error) {
    console.error('Error fetching blogs:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blogs'
    })
  }
})

// @route   GET /api/blogs/:id
// @desc    Get single blog by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const blogId = parseInt(req.params.id)
    const blog = blogs.find(b => b.id === blogId)

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      })
    }

    // Increment view count
    blog.views += 1

    // Add user-specific data if authenticated
    const userId = req.user?.id
    const blogWithUserData = {
      ...blog,
      isLiked: userId ? blog.likedBy.includes(userId) : false,
      commentsCount: blog.comments?.length || 0
    }

    res.json({
      success: true,
      data: blogWithUserData
    })
  } catch (error) {
    console.error('Error fetching blog:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blog'
    })
  }
})

// @route   POST /api/blogs
// @desc    Create new blog
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, category, tags, image } = req.body

    // Validation
    if (!title || !content || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, content, and category are required'
      })
    }

    const newBlog = {
      id: Date.now(), // In production, use proper ID generation
      title: title.trim(),
      content: content.trim(),
      author: {
        id: req.user.id,
        name: req.user.name || req.user.email,
        avatar: req.user.avatar || `https://ui-avatars.io/api/?name=${encodeURIComponent(req.user.name || req.user.email)}&background=0ea5e9&color=fff`
      },
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [],
      image: image || `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000000000)}?w=800&h=400&fit=crop`,
      likes: 0,
      likedBy: [],
      comments: [],
      views: 0,
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    blogs.unshift(newBlog) // Add to beginning of array

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: {
        ...newBlog,
        isLiked: false,
        commentsCount: 0
      }
    })
  } catch (error) {
    console.error('Error creating blog:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create blog'
    })
  }
})

// @route   PUT /api/blogs/:id
// @desc    Update blog
// @access  Private (only author can update)
router.put('/:id', auth, async (req, res) => {
  try {
    const blogId = parseInt(req.params.id)
    const { title, content, category, tags, image } = req.body

    const blogIndex = blogs.findIndex(b => b.id === blogId)
    if (blogIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      })
    }

    const blog = blogs[blogIndex]

    // Check if user is the author
    if (blog.author.id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own blogs'
      })
    }

    // Update blog
    blogs[blogIndex] = {
      ...blog,
      title: title?.trim() || blog.title,
      content: content?.trim() || blog.content,
      category: category || blog.category,
      tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : blog.tags,
      image: image || blog.image,
      updatedAt: new Date().toISOString()
    }

    res.json({
      success: true,
      message: 'Blog updated successfully',
      data: {
        ...blogs[blogIndex],
        isLiked: blog.likedBy.includes(req.user.id),
        commentsCount: blog.comments?.length || 0
      }
    })
  } catch (error) {
    console.error('Error updating blog:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update blog'
    })
  }
})

// @route   DELETE /api/blogs/:id
// @desc    Delete blog
// @access  Private (only author can delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const blogId = parseInt(req.params.id)
    const blogIndex = blogs.findIndex(b => b.id === blogId)

    if (blogIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      })
    }

    const blog = blogs[blogIndex]

    // Check if user is the author
    if (blog.author.id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own blogs'
      })
    }

    blogs.splice(blogIndex, 1)

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
    const blogId = parseInt(req.params.id)
    const userId = req.user.id

    const blog = blogs.find(b => b.id === blogId)
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      })
    }

    const isLiked = blog.likedBy.includes(userId)

    if (isLiked) {
      // Unlike
      blog.likedBy = blog.likedBy.filter(id => id !== userId)
      blog.likes = Math.max(0, blog.likes - 1)
    } else {
      // Like
      blog.likedBy.push(userId)
      blog.likes += 1
    }

    res.json({
      success: true,
      message: isLiked ? 'Blog unliked' : 'Blog liked',
      data: {
        isLiked: !isLiked,
        likes: blog.likes
      }
    })
  } catch (error) {
    console.error('Error toggling blog like:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update like status'
    })
  }
})

// @route   GET /api/blogs/categories/list
// @desc    Get all blog categories
// @access  Public
router.get('/categories/list', async (req, res) => {
  try {
    const categories = [
      { id: 'riding-tips', name: 'Riding Tips', icon: '🏍️', count: blogs.filter(b => b.category === 'riding-tips').length },
      { id: 'travel-stories', name: 'Travel Stories', icon: '🗺️', count: blogs.filter(b => b.category === 'travel-stories').length },
      { id: 'bike-reviews', name: 'Bike Reviews', icon: '⭐', count: blogs.filter(b => b.category === 'bike-reviews').length },
      { id: 'maintenance', name: 'Maintenance', icon: '🔧', count: blogs.filter(b => b.category === 'maintenance').length },
      { id: 'safety', name: 'Safety & Gear', icon: '🦺', count: blogs.filter(b => b.category === 'safety').length },
      { id: 'community', name: 'Community Events', icon: '🎉', count: blogs.filter(b => b.category === 'community').length },
      { id: 'news', name: 'Rider News', icon: '📰', count: blogs.filter(b => b.category === 'news').length }
    ]

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

// @route   POST /api/blogs/demo
// @desc    Create demo blog without authentication
// @access  Public (for testing)
router.post('/demo', async (req, res) => {
  try {
    const { title, content, category, tags, author } = req.body

    // Validation
    if (!title || !content || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, content, and category are required'
      })
    }

    const newBlog = {
      id: Date.now(),
      title: title.trim(),
      content: content.trim(),
      author: {
        id: `demo-${Date.now()}`,
        name: author || 'Demo User',
        avatar: `https://ui-avatars.io/api/?name=${encodeURIComponent(author || 'Demo User')}&background=0ea5e9&color=fff`
      },
      category,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)) : [],
      image: `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000000000)}?w=800&h=400&fit=crop`,
      likes: Math.floor(Math.random() * 50),
      likedBy: [],
      comments: [],
      views: Math.floor(Math.random() * 200),
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    blogs.push(newBlog)

    res.status(201).json({
      success: true,
      message: 'Demo blog created successfully',
      data: newBlog
    })
  } catch (error) {
    console.error('Error creating demo blog:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create demo blog'
    })
  }
})

export default router