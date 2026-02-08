import { supabase } from './supabase'

// ============================================
// PROFILE OPERATIONS
// ============================================

export const getProfile = async (userId) => {
  try {
    // Create AbortController for proper timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000) // 2 second timeout
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .abortSignal(controller.signal)
      .maybeSingle()
    
    clearTimeout(timeoutId) // Clear timeout if successful
    
    if (error) throw error
    if (!data) return null
    
    return data
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Database timeout')
    }
    throw err
  }
}

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .maybeSingle()
  
  if (error) throw error
  return data
}

export const updateLocation = async (userId, longitude, latitude, address = null) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      current_location: `POINT(${longitude} ${latitude})`,
      current_address: address,
      location_updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getNearbyUsers = async (longitude, latitude, radiusMeters = 10000, includeOffline = false) => {
  const { data, error } = await supabase
    .rpc('get_nearby_users', {
      user_longitude: longitude,
      user_latitude: latitude,
      radius_meters: radiusMeters,
      include_offline: includeOffline
    })
  
  if (error) throw error
  return data
}

export const updateUserStatus = async (userId, isOnline, isRiding = null) => {
  const updates = {
    is_online: isOnline,
    last_seen: new Date().toISOString()
  }
  
  if (isRiding !== null) {
    updates.is_riding = isRiding
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ============================================
// CHAT OPERATIONS
// ============================================

export const createChatRoom = async (name, type, participants, options = {}) => {
  // Use the database function to create room with participants atomically
  const { data: session } = await supabase.auth.getSession()
  const creatorId = session?.session?.user?.id
  
  if (!creatorId) {
    throw new Error('User must be authenticated to create a chat room')
  }

  // Filter out creator from participants list (function will add them as admin)
  const otherParticipants = participants.filter(p => p !== creatorId)

  const { data: roomId, error } = await supabase
    .rpc('create_chat_room_with_participants', {
      room_name: name,
      room_type: type,
      participant_ids: otherParticipants,
      creator_id: creatorId
    })
  
  if (error) throw error
  
  // Fetch the created room with full details
  const { data: room, error: fetchError } = await supabase
    .from('chat_rooms')
    .select('*')
    .eq('id', roomId)
    .single()
  
  if (fetchError) throw fetchError
  
  return room
}

export const deleteRoom = async (roomId) => {
  // Soft delete - set is_active to false
  const { error } = await supabase
    .from('chat_rooms')
    .update({ 
      is_active: false,
      deleted_at: new Date().toISOString()
    })
    .eq('id', roomId)
  
  if (error) throw error
  return { success: true }
}

export const getChatRooms = async (userId, type = null) => {
  let query = supabase
    .from('chat_rooms')
    .select(`
      *,
      room_participants!inner(
        user_id,
        role,
        joined_at,
        user:profiles(id, name, avatar_url, is_online)
      )
    `)
    .eq('room_participants.user_id', userId)
    .eq('is_active', true)
  
  if (type) {
    query = query.eq('room_type', type)
  }
  
  const { data: rooms, error } = await query.order('last_activity', { ascending: false })
  
  if (error) throw error
  
  // For each room, fetch ALL participants (not just the current user)
  if (rooms && rooms.length > 0) {
    const roomsWithAllParticipants = await Promise.all(
      rooms.map(async (room) => {
        const { data: allParticipants, error: partError } = await supabase
          .from('room_participants')
          .select(`
            user_id,
            role,
            joined_at,
            user:profiles(id, name, avatar_url, is_online)
          `)
          .eq('room_id', room.id)
        
        if (partError) {
          console.error('Error fetching participants for room:', room.id, partError)
          return { ...room, participants: [] }
        }
        
        return { ...room, participants: allParticipants || [] }
      })
    )
    return roomsWithAllParticipants
  }
  
  return rooms
}

export const getRoomMessages = async (roomId, limit = 100) => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, name, avatar_url)
    `)
    .eq('room_id', roomId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(limit)
  
  if (error) throw error
  
  // Normalize the data: map created_at to timestamp for frontend consistency
  return (data || []).map(msg => ({
    ...msg,
    timestamp: msg.created_at || msg.timestamp || new Date().toISOString(),
    type: msg.message_type || msg.type || 'text',
    // Also map media fields for image/file messages
    media_url: msg.media_url || msg.media?.url,
    media_type: msg.media_type || msg.media?.type,
    media_size: msg.media_size || msg.media?.size
  }))
}

export const sendMessage = async (roomId, senderId, content, messageType = 'text', extras = {}) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      room_id: roomId,
      sender_id: senderId,
      content,
      message_type: messageType,
      ...extras
    })
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, name, avatar_url)
    `)
    .single()
  
  if (error) throw error
  return data
}

