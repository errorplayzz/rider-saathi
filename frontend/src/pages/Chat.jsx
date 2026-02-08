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
import { friendsAPI, messagesAPI, groupsAPI, communitiesAPI, postsAPI } from '../services/chatAPI'

const Chat = () => {
  const { user } = useAuth()
  const { connected, onlineUsers, sendMessage, joinChatRoom } = useSocket()

  // Panel States
  const [activeTab, setActiveTab] = useState('friends') // friends | communities | nearby | groups
  const [selectedChat, setSelectedChat] = useState(null) // { type: 'dm' | 'community' | 'group', id, data }
  const [viewMode, setViewMode] = useState('chat') // chat | feed

  // Data States
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [communities, setCommunities] = useState([])
  const [nearbyRiders, setNearbyRiders] = useState([])
  const [groups, setGroups] = useState([])
  const [messages, setMessages] = useState([])
  const [posts, setPosts] = useState([])
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Group Creation States
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [groupData, setGroupData] = useState({
    name: '',
    description: '',
    type: 'private', // private | public
    city: '',
    route: '',
    selectedMembers: []
  })
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [postInput, setPostInput] = useState('')
  const [showNewPost, setShowNewPost] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [showMediaUpload, setShowMediaUpload] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)

  const messagesEndRef = useRef(null)

  // Load real data from backend
  useEffect(() => {
    if (user) {
      loadAllData()
      loadNearbyRiders()
    }
  }, [user])

  // Load nearby riders when on nearby tab
  useEffect(() => {
    if (user && activeTab === 'nearby') {
      loadNearbyRiders()
    }
  }, [user, activeTab])

  const loadAllData = async () => {
    try {
      setLoading(true)
      const [friendsRes, requestsRes, groupsRes, communitiesRes, conversationsRes] = await Promise.all([
        friendsAPI.getFriends().catch(() => ({ data: [] })),
        friendsAPI.getFriendRequests().catch(() => ({ data: [] })),
        groupsAPI.getMyGroups().catch(() => ({ data: [] })),
        communitiesAPI.getMyCommunities().catch(() => ({ data: [] })),
        messagesAPI.getConversations().catch(() => ({ data: [] }))
      ])

      setFriends(friendsRes.data || [])
      setFriendRequests(requestsRes.data || [])
      setGroups(groupsRes.data || [])
      setCommunities(communitiesRes.data || [])
      setConversations(conversationsRes.data || [])
    } catch (error) {
      console.error('Failed to load chat data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadNearbyRiders = async () => {
    try {
      // Get user's current location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords
            console.log('Loading nearby riders at:', latitude, longitude)
            
            const nearbyRes = await friendsAPI.getNearbyRiders(latitude, longitude, 5000)
            setNearbyRiders(nearbyRes.data || [])
            console.log('Found nearby riders:', nearbyRes.data?.length || 0)
          },
          (error) => {
            console.warn('Location access denied:', error)
            // Set some sample riders for demo purposes
            setNearbyRiders([
              { 
                id: 'demo1', 
                _id: 'demo1',
                name: 'Alex Kumar', 
                bike: 'Royal Enfield Classic 350', 
                distance: '2.3km', 
                online: true 
              },
              { 
                id: 'demo2', 
                _id: 'demo2',
                name: 'Priya Singh', 
                bike: 'KTM Duke 390', 
                distance: '3.1km', 
                online: true 
              },
              { 
                id: 'demo3', 
                _id: 'demo3',
                name: 'Rahul Sharma', 
                bike: 'Honda CB Hornet 160R', 
                distance: '4.7km', 
                online: false 
              }
            ])
          },
          {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 300000 // 5 minutes
          }
        )
      } else {
        console.warn('Geolocation not supported')
        // Set demo riders if geolocation not available
        setNearbyRiders([
          { 
            id: 'demo1', 
            _id: 'demo1',
            name: 'Alex Kumar', 
            bike: 'Royal Enfield Classic 350', 
            distance: '2.3km', 
            online: true 
          },
          { 
            id: 'demo2', 
            _id: 'demo2',
            name: 'Priya Singh', 
            bike: 'KTM Duke 390', 
            distance: '3.1km', 
            online: true 
          }
        ])
      }
    } catch (error) {
      console.error('Failed to load nearby riders:', error)
      // Still set demo data for testing
      setNearbyRiders([
        { 
          id: 'demo1', 
          _id: 'demo1',
          name: 'Alex Kumar', 
          bike: 'Royal Enfield Classic 350', 
          distance: '2.3km', 
          online: true 
        }
      ])
    }
  }

  // Listen for real-time messages
  useEffect(() => {
    if (!selectedChat) return

    const handleNewMessage = (event) => {
      const { message, roomId } = event.detail
      
      // Only add message if it's for the currently selected chat
      if (roomId === selectedChat.id) {
        setMessages(prev => [...prev, {
          _id: message._id,
          content: message.content,
          sender: message.sender,
          type: message.type,
          timestamp: message.timestamp,
          createdAt: message.timestamp
        }])
        scrollToBottom()
      }
    }

    // Listen for real-time messages
    window.addEventListener('new-message', handleNewMessage)

    // Join the chat room for real-time updates
    if (joinChatRoom) {
      joinChatRoom(selectedChat.id)
    }

    return () => {
      window.removeEventListener('new-message', handleNewMessage)
    }
  }, [selectedChat, joinChatRoom])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendFriendRequest = async (userId) => {
    try {
      await friendsAPI.sendFriendRequest(userId, 'Hi! I\'d like to connect with you on Rider Saathi!')
      
      // Show success feedback
      console.log('Friend request sent!')
      
      // Optionally remove from nearby riders or show as pending
      setNearbyRiders(prev => prev.filter(rider => rider._id !== userId))
      
    } catch (error) {
      console.error('Failed to send friend request:', error)
      alert('Failed to send friend request. Please try again.')
    }
  }

  const handleUpvote = (postId) => {
    setPosts(prev => prev.map(p => 
      p._id === postId ? { ...p, upvotes: (p.upvotes || 0) + 1 } : p
    ))
  }

  const handleDownvote = (postId) => {
    setPosts(prev => prev.map(p => 
      p._id === postId ? { ...p, downvotes: (p.downvotes || 0) + 1 } : p
    ))
  }

  // Real API handlers
  const acceptFriendRequest = async (requestId) => {
    try {
      await friendsAPI.acceptFriendRequest(requestId)
      setFriendRequests(prev => prev.filter(r => r._id !== requestId))
      await loadAllData() // Reload to get updated friends list
    } catch (error) {
      console.error('Failed to accept friend request:', error)
    }
  }

  const rejectFriendRequest = async (requestId) => {
    try {
      await friendsAPI.rejectFriendRequest(requestId)
      setFriendRequests(prev => prev.filter(r => r._id !== requestId))
    } catch (error) {
      console.error('Failed to reject friend request:', error)
    }
  }

  const createGroup = async () => {
    if (!groupData.name.trim()) return

    try {
      const newGroupData = {
        name: groupData.name,
        description: groupData.description,
        type: groupData.type,
        city: groupData.city,
        route: groupData.route,
        members: groupData.selectedMembers
      }

      const response = await groupsAPI.createGroup(newGroupData)
      setGroups(prev => [response.data, ...prev])
      setGroupData({
        name: '',
        description: '',
        type: 'private',
        city: '',
        route: '',
        selectedMembers: []
      })
      setShowGroupModal(false)
      setSelectedChat({ type: 'group', id: response.data._id, data: response.data })
    } catch (error) {
      console.error('Failed to create group:', error)
    }
  }

  const toggleMemberSelection = (friendId) => {
    setGroupData(prev => ({
      ...prev,
      selectedMembers: prev.selectedMembers.includes(friendId)
        ? prev.selectedMembers.filter(id => id !== friendId)
        : [...prev.selectedMembers, friendId]
    }))
  }

  const handleOpenChat = async (chatType, chatData) => {
    try {
      setSelectedChat({ type: chatType, id: chatData._id, data: chatData })
      
      if (chatType === 'dm') {
        const messagesRes = await messagesAPI.getConversation(chatData._id)
        setMessages(messagesRes.data || [])
        if (joinChatRoom) joinChatRoom(chatData._id)
      } else if (chatType === 'group') {
        const messagesRes = await groupsAPI.getGroupMessages(chatData._id)
        setMessages(messagesRes.data || [])
        if (joinChatRoom) joinChatRoom(chatData._id)
      } else if (chatType === 'community') {
        const postsRes = await postsAPI.getFeed(chatData._id)
        setPosts(postsRes.data || [])
        if (joinChatRoom) joinChatRoom(chatData._id)
      }
    } catch (error) {
      console.error('Failed to load chat:', error)
      setMessages([])
    }
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || sendingMessage) return
    
    const content = messageInput.trim()
    setMessageInput('')
    setSendingMessage(true)

    try {
      // Send via Socket.IO for real-time messaging
      if (sendMessage && connected) {
        const success = sendMessage(selectedChat.id, content)
        if (!success) {
          throw new Error('Failed to send message via Socket.IO')
        }
        console.log('Message sent via Socket.IO')
      } else {
        // Fallback to REST API if Socket.IO not available
        if (selectedChat.type === 'dm') {
          await messagesAPI.sendMessage(selectedChat.id, content, 'text')
        } else if (selectedChat.type === 'group') {
          await groupsAPI.sendGroupMessage(selectedChat.id, content)
        }
        console.log('Message sent via REST API')
      }
      
      // No need to reload messages - real-time events will handle this
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSendingMessage(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed top-16 left-0 right-0 bottom-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">Loading your connections...</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
            {connected ? '✓ Connected to server' : '○ Connecting...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed top-16 left-0 right-0 bottom-0 bg-white dark:bg-slate-950 flex overflow-hidden">
      {/* LEFT PANEL - Social & Discovery */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900 h-full">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 flex items-center">
              <ChatBubbleLeftIcon className="w-6 h-6 mr-2.5 text-cyan-500" />
              Connections
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 ml-8.5">Your riding community</p>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find riders, groups, communities..."
              className="w-full px-4 py-2.5 pl-10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none text-sm shadow-sm transition-all"
            />
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('friends')}
            className={`py-3 text-xs font-medium transition-colors ${
              activeTab === 'friends'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCircleIcon className="w-4 h-4 inline mr-1" />
            Friends
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`py-3 text-xs font-medium transition-colors ${
              activeTab === 'groups'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserGroupIcon className="w-4 h-4 inline mr-1" />
            Groups
          </button>
          <button
            onClick={() => setActiveTab('communities')}
            className={`py-3 text-xs font-medium transition-colors ${
              activeTab === 'communities'
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UsersIcon className="w-4 h-4 inline mr-1" />
            Comm
          </button>
          <button
            onClick={() => setActiveTab('nearby')}
            className={`py-3 text-xs font-medium transition-colors ${
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
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 px-1">
                      Pending Requests · {friendRequests.length}
                    </h3>
                    {friendRequests.map(request => (
                      <motion.div
                        key={request.id}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="p-3.5 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800/50 mb-2 shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-0.5">{request.name}</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{request.bike}</p>
                            <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">{request.mutualFriends} mutual connections</p>
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
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 px-1">
                  Friends · {friends.length}
                </h3>
                {friends.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <UserCircleIcon className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm">No friends yet</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Start connecting with riders!</p>
                  </div>
                ) : (
                  friends.map(friend => (
                  <motion.div
                    key={friend._id}
                    whileHover={{ scale: 1.01, x: 2 }}
                    onClick={() => handleOpenChat('dm', friend)}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all ${
                      selectedChat?.id === friend._id
                        ? 'bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30 ring-2 ring-cyan-500/50 shadow-md'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                          {friend.name?.charAt(0) || 'R'}
                        </div>
                        {friend.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white dark:border-slate-800 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate mb-0.5">{friend.name || 'Rider'}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{friend.bike?.model || 'Rider'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">{friend.city || 'Unknown'}</p>
                      </div>
                      {friend.isOnline && (
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </motion.div>
                  ))
                )}
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
                <button className="w-full p-3.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40">
                  <PlusCircleIcon className="w-5 h-5 mr-2" />
                  Create Community
                </button>

                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 px-1">
                  Communities · {communities.length}
                </h3>
                {communities.map(community => (
                  <motion.div
                    key={community.id}
                    whileHover={{ scale: 1.01, x: 2 }}
                    onClick={() => {
                      setSelectedChat({ type: 'community', id: community.id, data: community })
                      setViewMode('feed')
                    }}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all ${
                      selectedChat?.id === community.id
                        ? 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 ring-2 ring-purple-500/50 shadow-md'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center text-2xl">
                        {community.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5 mb-0.5">
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{community.name}</h4>
                          {community.verified && (
                            <ShieldCheckIcon className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{community.members.toLocaleString()} members</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 capitalize mt-0.5">{community.type}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Groups Tab */}
            {activeTab === 'groups' && (
              <motion.div
                key="groups"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-3 space-y-3"
              >
                <button
                  onClick={() => setShowGroupModal(true)}
                  className="w-full p-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/40"
                >
                  <PlusCircleIcon className="w-5 h-5 mr-2" />
                  Create Group
                </button>

                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 px-1">
                  Your Groups · {groups.length}
                </h3>
                {groups.map(group => (
                  <motion.div
                    key={group.id}
                    whileHover={{ scale: 1.01, x: 2 }}
                    onClick={() => setSelectedChat({ type: 'group', id: group.id, data: group })}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all ${
                      selectedChat?.id === group.id
                        ? 'bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30 ring-2 ring-cyan-500/50 shadow-md'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold">
                        {group.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-0.5">
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{group.name}</h4>
                          {group.type === 'private' && (
                            <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 rounded-full font-medium">
                              Private
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate mb-1">{group.lastMessage}</p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-500 dark:text-slate-500">{group.members} members</span>
                          {group.unread > 0 && (
                            <>
                              <span className="text-slate-400">•</span>
                              <span className="text-xs px-1.5 py-0.5 bg-cyan-500 text-white rounded-full">
                                {group.unread}
                              </span>
                            </>
                          )}
                        </div>
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

                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 px-1">
                  Nearby Riders · {nearbyRiders.length}
                </h3>
                {nearbyRiders.map(rider => (
                  <motion.div
                    key={rider.id}
                    whileHover={{ scale: 1.01, x: 2 }}
                    className="p-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-md"
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
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-0.5">{rider.name}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{rider.bike}</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{rider.distance} away</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => sendFriendRequest(rider._id)}
                        className="p-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                      >
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
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 h-full overflow-hidden">
        {selectedChat ? (
          <>
            {/* Chat/Feed Header */}
            <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {selectedChat.type === 'community' ? selectedChat.data.avatar : selectedChat.data.name.charAt(0)}
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white leading-tight">{selectedChat.data.name}</h3>
                    {selectedChat.data.verified && (
                      <ShieldCheckIcon className="w-4 h-4 text-cyan-500" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-tight">
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
                      <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                        <ChatBubbleOvalLeftEllipsisIcon className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Start the conversation</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 text-center max-w-sm leading-relaxed">
                        Say hello to {selectedChat.data.name} and share your riding stories
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
                        <div className={`max-w-md rounded-2xl px-4 py-3 shadow-sm ${
                          msg.sender.id === user.id
                            ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-cyan-500/20'
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
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setShowNewPost(!showNewPost)}
                    className="w-full p-4 mb-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-semibold transition-all flex items-center justify-center shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/40"
                  >
                    <PlusCircleIcon className="w-5 h-5 mr-2" />
                    Share Your Story
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
            <div className="w-28 h-28 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-cyan-500/30">
              <UserGroupIcon className="w-14 h-14 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Your Riding Community</h2>
            <p className="text-slate-600 dark:text-slate-400 text-center max-w-md mb-8 leading-relaxed">
              Connect with riders, share experiences, and discover new routes together
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab('friends')}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/40"
              >
                Find Riders
              </button>
              <button
                onClick={() => setActiveTab('communities')}
                className="px-6 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
              >
                Explore Communities
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL - Context & Intelligence */}
      <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-y-auto h-full">
        {selectedChat ? (
          <div className="p-4">
            {selectedChat.type === 'dm' ? (
              /* Rider Profile Preview */
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4">
                  Profile
                </h3>
                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-5 mb-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex flex-col items-center mb-5">
                    <div className="w-24 h-24 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-3xl mb-3 shadow-lg shadow-cyan-500/30">
                      {selectedChat.data.name.charAt(0)}
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-lg mb-1">{selectedChat.data.name}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{selectedChat.data.city}</p>
                  </div>
                  
                  <div className="space-y-3 mb-5">
                    <div className="flex items-center space-x-3 text-sm p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                      <GlobeAltIcon className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{selectedChat.data.bike}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                      <MapPinIcon className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{selectedChat.data.city}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700/50 space-y-2">
                    <button className="w-full px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/30">
                      View Profile
                    </button>
                    <button className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600/50 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-all">
                      Block
                    </button>
                  </div>
                </div>

                {/* Shared Communities */}
                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
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
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4">
                  Community Info
                </h3>
                
                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-5 mb-4 border border-slate-200 dark:border-slate-700 shadow-sm">
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

                  <button className="w-full px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-red-500/20 hover:shadow-red-500/30">
                    Leave Community
                  </button>
                </div>

                {/* Community Rules */}
                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-5 mb-4 border border-slate-200 dark:border-slate-700 shadow-sm">
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
                <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
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
            <div className="bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-2xl p-8 text-white text-center shadow-xl shadow-cyan-500/30">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BoltIcon className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg mb-2">AI Insights</h3>
              <p className="text-sm text-white/90 leading-relaxed">
                Select a conversation to get intelligent summaries and community insights
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Group Creation Modal */}
      <AnimatePresence>
        {showGroupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowGroupModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Create Group</h3>
                <button
                  onClick={() => setShowGroupModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                <div className="space-y-4">
                  {/* Group Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Group Name *
                    </label>
                    <input
                      type="text"
                      value={groupData.name}
                      onChange={(e) => setGroupData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Weekend Ride Squad"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={groupData.description}
                      onChange={(e) => setGroupData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="What's this group about?"
                      rows="3"
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none resize-none text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Group Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Group Type
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setGroupData(prev => ({ ...prev, type: 'private' }))}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          groupData.type === 'private'
                            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                            : 'border-slate-300 dark:border-slate-700 hover:border-cyan-300'
                        }`}
                      >
                        <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">Private</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Only invited members</p>
                      </button>
                      <button
                        onClick={() => setGroupData(prev => ({ ...prev, type: 'public' }))}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          groupData.type === 'public'
                            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                            : 'border-slate-300 dark:border-slate-700 hover:border-cyan-300'
                        }`}
                      >
                        <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">Public</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Anyone can join</p>
                      </button>
                    </div>
                  </div>

                  {/* Optional Tags */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        City (optional)
                      </label>
                      <input
                        type="text"
                        value={groupData.city}
                        onChange={(e) => setGroupData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="Delhi, Mumbai..."
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Route (optional)
                      </label>
                      <input
                        type="text"
                        value={groupData.route}
                        onChange={(e) => setGroupData(prev => ({ ...prev, route: e.target.value }))}
                        placeholder="Leh-Ladakh..."
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Invite Friends */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Invite Friends (optional)
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {friends.map(friend => (
                        <button
                          key={friend.id}
                          onClick={() => toggleMemberSelection(friend.id)}
                          className={`w-full p-3 rounded-lg flex items-center justify-between transition-all ${
                            groupData.selectedMembers.includes(friend.id)
                              ? 'bg-cyan-50 dark:bg-cyan-900/20 ring-2 ring-cyan-500'
                              : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {friend.name.charAt(0)}
                            </div>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{friend.name}</span>
                          </div>
                          {groupData.selectedMembers.includes(friend.id) && (
                            <CheckIcon className="w-5 h-5 text-cyan-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {groupData.selectedMembers.length} members selected
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowGroupModal(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createGroup}
                    disabled={!groupData.name.trim()}
                    className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                  >
                    Create Group
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Chat
