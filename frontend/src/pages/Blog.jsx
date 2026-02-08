import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DocumentTextIcon,
  PlusIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  EyeIcon,
  CalendarIcon,
  TagIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

const Blog = () => {
  const { user, profile } = useAuth()
  const { isDark } = useTheme()
  
  // State management
  const [blogs, setBlogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedBlog, setSelectedBlog] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('latest')
  
  // Create/Edit form state
  const [blogForm, setBlogForm] = useState({
    title: '',
    content: '',
    category: 'riding-tips',
    tags: '',
    image: null
  })

  // Blog categories
  const categories = [
    { id: 'all', name: 'All Blogs', icon: '📝' },
    { id: 'riding-tips', name: 'Riding Tips', icon: '🏍️' },
    { id: 'travel-stories', name: 'Travel Stories', icon: '🗺️' },
    { id: 'bike-reviews', name: 'Bike Reviews', icon: '⭐' },
    { id: 'maintenance', name: 'Maintenance', icon: '🔧' },
    { id: 'safety', name: 'Safety & Gear', icon: '🦺' },
    { id: 'community', name: 'Community Events', icon: '🎉' },
    { id: 'news', name: 'Rider News', icon: '📰' }
  ]

  // Load blogs from API
  useEffect(() => {
    const loadBlogs = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          page: '1',
          limit: '20',
          category: selectedCategory === 'all' ? '' : selectedCategory,
          search: searchQuery,
          sortBy: sortBy
        })
        
        const response = await fetch(`/api/blogs?${params}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': user?.access_token ? `Bearer ${user.access_token}` : ''
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data?.blogs) {
            setBlogs(data.data.blogs)
          } else {
            setBlogs([])
          }
        } else {
          console.error('Failed to load blogs from database')
          setBlogs([])
        }
      } catch (error) {
        console.error('Failed to load blogs:', error)
        setBlogs([])
      } finally {
        setIsLoading(false)
      }
    }

    loadBlogs()
  }, [selectedCategory, searchQuery, sortBy, user])

  // Generate avatar SVG
  const generateAvatar = (name, size = 40) => {
    const colors = ['0ea5e9', 'f59e0b', '10b981', 'ef4444', '8b5cf6', 'ec4899']
    const color = colors[Math.abs(name?.charCodeAt(0) || 0) % colors.length]
    const initial = (name || 'U')[0].toUpperCase()
    const fontSize = Math.floor(size * 0.4)
    const textY = Math.floor(size * 0.65)
    return `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#${color}"/><text x="${size/2}" y="${textY}" text-anchor="middle" fill="white" font-size="${fontSize}" font-family="Arial">${initial}</text></svg>`)}`
  }

  // Filter and sort blogs
  const filteredBlogs = blogs
    .filter(blog => {
      const matchesSearch = blog.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           blog.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           blog.author?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || blog.category === selectedCategory
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'latest':
          return new Date(b.createdAt) - new Date(a.createdAt)
        case 'popular':
          return b.likes - a.likes
        case 'mostViewed':
          return b.views - a.views
        default:
          return 0
      }
    })

  // Handle blog operations
  const handleLike = useCallback(async (blogId) => {
    if (!user?.access_token) {
      // Fallback to local update if not authenticated
      setBlogs(prevBlogs => 
        prevBlogs.map(blog => 
          (blog.id || blog._id) === blogId 
            ? { 
                ...blog, 
                likes: blog.isLiked ? blog.likes - 1 : blog.likes + 1,
                isLiked: !blog.isLiked 
              }
            : blog
        )
      )
      return
    }

    try {
      const response = await fetch(`/api/blogs/${blogId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setBlogs(prevBlogs => 
          prevBlogs.map(blog => 
            (blog.id || blog._id) === blogId 
              ? { 
                  ...blog, 
                  likes: data.data.likes,
                  isLiked: data.data.liked 
                }
              : blog
          )
        )
      } else {
        // Fallback to local update
        setBlogs(prevBlogs => 
          prevBlogs.map(blog => 
            (blog.id || blog._id) === blogId 
              ? { 
                  ...blog, 
                  likes: blog.isLiked ? blog.likes - 1 : blog.likes + 1,
                  isLiked: !blog.isLiked 
                }
              : blog
          )
        )
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
      // Fallback to local update
      setBlogs(prevBlogs => 
        prevBlogs.map(blog => 
          (blog.id || blog._id) === blogId 
            ? { 
                ...blog, 
                likes: blog.isLiked ? blog.likes - 1 : blog.likes + 1,
                isLiked: !blog.isLiked 
              }
            : blog
        )
      )
    }
  }, [user])

  const handleCreateBlog = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/blogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token || localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: blogForm.title,
          content: blogForm.content,
          category: blogForm.category,
          tags: blogForm.tags
        })
      })

      if (response.ok) {
        const data = await response.json()
        setBlogs(prev => [data.data, ...prev])
        setShowCreateForm(false)
        setBlogForm({ title: '', content: '', category: 'riding-tips', tags: '', image: null })
      } else {
        const errorData = await response.json()
        console.error('Failed to create blog:', errorData.message)
        alert('Failed to create blog. Please try again.')
      }
    } catch (error) {
      console.error('Failed to create blog:', error)
      alert('Failed to create blog. Please check your connection and try again.')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatNumber = (num) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`
    }
    return num.toString()
  }

  // Theme-aware styles
  const cardStyle = isDark 
    ? "bg-slate-800/50 border border-slate-700/50" 
    : "bg-white border border-slate-200"
  
  const textPrimary = isDark ? "text-white" : "text-slate-900"
  const textSecondary = isDark ? "text-slate-400" : "text-slate-600"
  const bgPrimary = isDark ? "bg-slate-900" : "bg-white"
  const bgSecondary = isDark ? "bg-slate-800" : "bg-slate-50"

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950' : 'bg-slate-50'} pt-20 px-4`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className={`text-4xl font-bold ${textPrimary} mb-2`}>
              🏍️ Rider Blogs
            </h1>
            <p className={`text-lg ${textSecondary}`}>
              Share your riding experiences, tips, and stories with the community
            </p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Create Blog</span>
          </motion.button>
        </div>

        {/* Filters and Search */}
        <div className={`${cardStyle} rounded-xl p-6 mb-8 backdrop-blur-sm`}>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${textSecondary}`} />
              <input
                type="text"
                placeholder="Search blogs, authors, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-900'} border ${isDark ? 'border-slate-600' : 'border-slate-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : isDark 
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' 
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  <span className="mr-1">{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="relative">
              <FunnelIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${textSecondary}`} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`pl-10 pr-8 py-3 ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-900'} border ${isDark ? 'border-slate-600' : 'border-slate-300'} rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer`}
              >
                <option value="latest">Latest</option>
                <option value="popular">Most Liked</option>
                <option value="mostViewed">Most Viewed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Blog Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className={textSecondary}>Loading awesome blogs...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredBlogs.map((blog, index) => (
              <motion.article
                key={blog._id || blog.id || `blog-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`${cardStyle} rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group`}
                onClick={() => setSelectedBlog(blog)}
              >
                {/* Blog Image */}
                <div className="relative overflow-hidden">
                  <img
                    src={blog.image}
                    alt={blog.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      isDark ? 'bg-black/50 text-white' : 'bg-white/90 text-slate-700'
                    }`}>
                      {categories.find(c => c.id === blog.category)?.icon} {categories.find(c => c.id === blog.category)?.name}
                    </span>
                  </div>
                </div>

                {/* Blog Content */}
                <div className="p-6">
                  <h3 className={`text-xl font-bold ${textPrimary} mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors`}>
                    {blog.title}
                  </h3>
                  
                  <p className={`${textSecondary} text-sm mb-4 line-clamp-3`}>
                    {blog.content}
                  </p>

                  {/* Author & Date */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={blog.author?.avatar || generateAvatar(blog.author?.name, 40)}
                        alt={blog.author?.name || 'Author'}
                        className="w-10 h-10 rounded-full"
                        onError={(e) => {
                          e.target.src = generateAvatar(blog.author?.name, 40)
                        }}
                      />
                      <div>
                        <p className={`font-medium ${textPrimary} text-sm`}>{blog.author?.name || 'Anonymous'}</p>
                        <div className={`flex items-center space-x-1 ${textSecondary} text-xs`}>
                          <CalendarIcon className="h-3 w-3" />
                          <span>{formatDate(blog.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {blog.tags.slice(0, 3).map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className={`px-2 py-1 rounded-md text-xs ${
                          isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Engagement Stats */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleLike(blog._id || blog.id)
                        }}
                        className={`flex items-center space-x-1 text-sm transition-colors ${
                          blog.isLiked ? 'text-red-500' : textSecondary
                        } hover:text-red-500`}
                      >
                        {blog.isLiked ? (
                          <HeartIconSolid className="h-4 w-4" />
                        ) : (
                          <HeartIcon className="h-4 w-4" />
                        )}
                        <span>{formatNumber(blog.likes)}</span>
                      </button>

                      <div className={`flex items-center space-x-1 text-sm ${textSecondary}`}>
                        <ChatBubbleLeftIcon className="h-4 w-4" />
                        <span>{formatNumber(blog.comments)}</span>
                      </div>

                      <div className={`flex items-center space-x-1 text-sm ${textSecondary}`}>
                        <EyeIcon className="h-4 w-4" />
                        <span>{formatNumber(blog.views)}</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // Handle share
                      }}
                      className={`${textSecondary} hover:text-blue-500 transition-colors`}
                    >
                      <ShareIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}

        {filteredBlogs.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <DocumentTextIcon className={`w-24 h-24 mx-auto ${textSecondary} mb-4`} />
            <h3 className={`text-xl font-medium ${textPrimary} mb-2`}>No blogs found</h3>
            <p className={textSecondary}>Try adjusting your search or filters</p>
          </div>
        )}
      </motion.div>

      {/* Create Blog Modal */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`${bgPrimary} rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleCreateBlog} className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className={`text-2xl font-bold ${textPrimary}`}>Create New Blog</h2>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className={`${textSecondary} hover:${textPrimary}`}
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                      Blog Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={blogForm.title}
                      onChange={(e) => setBlogForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter an engaging title for your blog..."
                      className={`w-full p-3 border rounded-lg ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                      Category *
                    </label>
                    <select
                      required
                      value={blogForm.category}
                      onChange={(e) => setBlogForm(prev => ({ ...prev, category: e.target.value }))}
                      className={`w-full p-3 border rounded-lg ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'} focus:ring-2 focus:ring-blue-500`}
                    >
                      {categories.filter(c => c.id !== 'all').map(category => (
                        <option key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                      Tags
                    </label>
                    <input
                      type="text"
                      value={blogForm.tags}
                      onChange={(e) => setBlogForm(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="Enter tags separated by commas (e.g., safety, tips, beginner)"
                      className={`w-full p-3 border rounded-lg ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                      Blog Content *
                    </label>
                    <textarea
                      required
                      value={blogForm.content}
                      onChange={(e) => setBlogForm(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Write your blog content here... Share your experience, tips, or story with the community!"
                      rows={12}
                      className={`w-full p-3 border rounded-lg ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none`}
                    />
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className={`px-6 py-3 border rounded-lg font-medium ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                    >
                      Publish Blog
                    </motion.button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blog View Modal */}
      <AnimatePresence>
        {selectedBlog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedBlog(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`${bgPrimary} rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <img
                  src={selectedBlog.image}
                  alt={selectedBlog.title}
                  className="w-full h-64 object-cover rounded-t-xl"
                />
                <button
                  onClick={() => setSelectedBlog(null)}
                  className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-8">
                <h1 className={`text-3xl font-bold ${textPrimary} mb-4`}>
                  {selectedBlog.title}
                </h1>
                
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <img
                      src={selectedBlog.author?.avatar || generateAvatar(selectedBlog.author?.name, 48)}
                      alt={selectedBlog.author?.name || 'Author'}
                      className="w-12 h-12 rounded-full"
                      onError={(e) => {
                        e.target.src = generateAvatar(selectedBlog.author?.name, 48)
                      }}
                    />
                    <div>
                      <p className={`font-medium ${textPrimary}`}>{selectedBlog.author?.name || 'Anonymous'}</p>
                      <p className={`text-sm ${textSecondary}`}>{formatDate(selectedBlog.createdAt)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleLike(selectedBlog._id || selectedBlog.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        selectedBlog.isLiked 
                          ? 'bg-red-100 text-red-600' 
                          : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {selectedBlog.isLiked ? (
                        <HeartIconSolid className="h-5 w-5" />
                      ) : (
                        <HeartIcon className="h-5 w-5" />
                      )}
                      <span>{formatNumber(selectedBlog.likes)}</span>
                    </button>
                  </div>
                </div>

                <div className={`prose ${isDark ? 'prose-invert' : ''} max-w-none`}>
                  <p className="text-lg leading-relaxed whitespace-pre-wrap">
                    {selectedBlog.content}
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex flex-wrap gap-2">
                    {selectedBlog.tags.map((tag, index) => (
                      <span
                        key={index}
                        className={`px-3 py-1 rounded-full text-sm ${
                          isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Blog