export const editMessage = async (messageId, newContent) => {
  const { data, error } = await supabase
    .from('messages')
    .update({ 
      content: newContent,
      edited_at: new Date().toISOString()
    })
    .eq('id', messageId)
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, name, avatar_url)
    `)
    .single()
  
  if (error) throw error
  return data
}

export const deleteMessage = async (messageId) => {
  // Soft delete - set is_deleted flag instead of hard delete
  const { error } = await supabase
    .from('messages')
    .update({ 
      is_deleted: true,
      deleted_at: new Date().toISOString()
    })
    .eq('id', messageId)
  
  if (error) throw error
  return { success: true }
}

export const addRoomParticipants = async (roomId, userIds) => {
  const inserts = userIds.map(userId => ({
    room_id: roomId,
    user_id: userId,
    role: 'member'
  }))
  
  const { data, error } = await supabase
    .from('room_participants')
    .insert(inserts)
    .select()
  
  if (error) throw error
  return data
}

export const getRoomParticipants = async (roomId) => {
  const { data, error } = await supabase
    .from('room_participants')
    .select(`
      *,
      user:profiles!room_participants_user_id_fkey(id, name, email, avatar_url, is_online)
    `)
    .eq('room_id', roomId)
  
  if (error) throw error
  return data
}

// ============================================
// EMERGENCY ALERT OPERATIONS
// ============================================

export const createEmergencyAlert = async (userId, alertType, severity, location, description = null) => {
  const insertData = {
    user_id: userId,
    alert_type: alertType,
    severity,
    description,
    status: 'active'
  }

  // Only add location if coordinates are available
  if (location && location.longitude && location.latitude) {
    insertData.location = `POINT(${location.longitude} ${location.latitude})`
    if (location.address) {
      insertData.address = location.address
    }
  }

  const { data, error } = await supabase
    .from('emergency_alerts')
    .insert(insertData)
    .select('*')
    .single()
  
  if (error) {
    console.error('Supabase insert error:', error)
    throw error
  }
  
  // Fetch user profile separately to avoid join issues
  if (data) {
    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id, name, email, phone, avatar_url')
        .eq('id', userId)
        .single()
      
      if (userProfile) {
        data.user = userProfile
      }
    } catch (profileError) {
      console.log('Profile fetch failed, alert created without user data')
    }
  }
  
  return data
}

export const getActiveEmergencyAlerts = async (longitude = null, latitude = null, radiusMeters = 50000) => {
  const { data, error } = await supabase
    .from('emergency_alerts')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Fetch alerts error:', error)
    throw error
  }
  
  // Fetch user profiles for each alert
  if (data && data.length > 0) {
    const alertsWithUsers = await Promise.all(
      data.map(async (alert) => {
        try {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('id, name, email, phone, avatar_url')
            .eq('id', alert.user_id)
            .single()
          
          return { ...alert, user: userProfile }
        } catch (err) {
          return alert
        }
      })
    )
    return alertsWithUsers
  }
  
  return data || []
}

export const respondToEmergency = async (alertId, responderId, message = null, estimatedArrival = null) => {
  const { data: alert, error: fetchError } = await supabase
    .from('emergency_alerts')
    .select('responders')
    .eq('id', alertId)
    .single()
  
  if (fetchError) throw fetchError
  
  const responders = alert.responders || []
  responders.push({
    user_id: responderId,
    responded_at: new Date().toISOString(),
    message,
    estimated_arrival: estimatedArrival
  })
  
  const { data, error } = await supabase
    .from('emergency_alerts')
    .update({
      responders,
      status: 'responded'
    })
    .eq('id', alertId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const resolveEmergency = async (alertId, resolvedBy) => {
  const { data, error } = await supabase
    .from('emergency_alerts')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy
    })
    .eq('id', alertId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ============================================
// RIDE OPERATIONS
// ============================================

export const createRide = async (riderId, startLocation, options = {}) => {
  const { data, error } = await supabase
    .from('rides')
    .insert({
      rider_id: riderId,
      start_location: `POINT(${startLocation.longitude} ${startLocation.latitude})`,
      start_address: startLocation.address,
      start_time: new Date().toISOString(),
      ...options
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updateRide = async (rideId, updates) => {
  const { data, error } = await supabase
    .from('rides')
    .update(updates)
    .eq('id', rideId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getRides = async (riderId, limit = 20) => {
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .eq('rider_id', riderId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data
}

export const addRideWaypoint = async (rideId, location, speed = null, heading = null) => {
  // Get current waypoints
  const { data: ride, error: fetchError } = await supabase
    .from('rides')
    .select('waypoints')
    .eq('id', rideId)
    .single()
  
  if (fetchError) throw fetchError
  
  const waypoints = ride.waypoints || []
  waypoints.push({
    coordinates: [location.longitude, location.latitude],
    timestamp: new Date().toISOString(),
    speed,
    heading
  })
  
  const { data, error } = await supabase
    .from('rides')
    .update({
      waypoints,
      current_location: `POINT(${location.longitude} ${location.latitude})`,
      current_address: location.address,
      location_updated_at: new Date().toISOString()
    })
    .eq('id', rideId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ============================================
// REWARD OPERATIONS
// ============================================

export const addReward = async (userId, activityType, points, description, extras = {}) => {
  const { data, error } = await supabase
    .from('rewards')
    .insert({
      user_id: userId,
      activity_type: activityType,
      points,
      description,
      ...extras
    })
    .select()
    .single()
  
  if (error) throw error
  
  // Update user's total reward points
  const { data: profile } = await supabase
    .from('profiles')
    .select('reward_points')
    .eq('id', userId)
    .single()
  
  if (profile) {
    await supabase
      .from('profiles')
      .update({ reward_points: (profile.reward_points || 0) + points })
      .eq('id', userId)
  }
  
  return data
}

export const getRewards = async (userId, limit = 50) => {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data
}

export const getLeaderboard = async (period = 'alltime', category = 'total_points', limit = 50) => {
  const { data, error } = await supabase
    .from('leaderboard')
    .select(`
      *,
      user:profiles!leaderboard_user_id_fkey(id, name, avatar_url)
    `)
    .eq('period', period)
    .eq('category', category)
    .order('rank', { ascending: true })
    .limit(limit)
  
  if (error) throw error
  return data
}

export const getUserAchievements = async (userId) => {
  try {
    // Fetch achievements from the achievements table
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', userId)
      .order('is_completed', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      // Log and return empty list instead of throwing so UI doesn't break if schema differs
      console.error('getUserAchievements error:', error)
      return []
    }

    // Map to a shape used by the UI
    return (data || []).map((row) => ({
      id: row.id,
      achievementId: row.achievement_id,
      title: row.name || 'Achievement',
      description: row.description || '',
      icon: row.icon || '🏆',
      category: row.category,
      tier: row.tier,
      progress: {
        current: row.progress_current || 0,
        target: row.progress_target || 1,
        unit: row.progress_unit
      },
      isCompleted: row.is_completed,
      completedAt: row.completed_at,
      rewardPoints: row.reward_points || 0
    }))
  } catch (err) {
    console.error('getUserAchievements unexpected error:', err)
    return []
  }
}

// ============================================
// STORAGE OPERATIONS
// ============================================

export const uploadAvatar = async (userId, file) => {
  // Build filename and path
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}-${Date.now()}.${fileExt}`
  const filePath = `${fileName}`

  // Upload file to the `avatars` bucket
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (uploadError) {
    // Provide more context to the calling UI
    console.error('uploadAvatar upload error:', uploadError)
    throw new Error(uploadError.message || 'Avatar upload failed')
  }

  // Get public URL for the uploaded file
  const { data: publicData, error: publicError } = await supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  if (publicError) {
    console.error('uploadAvatar getPublicUrl error:', publicError)
    throw new Error(publicError.message || 'Failed to get avatar public URL')
  }

  // Some supabase client versions return `publicUrl` or `public_url` — normalize
  const publicUrl = (publicData && (publicData.publicUrl || publicData.public_url)) || null

  if (!publicUrl) {
    console.error('uploadAvatar: public URL not available', publicData)
    throw new Error('Avatar uploaded but public URL unavailable')
  }

  // NOTE: we intentionally do not update the profile here to avoid double updates.
  // Let the caller (UI) perform profile updates so it's explicit and easy to retry.
  return publicUrl
}

