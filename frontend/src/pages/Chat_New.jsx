import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  MapPinIcon,
  PhotoIcon,
  LinkIcon,
  ChatBubbleLeftIcon,
  HeartIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  EllipsisVerticalIcon,
  UserPlusIcon,
  CheckIcon,
  XMarkIcon,
  VideoCameraIcon,
  PlayIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  BoltIcon,
  UserCircleIcon,
  Squares2X2Icon,
  UsersIcon,
  PlusCircleIcon,
  FlagIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'

const Chat = () => {
  const { user } = useAuth()
  const { connected, onlineUsers } = useSocket()

  // Panel States
  const [activeTab, setActiveTab] = useState('friends') // friends | communities | nearby
  const [selectedChat, setSelectedChat] = useState(null) // { type: 'dm' | 'community', id, data }
  const [viewMode, setViewMode] = useState('chat') // chat | feed

  // Data States
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [communities, setCommunities] = useState([])
  const [nearbyRiders, setNearbyRiders] = useState([])
  const [messages, setMessages] = useState([])
  const [posts, setPosts] = useState([])
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [postInput, setPostInput] = useState('')
  const [showNewPost, setShowNewPost] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [showMediaUpload, setShowMediaUpload] = useState(false)

  const messagesEndRef = useRef(null)

  // Mock Data - Replace with real API calls
  useEffect(() => {
    loadMockData()
  }, [user])

  const loadMockData = () => {
    // Mock Friends
    setFriends([
      { id: 1, name: 'Rahul Sharma', bike: 'Royal Enfield Classic 350', city: 'Delhi', online: true, avatar: null },
      { id: 2, name: 'Priya Singh', bike: 'KTM Duke 390', city: 'Mumbai', online: true, avatar: null },
      { id: 3, name: 'Arjun Patel', bike: 'Bajaj Dominar 400', city: 'Bangalore', online: false, avatar: null },
    ])

    // Mock Friend Requests
    setFriendRequests([
      { id: 101, name: 'Vikram Roy', bike: 'Yamaha R15', city: 'Kolkata', mutualFriends: 3 }
    ])

    // Mock Communities
    setCommunities([
      { id: 1, name: 'Delhi Riders Club', members: 1247, type: 'city', verified: true, avatar: '🏍️' },
      { id: 2, name: 'Himalayan Routes', members: 3421, type: 'topic', verified: true, avatar: '🏔️' },
      { id: 3, name: 'Weekend Warriors', members: 892, type: 'topic', verified: false, avatar: '⚡' },
    ])

    // Mock Nearby Riders
    setNearbyRiders([
      { id: 201, name: 'Sneha Das', bike: 'Honda CB350', distance: '1.2 km', online: true },
      { id: 202, name: 'Karan Mehta', bike: 'Jawa 42', distance: '3.5 km', online: true },
    ])

    // Mock Posts for Community Feed
    setPosts([
      {
        id: 1,
        author: { name: 'Rahul Sharma', verified: true, avatar: null },
        community: 'Delhi Riders Club',
        timestamp: '2 hours ago',
        type: 'text',
        title: 'Best route to Manali from Delhi?',
        content: 'Planning a trip next weekend. Any suggestions on the best route avoiding heavy traffic?',
        upvotes: 34,
        downvotes: 2,
        comments: 12,
        isPinned: false,
        tags: ['route', 'travel', 'manali']
      },
      {
        id: 2,
        author: { name: 'Priya Singh', verified: true, avatar: null },
        community: 'Himalayan Routes',
        timestamp: '5 hours ago',
        type: 'image',
        title: 'Leh-Ladakh Day 3: Nubra Valley',
        content: 'The journey through Khardung La was breathtaking! 🏔️',
        media: { type: 'image', url: 'https://via.placeholder.com/800x400?text=Nubra+Valley' },
        upvotes: 156,
        downvotes: 3,
        comments: 28,
        isPinned: true,
        tags: ['ladakh', 'adventure', 'photography']
      }
    ])
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = () => {
    if (!messageInput.trim()) return
    
    const newMsg = {
      id: Date.now(),
      sender: user,
      content: messageInput,
      timestamp: new Date().toISOString(),
      type: 'text'
    }
    
    setMessages(prev => [...prev, newMsg])
    setMessageInput('')
    setTimeout(scrollToBottom, 100)
  }

  const handleUpvote = (postId) => {
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, upvotes: p.upvotes + 1 } : p
    ))
  }

  const handleDownvote = (postId) => {
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, downvotes: p.downvotes + 1 } : p
    ))
  }

  const acceptFriendRequest = (requestId) => {
    const request = friendRequests.find(r => r.id === requestId)
    if (request) {
      setFriends(prev => [...prev, { ...request, online: false }])
      setFriendRequests(prev => prev.filter(r => r.id !== requestId))
    }
  }

  const rejectFriendRequest = (requestId) => {
    setFriendRequests(prev => prev.filter(r => r.id !== requestId))
  }

  return (
    <div className="h-screen bg-white dark:bg-slate-950 flex overflow-hidden" style={{ marginTop: '4rem' }}>
      {/* LEFT PANEL - Social & Discovery */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center">
            <ChatBubbleLeftIcon className="w-6 h-6 mr-2 text-cyan-500" />
            Rider Network
          </h2>
          
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search riders, communities..."
              className="w-full px-4 py-2 pl-10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'friends'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCircleIcon className="w-4 h-4 inline mr-1" />
            Friends
          </button>
          <button
            onClick={() => setActiveTab('communities')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'communities'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UsersIcon className="w-4 h-4 inline mr-1" />
            Communities
          </button>
          <button
            onClick={() => setActiveTab('nearby')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'nearby'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MapPinIcon className="w-4 h-4 inline mr-1" />
            Nearby
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <motion.div
                key="friends"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-3 space-y-3"
              >
                {/* Friend Requests */}
                {friendRequests.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 px-1">
                      Friend Requests ({friendRequests.length})
                    </h3>
                    {friendRequests.map(request => (
                      <motion.div
                        key={request.id}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800 mb-2"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-slate-900 dark:text-white text-sm">{request.name}</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{request.bike}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-500">{request.mutualFriends} mutual friends</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => acceptFriendRequest(request.id)}
                            className="flex-1 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            <CheckIcon className="w-3 h-3 inline mr-1" />
                            Accept
                          </button>
                          <button
                            onClick={() => rejectFriendRequest(request.id)}
                            className="flex-1 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
                          >
                            <XMarkIcon className="w-3 h-3 inline mr-1" />
                            Decline
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Friends List */}
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 px-1">
                  Your Friends ({friends.length})
                </h3>
                {friends.map(friend => (
                  <motion.div
                    key={friend.id}
                    whileHover={{ scale: 1.02, x: 4 }}
                    onClick={() => setSelectedChat({ type: 'dm', id: friend.id, data: friend })}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedChat?.id === friend.id
                        ? 'bg-cyan-100 dark:bg-cyan-900/30 ring-2 ring-cyan-500'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                          {friend.name.charAt(0)}
                        </div>
                        {friend.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white dark:border-slate-800 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 dark:text-white text-sm truncate">{friend.name}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{friend.bike}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">{friend.city}</p>
                      </div>
                      {friend.online && (
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Communities Tab */}
            {activeTab === 'communities' && (
              <motion.div
                key="communities"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-3 space-y-3"
              >
                <button className="w-full p-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center">
                  <PlusCircleIcon className="w-5 h-5 mr-2" />
                  Create Community
                </button>

                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 px-1">
                  Your Communities ({communities.length})
                </h3>
                {communities.map(community => (
                  <motion.div
                    key={community.id}
                    whileHover={{ scale: 1.02, x: 4 }}
                    onClick={() => {
                      setSelectedChat({ type: 'community', id: community.id, data: community })
                      setViewMode('feed')
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedChat?.id === community.id
                        ? 'bg-cyan-100 dark:bg-cyan-900/30 ring-2 ring-cyan-500'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center text-2xl">
                        {community.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1">
                          <h4 className="font-medium text-slate-900 dark:text-white text-sm truncate">{community.name}</h4>
                          {community.verified && (
                            <ShieldCheckIcon className="w-4 h-4 text-cyan-500" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{community.members.toLocaleString()} members</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 capitalize">{community.type}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Nearby Riders Tab */}
            {activeTab === 'nearby' && (
              <motion.div
                key="nearby"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-3 space-y-3"
              >
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center">
                    <MapPinIcon className="w-4 h-4 mr-1" />
                    Riders within 5 km radius
                  </p>
                </div>

                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 px-1">
                  Nearby Riders ({nearbyRiders.length})
                </h3>
                {nearbyRiders.map(rider => (
                  <motion.div
                    key={rider.id}
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                            {rider.name.charAt(0)}
                          </div>
                          {rider.online && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white dark:border-slate-800 rounded-full"></div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900 dark:text-white text-sm">{rider.name}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{rider.bike}</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">{rider.distance} away</p>
                        </div>
                      </div>
                      <button className="p-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors">
                        <UserPlusIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* CENTER PANEL - Main Interaction Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950">
        {selectedChat ? (
          <>
            {/* Chat/Feed Header */}
            <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-900">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {selectedChat.type === 'community' ? selectedChat.data.avatar : selectedChat.data.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{selectedChat.data.name}</h3>
                    {selectedChat.data.verified && (
                      <ShieldCheckIcon className="w-4 h-4 text-cyan-500" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {selectedChat.type === 'community' 
                      ? `${selectedChat.data.members.toLocaleString()} members`
                      : selectedChat.data.online ? 'Online' : 'Offline'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {selectedChat.type === 'community' && (
                  <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('chat')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        viewMode === 'chat'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <ChatBubbleLeftIcon className="w-3 h-3 inline mr-1" />
                      Chat
                    </button>
                    <button
                      onClick={() => setViewMode('feed')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        viewMode === 'feed'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Squares2X2Icon className="w-3 h-3 inline mr-1" />
                      Feed
                    </button>
                  </div>
                )}
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <VideoCameraIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <EllipsisVerticalIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto">
              {viewMode === 'chat' ? (
                /* Direct Messages View */
                <div className="p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-20">
                      <ChatBubbleOvalLeftEllipsisIcon className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No messages yet</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 text-center max-w-sm">
                        Start a conversation with {selectedChat.data.name}. Share your ride experiences!
                      </p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.sender.id === user.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-md rounded-2xl px-4 py-2 ${
                          msg.sender.id === user.id
                            ? 'bg-cyan-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-xs mt-1 ${
                            msg.sender.id === user.id ? 'text-cyan-100' : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                /* Community Feed View */
                <div className="p-6 max-w-4xl mx-auto">
                  {/* New Post Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowNewPost(!showNewPost)}
                    className="w-full p-4 mb-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-medium transition-all flex items-center justify-center shadow-lg shadow-cyan-500/30"
                  >
                    <PlusCircleIcon className="w-5 h-5 mr-2" />
                    Share Your Ride Story
                  </motion.button>

                  {/* New Post Form */}
                  <AnimatePresence>
                    {showNewPost && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-6 bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800"
                      >
                        <textarea
                          value={postInput}
                          onChange={(e) => setPostInput(e.target.value)}
                          placeholder="Share your experience, route tips, or ask the community..."
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
                          rows="4"
                        />
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex space-x-2">
                            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                              <PhotoIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </button>
                            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                              <LinkIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </button>
                            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                              <MapPinIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </button>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setShowNewPost(false)}
                              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium"
                            >
                              Cancel
                            </button>
                            <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors text-sm font-medium">
                              Post
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Posts Feed */}
                  <div className="space-y-4">
                    {posts.map(post => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:border-cyan-500 dark:hover:border-cyan-500 transition-all"
                      >
                        {/* Post Header */}
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                              {post.author.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center space-x-1">
                                <h4 className="font-medium text-slate-900 dark:text-white text-sm">{post.author.name}</h4>
                                {post.author.verified && (
                                  <ShieldCheckIcon className="w-4 h-4 text-cyan-500" />
                                )}
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400">{post.timestamp} • {post.community}</p>
                            </div>
                          </div>
                          {post.isPinned && (
                            <div className="flex items-center space-x-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs font-medium">
                              <StarIcon className="w-3 h-3" />
                              <span>Pinned</span>
                            </div>
                          )}
                        </div>

                        {/* Post Content */}
                        <div className="px-4 pb-4">
                          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{post.title}</h3>
                          <p className="text-slate-700 dark:text-slate-300 text-sm mb-3">{post.content}</p>
                          
                          {post.media && (
                            <div className="rounded-lg overflow-hidden mb-3">
                              <img src={post.media.url} alt="" className="w-full h-64 object-cover" />
                            </div>
                          )}

                          {/* Tags */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {post.tags.map(tag => (
                              <span key={tag} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-xs">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Post Actions */}
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                          <div className="flex items-center space-x-4">
                            <button
                              onClick={() => handleUpvote(post.id)}
                              className="flex items-center space-x-1 text-slate-600 dark:text-slate-400 hover:text-cyan-500 transition-colors"
                            >
                              <ArrowUpIcon className="w-5 h-5" />
                              <span className="text-sm font-medium">{post.upvotes}</span>
                            </button>
                            <button
                              onClick={() => handleDownvote(post.id)}
                              className="flex items-center space-x-1 text-slate-600 dark:text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <ArrowDownIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setSelectedPost(post)}
                              className="flex items-center space-x-1 text-slate-600 dark:text-slate-400 hover:text-cyan-500 transition-colors"
                            >
                              <ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5" />
                              <span className="text-sm font-medium">{post.comments}</span>
                            </button>
                          </div>
                          <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">
                            <FlagIcon className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Message Input (for DM mode) */}
            {viewMode === 'chat' && (
              <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
                <div className="flex items-center space-x-3">
                  <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <PhotoIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="p-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center mb-6">
              <UserGroupIcon className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Welcome to Rider Network</h2>
            <p className="text-slate-600 dark:text-slate-400 text-center max-w-md mb-6">
              Connect with fellow riders, join communities, and share your journey. Select a friend or community to get started.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab('friends')}
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
              >
                Find Friends
              </button>
              <button
                onClick={() => setActiveTab('communities')}
                className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
              >
                Join Communities
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL - Context & Intelligence */}
      <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-y-auto">
        {selectedChat ? (
          <div className="p-4">
            {selectedChat.type === 'dm' ? (
              /* Rider Profile Preview */
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                  Profile
                </h3>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-4">
                  <div className="flex flex-col items-center mb-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-3">
                      {selectedChat.data.name.charAt(0)}
                    </div>
                    <h4 className="font-semibold text-slate-900 dark:text-white text-lg">{selectedChat.data.name}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{selectedChat.data.city}</p>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center space-x-2 text-sm">
                      <GlobeAltIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700 dark:text-slate-300">{selectedChat.data.bike}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <MapPinIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700 dark:text-slate-300">{selectedChat.data.city}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                    <button className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors mb-2">
                      View Full Profile
                    </button>
                    <button className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors">
                      Block User
                    </button>
                  </div>
                </div>

                {/* Shared Communities */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Shared Communities</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-xs">
                      <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-500 rounded flex items-center justify-center">🏍️</div>
                      <span className="text-slate-700 dark:text-slate-300">Delhi Riders Club</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Community Info */
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                  Community Info
                </h3>
                
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center text-3xl">
                      {selectedChat.data.avatar}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">{selectedChat.data.name}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{selectedChat.data.members.toLocaleString()} members</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Type</span>
                      <span className="text-slate-900 dark:text-white capitalize">{selectedChat.data.type}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Verified</span>
                      <span className="text-slate-900 dark:text-white">{selectedChat.data.verified ? 'Yes' : 'No'}</span>
                    </div>
                  </div>

                  <button className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors">
                    Leave Community
                  </button>
                </div>

                {/* Community Rules */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-4">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Community Rules</h4>
                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <li className="flex items-start">
                      <span className="text-cyan-500 mr-2">•</span>
                      Be respectful to all members
                    </li>
                    <li className="flex items-start">
                      <span className="text-cyan-500 mr-2">•</span>
                      No spam or self-promotion
                    </li>
                    <li className="flex items-start">
                      <span className="text-cyan-500 mr-2">•</span>
                      Share accurate safety information
                    </li>
                    <li className="flex items-start">
                      <span className="text-cyan-500 mr-2">•</span>
                      Keep posts relevant to riding
                    </li>
                  </ul>
                </div>

                {/* Trending Posts */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
                    <BoltIcon className="w-4 h-4 mr-1 text-amber-500" />
                    Trending
                  </h4>
                  <div className="space-y-3">
                    <div className="pb-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-white mb-1">Best monsoon gear?</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">45 upvotes</p>
                    </div>
                    <div className="pb-2 border-b border-slate-200 dark:border-slate-700 last:border-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-white mb-1">Road closure update - NH44</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">38 upvotes</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* AI Assistant Placeholder */
          <div className="p-6">
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-6 text-white text-center">
              <BoltIcon className="w-12 h-12 mx-auto mb-3 opacity-80" />
              <h3 className="font-semibold mb-2">AI Assistant</h3>
              <p className="text-sm opacity-90">
                Get intelligent insights and summaries when you select a chat or community
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Chat
