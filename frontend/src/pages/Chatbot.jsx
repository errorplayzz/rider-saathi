import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'

const Chatbot = () => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatWindowRef = useRef(null)
  const navigate = useNavigate()
  const { session } = useAuth()

  // We'll call the backend proxy (/api/ai/gpt) which uses the server-side OpenAI key.
  // This avoids exposing secrets to the browser.

  const appendMessage = (text, cls) => {
    setMessages(prev => [...prev, { text, cls }])
    setTimeout(() => {
      chatWindowRef.current?.scrollTo({ top: chatWindowRef.current.scrollHeight, behavior: 'smooth' })
    }, 50)
  }

  const sendMessage = async () => {
    const content = input.trim()
    if (!content) return
    appendMessage(content, 'user')
    setInput('')
    appendMessage('… thinking', 'bot')
    setLoading(true)

    try {
      // Build payload: prefer messages array from conversation for better context
      const recentMessages = messages
        .filter(m => m.text)
        .map(m => ({ role: m.cls === 'user' ? 'user' : 'assistant', content: m.text }))

      // Ensure the last user message is included
      if (recentMessages.length === 0 || recentMessages[recentMessages.length - 1].role !== 'user') {
        recentMessages.push({ role: 'user', content })
      }

      const payload = { messages: recentMessages }

      const apiBase = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const gptUrl = `${apiBase.replace(/\/$/, '')}/api/ai/gpt`

      // Try authenticated endpoint first
      const headers = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      let res = await fetch(gptUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })

      // If unauthorized or blocked, try public testing endpoint
      if (res.status === 401) {
        const publicUrl = `${apiBase.replace(/\/$/, '')}/api/ai/gpt-public`
        res = await fetch(publicUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody?.message || `AI API returned ${res.status}`)
      }

      const data = await res.json()

      // Parse common shapes (OpenAI-like / GROQ)
      const replyText = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || data?.responses?.[0] || data?.message || data?.output || (typeof data === 'string' ? data : null)

      const finalReply = (replyText && String(replyText)) || "I'm sorry, I couldn't generate a reply."

      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { text: finalReply, cls: 'bot' } : m))
    } catch (err) {
      console.error('Chatbot error:', err.message)
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { text: 'Error: ' + (err.message || 'unknown'), cls: 'bot' } : m))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-orbitron font-bold text-neon-cyan">Rider Saathi AI Chat Bot</h1>
          <button onClick={() => navigate('/')} className="text-gray-300 hover:text-neon-cyan">← Back to Home</button>
        </div>

        <div className="card-glow p-4">
          <div ref={chatWindowRef} id="chat-window" className="h-96 overflow-auto p-4 rounded bg-dark-800 border border-gray-800">
            {messages.length === 0 && (
              <div className="text-gray-400">Ask me anything about Rider Saathi — features, navigation, emergency assistance, or how things work.</div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`mb-3 max-w-[85%] p-3 rounded ${m.cls === 'user' ? 'ml-auto bg-gradient-to-r from-neon-cyan to-neon-purple text-dark-900' : 'bg-dark-700 border border-gray-700 text-gray-200'}`}>
                {m.text}
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
              placeholder="Ask me anything about Rider Saathi..."
              className="flex-1 px-4 py-3 bg-dark-700 border border-gray-700 rounded text-white focus:outline-none"
            />
            <button onClick={sendMessage} disabled={loading} className="px-4 py-3 rounded bg-gradient-to-r from-neon-cyan to-neon-purple text-dark-900 font-semibold disabled:opacity-50">
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chatbot
