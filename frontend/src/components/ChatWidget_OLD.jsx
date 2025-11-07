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

  const appendMessage = (text, cls) => {
    // Safety check - never append raw JSON responses
    const cleanText = typeof text === 'string' && text.trim()
      ? (text.includes('{"id":"gen-') || text.includes('"provider":"OpenAI"') 
         ? "I received your message. Let me process that..." 
         : text)
      : text
      
    setMessages(prev => [...prev, { text: cleanText, cls }])
  }

  const apiPost = async (payload) => {
    const apiBase = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || window.location.origin
    const gptUrl = `${apiBase.replace(/\/$/, '')}/api/ai/gpt`

    const headers = { 'Content-Type': 'application/json' }
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

    let res = await fetch(gptUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })

    // fallback to public testing endpoint if unauthorized
    if (res.status === 401) {
      const publicUrl = `${apiBase.replace(/\/$/, '')}/api/ai/gpt-public`
      res = await fetch(publicUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    }

    return res
  }

  const sendMessage = async () => {
    const content = input.trim()
    if (!content) return
    appendMessage(content, 'user')
    setInput('')

    // placeholder bot message we will update
    appendMessage('', 'bot')
    setLoading(true)

    try {
      const recentMessages = messages
        .filter(m => m.text)
        .map(m => ({ role: m.cls === 'user' ? 'user' : 'assistant', content: m.text }))

      recentMessages.push({ role: 'user', content })

      const payload = { messages: recentMessages }

      const res = await apiPost(payload)

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody?.message || `AI API returned ${res.status}`)
      }

      // If streaming body available, read it
      if (res.body && res.body.getReader) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let done = false
        let acc = ''

        while (!done) {
          const { value, done: d } = await reader.read()
          done = d
          if (value) {
            const chunk = decoder.decode(value, { stream: true })
            acc += chunk
            // Update last bot message with progressive text
            setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, text: acc } : m))
          }
        }

        // finished streaming — ensure final text is present
        if (acc) {
          setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, text: acc, cls: 'bot' } : m))
        }
      } else {
        // non-streaming JSON response
        const data = await res.json()
        console.log('ChatWidget: Full API response:', data) // Debug log
        
        // More robust response parsing
        let replyText = ''
        
        if (data?.choices?.[0]?.message?.content) {
          replyText = data.choices[0].message.content
        } else if (data?.choices?.[0]?.text) {
          replyText = data.choices[0].text
        } else if (data?.message) {
          replyText = data.message
        } else if (data?.content) {
          replyText = data.content
        } else if (data?.response) {
          replyText = data.response
        } else if (typeof data === 'string') {
          replyText = data
        } else {
          // If we get raw OpenAI response, don't display it
          console.warn('ChatWidget: Unexpected response format, showing fallback message')
          replyText = "I'm sorry, I couldn't process that response properly."
        }
        
        console.log('ChatWidget: Extracted reply text:', replyText) // Debug log
        const finalReply = (replyText && String(replyText).trim()) || "I'm sorry, I couldn't generate a reply."
        console.log('ChatWidget: Final reply to show:', finalReply) // Debug log
        
        // Temporary debug alert to ensure this code is running
        if (finalReply.includes('{') || finalReply.includes('provider')) {
          alert('DEBUG: Raw JSON detected in finalReply: ' + finalReply.substring(0, 100))
        }
        
        setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, text: finalReply, cls: 'bot' } : m))
      }
    } catch (err) {
      console.error('Chat widget error:', err)
      
      // Don't display raw error objects, show user-friendly message
      let errorMessage = 'Sorry, something went wrong. Please try again.'
      
      if (err.message && typeof err.message === 'string' && !err.message.includes('{')) {
        errorMessage = 'Error: ' + err.message
      }
      
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, text: errorMessage, cls: 'bot' } : m))
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage()
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
              <div className="rs-empty">Ask me anything about Rider Saathi — features, navigation, or emergency assistance.</div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`rs-msg ${m.cls === 'user' ? 'user' : 'bot'}`}>
                {m.text}
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
            <button className="rs-send" onClick={sendMessage} disabled={loading || !input.trim()}>
              {loading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ChatWidget
