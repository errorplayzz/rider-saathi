import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  PaperAirplaneIcon,
  PhoneIcon,
  VideoCameraIcon,
  UserGroupIcon,
  MapPinIcon,
  EllipsisVerticalIcon,
  PhotoIcon,
  MicrophoneIcon,
  XMarkIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  PlayIcon,
  PauseIcon,
  StopIcon
} from '@heroicons/react/24/outline'
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { supabase } from '../lib/supabase'
import {
  getNearbyUsers,
  getChatRooms,
  getRoomMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  createChatRoom,
  deleteRoom,
  uploadChatMedia,
  addRoomParticipants
} from '../lib/supabaseHelpers'

const Chat = () => {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [activeChat, setActiveChat] = useState(null)
  const [nearbyRiders, setNearbyRiders] = useState([])
  const [groupChats, setGroupChats] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [showParticipants, setShowParticipants] = useState(false)
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [addSelectedUsers, setAddSelectedUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editedContent, setEditedContent] = useState('')
  const [messageMenuOpen, setMessageMenuOpen] = useState(null)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [playingAudioId, setPlayingAudioId] = useState(null)
  const [showGroupMenu, setShowGroupMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const realtimeChannelRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingIntervalRef = useRef(null)
  const audioPlayerRef = useRef({})
  
  const { user } = useAuth()
  const { connected, onlineUsers, joinChatRoom } = useSocket()

  useEffect(() => {
    // Don't attempt to fetch protected resources before we know the user (and auth header) is ready
    if (!user) return

    fetchNearbyRiders()
    fetchGroupChats()
    scrollToBottom()
    
    // Voice call handling removed - using Supabase Realtime now
    // No socket needed here anymore

    // Cleanup
    return () => {
      // Cleanup voice recording
      if (mediaRecorderRef.current && isRecordingVoice) {
        mediaRecorderRef.current.stop()
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
      // Cleanup audio players
      Object.values(audioPlayerRef.current).forEach(audio => {
        audio.pause()
        audio.src = ''
      })
    }

    // Listen for new messages from server and update UI
    const handleNewMessage = (payload) => {
      try {
        const { chatId, message } = payload
        if (!chatId || !message) return

        // If the message belongs to the active chat, append it
        if (activeChat && (activeChat.id === chatId || activeChat.id === (message.room || chatId))) {
          setMessages(prev => {
            // Check if we already have this message (avoid duplicates)
            const exists = prev.some(m => m.id === message._id || m._id === message._id)
            if (exists) return prev
            
            // Remove any temp "sending" messages from same user with similar content
            const filtered = prev.filter(m => 
              !(m.sending && m.sender?.id === message.sender?.id && m.content === message.content)
            )
            
            // Add the new message
            return [...filtered, {
              id: message._id,
              _id: message._id,
              sender: message.sender,
              content: message.content || message.message,
              type: message.type || message.messageType || 'text',
              media: message.media,
              media_url: message.media_url || message.media?.url,
              location: message.location,
              timestamp: message.timestamp || message.createdAt || new Date().toISOString()
            }]
          })
          setTimeout(scrollToBottom, 50)
        } else {
          // Optionally: show toast/unread indicator for other rooms
          console.log('New message for other room', chatId)
        }
      } catch (e) {
        console.error('Error handling new-message', e)
      }
    }

    const handleJoinedRoom = ({ roomId }) => {
      // when server acknowledges join, we can fetch messages
      if (activeChat && activeChat.id === roomId) {
        fetchMessages(roomId)
      }
    }

    const handleUserJoinedChat = (data) => {
      // update participants list when someone joins
      if (!data || !data.userId) return
      setGroupChats(prev => prev.map(g => {
        if (g.id === activeChat?.id) {
          // avoid duplicates
          const already = g.participants.some(p => (p.user?._id || p.user || p) === data.userId)
          if (!already) {
            return { ...g, participants: [...g.participants, { user: data.userId }] }
          }
        }
        return g
      }))
    }

    const handleUserLeftChat = (data) => {
      if (!data || !data.userId) return
      setGroupChats(prev => prev.map(g => {
        if (g.id === activeChat?.id) {
          return { ...g, participants: g.participants.filter(p => (p.user?._id || p.user || p) !== data.userId) }
        }
        return g
      }))
    }

    const handleMessageSent = ({ tempId, messageId, timestamp }) => {
      // Update temp message with real ID from server
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, id: messageId, _id: messageId, timestamp, sending: false } : m
      ))
      console.log('Message confirmed by server:', messageId)
    }

    // Supabase Realtime subscription for this room
    if (activeChat?.id) {
      console.log('📡 Setting up realtime for room:', activeChat.id)
      
      const channel = supabase
        .channel(`room:${activeChat.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${activeChat.id}`
          },
          (payload) => {
            console.log('📩 New message via Supabase Realtime:', payload.new)
            
            const newMsg = payload.new
            
            // Skip if message is deleted
            if (newMsg.is_deleted) {
              console.log('⏭️ Skipping deleted message')
              return
            }
            
            // Skip if it's our own message (already added from sendMessage response)
            if (newMsg.sender_id === user.id) {
              console.log('⏭️ Skipping own message (already added)')
              return
            }
            
            // Add message if not already in list
            setMessages(prev => {
              const exists = prev.some(m => m.id === newMsg.id)
              if (exists) {
                return prev // Already have this message
              }
              
              return [...prev, {
                id: newMsg.id,
                _id: newMsg.id,
                sender: {
                  id: newMsg.sender_id,
                  name: 'Other User', // Will be fetched on page load
                  avatar_url: null
                },
                content: newMsg.content,
                type: newMsg.message_type || 'text',
                media_url: newMsg.media_url,
                timestamp: newMsg.created_at,
                sending: false
              }]
            })
            
            setTimeout(scrollToBottom, 100)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${activeChat.id}`
          },
          (payload) => {
            console.log('📝 Message updated via Supabase Realtime:', payload.new)
            
            const updatedMsg = payload.new
            
            // If message is deleted, remove it from UI
            if (updatedMsg.is_deleted) {
              console.log('🗑️ Message deleted, removing from UI')
              setMessages(prev => prev.filter(m => m.id !== updatedMsg.id))
              return
            }
            
            // If message is edited, update it in UI
            setMessages(prev => prev.map(m => 
              m.id === updatedMsg.id
                ? {
                    ...m,
                    content: updatedMsg.content,
                    edited_at: updatedMsg.edited_at
                  }
                : m
            ))
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status)
          if (status === 'SUBSCRIBED') {
            console.log('✅ Subscribed to room:', activeChat.id)
          }
        })

      realtimeChannelRef.current = channel
    }

    return () => {
      // Cleanup Supabase Realtime
      if (realtimeChannelRef.current) {
        console.log('🔌 Unsubscribing from room')
        supabase.removeChannel(realtimeChannelRef.current)
        realtimeChannelRef.current = null
      }
    }
  }, [activeChat, user])

  useEffect(() => {
    if (activeChat) {
      // joinChatRoom is handled by SocketContext presence
      // No need to call it here - Supabase Realtime subscription handles it
      fetchMessages(activeChat.id)
    }
  }, [activeChat])

  // Close message menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (messageMenuOpen && !event.target.closest('.message-menu')) {
        setMessageMenuOpen(null)
      }
      if (showGroupMenu && !event.target.closest('.group-menu')) {
        setShowGroupMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [messageMenuOpen, showGroupMenu])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchNearbyRiders = async () => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const users = await getNearbyUsers(
            position.coords.longitude,
            position.coords.latitude,
            5000
          )
          setNearbyRiders(users || [])
        } catch (error) {
          console.error('Nearby riders fetch error:', error)
          // Set empty array on error to prevent UI issues
          setNearbyRiders([])
        }
      },
      (error) => {
        console.error('Location error:', error)
        setNearbyRiders([])
      }
    )
  }

  const fetchGroupChats = async () => {
    try {
      const rooms = await getChatRooms(user.id, 'group')
      setGroupChats((rooms || []).map(r => ({ 
        id: r.id, 
        name: r.name, 
        participants: r.participants || [] 
      })))
    } catch (error) {
      console.error('Group chats fetch error:', error)
      // Set empty array on error to prevent UI issues
      setGroupChats([])
    }
  }

  const fetchMessages = async (chatId) => {
    try {
      const msgs = await getRoomMessages(chatId)
      setMessages(msgs || [])
      setTimeout(scrollToBottom, 100)
    } catch (error) {
      console.error('Messages fetch error:', error)
    }
  }

  const isUserAdmin = () => {
    if (!activeChat || !activeChat.participants || !user) return false
    const myParticipant = activeChat.participants.find(p => {
      const userId = p.user?.id || p.user?._id || p.user || p.id || p._id
      return userId === user.id || userId === user._id
    })
    return myParticipant?.role === 'admin'
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return

    const messageText = newMessage.trim()
    const tempId = `temp-${Date.now()}`
    setNewMessage('') // Clear input immediately

    try {
      // Optimistic update - add message immediately to UI
      const tempMessage = {
        id: tempId,
        sender: {
          id: user.id,
          name: user.name || 'You',
          avatar_url: user.avatar_url
        },
        content: messageText,
        type: 'text',
        timestamp: new Date().toISOString(),
        sending: true // Flag to show it's being sent
      }
      
      setMessages(prev => [...prev, tempMessage])
      scrollToBottom()

      // Send via Supabase (no socket.io)
      console.log('📤 Sending message via Supabase...')
      const msg = await sendMessage(activeChat.id, user.id, messageText, 'text')
      
      console.log('✅ Message sent:', msg)
      
      // Remove temp message and add real one immediately
      setMessages(prev => {
        // Remove temp
        const filtered = prev.filter(m => m.id !== tempId)
        
        // Add real message (from sendMessage response with full data)
        return [...filtered, {
          id: msg.id,
          _id: msg.id,
          sender: {
            id: msg.sender.id,
            name: msg.sender.name,
            avatar_url: msg.sender.avatar_url
          },
          content: msg.content,
          type: msg.message_type,
          media_url: msg.media_url,
          timestamp: msg.created_at,
          sending: false
        }]
      })
      
      scrollToBottom()
      
    } catch (error) {
      console.error('Send message error:', error)
      alert('Failed to send message')
      // Remove the failed message
      setMessages(prev => prev.filter(m => m.id !== tempId))
    }
  }

  const startPrivateChat = async (riderId) => {
    try {
      const room = await createChatRoom(
        'Private Chat',
        'private',
        [user.id, riderId]
      )
      setActiveChat({
        id: room.id,
        name: room.name || 'Private Chat',
        type: room.room_type || 'private',
        participants: []
      })
    } catch (error) {
      console.error('Start private chat error:', error)
    }
  }

  const createGroupChat = async () => {
    if (!newGroupName.trim() || selectedUsers.length === 0) {
      alert('Please enter a group name and select at least one participant')
      return
    }

    try {
      const room = await createChatRoom(
        newGroupName,
        'group',
        [...selectedUsers, user.id]
      )

      // normalize the room object for frontend usage
      const normalized = {
        id: room.id,
        name: room.name,
        participants: []
      }

      setGroupChats(prev => [...prev, normalized])
      setShowCreateGroup(false)
      setNewGroupName('')
      setSelectedUsers([])

      setActiveChat({
        id: normalized.id,
        name: normalized.name,
        type: 'group',
        participants: normalized.participants
      })

      // Realtime subscription will handle new room automatically
      // No socket needed - Supabase Realtime does it

      // Ensure the server-side list is reflected in the UI (avoids race where creation succeeded but
      // subsequent page refresh / fetch may not yet include the new room due to auth/fetch timing)
      await fetchGroupChats()
    } catch (error) {
      console.error('Create group error:', error)
    }
  }

  const startVoiceCall = () => {
    if (!activeChat) return

    // Voice calling feature - to be implemented with Supabase Realtime or WebRTC
    alert('Voice calling feature coming soon!')
    
    // TODO: Implement with Supabase Realtime broadcast or dedicated WebRTC solution
    return

    // pick a target participant (first other user)
    const target = activeChat.participants.find(p => {
      const pid = p?.user?._id || p?.user || p?._id || p
      return pid?.toString() !== (user.id || user._id)?.toString()
    })
    const targetUserId = target ? (target.user?._id || target.user || target._id || target) : null

    if (!targetUserId) {
      alert('No other participant available to call')
      return
    }

    // Voice call code removed - implement with Supabase Realtime later
    console.log('Voice call to:', targetUserId)
  }

  const startVideoCall = () => {
    if (!activeChat) return

    // Video calling feature - to be implemented with Supabase Realtime or WebRTC
    alert('Video calling feature coming soon!')
    
    // TODO: Implement with Supabase Realtime broadcast or dedicated WebRTC solution
    return

    const target = activeChat.participants.find(p => {
      const pid = p?.user?._id || p?.user || p?._id || p
      return pid?.toString() !== (user.id || user._id)?.toString()
    })
    const targetUserId = target ? (target.user?._id || target.user || target._id || target) : null

    if (!targetUserId) {
      alert('No other participant available to call')
      return
    }

    // Video call code removed - implement with Supabase Realtime later
    console.log('Video call to:', targetUserId)
  }

  const handleEditMessage = async (messageId, newContent) => {
    if (!newContent.trim()) {
      alert('Message cannot be empty')
      return
    }

    try {
      const updatedMessage = await editMessage(messageId, newContent)
      
      // Update message in local state
      setMessages(prev => prev.map(m => 
        (m.id || m._id) === messageId 
          ? { ...m, content: newContent, edited_at: updatedMessage.edited_at }
          : m
      ))
      
      setEditingMessageId(null)
      setEditedContent('')
      setMessageMenuOpen(null)
      console.log('✅ Message edited successfully')
    } catch (error) {
      console.error('Edit message error:', error)
      alert(`Failed to edit message: ${error.message}`)
    }
  }

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return
    }

    try {
      await deleteMessage(messageId)
      
      // Remove message from local state
      setMessages(prev => prev.filter(m => (m.id || m._id) !== messageId))
      
      setMessageMenuOpen(null)
      console.log('✅ Message deleted successfully')
    } catch (error) {
      console.error('Delete message error:', error)
      alert(`Failed to delete message: ${error.message}`)
    }
  }

  const handleDeleteGroup = async () => {
    if (deleteConfirmText !== 'CONFIRM') {
      alert('Please type "CONFIRM" to delete the group')
      return
    }

    try {
      await deleteRoom(activeChat.id)
      
      // Remove group from local state
      setGroupChats(prev => prev.filter(g => g.id !== activeChat.id))
      
      // Close all modals
      setShowDeleteConfirm(false)
      setShowGroupMenu(false)
      setDeleteConfirmText('')
      
      // Clear active chat
      setActiveChat(null)
      setMessages([])
      
      console.log('✅ Group deleted successfully')
      alert('Group deleted successfully')
    } catch (error) {
      console.error('Delete group error:', error)
      alert(`Failed to delete group: ${error.message}`)
    }
  }

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      setIsRecordingVoice(true)
      setRecordingTime(0)
      
      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
      console.log('🎤 Voice recording started')
    } catch (error) {
      console.error('Voice recording error:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop()
      setIsRecordingVoice(false)
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
      
      console.log('🎤 Voice recording stopped')
    }
  }

  const cancelVoiceRecording = () => {
    stopVoiceRecording()
    setAudioBlob(null)
    setRecordingTime(0)
    audioChunksRef.current = []
    console.log('🎤 Voice recording cancelled')
  }

  const sendVoiceMessage = async () => {
    if (!audioBlob || !activeChat) return

    try {
      setIsUploading(true)
      setUploadProgress(0)
      
      const tempId = Date.now()
      const loadingMessage = {
        id: tempId,
        sender: { id: user.id, name: user.name || 'You' },
        content: 'Sending voice message...',
        type: 'voice',
        timestamp: new Date().toISOString(),
        isUploading: true
      }
      setMessages(prev => [...prev, loadingMessage])
      
      // Convert blob to file
      const voiceFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
      
      // Upload voice file
      const mediaData = await uploadChatMedia(activeChat.id, user.id, voiceFile, (progress) => {
        setUploadProgress(progress)
      })
      
      // Remove loading message
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setIsUploading(false)
      setUploadProgress(0)
      
      // Send voice message
      const duration = recordingTime // Store duration
      
      // Try sending with voice_duration, fallback without it if column doesn't exist
      let msg
      try {
        msg = await sendMessage(
          activeChat.id,
          user.id,
          `Voice message (${formatDuration(duration)})`,
          'voice',
          {
            media_url: mediaData.url,
            media_type: 'audio/webm',
            media_size: voiceFile.size,
            voice_duration: duration
          }
        )
      } catch (error) {
        if (error.message && error.message.includes('voice_duration')) {
          // Column doesn't exist, send without it
          console.log('⚠️ voice_duration column not found, sending without it')
          msg = await sendMessage(
            activeChat.id,
            user.id,
            `Voice message (${formatDuration(duration)})`,
            'voice',
            {
              media_url: mediaData.url,
              media_type: 'audio/webm',
              media_size: voiceFile.size
            }
          )
        } else {
          throw error
        }
      }
      
      // Add message immediately
      if (msg && msg.data && msg.data[0]) {
        const newMsg = msg.data[0]
        setMessages(prev => {
          const exists = prev.some(m => (m.id || m._id) === (newMsg.id || newMsg._id))
          if (exists) return prev
          return [...prev, newMsg]
        })
      }
      
      // Reset voice recording state
      setAudioBlob(null)
      setRecordingTime(0)
      audioChunksRef.current = []
      
      scrollToBottom()
      console.log('✅ Voice message sent')
    } catch (error) {
      console.error('Voice message send error:', error)
      setIsUploading(false)
      setUploadProgress(0)
      setMessages(prev => prev.filter(m => !m.isUploading))
      alert(`Failed to send voice message: ${error.message}`)
    }
  }

  const toggleAudioPlayback = (messageId, audioUrl) => {
    const audio = audioPlayerRef.current[messageId]
    
    if (audio) {
      if (playingAudioId === messageId) {
        // Pause current audio
        audio.pause()
        setPlayingAudioId(null)
      } else {
        // Play this audio
        audio.play()
        setPlayingAudioId(messageId)
      }
    } else {
      // Create new audio element
      const newAudio = new Audio(audioUrl)
      audioPlayerRef.current[messageId] = newAudio
      
      newAudio.onended = () => {
        setPlayingAudioId(null)
      }
      
      newAudio.onerror = () => {
        console.error('Audio playback error')
        setPlayingAudioId(null)
      }
      
      newAudio.play()
      setPlayingAudioId(messageId)
    }
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file || !activeChat) return

    try {
      // Show loading state with progress
      setIsUploading(true)
      setUploadProgress(0)
      
      const tempId = Date.now()
      const loadingMessage = {
        id: tempId,
        sender: { id: user.id, name: user.name || 'You' },
        content: 'Uploading... 0%',
        type: 'text',
        timestamp: new Date().toISOString(),
        isUploading: true
      }
      setMessages(prev => [...prev, loadingMessage])
      
      // Upload file to Supabase storage with progress tracking
      const mediaData = await uploadChatMedia(activeChat.id, user.id, file, (progress) => {
        setUploadProgress(progress)
        // Update loading message with progress
        setMessages(prev => prev.map(m => 
          m.id === tempId 
            ? { ...m, content: `Uploading... ${progress}%` }
            : m
        ))
      })
      
      // Upload complete - remove loading message
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setIsUploading(false)
      setUploadProgress(0)
      
      // Send message with file URL via Supabase (no socket.io)
      console.log('📤 Sending file message via Supabase...')
      const msg = await sendMessage(
        activeChat.id, 
        user.id, 
        file.name, 
        file.type.startsWith('image/') ? 'image' : 'file',
        { 
          media_url: mediaData.url, 
          media_type: file.type, 
          media_size: file.size
        }
      )
      
      // Add message immediately from response (don't wait for Realtime)
      if (msg && msg.data && msg.data[0]) {
        const newMsg = msg.data[0]
        console.log('✅ File message sent, adding to UI immediately:', newMsg)
        setMessages(prev => {
          // Avoid duplicates - check if message already exists
          const exists = prev.some(m => (m.id || m._id) === (newMsg.id || newMsg._id))
          if (exists) return prev
          return [...prev, newMsg]
        })
      } else {
        console.log('✅ File message sent, waiting for realtime update...')
      }
      
      scrollToBottom()
    } catch (error) {
      console.error('File upload error:', error)
      setIsUploading(false)
      setUploadProgress(0)
      // Remove any loading messages on error
      setMessages(prev => prev.filter(m => !m.isUploading))
      alert(`Failed to upload file: ${error.message || 'Unknown error'}`)
    }
  }

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const toggleAddSelection = (userId) => {
    setAddSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId])
  }

  const addMembersToRoom = async () => {
    if (!addSelectedUsers.length || !activeChat) {
      alert('Select at least one user to add')
      return
    }

    try {
      await addRoomParticipants(activeChat.id, addSelectedUsers)

      // Re-fetch participants for the active chat
      // Since addRoomParticipants doesn't return the full room, we need to refresh
      await fetchGroupChats()
      
      setShowAddMembers(false)
      setAddSelectedUsers([])
      alert('Members added successfully')
    } catch (err) {
      console.error('Add members error:', err)
      alert(err?.response?.data?.message || 'Failed to add members')
    }
  }

  const filteredRiders = nearbyRiders.filter(rider =>
    rider.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now'
    
    const date = new Date(timestamp)
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Just now'
    
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen pt-20 px-4 pb-4">
      <div className="max-w-7xl mx-auto h-[calc(100vh-7rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full relative z-0">
          
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6 overflow-y-auto h-full">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-orbitron font-bold text-white">Chat</h1>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="p-2 bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan rounded-full transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>
              
              <div className={`flex items-center px-3 py-2 rounded ${
                connected ? 'bg-green-900/20 text-green-300' : 'bg-red-900/20 text-red-300'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  connected ? 'bg-green-400' : 'bg-red-400'
                }`} />
                <span className="text-sm">
                  {connected ? `${onlineUsers.length} riders online` : 'Offline'}
                </span>
              </div>
            </motion.div>

            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search riders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark-600 border border-gray-600 rounded text-white focus:border-neon-cyan focus:outline-none"
              />
            </div>

            {/* Group Chats */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-lg font-semibold text-white mb-3">Group Chats</h2>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {groupChats.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setActiveChat({
                      id: group.id,
                      name: group.name,
                      type: 'group',
                      participants: group.participants
                    })}
                    className={`w-full text-left p-3 rounded transition-colors ${
                      activeChat?.id === group.id 
                        ? 'bg-neon-cyan/20 border border-neon-cyan/30' 
                        : 'bg-dark-600 hover:bg-dark-500'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-neon-purple to-neon-cyan rounded-full flex items-center justify-center">
                        <UserGroupIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{group.name}</h3>
                        <p className="text-xs text-gray-400">
                          {group.participants.length} members
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Nearby Riders */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-lg font-semibold text-white mb-3">Nearby Riders</h2>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredRiders.map((rider) => (
                  <button
                    key={rider._id || rider.id}
                    onClick={() => startPrivateChat(rider._id || rider.id)}
                    className="w-full text-left p-3 bg-dark-600 hover:bg-dark-500 rounded transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-neon-cyan to-neon-purple rounded-full flex items-center justify-center">
                            <span className="text-white font-bold">
                              {rider.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          {/* Online indicator (green) or offline (gray) */}
                          {onlineUsers.some(u => u.userId === (rider._id || rider.id)) ? (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-dark-800" />
                          ) : (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-500 rounded-full border-2 border-dark-800" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-white font-medium">{rider.name}</h3>
                          <div className="flex items-center space-x-1 text-xs text-gray-400">
                            <MapPinIcon className="w-3 h-3" />
                            <span>{Math.round(rider.distance)}m away</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3 h-full overflow-hidden">
            {activeChat ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col card-glow overflow-hidden"
              >
                {/* Chat Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-neon-purple to-neon-cyan rounded-full flex items-center justify-center">
                      {activeChat.type === 'group' ? (
                        <UserGroupIcon className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-white font-bold">
                          {activeChat.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">{activeChat.name}</h2>
                      <p className="text-sm text-gray-400">
                        {activeChat.type === 'group' 
                          ? `${activeChat.participants.length} members`
                          : 'Private chat'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={startVoiceCall}
                      className="p-2 text-gray-400 hover:text-neon-cyan transition-colors"
                    >
                      <PhoneIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => startVideoCall()}
                      className="p-2 text-gray-400 hover:text-neon-cyan transition-colors"
                    >
                      <VideoCameraIcon className="w-5 h-5" />
                    </button>
                    <div className="relative group-menu">
                      <button
                        onClick={() => setShowGroupMenu(!showGroupMenu)}
                        className="p-2 text-gray-400 hover:text-neon-cyan transition-colors"
                      >
                        <EllipsisVerticalIcon className="w-5 h-5" />
                      </button>
                      
                      {/* Group Menu Dropdown */}
                      {showGroupMenu && (
                        <div className="absolute right-0 top-12 bg-dark-700 rounded-lg shadow-xl border border-gray-600 py-1 min-w-[180px] z-20">
                          <button
                            onClick={() => {
                              setShowGroupMenu(false)
                              setShowParticipants(true)
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-dark-600 flex items-center gap-2 text-white"
                          >
                            <UserGroupIcon className="w-4 h-4" />
                            View Participants
                          </button>
                          
                          {/* Delete Group - Only for Admin */}
                          {activeChat.type === 'group' && isUserAdmin() && (
                            <button
                              onClick={() => {
                                setShowGroupMenu(false)
                                setShowDeleteConfirm(true)
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-dark-600 flex items-center gap-2 text-red-400"
                            >
                              <TrashIcon className="w-4 h-4" />
                              Delete Group
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message, index) => {
                    const isOwnMessage = (message.sender.id || message.sender._id) === (user.id || user._id)
                    const messageId = message.id || message._id
                    
                    return (
                    <div
                      key={messageId || index}
                      className={`flex ${
                        isOwnMessage ? 'justify-end' : 'justify-start'
                      } ${message.sending ? 'opacity-60' : 'opacity-100'} group`}
                    >
                      <div className="relative">
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            isOwnMessage
                              ? 'bg-neon-cyan text-dark-800'
                              : 'bg-dark-600 text-white'
                          }`}
                        >
                          {!isOwnMessage && activeChat.type === 'group' && (
                            <p className="text-xs text-gray-400 mb-1">{message.sender.name}</p>
                          )}
                          
                          {/* Edit/Delete Menu for own messages */}
                          {isOwnMessage && !message.isUploading && !message.sending && (
                            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity message-menu">
                              <button
                                onClick={() => setMessageMenuOpen(messageMenuOpen === messageId ? null : messageId)}
                                className="bg-dark-700 hover:bg-dark-600 text-white p-1 rounded-full shadow-lg"
                              >
                                <EllipsisVerticalIcon className="w-4 h-4" />
                              </button>
                              
                              {messageMenuOpen === messageId && (
                                <div className="absolute right-0 top-8 bg-dark-700 rounded-lg shadow-xl border border-gray-600 py-1 min-w-[120px] z-10">
                                  {/* Only show Edit for text messages */}
                                  {message.type === 'text' && (
                                    <button
                                      onClick={() => {
                                        setEditingMessageId(messageId)
                                        setEditedContent(message.content)
                                        setMessageMenuOpen(null)
                                      }}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-dark-600 flex items-center gap-2 text-white"
                                    >
                                      <PencilIcon className="w-4 h-4" />
                                      Edit
                                    </button>
                                  )}
                                  {/* Show Delete for all message types */}
                                  <button
                                    onClick={() => handleDeleteMessage(messageId)}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-dark-600 flex items-center gap-2 text-red-400"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {message.isUploading ? (
                            <div className="space-y-2 min-w-[200px]">
                              <p className="text-sm">{message.content}</p>
                              <div className="w-full bg-dark-800 rounded-full h-2.5 overflow-hidden">
                                <div 
                                  className="bg-neon-cyan h-2.5 rounded-full transition-all duration-300 ease-out"
                                  style={{ width: `${uploadProgress}%` }}
                                ></div>
                              </div>
                            </div>
                          ) : editingMessageId === messageId ? (
                            <div className="space-y-2 min-w-[200px]">
                              <input
                                type="text"
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="w-full px-2 py-1 bg-dark-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-neon-cyan"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditMessage(messageId, editedContent)}
                                  className="flex items-center gap-1 px-2 py-1 bg-neon-cyan text-dark-800 rounded text-xs hover:bg-opacity-80"
                                >
                                  <CheckIcon className="w-3 h-3" />
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingMessageId(null)
                                    setEditedContent('')
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 bg-dark-600 text-white rounded text-xs hover:bg-dark-500"
                                >
                                  <XMarkIcon className="w-3 h-3" />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : message.type === 'text' ? (
                            <div>
                              <p className="text-sm">{message.content}</p>
                              {message.edited_at && (
                                <p className="text-xs opacity-50 mt-1">(edited)</p>
                              )}
                            </div>
                          ) : null}
                          
                          {!message.isUploading && message.type === 'image' && (
                            <div>
                              <img 
                                src={message.media_url || message.media?.url || message.fileUrl} 
                                alt="Shared image" 
                                className="max-w-full max-h-80 rounded cursor-pointer"
                                onClick={() => window.open(message.media_url || message.media?.url || message.fileUrl, '_blank')}
                              />
                            </div>
                          )}
                          
                          {!message.isUploading && message.type === 'file' && (
                            <a 
                              href={message.media_url || message.media?.url || message.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 hover:underline"
                            >
                              <PhotoIcon className="w-4 h-4" />
                              <span className="text-sm">{message.content || 'Download file'}</span>
                            </a>
                          )}
                          
                          {!message.isUploading && message.type === 'location' && (
                            <div className="flex items-center space-x-2">
                              <MapPinIcon className="w-4 h-4" />
                              <span className="text-sm">Location shared</span>
                            </div>
                          )}
                          
                          {!message.isUploading && message.type === 'voice' && (
                            <div className="flex items-center space-x-3 min-w-[200px]">
                              <button
                                onClick={() => toggleAudioPlayback(messageId, message.media_url || message.media?.url)}
                                className={`p-2 rounded-full transition-colors ${
                                  isOwnMessage 
                                    ? 'bg-dark-800 hover:bg-dark-700' 
                                    : 'bg-dark-700 hover:bg-dark-600'
                                }`}
                              >
                                {playingAudioId === messageId ? (
                                  <PauseIcon className="w-5 h-5" />
                                ) : (
                                  <PlayIcon className="w-5 h-5" />
                                )}
                              </button>
                              <div className="flex-1 flex items-center gap-2">
                                <div className="flex-1 h-1 bg-dark-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-neon-cyan rounded-full" style={{ width: '0%' }}></div>
                                </div>
                                <span className="text-xs whitespace-nowrap">
                                  {message.voice_duration ? formatDuration(message.voice_duration) : '0:00'}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {!message.isUploading && editingMessageId !== messageId && (
                            <p className="text-xs opacity-75 mt-1 flex items-center gap-1">
                              {message.sending && <span className="animate-pulse">●</span>}
                              {formatTime(message.timestamp)}
                              {message.sending && <span className="text-[10px]">sending...</span>}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )})}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-700">
                  {/* Voice Recording Preview */}
                  {audioBlob && (
                    <div className="mb-3 p-3 bg-dark-700 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neon-cyan flex items-center justify-center">
                          <MicrophoneIcon className="w-5 h-5 text-dark-800" />
                        </div>
                        <div>
                          <p className="text-sm text-white">Voice Message</p>
                          <p className="text-xs text-gray-400">{formatDuration(recordingTime)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={cancelVoiceRecording}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={sendVoiceMessage}
                          className="px-4 py-2 bg-neon-cyan text-dark-800 rounded-lg hover:bg-opacity-80 transition-colors"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Recording In Progress */}
                  {isRecordingVoice && (
                    <div className="mb-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center justify-between animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="text-white">Recording... {formatDuration(recordingTime)}</span>
                      </div>
                      <button
                        onClick={stopVoiceRecording}
                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                      >
                        <StopIcon className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    {!isRecordingVoice && !audioBlob && (
                      <>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 text-gray-400 hover:text-neon-cyan transition-colors"
                        >
                          <PhotoIcon className="w-5 h-5" />
                        </button>
                        
                        <button
                          onClick={startVoiceRecording}
                          className="p-2 text-gray-400 hover:text-neon-cyan transition-colors"
                        >
                          <MicrophoneIcon className="w-5 h-5" />
                        </button>
                        
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Type a message..."
                          className="flex-1 px-4 py-2 bg-dark-600 border border-gray-600 rounded text-white focus:border-neon-cyan focus:outline-none"
                        />
                      </>
                    )}
                    
                    {(isRecordingVoice || audioBlob) && (
                      <div className="flex-1"></div>
                    )}
                    
                    {!isRecordingVoice && !audioBlob && (
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="p-2 bg-neon-cyan text-dark-800 rounded hover:bg-neon-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <PaperAirplaneIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </motion.div>
            ) : (
              <div className="h-full flex items-center justify-center card-glow">
                <div className="text-center">
                  <ChatBubbleLeftIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-white mb-2">
                    Select a chat to start messaging
                  </h2>
                  <p className="text-gray-400">
                    Choose from nearby riders or create a group chat
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Group Modal */}
        {showCreateGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-dark-800 rounded-lg p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Create Group Chat</h3>
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-600 border border-gray-600 rounded text-white focus:border-neon-cyan focus:outline-none"
                />
                
                <div>
                  <h4 className="text-white font-medium mb-2">Select participants:</h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {/* Nearby riders first (if any) */}
                    {nearbyRiders.map((rider) => (
                      <label
                        key={rider._id || rider.id}
                        className="flex items-center space-x-3 p-2 hover:bg-dark-600 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(rider._id || rider.id)}
                          onChange={() => toggleUserSelection(rider._id || rider.id)}
                          className="text-neon-cyan"
                        />
                        <span className="text-white">{rider.name}</span>
                      </label>
                    ))}

                    {/* Fallback: online users (exclude those already shown and exclude self) */}
                    {onlineUsers
                      .filter(u => !nearbyRiders.some(r => (r._id || r.id) === u.userId) && u.userId !== (user?.id || user?._id))
                      .map((u) => (
                        <label
                          key={u.userId}
                          className="flex items-center space-x-3 p-2 hover:bg-dark-600 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(u.userId)}
                            onChange={() => toggleUserSelection(u.userId)}
                            className="text-neon-cyan"
                          />
                          <span className="text-white">{u.name || u.email || u.userId}</span>
                        </label>
                      ))}
                  </div>

                  {/* Debug / quick-inspect button: prints arrays to console so you can see what's available */}
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        // helpful quick-debug: inspect participant sources in console
                        // eslint-disable-next-line no-console
                        console.log('Create Group debug - onlineUsers:', onlineUsers)
                        // eslint-disable-next-line no-console
                        console.log('Create Group debug - nearbyRiders:', nearbyRiders)
                        // eslint-disable-next-line no-console
                        alert('Printed onlineUsers and nearbyRiders to the console')
                      }}
                      className="px-3 py-1 text-xs bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
                    >
                      Print participants to console
                    </button>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={createGroupChat}
                    className="flex-1 px-4 py-2 bg-neon-cyan text-dark-800 rounded hover:bg-neon-cyan/80 transition-colors"
                  >
                    Create Group
                  </button>
                  <button
                    onClick={() => setShowCreateGroup(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        {/* Participants Modal */}
        {showParticipants && activeChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-dark-800 rounded-lg p-6 w-full max-w-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Participants</h3>
                <button
                  onClick={() => setShowParticipants(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Add More Members button for group chats */}
              {activeChat && activeChat.type === 'group' && (
                <div className="mb-3">
                  <button 
                    onClick={() => {
                      setShowParticipants(false)
                      setShowAddMembers(true)
                    }} 
                    className="w-full px-4 py-2 bg-neon-cyan text-dark-800 rounded-lg hover:bg-opacity-80 transition-colors flex items-center justify-center gap-2"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Add More Members
                  </button>
                </div>
              )}

              <div className="space-y-3 max-h-72 overflow-y-auto">
                {activeChat.participants.map((p, idx) => {
                  const userObj = p.user || p
                  const id = userObj?._id || userObj?.id || userObj
                  const displayName = userObj?.name || userObj?.email || id
                  const role = p.role || 'member'
                  const isAdmin = role === 'admin'
                  const isModerator = role === 'moderator'
                  
                  return (
                    <div key={id || idx} className="flex items-center justify-between p-2 rounded hover:bg-dark-700">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-neon-cyan to-neon-purple rounded-full flex items-center justify-center text-white font-bold">
                          {(displayName || '').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white">{displayName}</span>
                            {isAdmin && (
                              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30">
                                Admin
                              </span>
                            )}
                            {isModerator && (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                                Moderator
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{id?.toString?.()}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Add Members Modal */}
        {showAddMembers && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-dark-800 rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Add Members to "{activeChat?.name}"</h3>
                <button onClick={() => setShowAddMembers(false)} className="text-gray-400 hover:text-white"><XMarkIcon className="w-5 h-5"/></button>
              </div>

              <div className="space-y-3 max-h-56 overflow-y-auto">
                {nearbyRiders.map(r => (
                  <label key={r._id || r.id} className="flex items-center space-x-3 p-2 hover:bg-dark-700 rounded cursor-pointer">
                    <input type="checkbox" checked={addSelectedUsers.includes(r._id || r.id)} onChange={() => toggleAddSelection(r._id || r.id)} />
                    <span className="text-white">{r.name}</span>
                  </label>
                ))}

                {onlineUsers.filter(u => !nearbyRiders.some(r => (r._id || r.id) === u.userId)).map(u => (
                  <label key={u.userId} className="flex items-center space-x-3 p-2 hover:bg-dark-700 rounded cursor-pointer">
                    <input type="checkbox" checked={addSelectedUsers.includes(u.userId)} onChange={() => toggleAddSelection(u.userId)} />
                    <span className="text-white">{u.name || u.email || u.userId}</span>
                  </label>
                ))}
              </div>

              <div className="mt-4 flex space-x-2">
                <button onClick={addMembersToRoom} className="flex-1 px-4 py-2 bg-neon-cyan text-dark-800 rounded">Add Selected</button>
                <button onClick={() => { setShowAddMembers(false); setAddSelectedUsers([]) }} className="px-4 py-2 bg-gray-600 text-white rounded">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Group Confirmation Modal */}
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              className="bg-dark-800 rounded-lg p-6 w-full max-w-md border-2 border-red-500/30"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
                  <TrashIcon className="w-6 h-6" />
                  Delete Group
                </h3>
                <button 
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteConfirmText('')
                  }} 
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="w-5 h-5"/>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <p className="text-white text-sm mb-2">
                    ⚠️ Warning: This action cannot be undone!
                  </p>
                  <p className="text-gray-300 text-sm">
                    You are about to permanently delete the group "<strong>{activeChat?.name}</strong>". 
                    All messages and data will be lost.
                  </p>
                </div>

                <div>
                  <label className="block text-white text-sm mb-2">
                    Type <span className="font-bold text-red-400">CONFIRM</span> to delete:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type CONFIRM here"
                    className="w-full px-4 py-2 bg-dark-700 border border-gray-600 rounded text-white focus:border-red-500 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={handleDeleteGroup}
                    disabled={deleteConfirmText !== 'CONFIRM'}
                    className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Delete Group
                  </button>
                  <button 
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText('')
                    }} 
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default Chat