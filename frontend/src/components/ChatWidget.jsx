import React, { useEffect, useRef, useState, useLayoutEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import gsap from 'gsap'

const ChatWidget = () => {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRendered, setIsRendered] = useState(false)

  const chatRef = useRef(null)
  const pulseRef = useRef(null)
  const widgetRef = useRef(null)
  const chipsRef = useRef([])

  // Close on outside click
  useEffect(() => {
    const onClickOutside = (e) => {
      if (!open) return
      if (widgetRef.current && !widgetRef.current.contains(e.target) && !e.target.closest('#ai-open-btn')) {
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

  // GSAP Animations
  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      // Pulse animation for open button (Breathing glow every 5 seconds)
      if (pulseRef.current) {
        gsap.to(pulseRef.current, {
          scale: 1.4,
          opacity: 0,
          duration: 2,
          repeat: -1,
          repeatDelay: 3,
          ease: 'power2.out'
        })
      }
    })
    return () => ctx.revert()
  }, [])

  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      if (open) {
        setIsRendered(true)
        gsap.fromTo(widgetRef.current,
          { scale: 0.94, opacity: 0, y: 20, display: 'flex' },
          { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }
        )

        // Suggestion chips stagger
        if (messages.length === 0 && chipsRef.current.length > 0) {
          gsap.fromTo(chipsRef.current,
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, delay: 0.15, ease: 'power2.out' }
          )
        }
      } else if (!open && isRendered) {
        gsap.to(widgetRef.current, {
          scale: 0.94, opacity: 0, y: 20, duration: 0.3, ease: 'power2.in',
          onComplete: () => setIsRendered(false)
        })
      }
    })
    return () => ctx.revert()
  }, [open, messages.length])

  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      if (loading) {
        gsap.to('.typing-dot', {
          y: -4,
          opacity: 0.4,
          duration: 0.4,
          stagger: 0.15,
          yoyo: true,
          repeat: -1,
          ease: 'power1.inOut'
        })
      }
    }, chatRef)
    return () => ctx.revert()
  }, [loading])

  const addMessage = (text, isUser = false) => {
    setMessages(prev => [...prev, { text, isUser, id: Date.now() + Math.random() }])
  }

  const handleSuggestion = (text) => {
    setInput(text)
  }

  const sendMessage = async () => {
    const userMessage = input.trim()
    if (!userMessage) return

    addMessage(userMessage, true)
    setInput('')
    setLoading(true)

    try {
      const apiBase = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || window.location.origin
      const response = await fetch(`${apiBase}/api/ai/gpt-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })

      if (!response.ok) throw new Error(`API Error`)

      const data = await response.json()
      let botReply = data?.choices?.[0]?.message?.content || "I couldn't process that properly."
      addMessage(botReply, false)
    } catch (error) {
      addMessage("Technical difficulties. Please try again later.", false)
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

  const suggestions = ["Navigate Home", "Nearby Fuel", "Emergency SOS", "Weather Ahead"]

  return (
    <>
      {/* Floating Open Button */}
      <button
        id="ai-open-btn"
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-8 right-8 z-[60] w-[56px] h-[56px] rounded-full flex items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-105"
        style={{
          background: '#1A1A1A',
          border: '1px solid rgba(176,137,104,0.3)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
        }}
        onMouseEnter={(e) => gsap.to(e.currentTarget, { boxShadow: '0 12px 32px rgba(176,137,104,0.3)', scale: 1.06, duration: 0.3 })}
        onMouseLeave={(e) => gsap.to(e.currentTarget, { boxShadow: '0 8px 24px rgba(0,0,0,0.5)', scale: 1, duration: 0.3 })}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B08968" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 0 0-10 10v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a10 10 0 0 0-10-10z" />
          <path d="M12 14v8" />
          <path d="M8 22h8" />
        </svg>
        {/* Soft breathing glow */}
        <div
          ref={pulseRef}
          className="absolute inset-0 rounded-full border border-[#B08968] pointer-events-none"
        />
      </button>

      {/* Chat Widget Panel */}
      <div
        ref={widgetRef}
        className="fixed bottom-[104px] right-4 md:right-6 w-[calc(100%-32px)] md:w-[380px] lg:w-[420px] rounded-[28px] overflow-hidden flex-col z-[60]"
        style={{
          height: '680px',
          maxHeight: 'calc(100vh - 220px)',
          background: 'rgba(15,15,15,0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(176,137,104,0.25)',
          display: isRendered ? 'flex' : 'none',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
          transformOrigin: 'bottom right'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#B08968]/10 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center border border-[#B08968]/30 bg-[#B08968]/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B08968" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-[15px] text-white tracking-wide">Rider AI</h3>
              <p className="text-[13px] text-white/50">Ride Assistant</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        {/* Chat Area */}
        <div ref={chatRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full pb-10">
              <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 bg-[#B08968] rounded-full blur-xl opacity-20" />
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#B08968" strokeWidth="1" className="relative z-10">
                  <path d="M12 2a10 10 0 0 0-10 10v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a10 10 0 0 0-10-10z" />
                  <path d="M12 14v8" />
                  <path d="M8 22h8" />
                </svg>
              </div>
              <h4 className="text-white text-lg font-medium tracking-wide mb-2">Ready for your next ride.</h4>
              <div className="flex gap-2 mb-8">
                {['Navigation', 'Safety', 'Emergency', 'Community'].map((tag) => (
                  <span key={tag} className="text-[11px] px-3 py-1 rounded-full border border-white/10 text-white/60 bg-white/5">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Suggestion Chips */}
              <div className="w-full flex flex-col gap-2 px-2">
                {suggestions.map((s, i) => (
                  <button
                    key={s}
                    ref={el => chipsRef.current[i] = el}
                    onClick={() => handleSuggestion(s)}
                    className="w-full text-left px-5 py-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#B08968]/30 transition-colors text-[14px] text-white/80"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] px-5 py-3.5 text-[14px] leading-relaxed rounded-[22px] shadow-sm`}
                style={{
                  background: msg.isUser ? 'rgba(176,137,104,0.15)' : 'rgba(35,35,35,0.8)',
                  color: msg.isUser ? '#ffffff' : 'rgba(255,255,255,0.9)',
                  border: `1px solid ${msg.isUser ? 'rgba(176,137,104,0.3)' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: msg.isUser ? '22px 22px 6px 22px' : '22px 22px 22px 6px'
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="px-5 py-4 rounded-[22px] rounded-bl-[6px] bg-[#232323]/80 border border-white/5 flex items-center gap-1.5 h-[42px]">
                <div className="flex gap-1.5 items-center">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="typing-dot w-1.5 h-1.5 rounded-full bg-[#B08968]"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="px-6 py-5 bg-black/40 border-t border-[#B08968]/10">
          <div className="h-[60px] flex items-center gap-3 rounded-full px-5 bg-white/5 border border-white/10 focus-within:border-[#B08968]/40 focus-within:bg-white/10 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about your ride..."
              className="flex-1 bg-transparent border-none outline-none text-[15px] text-white placeholder-white/40 h-full"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #B08968, #8c6a4e)',
              }}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ChatWidget