export const uploadChatMedia = async (roomId, userId, file, onProgress = null) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${roomId}/${userId}-${Date.now()}.${fileExt}`
  
  // If progress callback provided, use custom upload with XMLHttpRequest
  if (onProgress) {
    return new Promise(async (resolve, reject) => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          reject(new Error('No active session'))
          return
        }
        
        const xhr = new XMLHttpRequest()
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100)
            onProgress(percentComplete)
          }
        })
        
        // Handle completion
        xhr.addEventListener('load', async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              // Get signed URL (valid for 1 hour)
              const { data: { signedUrl }, error: urlError } = await supabase.storage
                .from('chat-media')
                .createSignedUrl(fileName, 3600)
              
              if (urlError) throw urlError
              
              resolve({
                url: signedUrl,
                path: fileName,
                type: file.type,
                size: file.size
              })
            } catch (error) {
              reject(error)
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        })
        
        // Handle errors
        xhr.addEventListener('error', () => reject(new Error('Upload failed')))
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))
        
        // Construct Supabase storage URL
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const uploadUrl = `${supabaseUrl}/storage/v1/object/chat-media/${fileName}`
        
        xhr.open('POST', uploadUrl)
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.setRequestHeader('x-upsert', 'false')
        
        xhr.send(file)
      } catch (error) {
        reject(error)
      }
    })
  }
  
  // Fallback to standard upload without progress
  const { error: uploadError } = await supabase.storage
    .from('chat-media')
    .upload(fileName, file, {
      cacheControl: '3600'
    })
  
  if (uploadError) throw uploadError
  
  // Get signed URL (valid for 1 hour)
  const { data: { signedUrl }, error: urlError } = await supabase.storage
    .from('chat-media')
    .createSignedUrl(fileName, 3600)
  
  if (urlError) throw urlError
  
  return {
    url: signedUrl,
    path: fileName,
    type: file.type,
    size: file.size
  }
}

export const deleteFile = async (bucket, path) => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])
  
  if (error) throw error
}

// ============================================
// ACHIEVEMENT OPERATIONS
// ============================================

/**
 * Initialize achievements for a user (usually called on signup)
 */
export const initializeUserAchievements = async (userId) => {
  try {
    const { data, error } = await supabase.rpc('initialize_user_achievements', {
      p_user_id: userId
    })
    
    if (error) throw error
    return true
  } catch (err) {
    console.error('initializeUserAchievements error:', err)
    return false
  }
}

/**
 * Track an activity and update related achievements
 */
export const trackAchievementActivity = async (userId, activityType) => {
  try {
    const { data, error } = await supabase.rpc('track_achievement_activity', {
      p_user_id: userId,
      p_activity_type: activityType
    })
    
    if (error) throw error
    return true
  } catch (err) {
    console.error('trackAchievementActivity error:', err)
    return false
  }
}

/**
 * Update progress for a specific achievement
 */
export const updateAchievementProgress = async (userId, achievementId, increment = 1) => {
  try {
    const { data, error } = await supabase.rpc('update_achievement_progress', {
      p_user_id: userId,
      p_achievement_id: achievementId,
      p_increment: increment
    })
    
    if (error) throw error
    return data // Returns true if newly completed
  } catch (err) {
    console.error('updateAchievementProgress error:', err)
    return false
  }
}

/**
 * Get all achievement definitions (master list)
 */
export const getAchievementDefinitions = async () => {
  try {
    const { data, error } = await supabase
      .from('achievement_definitions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
    
    if (error) throw error
    return data || []
  } catch (err) {
    console.error('getAchievementDefinitions error:', err)
    return []
  }
}
