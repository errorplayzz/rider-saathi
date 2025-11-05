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
    setMessages(prev => [...prev, { text, cls }])
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
        const replyText = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || data?.responses?.[0] || data?.message || data?.output || (typeof data === 'string' ? data : null)
        const finalReply = (replyText && String(replyText)) || "I'm sorry, I couldn't generate a reply."
        setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, text: finalReply, cls: 'bot' } : m))
      }
    } catch (err) {
      console.error('Chat widget error:', err)
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, text: 'Error: ' + (err.message || 'unknown'), cls: 'bot' } : m))
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
