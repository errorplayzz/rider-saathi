import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DocumentTextIcon, PlusIcon, HeartIcon, ChatBubbleLeftIcon, EyeIcon, CalendarIcon,
  MagnifyingGlassIcon, XMarkIcon, ShieldCheckIcon, PhotoIcon, ShareIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

// Sub-components for cleaner structure
const BlogCard = ({ blog, onOpen, onLike }) => {
  const getCategoryImage = (b) => {
    if (b?.image && typeof b.image === 'string' && b.image.trim().length > 0) return b.image
    return 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=800&auto=format&fit=crop'
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  }

  const formatNum = (n) => (Number(n) >= 1000 ? `${(Number(n)/1000).toFixed(1)}k` : Number(n) || 0)

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -8 }}
      className="group relative flex flex-col rounded-[32px] bg-[#0A0A0A] border border-white/5 overflow-hidden transition-all duration-500 hover:border-white/10 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)] cursor-pointer"
      onClick={() => onOpen(blog)}
    >
      <div className="absolute top-4 left-4 z-20">
        <span className="px-3 py-1.5 rounded-full bg-[#121212]/80 border border-white/10 text-[#86868B] text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
          {blog.category.replace('-', ' ')}
        </span>
      </div>
      
      <div className="relative h-64 overflow-hidden bg-[#121212]">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent z-10 opacity-80" />
        <img 
          src={getCategoryImage(blog)} 
          alt={blog.title}
          className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-col flex-grow p-6 z-20 -mt-12">
        <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-[#B08968] transition-colors drop-shadow-md">
          {blog.title}
        </h3>
        <p className="text-[#86868B] text-sm leading-relaxed mb-6 line-clamp-3 flex-grow">
          {blog.content}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#B08968] to-[#8C6D53] flex items-center justify-center text-white font-bold text-xs shadow-inner">
              {(blog.author?.name || 'U')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F5F5F7]">{blog.author?.name || 'Anonymous'}</p>
              <p className="text-xs text-[#86868B]">{formatDate(blog.createdAt)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={(e) => { e.stopPropagation(); onLike(blog._id || blog.id); }}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${blog.isLiked ? 'text-red-500' : 'text-[#86868B] hover:text-white'}`}
            >
              {blog.isLiked ? <HeartIconSolid className="w-4 h-4" /> : <HeartIcon className="w-4 h-4" />}
              {formatNum(blog.likes)}
            </button>
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#86868B]">
              <EyeIcon className="w-4 h-4" />
              {formatNum(blog.views)}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

const Blog = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  
  const [blogs, setBlogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedBlog, setSelectedBlog] = useState(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('latest') // 'latest', 'popular', 'mostViewed'
  const [createError, setCreateError] = useState('')

  const [blogForm, setBlogForm] = useState({
    title: '', content: '', category: 'riding-tips', tags: '', imageFile: null
  })

  const categories = [
    { id: 'all', name: 'All Stories' },
    { id: 'riding-tips', name: 'Riding Tips' },
    { id: 'travel-stories', name: 'Travel Stories' },
    { id: 'bike-reviews', name: 'Bike Reviews' },
    { id: 'maintenance', name: 'Maintenance' },
    { id: 'safety', name: 'Safety & Gear' }
  ]

  useEffect(() => {
    const loadBlogs = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({ page: '1', limit: '20' })
        const response = await fetch(`/api/blogs?${params}`, {
          headers: { 'Content-Type': 'application/json', 'Authorization': user?.access_token ? `Bearer ${user.access_token}` : '' }
        })
        if (response.ok) {
          const data = await response.json()
          setBlogs(data.data?.blogs || [])
        } else {
          setBlogs([])
        }
      } catch (error) {
        setBlogs([])
      } finally {
        setIsLoading(false)
      }
    }
    loadBlogs()
  }, [user])

  const filteredBlogs = useMemo(() => {
    return blogs
      .filter(blog => {
        const matchesSearch = (blog.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (blog.content || '').toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCat = selectedCategory === 'all' || blog.category === selectedCategory
        return matchesSearch && matchesCat
      })
      .sort((a, b) => {
        if (sortBy === 'latest') return new Date(b.createdAt) - new Date(a.createdAt)
        if (sortBy === 'popular') return (b.likes || 0) - (a.likes || 0)
        if (sortBy === 'mostViewed') return (b.views || 0) - (a.views || 0)
        return 0
      })
  }, [blogs, searchQuery, selectedCategory, sortBy])

  const handleLike = useCallback(async (blogId) => {
    if (!user?.access_token) {
      setBlogs(prev => prev.map(b => (b.id || b._id) === blogId ? { ...b, likes: b.isLiked ? b.likes - 1 : b.likes + 1, isLiked: !b.isLiked } : b))
      return
    }
    try {
      const res = await fetch(`/api/blogs/${blogId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setBlogs(prev => prev.map(b => (b.id || b._id) === blogId ? { ...b, likes: data.data.likes, isLiked: data.data.liked } : b))
      } else {
        setBlogs(prev => prev.map(b => (b.id || b._id) === blogId ? { ...b, likes: b.isLiked ? b.likes - 1 : b.likes + 1, isLiked: !b.isLiked } : b))
      }
    } catch (e) {
      setBlogs(prev => prev.map(b => (b.id || b._id) === blogId ? { ...b, likes: b.isLiked ? b.likes - 1 : b.likes + 1, isLiked: !b.isLiked } : b))
    }
  }, [user])

  const handleCreateBlog = async (e) => {
    e.preventDefault()
    setCreateError('')
    if (blogForm.title.trim().length < 5) return setCreateError('Title must be at least 5 characters.')
    if (blogForm.content.trim().length < 50) return setCreateError('Content must be at least 50 characters.')
    
    try {
      const formData = new FormData()
      formData.append('title', blogForm.title)
      formData.append('content', blogForm.content)
      formData.append('category', blogForm.category)
      formData.append('tags', JSON.stringify(blogForm.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)))
      if (blogForm.imageFile) formData.append('image', blogForm.imageFile)

      const res = await fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user?.access_token || localStorage.getItem('token')}` },
        body: formData
      })
      if (res.ok) {
        const data = await res.json()
        setBlogs(prev => [data.data, ...prev])
        setShowCreateForm(false)
        setBlogForm({ title: '', content: '', category: 'riding-tips', tags: '', imageFile: null })
      } else {
        const err = await res.json().catch(() => null)
        setCreateError(err?.errors?.[0]?.msg || err?.message || 'Failed to create blog.')
      }
    } catch (e) {
      setCreateError('Connection failed. Please try again.')
    }
  }

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return setBlogForm(prev => ({ ...prev, imageFile: null }))
    if (!file.type.startsWith('image/')) return setCreateError('Please select an image file.')
    setCreateError('')
    setBlogForm(prev => ({ ...prev, imageFile: file }))
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F7] font-sans pb-32 relative overflow-x-hidden selection:bg-[#B08968]/30 pt-20">
      
      {/* Immersive Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] bg-[#B08968]/10 rounded-full blur-[150px] opacity-70"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-[#1C1C1E]/30 via-[#0A0A0A] to-[#050505]"></div>
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        
        {/* PREMIUM HERO */}
        <div className="flex flex-col items-center text-center space-y-8 pt-12 pb-20 border-b border-white/5">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-white/5 border border-white/10 mb-2">
            <DocumentTextIcon className="w-8 h-8 text-[#B08968]" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-[#F5F5F7] to-[#86868B] drop-shadow-xl">
            Rider Stories
          </h1>
          <p className="text-[#86868B] text-lg max-w-2xl font-medium leading-relaxed">
            Chronicles from the road. Connect, share, and get inspired by the global riding community.
          </p>
          
          <div className="bg-[#B08968]/10 border border-[#B08968]/20 rounded-2xl p-4 flex items-center gap-4 text-[#F5F5F7] max-w-2xl text-left shadow-[0_10px_30px_rgba(176,137,104,0.1)]">
            <ShieldCheckIcon className="w-6 h-6 text-[#B08968] flex-shrink-0" />
            <div className="text-xs font-medium leading-relaxed text-[#B08968]">
              <strong>Development Notice:</strong> The Blog system is currently running on simulated mock data. Full database integration is in progress and will be functional soon!
            </div>
          </div>
          
          <button 
            onClick={() => setShowCreateForm(true)}
            className="mt-8 px-8 py-4 rounded-full bg-gradient-to-r from-[#B08968] to-[#8C6D53] hover:from-[#9c785b] hover:to-[#7a5f48] text-white font-bold text-sm tracking-widest uppercase shadow-[0_0_40px_rgba(176,137,104,0.4)] hover:shadow-[0_0_60px_rgba(176,137,104,0.6)] transition-all flex items-center gap-3"
          >
            <PlusIcon className="w-5 h-5" /> Share Your Story
          </button>
        </div>

        {/* GLASSMORPHIC CONTROLS */}
        <div className="py-12 sticky top-20 z-40 bg-[#050505]/80 backdrop-blur-3xl border-b border-white/5 mb-12 -mx-6 px-6 lg:-mx-12 lg:px-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 max-w-[1400px] mx-auto">
            
            {/* Pill Filters */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 lg:pb-0 w-full lg:w-auto">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex-shrink-0 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                    selectedCategory === cat.id 
                      ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]' 
                      : 'bg-[#121212] border border-white/10 text-[#86868B] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Search & Sort */}
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-72">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B]" />
                <input 
                  type="text"
                  placeholder="Search stories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-[#86868B] outline-none focus:border-white/30 focus:bg-white/5 transition-all"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#121212] border border-white/10 rounded-full py-2.5 px-6 text-sm text-white font-medium outline-none focus:border-white/30 cursor-pointer appearance-none"
              >
                <option value="latest">Latest</option>
                <option value="popular">Popular</option>
                <option value="mostViewed">Most Viewed</option>
              </select>
            </div>
          </div>
        </div>

        {/* FEED GRID */}
        {isLoading ? (
          <div className="py-32 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-2 border-[#B08968]/30 border-t-[#B08968] rounded-full animate-spin mb-6" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#86868B]">Loading Stories...</p>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-full bg-[#121212] border border-white/5 flex items-center justify-center mb-6">
              <DocumentTextIcon className="w-10 h-10 text-[#86868B]/50" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No Stories Found</h3>
            <p className="text-[#86868B] text-sm max-w-sm mb-8">Try adjusting your search terms or selecting a different category.</p>
            <button onClick={() => {setSearchQuery(''); setSelectedCategory('all')}} className="px-8 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-widest transition-all">
              Clear Filters
            </button>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            <AnimatePresence>
              {filteredBlogs.map(blog => (
                <BlogCard key={blog._id || blog.id} blog={blog} onOpen={setSelectedBlog} onLike={handleLike} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* CREATE MODAL */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#0A0A0A] border border-white/10 rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-white/5 px-8 py-6 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-white">Write a Story</h2>
                <button onClick={() => setShowCreateForm(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#86868B] hover:text-white transition-colors">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateBlog} className="p-8 space-y-6">
                {createError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl text-sm font-medium flex items-center gap-3">
                    <XMarkIcon className="w-5 h-5" /> {createError}
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#86868B] mb-3">Title</label>
                  <input
                    type="text" required value={blogForm.title} onChange={e => setBlogForm({...blogForm, title: e.target.value})}
                    placeholder="Enter an engaging title..."
                    className="w-full bg-[#121212] border border-white/10 rounded-2xl p-4 text-white placeholder:text-[#86868B] outline-none focus:border-[#B08968]/50 focus:bg-[#1C1C1E] transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#86868B] mb-3">Category</label>
                    <select
                      value={blogForm.category} onChange={e => setBlogForm({...blogForm, category: e.target.value})}
                      className="w-full bg-[#121212] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#B08968]/50 appearance-none cursor-pointer"
                    >
                      {categories.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#86868B] mb-3">Cover Image</label>
                    <label className="w-full bg-[#121212] border border-white/10 rounded-2xl p-4 flex items-center gap-3 text-[#86868B] cursor-pointer hover:bg-white/5 transition-all">
                      <PhotoIcon className="w-5 h-5" />
                      <span className="text-sm truncate">{blogForm.imageFile ? blogForm.imageFile.name : 'Upload Image'}</span>
                      <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#86868B] mb-3">Tags</label>
                  <input
                    type="text" value={blogForm.tags} onChange={e => setBlogForm({...blogForm, tags: e.target.value})}
                    placeholder="e.g. safety, gear, review"
                    className="w-full bg-[#121212] border border-white/10 rounded-2xl p-4 text-white placeholder:text-[#86868B] outline-none focus:border-[#B08968]/50 focus:bg-[#1C1C1E] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#86868B] mb-3">Content</label>
                  <textarea
                    required rows="6" value={blogForm.content} onChange={e => setBlogForm({...blogForm, content: e.target.value})}
                    placeholder="Write your story here..."
                    className="w-full bg-[#121212] border border-white/10 rounded-2xl p-4 text-white placeholder:text-[#86868B] outline-none focus:border-[#B08968]/50 focus:bg-[#1C1C1E] transition-all resize-none"
                  />
                </div>

                <div className="pt-6 border-t border-white/5 flex justify-end">
                  <button type="submit" className="px-8 py-4 rounded-full bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                    Publish Story
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* READ MODAL (Simple View for Redesign) */}
      <AnimatePresence>
        {selectedBlog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-50 overflow-y-auto"
            onClick={() => setSelectedBlog(null)}
          >
            <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className="bg-[#050505] border border-white/10 rounded-[40px] max-w-4xl w-full overflow-hidden shadow-2xl relative"
                onClick={e => e.stopPropagation()}
              >
                <button onClick={() => setSelectedBlog(null)} className="absolute top-6 right-6 w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-50">
                  <XMarkIcon className="w-6 h-6" />
                </button>
                
                <div className="h-80 md:h-96 w-full relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-10" />
                  <img src={selectedBlog.image || 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1200&auto=format&fit=crop'} className="w-full h-full object-cover" />
                </div>
                
                <div className="p-8 md:p-12 relative z-20 -mt-32">
                  <span className="px-4 py-2 rounded-full bg-[#121212]/90 backdrop-blur-md border border-white/10 text-[#86868B] text-xs font-bold uppercase tracking-widest mb-6 inline-block">
                    {selectedBlog.category?.replace('-', ' ')}
                  </span>
                  
                  <h1 className="text-4xl md:text-5xl font-black text-white mb-8 leading-tight">
                    {selectedBlog.title}
                  </h1>
                  
                  <div className="flex items-center gap-4 pb-8 border-b border-white/5 mb-8">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#B08968] to-[#8C6D53] flex items-center justify-center text-white font-bold text-lg shadow-inner">
                      {(selectedBlog.author?.name || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-base font-bold text-white">{selectedBlog.author?.name || 'Anonymous'}</p>
                      <p className="text-sm text-[#86868B]">{new Date(selectedBlog.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="prose prose-invert max-w-none prose-p:text-[#A1A1A6] prose-p:leading-relaxed prose-p:text-lg">
                    <p className="whitespace-pre-wrap">{selectedBlog.content}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

export default Blog