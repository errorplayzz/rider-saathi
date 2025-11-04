import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import Navbar from '../components/Navbar';

export default function Chat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    onlineUsers, 
    sendMessage, 
    sendTypingIndicator,
    userTypingStatus 
  } = useRealtime();

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Realtime message tracking
  const [pendingMessages, setPendingMessages] = useState(new Map());
  const messageEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingMessages]);

  // Load user's rooms
  useEffect(() => {
    if (!user) return;
    loadRooms();
  }, [user]);

  // Listen for realtime messages
  useEffect(() => {
    const handleRealtimeMessage = (event) => {
      const { message } = event.detail;
      
      // If message is for current room, add it
      if (selectedRoom && message.room_id === selectedRoom.id) {
        setMessages(prev => {
          // Check if message already exists
          const exists = prev.some(m => m.id === message.id);
          if (exists) return prev;
          
          // Remove pending message with same temp ID if exists
          if (message.temp_id) {
            setPendingMessages(prev => {
              const newMap = new Map(prev);
              newMap.delete(message.temp_id);
              return newMap;
            });
          }
          
          return [...prev, message].sort((a, b) => 
            new Date(a.created_at) - new Date(b.created_at)
          );
        });

        // Mark as delivered if not from current user
        if (message.sender_id !== user.id) {
          markMessageDelivered(message.id);
        }
      }
    };

    window.addEventListener('realtime-message', handleRealtimeMessage);
    
    return () => {
      window.removeEventListener('realtime-message', handleRealtimeMessage);
    };
  }, [selectedRoom, user]);

  // Load messages when room is selected
  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.id);
      markRoomAsRead(selectedRoom.id);
    }
  }, [selectedRoom]);

  const loadRooms = async () => {
    try {
      const { data: participantData, error: participantError } = await supabase
        .from('room_participants')
        .select('room_id')
        .eq('user_id', user.id);

      if (participantError) throw participantError;

      const roomIds = participantData.map(p => p.room_id);

      if (roomIds.length === 0) {
        setRooms([]);
        setLoading(false);
        return;
      }

      const { data: roomsData, error: roomsError } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          room_participants (
            user_id,
            profiles (
              id,
              name,
              avatar_url,
              is_online
            )
          )
        `)
        .in('id', roomIds)
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (roomsError) throw roomsError;

      setRooms(roomsData || []);
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (roomId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles:sender_id (
            id,
            name,
            avatar_url
          )
        `)
        .eq('room_id', roomId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const markMessageDelivered = async (messageId) => {
    try {
      await supabase.rpc('mark_message_delivered', { message_id: messageId });
    } catch (error) {
      console.error('Error marking message delivered:', error);
    }
  };

  const markRoomAsRead = async (roomId) => {
    try {
      await supabase
        .from('room_participants')
        .update({ last_seen: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error marking room as read:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedRoom) return;

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    let mediaUrl = null;
    let messageType = 'text';

    // Optimistic UI - add pending message
    const pendingMessage = {
      id: tempId,
      room_id: selectedRoom.id,
      sender_id: user.id,
      content: newMessage,
      message_type: messageType,
      media_url: mediaUrl,
      created_at: new Date().toISOString(),
      profiles: {
        id: user.id,
        name: user.user_metadata?.name || user.email,
        avatar_url: user.user_metadata?.avatar_url
      },
      isPending: true
    };

    setPendingMessages(prev => new Map(prev).set(tempId, pendingMessage));
    setNewMessage('');

    try {
      // Upload file if exists
      if (selectedFile) {
        setIsUploading(true);
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(fileName, selectedFile, {
            onUploadProgress: (progress) => {
              const percentage = (progress.loaded / progress.total) * 100;
              setUploadProgress(percentage);
            }
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-media')
          .getPublicUrl(fileName);

        mediaUrl = publicUrl;
        messageType = selectedFile.type.startsWith('image/') ? 'image' : 'file';
        
        setSelectedFile(null);
        setUploadProgress(0);
        setIsUploading(false);
      }

      // Send via RealtimeContext (will insert into DB and broadcast)
      const success = await sendMessage(
        selectedRoom.id,
        newMessage,
        messageType,
        mediaUrl
      );

      if (success) {
        // Remove pending message
        setPendingMessages(prev => {
          const newMap = new Map(prev);
          newMap.delete(tempId);
          return newMap;
        });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message: ' + error.message);
      
      // Mark pending message as failed
      setPendingMessages(prev => {
        const newMap = new Map(prev);
        const msg = newMap.get(tempId);
        if (msg) {
          newMap.set(tempId, { ...msg, isFailed: true });
        }
        return newMap;
      });
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!selectedRoom) return;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator
    sendTypingIndicator(selectedRoom.id, true);

    // Stop typing after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(selectedRoom.id, false);
    }, 2000);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const createRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      const { data: roomData, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: newRoomName,
          room_type: 'group',
          created_by: user.id,
          is_active: true,
          last_activity: new Date().toISOString()
        })
        .select()
        .single();

      if (roomError) throw roomError;

      const { error: participantError } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomData.id,
          user_id: user.id,
          joined_at: new Date().toISOString()
        });

      if (participantError) throw participantError;

      setNewRoomName('');
      setShowNewRoomModal(false);
      await loadRooms();
      setSelectedRoom(roomData);
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room: ' + error.message);
    }
  };

  // Get typing users for current room
  const typingUsers = selectedRoom 
    ? userTypingStatus.get(selectedRoom.id) || []
    : [];
  
  const typingUsersText = typingUsers
    .filter(uid => uid !== user.id)
    .map(uid => {
      const participant = selectedRoom?.room_participants?.find(
        p => p.profiles?.id === uid
      );
      return participant?.profiles?.name || 'Someone';
    })
    .join(', ');

  // Combine real and pending messages
  const allMessages = [
    ...messages,
    ...Array.from(pendingMessages.values())
  ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="flex gap-4 h-[calc(100vh-8rem)]">
          {/* Rooms Sidebar */}
          <div className="w-80 bg-white/10 backdrop-blur-lg rounded-xl p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Chat Rooms</h2>
              <button
                onClick={() => setShowNewRoomModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
              >
                New Room
              </button>
            </div>

            {/* Online Users */}
            <div className="mb-4 p-3 bg-white/5 rounded-lg">
              <h3 className="text-sm font-semibold text-white/70 mb-2">
                Online ({onlineUsers.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {onlineUsers.slice(0, 10).map(userId => {
                  const room = rooms.find(r => 
                    r.room_participants?.some(p => p.profiles?.id === userId)
                  );
                  const participant = room?.room_participants?.find(
                    p => p.profiles?.id === userId
                  );
                  return participant?.profiles ? (
                    <div key={userId} className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-white/80">
                        {participant.profiles.name?.split(' ')[0]}
                      </span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            {/* Room List */}
            <div className="space-y-2">
              {rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`w-full text-left p-3 rounded-lg transition ${
                    selectedRoom?.id === room.id
                      ? 'bg-blue-500/30 border border-blue-400'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold">{room.name}</div>
                      <div className="text-white/60 text-sm">
                        {room.room_participants?.length || 0} members
                      </div>
                    </div>
                    {room.room_participants?.some(p => 
                      onlineUsers.includes(p.profiles?.id)
                    ) && (
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 bg-white/10 backdrop-blur-lg rounded-xl flex flex-col">
            {selectedRoom ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-white/10">
                  <h3 className="text-xl font-bold text-white">{selectedRoom.name}</h3>
                  <div className="text-white/60 text-sm">
                    {selectedRoom.room_participants?.length || 0} members
                    {typingUsersText && (
                      <span className="ml-2 text-blue-300">
                        • {typingUsersText} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                      </span>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {allMessages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_id === user.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.sender_id === user.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/20 text-white'
                        } ${message.isPending ? 'opacity-60' : ''} ${
                          message.isFailed ? 'bg-red-500/50' : ''
                        }`}
                      >
                        {message.sender_id !== user.id && (
                          <div className="text-xs font-semibold mb-1 opacity-80">
                            {message.profiles?.name || 'Unknown'}
                          </div>
                        )}
                        
                        {message.message_type === 'image' && message.media_url && (
                          <img
                            src={message.media_url}
                            alt="Shared"
                            className="rounded mb-2 max-w-full"
                          />
                        )}
                        
                        {message.content && (
                          <div className="break-words">{message.content}</div>
                        )}
                        
                        <div className="text-xs opacity-70 mt-1 flex items-center gap-2">
                          {new Date(message.created_at).toLocaleTimeString()}
                          {message.isPending && (
                            <span className="flex items-center gap-1">
                              <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                              Sending...
                            </span>
                          )}
                          {message.isFailed && (
                            <span className="text-red-300">Failed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messageEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10">
                  {selectedFile && (
                    <div className="mb-2 p-2 bg-white/5 rounded flex items-center justify-between">
                      <span className="text-white text-sm truncate">{selectedFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  
                  {isUploading && (
                    <div className="mb-2">
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept="image/*,video/*,.pdf,.doc,.docx"
                    />
                    <label
                      htmlFor="file-upload"
                      className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg cursor-pointer transition"
                    >
                      📎
                    </label>
                    
                    <input
                      type="text"
                      value={newMessage}
                      onChange={handleTyping}
                      placeholder="Type a message..."
                      className="flex-1 bg-white/10 text-white placeholder-white/50 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isUploading}
                    />
                    
                    <button
                      type="submit"
                      disabled={isUploading || (!newMessage.trim() && !selectedFile)}
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-white/50">
                Select a room to start chatting
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Room Modal */}
      {showNewRoomModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-xl max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-white mb-4">Create New Room</h2>
            <form onSubmit={createRoom}>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room name..."
                className="w-full bg-white/10 text-white placeholder-white/50 px-4 py-2 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewRoomModal(false);
                    setNewRoomName('');
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newRoomName.trim()}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
