import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ========================================
// FRIENDS API
// ========================================

export const friendsAPI = {
  // Get pending friend requests
  getFriendRequests: async () => {
    const { data } = await api.get('/friends/requests')
    return data
  },

  // Send friend request
  sendFriendRequest: async (userId, message) => {
    const { data } = await api.post('/friends/request', { userId, message })
    return data
  },

  // Accept friend request
  acceptFriendRequest: async (requestId) => {
    const { data } = await api.put(`/friends/request/${requestId}/accept`)
    return data
  },

  // Reject friend request
  rejectFriendRequest: async (requestId) => {
    const { data } = await api.put(`/friends/request/${requestId}/reject`)
    return data
  },

  // Get friends list
  getFriends: async () => {
    const { data } = await api.get('/friends/list')
    return data
  },

  // Remove friend
  removeFriend: async (friendId) => {
    const { data } = await api.delete(`/friends/${friendId}`)
    return data
  },

  // Block user
  blockUser: async (userId) => {
    const { data } = await api.post(`/friends/block/${userId}`)
    return data
  },

  // Unblock user
  unblockUser: async (userId) => {
    const { data } = await api.post(`/friends/unblock/${userId}`)
    return data
  },

  // Get nearby riders
  getNearbyRiders: async (latitude, longitude, radius = 5000) => {
    const { data } = await api.get(`/friends/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`)
    return data
  }
}

// ========================================
// MESSAGES API
// ========================================

export const messagesAPI = {
  // Get conversation with a user
  getConversation: async (userId, page = 1) => {
    const { data } = await api.get(`/messages/conversation/${userId}`, {
      params: { page }
    })
    return data
  },

  // Get all conversations
  getConversations: async () => {
    const { data } = await api.get('/messages/conversations')
    return data
  },

  // Send message (REST fallback, prefer socket)
  sendMessage: async (recipientId, content, contentType = 'text', mediaUrl) => {
    const { data } = await api.post('/messages/send', {
      recipientId,
      content,
      contentType,
      mediaUrl
    })
    return data
  },

  // Mark message as read
  markAsRead: async (messageId) => {
    const { data } = await api.put(`/messages/${messageId}/read`)
    return data
  },

  // Delete message
  deleteMessage: async (messageId) => {
    const { data } = await api.delete(`/messages/${messageId}`)
    return data
  },

  // Get unread count
  getUnreadCount: async () => {
    const { data } = await api.get('/messages/unread/count')
    return data
  }
}

// ========================================
// GROUPS API
// ========================================

export const groupsAPI = {
  // Create group
  createGroup: async (groupData) => {
    const { data } = await api.post('/groups', groupData)
    return data
  },

  // Get user's groups
  getMyGroups: async () => {
    const { data } = await api.get('/groups/my-groups')
    return data
  },

  // Get group details
  getGroup: async (groupId) => {
    const { data } = await api.get(`/groups/${groupId}`)
    return data
  },

  // Get group messages
  getGroupMessages: async (groupId, page = 1) => {
    const { data } = await api.get(`/groups/${groupId}/messages`, {
      params: { page }
    })
    return data
  },

  // Add member to group
  addMember: async (groupId, userId) => {
    const { data } = await api.post(`/groups/${groupId}/members`, { userId })
    return data
  },

  // Remove member from group
  removeMember: async (groupId, userId) => {
    const { data } = await api.delete(`/groups/${groupId}/members/${userId}`)
    return data
  },

  // Make admin
  makeAdmin: async (groupId, userId) => {
    const { data } = await api.put(`/groups/${groupId}/admins/${userId}`)
    return data
  },

  // Update group
  updateGroup: async (groupId, updates) => {
    const { data } = await api.put(`/groups/${groupId}`, updates)
    return data
  },

  // Delete group
  deleteGroup: async (groupId) => {
    const { data } = await api.delete(`/groups/${groupId}`)
    return data
  }
}

// ========================================
// COMMUNITIES API
// ========================================

export const communitiesAPI = {
  // Create community
  createCommunity: async (communityData) => {
    const { data } = await api.post('/communities', communityData)
    return data
  },

  // Browse communities
  getCommunities: async (params = {}) => {
    const { data } = await api.get('/communities', { params })
    return data
  },

  // Get user's communities
  getMyCommunities: async () => {
    const { data } = await api.get('/communities/my-communities')
    return data
  },

  // Get community details
  getCommunity: async (communityId) => {
    const { data } = await api.get(`/communities/${communityId}`)
    return data
  },

  // Join community
  joinCommunity: async (communityId) => {
    const { data } = await api.post(`/communities/${communityId}/join`)
    return data
  },

  // Leave community
  leaveCommunity: async (communityId) => {
    const { data } = await api.post(`/communities/${communityId}/leave`)
    return data
  },

  // Update community
  updateCommunity: async (communityId, updates) => {
    const { data } = await api.put(`/communities/${communityId}`, updates)
    return data
  }
}

// ========================================
// POSTS API
// ========================================

export const postsAPI = {
  // Create post
  createPost: async (postData) => {
    const { data } = await api.post('/posts', postData)
    return data
  },

  // Get community feed
  getFeed: async (communityId, params = {}) => {
    const { data } = await api.get(`/posts/feed/${communityId}`, { params })
    return data
  },

  // Get single post
  getPost: async (postId) => {
    const { data } = await api.get(`/posts/${postId}`)
    return data
  },

  // React to post
  reactToPost: async (postId, reactionType) => {
    const { data } = await api.post(`/posts/${postId}/react`, { reactionType })
    return data
  },

  // Remove reaction
  removeReaction: async (postId) => {
    const { data } = await api.delete(`/posts/${postId}/react`)
    return data
  },

  // Add comment
  addComment: async (postId, content, parentCommentId = null, mentions = []) => {
    const { data } = await api.post(`/posts/${postId}/comments`, {
      content,
      parentCommentId,
      mentions
    })
    return data
  },

  // Get comments
  getComments: async (postId, sortBy = 'latest') => {
    const { data } = await api.get(`/posts/${postId}/comments`, {
      params: { sortBy }
    })
    return data
  },

  // Update post
  updatePost: async (postId, updates) => {
    const { data } = await api.put(`/posts/${postId}`, updates)
    return data
  },

  // Delete post
  deletePost: async (postId) => {
    const { data } = await api.delete(`/posts/${postId}`)
    return data
  },

  // Pin/unpin post
  togglePin: async (postId, communityId) => {
    const { data } = await api.put(`/posts/${postId}/pin`, { communityId })
    return data
  }
}

// ========================================
// UPLOAD API
// ========================================

export const uploadAPI = {
  // Upload avatar
  uploadAvatar: async (file) => {
    const formData = new FormData()
    formData.append('avatar', file)
    
    const { data } = await api.post('/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  // Upload media (images, videos)
  uploadMedia: async (file, type = 'image') => {
    const formData = new FormData()
    formData.append('media', file)
    formData.append('type', type)
    
    const { data } = await api.post('/upload/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  // Upload multiple files
  uploadMultiple: async (files) => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    
    const { data } = await api.post('/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  }
}

export default api
