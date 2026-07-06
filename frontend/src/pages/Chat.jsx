import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PaperAirplaneIcon, MagnifyingGlassIcon, UserGroupIcon, MapPinIcon, PhotoIcon,
  LinkIcon, ChatBubbleLeftIcon, HeartIcon, ArrowUpIcon, ArrowDownIcon,
  ChatBubbleOvalLeftEllipsisIcon, EllipsisVerticalIcon, UserPlusIcon, CheckIcon,
  XMarkIcon, VideoCameraIcon, PlayIcon, GlobeAltIcon, ShieldCheckIcon, BoltIcon,
  UserCircleIcon, Squares2X2Icon, UsersIcon, PlusCircleIcon, FlagIcon, StarIcon,
  PhoneIcon, ArrowPathIcon, FaceSmileIcon, SparklesIcon, ShareIcon, ShieldExclamationIcon,
  CloudIcon, MapIcon
} from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { friendsAPI, messagesAPI, groupsAPI, communitiesAPI, postsAPI } from '../services/chatAPI'

const Chat = () => {
  const { user } = useAuth()
  const { connected, onlineUsers, sendMessage, joinChatRoom, sendTypingStatus } = useSocket()

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
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [postInput, setPostInput] = useState('')
  const [showNewPost, setShowNewPost] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [showMediaUpload, setShowMediaUpload] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [isPeerTyping, setIsPeerTyping] = useState(false)

  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const getEntityId = (item) => item?.id || item?._id

  // Load real data from backend
  useEffect(() => {
    if (user) {
      loadAllData()
      loadNearbyRiders()
    }
  }, [user])

  useEffect(() => {
    if (activeTab !== 'friends') {
      setSearchResults([])
      return
    }

    const q = (searchQuery || '').trim().replace(/^@/, '').toLowerCase()
    if (q.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true)
        const res = await friendsAPI.searchByUsername(q)
        setSearchResults(res?.data || [])
      } catch (e) {
        console.error('Username search failed:', e)
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, activeTab])

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

      const normalizedFriends = (friendsRes.data || []).map((f) => ({
        ...f,
        id: getEntityId(f),
        bike: f?.bikeDetails?.model || f?.bike || 'Rider'
      }))

      const normalizedRequests = (requestsRes.data || []).map((r) => ({
        ...r,
        id: getEntityId(r),
        sender: r.sender || {}
      }))

      const normalizedGroups = (groupsRes.data || []).map((g) => ({
        ...g,
        id: getEntityId(g),
        membersCount: Array.isArray(g.members) ? g.members.length : Number(g.members || 0),
        unread: g.unreadCount || 0,
        lastMessageText: g?.lastMessage?.content || g?.lastMessage?.message || 'No messages yet'
      }))

      const normalizedCommunities = (communitiesRes.data || []).map((c) => ({
        ...c,
        id: getEntityId(c),
        membersCount: c?.stats?.totalMembers || c?.membersCount || (Array.isArray(c.members) ? c.members.length : 0),
        avatarLabel: c?.name?.charAt(0)?.toUpperCase() || 'C'
      }))

      setFriends(normalizedFriends)
      setFriendRequests(normalizedRequests)
      setGroups(normalizedGroups)
      setCommunities(normalizedCommunities)
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
            setNearbyRiders([])
          },
          {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 300000 // 5 minutes
          }
        )
      } else {
        console.warn('Geolocation not supported')
        setNearbyRiders([])
      }
    } catch (error) {
      console.error('Failed to load nearby riders:', error)
      setNearbyRiders([])
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

  const isOwnMessage = (msg) => {
    if (!selectedChat || selectedChat.type !== 'dm') return false
    const senderId = (msg?.sender?.id || msg?.sender?._id || msg?.sender || '').toString()
    const activePartnerId = (selectedChat.id || '').toString()
    return senderId && activePartnerId && senderId !== activePartnerId
  }

  const sendFriendRequest = async (targetId) => {
    const userId = (targetId || '').toString().trim()
    if (!userId) {
      alert('Invalid rider selection. Please refresh and try again.')
      return
    }

    try {
      await friendsAPI.sendFriendRequest(userId, 'Hi! I\'d like to connect with you on Rider Saathi!')
      
      // Show success feedback
      console.log('Friend request sent!')
      
      // Optionally remove from nearby riders or show as pending
      setNearbyRiders(prev => prev.filter(rider => getEntityId(rider) !== userId))
      setSearchResults(prev => prev.filter(rider => getEntityId(rider) !== userId))
      
    } catch (error) {
      console.error('Failed to send friend request:', error)
      const apiMessage = error?.response?.data?.error || error?.response?.data?.message
      alert(apiMessage || 'Failed to send friend request. Please try again.')
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
        memberIds: groupData.selectedMembers
      }

      const response = await groupsAPI.createGroup(newGroupData)
      const createdGroup = response?.data || response
      setGroups(prev => [{
        ...createdGroup,
        id: getEntityId(createdGroup),
        membersCount: Array.isArray(createdGroup?.members) ? createdGroup.members.length : 1,
        unread: 0,
        lastMessageText: 'Group created'
      }, ...prev])
      setGroupData({
        name: '',
        description: '',
        type: 'private',
        city: '',
        route: '',
        selectedMembers: []
      })
      setShowGroupModal(false)
      setSelectedChat({ type: 'group', id: getEntityId(createdGroup), data: createdGroup })
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
      const chatId = getEntityId(chatData)
      setSelectedChat({ type: chatType, id: chatId, data: chatData })
      
      if (chatType === 'dm') {
        const messagesRes = await messagesAPI.getConversation(chatId)
        setMessages(messagesRes.data || [])

        // Mark all unread incoming messages as read when user opens the DM.
        await messagesAPI.markConversationRead(chatId).catch(() => null)
      } else if (chatType === 'group') {
        const messagesRes = await groupsAPI.getGroupMessages(chatId)
        setMessages(messagesRes.data || [])
      } else if (chatType === 'community') {
        const postsRes = await postsAPI.getFeed(chatId)
        setPosts(postsRes.data || [])
      }
    } catch (error) {
      console.error('Failed to load chat:', error)
      setMessages([])
    }
  }

  // Listen for realtime direct-message events so receiver sees messages instantly.
  useEffect(() => {
    const handleDirectMessage = (event) => {
      const detail = event?.detail || {}
      const incomingMsg = detail?.message
      const conversationWith = (detail?.conversationWith || '').toString()

      if (!incomingMsg || !selectedChat || selectedChat.type !== 'dm') return
      if ((selectedChat.id || '').toString() !== conversationWith) return

      setMessages((prev) => {
        const exists = prev.some((m) => (m?._id || m?.id) === (incomingMsg?._id || incomingMsg?.id))
        if (exists) return prev
        return [...prev, incomingMsg]
      })

      // Delivery acknowledgement for sender tick state.
      messagesAPI.markAsDelivered(incomingMsg._id).catch(() => null)
      // If chat is open, mark read immediately for real-time double-blue tick.
      messagesAPI.markAsRead(incomingMsg._id).catch(() => null)

      scrollToBottom()
    }

    window.addEventListener('direct-message', handleDirectMessage)
    return () => window.removeEventListener('direct-message', handleDirectMessage)
  }, [selectedChat])

  useEffect(() => {
    const handleMessageStatusUpdate = (event) => {
      const detail = event?.detail || {}
      const messageId = (detail?.messageId || '').toString()
      const status = detail?.status
      if (!messageId || !status) return

      setMessages((prev) => prev.map((m) => {
        const currentId = (m?._id || m?.id || '').toString()
        if (currentId !== messageId) return m
        return {
          ...m,
          status,
          deliveredAt: detail?.updatedAt || m?.deliveredAt,
          readAt: detail?.updatedAt || m?.readAt
        }
      }))
    }

    const handleMessageStatusBatchUpdate = (event) => {
      const detail = event?.detail || {}
      const ids = new Set((detail?.messageIds || []).map((id) => id?.toString?.()))
      const status = detail?.status
      if (ids.size === 0 || !status) return

      setMessages((prev) => prev.map((m) => {
        const currentId = (m?._id || m?.id || '').toString()
        if (!ids.has(currentId)) return m
        return {
          ...m,
          status,
          readAt: detail?.updatedAt || m?.readAt
        }
      }))
    }

    const handleTypingIndicator = (event) => {
      const detail = event?.detail || {}
      if (!selectedChat || selectedChat.type !== 'dm') return

      const fromUserId = (detail?.fromUserId || '').toString()
      if (!fromUserId || fromUserId !== (selectedChat.id || '').toString()) return

      setIsPeerTyping(!!detail?.isTyping)
    }

    window.addEventListener('message-status-update', handleMessageStatusUpdate)
    window.addEventListener('message-status-batch-update', handleMessageStatusBatchUpdate)
    window.addEventListener('typing-indicator', handleTypingIndicator)

    return () => {
      window.removeEventListener('message-status-update', handleMessageStatusUpdate)
      window.removeEventListener('message-status-batch-update', handleMessageStatusBatchUpdate)
      window.removeEventListener('typing-indicator', handleTypingIndicator)
    }
  }, [selectedChat])

  useEffect(() => {
    setIsPeerTyping(false)
  }, [selectedChat?.id])

  const handleMessageInputChange = (e) => {
    const value = e.target.value
    setMessageInput(value)

    if (!selectedChat || selectedChat.type !== 'dm' || !sendTypingStatus) return
    const targetUserId = selectedChat.id
    sendTypingStatus(targetUserId, true)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(targetUserId, false)
    }, 1200)
  }

  const getTickLabel = (status) => {
    if (status === 'read') return '✓✓'
    if (status === 'delivered') return '✓✓'
    return '✓'
  }

  const getTickClass = (status) => {
    if (status === 'read') return 'text-sky-200'
    if (status === 'delivered') return 'text-orange-100'
    return 'text-orange-200'
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || sendingMessage) return
    
    const content = messageInput.trim()
    setMessageInput('')
    setSendingMessage(true)

    if (selectedChat?.type === 'dm' && sendTypingStatus) {
      sendTypingStatus(selectedChat.id, false)
    }

    try {
      if (selectedChat.type === 'dm') {
        const sentRes = await messagesAPI.sendMessage(selectedChat.id, content, 'text')
        const sentMsg = sentRes?.data || sentRes
        setMessages(prev => ([...prev, {
          ...(sentMsg || {}),
          id: sentMsg?._id || `temp-${Date.now()}`,
          content,
          sender: sentMsg?.sender || { id: user.id, _id: user.id, name: user?.user_metadata?.name || 'You' },
          timestamp: sentMsg?.createdAt || new Date().toISOString(),
          status: sentMsg?.status || 'sent'
        }]))
      } else if (selectedChat.type === 'group') {
        const sentRes = await groupsAPI.sendGroupMessage(selectedChat.id, content)
        const sentMsg = sentRes?.data || sentRes
        setMessages(prev => ([...prev, {
          ...(sentMsg || {}),
          id: sentMsg?._id || `temp-${Date.now()}`,
          content,
          sender: sentMsg?.sender || { id: user.id, _id: user.id, name: user?.user_metadata?.name || 'You' },
          timestamp: sentMsg?.createdAt || new Date().toISOString(),
          status: sentMsg?.status || 'sent'
        }]))
      }

      scrollToBottom()
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessageInput(content)
    } finally {
      setSendingMessage(false)
    }
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="fixed top-16 left-0 right-0 bottom-0 flex items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-2 border-[#B08968]/30 border-t-[#B08968] rounded-full animate-spin mb-4" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#86868B]">Connecting to Network</p>
        </div>
      </div>
    )
  }

  // Find the currently selected conversation/community/group to render the correct view
  const activeChatEntity = selectedChat ? (
    selectedChat.type === 'dm' ? friends.find(f => f.id === selectedChat.id) :
    selectedChat.type === 'community' ? communities.find(c => c.id === selectedChat.id) :
    groups.find(g => g.id === selectedChat.id)
  ) : null;

  return (
    <div className="fixed top-16 left-0 right-0 bottom-0 bg-gradient-to-br from-[#1C1C1E] via-[#0A0A0A] to-[#050505] text-[#F5F5F7] flex overflow-hidden selection:bg-[#B08968]/30">
      
      {/* Background Depth Effects */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#B08968]/20 via-[#1A1A1A]/50 to-[#050505]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* ========================================= */}
      {/* LEFT SIDEBAR: CONNECTIONS & DISCOVERY */}
      {/* ========================================= */}
      <div className="w-80 lg:w-96 flex-shrink-0 flex flex-col bg-[#0A0A0A]/90 backdrop-blur-2xl border-r border-white/5 relative z-10">
        
        {/* Header & Search */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#B08968] to-[#8C6D53] flex items-center justify-center shadow-[0_0_15px_rgba(176,137,104,0.4)]">
                <GlobeAltIcon className="w-4 h-4 text-[#050505]" />
              </span>
              Network
            </h2>
            <button className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
              <PlusCircleIcon className="w-5 h-5 text-[#86868B]" />
            </button>
          </div>

          <div className="relative group">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868B] group-focus-within:text-[#B08968] transition-colors" />
            <input
              type="text"
              placeholder="Search riders, groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1C1C1E] border border-transparent focus:border-[#B08968]/30 rounded-full py-3 pl-10 pr-4 text-sm text-white placeholder:text-[#86868B] outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
            />
          </div>
        </div>

        {/* Navigation Pills */}
        <div className="px-6 mb-4 flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {['friends', 'groups', 'communities', 'nearby'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-gradient-to-r from-[#B08968]/20 to-[#8C6D53]/20 text-[#B08968] border border-[#B08968]/40 shadow-[0_0_15px_rgba(176,137,104,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]' : 'bg-transparent text-[#86868B] hover:text-white hover:bg-white/5 border border-transparent'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-6 space-y-1">
          {searchLoading ? (
            <div className="text-center py-8 text-[#86868B] text-xs uppercase tracking-widest animate-pulse">Scanning Network...</div>
          ) : searchResults.length > 0 ? (
            searchResults.map(result => (
              <div key={result.id} className="p-3 rounded-2xl flex items-center gap-4 bg-white/5 border border-white/10">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                  <UserCircleIcon className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{result.username}</h4>
                  <p className="text-xs text-[#86868B]">Rider</p>
                </div>
              </div>
            ))
          ) : activeTab === 'friends' ? (
            friends.map(friend => (
              <button
                key={friend.id}
                onClick={() => setSelectedChat({ type: 'dm', id: friend.id, data: friend })}
                className={`w-full text-left p-3 rounded-2xl flex items-center gap-4 transition-all ${selectedChat?.id === friend.id ? 'bg-gradient-to-r from-[#1C1C1E] to-transparent border-l-2 border-[#B08968] shadow-[0_8px_16px_rgba(0,0,0,0.6)]' : 'hover:bg-white/5 border-l-2 border-transparent'}`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center border border-white/5">
                    {friend.profilePicture ? (
                      <img src={friend.profilePicture} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="font-bold text-slate-300">{(friend.name || friend.username || 'U')[0].toUpperCase()}</span>
                    )}
                  </div>
                  {friend.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0A0A0A] shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="text-sm font-bold text-white truncate">{friend.name || friend.username}</h4>
                    <span className="text-[10px] text-[#86868B] flex-shrink-0">12:45</span>
                  </div>
                  <p className="text-xs text-[#86868B] truncate">Shared a new route to Ladakh.</p>
                </div>
              </button>
            ))
          ) : activeTab === 'groups' ? (
             groups.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedChat({ type: 'group', id: group.id, data: group })}
                className={`w-full text-left p-3 rounded-2xl flex items-center gap-4 transition-all ${selectedChat?.id === group.id ? 'bg-[#1C1C1E] border border-white/10 shadow-[0_8px_16px_rgba(0,0,0,0.4)]' : 'hover:bg-white/5 border border-transparent'}`}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#B08968]/20 to-[#8C6D53]/10 flex items-center justify-center border border-[#B08968]/30">
                  <UserGroupIcon className="w-6 h-6 text-[#B08968]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{group.name}</h4>
                  <p className="text-xs text-[#86868B] truncate">{group.membersCount} Members</p>
                </div>
              </button>
            ))
          ) : activeTab === 'nearby' ? (
            nearbyRiders.map(rider => (
              <div key={rider.id} className="p-3 rounded-2xl flex items-center gap-4 bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/5 group">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-white/5">
                    <span className="font-bold text-slate-300">{(rider.name || 'U')[0]}</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-[#1C1C1E] border border-white/10 text-[8px] font-bold px-1.5 py-0.5 rounded-full text-[#B08968]">
                    {rider.distance}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{rider.name}</h4>
                  <p className="text-[10px] text-[#86868B] uppercase tracking-wider truncate">{rider.bike}</p>
                </div>
                <button className="w-8 h-8 rounded-full bg-[#B08968]/20 flex items-center justify-center text-[#B08968] hover:bg-[#B08968] hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                  <PaperAirplaneIcon className="w-4 h-4 -rotate-45" />
                </button>
              </div>
            ))
          ) : (
             <div className="text-center py-8 text-[#86868B] text-sm">Communities loading...</div>
          )}
        </div>
      </div>

      {/* ========================================= */}
      {/* CENTER STAGE: ACTIVE CHAT OR COMMUNITY HUB */}
      {/* ========================================= */}
      <div className="flex-1 flex flex-col relative z-10 bg-transparent">
        {!selectedChat ? (
          // --- EMPTY STATE: COMMUNITY HUB ---
          <div className="h-full overflow-y-auto scrollbar-hide p-8 lg:p-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-12">
              
              <div className="text-center space-y-4 pt-12 pb-8">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#B08968]/20 to-transparent rounded-full flex items-center justify-center border border-[#B08968]/30 shadow-[0_0_40px_rgba(176,137,104,0.25),inset_0_0_20px_rgba(176,137,104,0.2)]">
                  <GlobeAltIcon className="w-10 h-10 text-[#B08968] drop-shadow-[0_0_8px_rgba(176,137,104,0.8)]" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">Rider Network</h1>
                <p className="text-[#86868B] max-w-md mx-auto text-sm">Discover routes, organize weekend rides, and connect with the motorcycling community around you.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Weather & Telemetry */}
                <div className="p-6 rounded-[32px] bg-gradient-to-br from-[#1C1C1E]/90 to-[#0A0A0A]/90 backdrop-blur-2xl border border-white/10 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#86868B]">Sector Conditions</h3>
                    <CloudIcon className="w-5 h-5 text-[#B08968]" />
                  </div>
                  <div className="flex items-end gap-4 mb-4">
                    <div className="text-4xl font-bold text-white drop-shadow-sm">24°C</div>
                    <div className="text-xs text-[#86868B] mb-1.5 font-medium">Clear Skies, Ideal for riding</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-6">
                     <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 shadow-inner"><div className="text-[10px] uppercase tracking-widest text-[#86868B] mb-1 font-bold">Wind</div><div className="text-sm font-bold text-white">12 km/h NE</div></div>
                     <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 shadow-inner"><div className="text-[10px] uppercase tracking-widest text-[#86868B] mb-1 font-bold">Visibility</div><div className="text-sm font-bold text-white">Perfect</div></div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="p-6 rounded-[32px] bg-gradient-to-br from-[#1C1C1E]/90 to-[#0A0A0A]/90 backdrop-blur-2xl border border-white/10 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#86868B] mb-4">Quick Commands</h3>
                  <div className="space-y-3">
                    <button className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#B08968] to-[#8C6D53] hover:from-[#C5A059] hover:to-[#B08968] text-[#050505] font-bold text-sm flex items-center justify-center gap-2 shadow-[0_15px_30px_rgba(176,137,104,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all">
                      <MapPinIcon className="w-5 h-5 drop-shadow-sm" /> Start Group Ride
                    </button>
                    <button className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all">
                      <UserPlusIcon className="w-5 h-5" /> Invite Riders
                    </button>
                  </div>
                </div>

              </div>

              {/* Trending Routes */}
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#86868B] mb-6">Trending Routes Nearby</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex-shrink-0 w-72 h-40 rounded-[24px] bg-[#111111] border border-white/10 overflow-hidden relative group cursor-pointer snap-start shadow-lg">
                      <div className="absolute inset-0 bg-[url('https://cartodb-basemaps-c.global.ssl.fastly.net/dark_all/12/2356/1572.png')] bg-cover opacity-50 group-hover:scale-105 transition-transform duration-700"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex justify-between items-end">
                          <div>
                            <h4 className="text-sm font-bold text-white drop-shadow-md">Coastal Highway Loop</h4>
                            <p className="text-[10px] text-[#B08968] uppercase tracking-widest font-bold drop-shadow-md">120 km • Curvy</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white">
                            <ArrowUpIcon className="w-4 h-4 rotate-45" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          </div>
        ) : (
          // --- ACTIVE CHAT STATE ---
          <div className="flex flex-col h-full bg-transparent">
            
            {/* Chat Header */}
            <header className="h-24 flex-shrink-0 flex items-center justify-between px-8 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/5 z-20">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center border-2 border-[#1C1C1E]">
                  <span className="font-bold text-slate-300 text-xl">{(activeChatEntity?.name || activeChatEntity?.username || 'U')[0].toUpperCase()}</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    {activeChatEntity?.name || activeChatEntity?.username || 'Unknown'}
                    {activeChatEntity?.online && <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />}
                  </h2>
                  <p className="text-xs text-[#86868B] uppercase tracking-widest">
                    {selectedChat.type === 'dm' ? `${activeChatEntity?.bike || 'Rider'} • 2.4 km away` : `${activeChatEntity?.membersCount || 0} Members`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5">
                  <PhoneIcon className="w-5 h-5 text-white" />
                </button>
                <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5">
                  <VideoCameraIcon className="w-5 h-5 text-white" />
                </button>
                <div className="w-px h-6 bg-white/10 mx-2"></div>
                <button className="w-10 h-10 rounded-full bg-[#1C1C1E] hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5">
                  <EllipsisVerticalIcon className="w-5 h-5 text-[#86868B]" />
                </button>
              </div>
            </header>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-8 space-y-6">
              
              {/* Fake historical messages for visual */}
              <div className="flex flex-col items-center mb-8">
                <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-[#86868B] font-bold">
                  Today
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 mt-auto border border-white/10"></div>
                <div className="max-w-[70%] bg-[#1C1C1E] text-white p-4 rounded-[24px] rounded-bl-sm border border-white/5 shadow-md">
                  <p className="text-sm">Hey, are you joining the Sunday ride to the coastal highway?</p>
                  <span className="text-[10px] text-[#86868B] mt-2 block">10:42 AM</span>
                </div>
              </div>

              <div className="flex gap-4 justify-end">
                <div className="max-w-[70%] bg-gradient-to-br from-[#B08968] to-[#8C6D53] text-[#050505] p-4 rounded-[24px] rounded-br-sm shadow-[0_10px_20px_rgba(176,137,104,0.2)]">
                  <p className="text-sm font-medium">Absolutely! I just got my bike serviced. Where are we meeting?</p>
                  <span className="text-[10px] text-[#050505]/60 mt-2 block text-right font-bold">10:45 AM</span>
                </div>
              </div>

              {messages.map((msg, idx) => {
                 const isMe = msg.sender?.id === user?.id || msg.sender === user?.id;
                 return (
                  <div key={idx} className={`flex gap-4 ${isMe ? 'justify-end' : ''}`}>
                    {!isMe && <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 mt-auto border border-white/10"></div>}
                    <div className={`max-w-[70%] p-4 rounded-[24px] shadow-md ${isMe ? 'bg-gradient-to-br from-[#B08968] to-[#8C6D53] text-[#050505] rounded-br-sm' : 'bg-[#1C1C1E] text-white rounded-bl-sm border border-white/5'}`}>
                      <p className={`text-sm ${isMe ? 'font-medium' : ''}`}>{msg.content}</p>
                    </div>
                  </div>
                 )
              })}
              
              {isPeerTyping && (
                <div className="flex gap-4 items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 border border-white/10"></div>
                  <div className="bg-[#1C1C1E] px-4 py-3 rounded-full border border-white/5 flex gap-1 items-center h-10">
                    <span className="w-1.5 h-1.5 bg-[#86868B] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-[#86868B] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-[#86868B] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Premium Input Dock */}
            <div className="p-6 pt-0 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent">
              <div className="max-w-4xl mx-auto flex items-end gap-3 p-2 bg-[#1C1C1E]/80 backdrop-blur-2xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] rounded-[32px]">
                
                <button className="w-10 h-10 flex-shrink-0 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                  <PlusCircleIcon className="w-5 h-5 text-[#86868B]" />
                </button>
                <button className="w-10 h-10 flex-shrink-0 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                  <PhotoIcon className="w-5 h-5 text-[#86868B]" />
                </button>
                
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value)
                    sendTypingStatus(selectedChat?.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                       if (messageInput.trim()) {
                         sendMessage(selectedChat?.id, messageInput, selectedChat?.type)
                         setMessageInput('')
                       }
                    }
                  }}
                  placeholder="Transmit message..."
                  className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-[#86868B] py-3 px-2"
                />

                {messageInput.trim() ? (
                  <button 
                    onClick={() => {
                      sendMessage(selectedChat?.id, messageInput, selectedChat?.type)
                      setMessageInput('')
                    }}
                    className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-r from-[#B08968] to-[#8C6D53] flex items-center justify-center transition-all shadow-[0_0_15px_rgba(176,137,104,0.4)]"
                  >
                    <ArrowUpIcon className="w-5 h-5 text-[#050505]" />
                  </button>
                ) : (
                  <button className="w-10 h-10 flex-shrink-0 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                    <ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5 text-[#86868B]" />
                  </button>
                )}
                
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ========================================= */}
      {/* RIGHT SIDEBAR: RIDE INTELLIGENCE */}
      {/* ========================================= */}
      {selectedChat && selectedChat.type === 'dm' && (
        <div className="hidden lg:flex w-80 flex-shrink-0 flex-col bg-[#0A0A0A]/90 backdrop-blur-2xl border-l border-white/5 relative z-10 overflow-y-auto scrollbar-hide">
          <div className="p-8">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[#1C1C1E] to-[#121212] border border-white/10 shadow-lg flex items-center justify-center mb-4">
               <span className="font-bold text-slate-300 text-3xl">{(activeChatEntity?.name || activeChatEntity?.username || 'U')[0].toUpperCase()}</span>
            </div>
            <h2 className="text-xl font-bold text-white text-center">{activeChatEntity?.name || activeChatEntity?.username}</h2>
            <p className="text-xs text-[#86868B] text-center uppercase tracking-widest mt-1 mb-8">{activeChatEntity?.bike || 'Rider'}</p>

            <div className="space-y-4">
              
              <div className="p-5 rounded-[24px] bg-gradient-to-b from-[#1C1C1E]/80 to-[#0A0A0A]/90 border border-white/10 shadow-[0_8px_16px_rgba(0,0,0,0.5)]">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#86868B] mb-4">Ride Compatibility</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#B08968]/20 flex items-center justify-center border border-[#B08968]/30">
                    <UsersIcon className="w-4 h-4 text-[#B08968]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">4 Mutual Friends</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <MapIcon className="w-4 h-4 text-[#86868B]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">1 Shared Trip</div>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-[24px] bg-gradient-to-b from-[#1C1C1E]/80 to-[#0A0A0A]/90 border border-white/10 shadow-[0_8px_16px_rgba(0,0,0,0.5)]">
                 <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#86868B] mb-4">Quick Actions</h3>
                 <div className="space-y-2">
                   <button className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium flex items-center gap-3 transition-colors">
                     <MapPinIcon className="w-4 h-4 text-[#B08968]" /> Share Live Location
                   </button>
                   <button className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium flex items-center gap-3 transition-colors">
                     <SparklesIcon className="w-4 h-4 text-[#B08968]" /> AI Ride Summary
                   </button>
                   <button className="w-full p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-medium flex items-center gap-3 transition-colors border border-red-500/20">
                     <ShieldExclamationIcon className="w-4 h-4" /> Emergency Protocol
                   </button>
                 </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Chat;
