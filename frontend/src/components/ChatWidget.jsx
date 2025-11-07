import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './chatWidget.css'

const ChatWidget = () => {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const containerRef = useRef(null)
  const chatRef = useRef(null)

  useEffect(() => {
    const onClickOutside = (e) => {
      if (!open) return
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages, open])

  // SIMPLE MESSAGE APPENDER - NO JSON ALLOWED
  const addMessage = (text, isUser = false) => {
    // NEVER allow JSON objects in messages
    let cleanText = ''
    
    if (typeof text === 'string') {
      // Check if it's a JSON response
      if (text.startsWith('{"id":"gen-') || text.includes('"provider":"OpenAI"')) {
        cleanText = "Sorry, I'm having trouble processing that. Please try again."
      } else {
        cleanText = text
      }
    } else {
      cleanText = "I received your message."
    }
    
    setMessages(prev => [...prev, { 
      text: cleanText, 
      isUser, 
      id: Date.now() + Math.random() 
    }])
  }

  const sendMessage = async () => {
    const userMessage = input.trim()
    if (!userMessage) return
    
    // Add user message
    addMessage(userMessage, true)
    setInput('')
    setLoading(true)

    try {
      // Use environment variable for production backend URL or fallback to current origin for local dev
      const apiBase = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || window.location.origin
      const response = await fetch(`${apiBase}/api/ai/gpt-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data = await response.json()
      
      // EXTRACT ONLY THE MESSAGE CONTENT
      let botReply = ''
      
      if (data?.choices?.[0]?.message?.content) {
        botReply = data.choices[0].message.content
      } else {
        botReply = "Sorry, I couldn't process your request properly."
      }
      
      // Add bot message
      addMessage(botReply, false)
      
    } catch (error) {
      addMessage("Sorry, I'm having technical difficulties. Please try again later.", false)
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating button */}
      <div className={`rs-chat-widget ${open ? 'open' : ''}`}>
        <button
          aria-label="Open Rider Saathi chat"
          className="rs-chat-btn"
          onClick={() => setOpen(v => !v)}
        >
          <span className="rs-robot">🤖</span>
        </button>

        {/* Panel */}
        <div className={`rs-chat-panel`} ref={containerRef}>
          <div className="rs-chat-header">
            <div className="rs-chat-title">Rider Saathi — AI Assistant</div>
            <button className="rs-close" onClick={() => setOpen(false)} aria-label="Close chat">✕</button>
          </div>

          <div className="rs-chat-body" ref={chatRef} role="log" aria-live="polite">
            {messages.length === 0 && (
              <div className="rs-empty">Ask me anything about Rider Saathi!</div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`rs-msg ${msg.isUser ? 'user' : 'bot'}`}>
                {msg.text}
              </div>
            ))}

            {loading && (
              <div className="rs-typing">AI is thinking<span className="dots">...</span></div>
            )}
          </div>

          <div className="rs-chat-footer">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask Rider Saathi..."
              className="rs-input"
            />
            <button 
              className="rs-send" 
              onClick={sendMessage} 
              disabled={loading || !input.trim()}
            >
              {loading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ChatWidget