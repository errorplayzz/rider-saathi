import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'

const ChatWidget = () => {
  const { session } = useAuth()
  const { isDark } = useTheme()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
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

  const addMessage = (text, isUser = false, isSystem = false) => {
    let cleanText = ''
    if (typeof text === 'string') {
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
      isSystem,
      id: Date.now() + Math.random()
    }])
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

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data = await response.json()
      let botReply = data?.choices?.[0]?.message?.content || "Sorry, I couldn't process your request properly."
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

  // Theme-aware styles with enhanced glass effect
  const styles = {
    panel: isDark ? {
      background: 'linear-gradient(135deg, rgba(15,23,42,0.7) 0%, rgba(30,41,59,0.8) 50%, rgba(15,23,42,0.75) 100%)',
      borderColor: 'rgba(6,182,212,0.3)',
      boxShadow: `
        0 25px 50px -12px rgba(0,0,0,0.6),
        0 0 0 1px rgba(6,182,212,0.15),
        inset 0 1px 0 rgba(255,255,255,0.1),
        inset 0 -1px 0 rgba(6,182,212,0.05)
      `
    } : {
      background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(241,245,249,0.8) 50%, rgba(255,255,255,0.75) 100%)',
      borderColor: 'rgba(59,130,246,0.3)',
      boxShadow: `
        0 25px 50px -12px rgba(0,0,0,0.2),
        0 0 0 1px rgba(59,130,246,0.15),
        inset 0 1px 0 rgba(255,255,255,0.4),
        inset 0 -1px 0 rgba(59,130,246,0.05)
      `
    },
    headerBg: isDark ? 'rgba(6,182,212,0.08)' : 'rgba(59,130,246,0.08)',
    textPrimary: isDark ? '#f1f5f9' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    inputBg: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
    inputBorder: isDark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.35)',
    userMsg: isDark
      ? 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(59,130,246,0.1) 100%)'
      : 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(99,102,241,0.1) 100%)',
    botMsg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
    accent: isDark ? '#06b6d4' : '#3b82f6'
  }

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-5 right-5 z-[60] w-14 h-14 rounded-2xl flex items-center justify-center cursor-pointer"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(30,41,59,0.85) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(241,245,249,0.85) 100%)',
          border: `1px solid ${styles.accent}30`,
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(6,182,212,0.15), inset 0 1px 0 rgba(255,255,255,0.1)'
            : '0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.3)'
        }}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open Rider Saathi AI Assistant"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={styles.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10a10 10 0 0 1-10-10C2 6.477 6.477 2 12 2z" />
          <circle cx="8" cy="10" r="1" fill={styles.accent} />
          <circle cx="16" cy="10" r="1" fill={styles.accent} />
          <path d="M9 15c.83.67 1.83 1 3 1s2.17-.33 3-1" />
        </svg>

        {/* Pulse indicator */}
        <span
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
          style={{
            background: '#10b981',
            boxShadow: '0 0 0 2px ' + (isDark ? '#0f172a' : '#fff')
          }}
        />
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={containerRef}
            className="fixed bottom-24 right-5 w-[380px] max-w-[calc(100vw-40px)] rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            style={{
              height: '520px',
              // Navbar (64px) + Bottom Offset (96px) + Safety Gap (20px) = 180px
              maxHeight: 'calc(100vh - 180px)',
              zIndex: 40, // Well below Navbar (z-100)
              ...styles.panel,
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: `1px solid ${styles.panel.borderColor}`
            }}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{
                background: `linear-gradient(135deg, ${styles.headerBg}, rgba(255,255,255,${isDark ? '0.02' : '0.1'}))`,
                borderBottom: `1px solid ${isDark ? 'rgba(6,182,212,0.1)' : 'rgba(59,130,246,0.1)'}`,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)'
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: '#10b981',
                    boxShadow: '0 0 8px rgba(16,185,129,0.6)'
                  }}
                />
                <div>
                  <h3
                    className="font-semibold text-sm tracking-wide"
                    style={{ color: styles.textPrimary }}
                  >
                    Rider Saathi — AI Assistant
                  </h3>
                  <span
                    className="text-xs"
                    style={{ color: styles.textSecondary }}
                  >
                    Online • Ready to assist
                  </span>
                </div>
              </div>
              <motion.button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  color: styles.textSecondary
                }}
                whileHover={{ scale: 1.1, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
                whileTap={{ scale: 0.9 }}
                aria-label="Close chat"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 1l12 12M13 1L1 13" />
                </svg>
              </motion.button>
            </div>

            {/* Messages */}
            <div
              ref={chatRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
              role="log"
              aria-live="polite"
            >
              {messages.length === 0 && (
                <div
                  className="text-center py-8"
                  style={{ color: styles.textSecondary }}
                >
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: `${styles.accent}15` }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={styles.accent} strokeWidth="1.5">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium" style={{ color: styles.textPrimary }}>
                    How can I assist you today?
                  </p>
                  <p className="text-xs mt-1">
                    Ask about safety, navigation, or emergencies
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.isSystem ? 'font-mono text-xs' : ''
                      }`}
                    style={{
                      background: msg.isUser ? styles.userMsg : styles.botMsg,
                      color: styles.textPrimary,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                      borderRadius: msg.isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px'
                    }}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <motion.div
                  className="flex justify-start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div
                    className="px-4 py-3 rounded-2xl flex items-center gap-1"
                    style={{ background: styles.botMsg, border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}
                  >
                    <span className="text-xs font-medium mr-2" style={{ color: styles.textSecondary }}>
                      Analyzing
                    </span>
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: styles.accent }}
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input area */}
            <div
              className="px-4 py-3"
              style={{
                borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                background: styles.headerBg
              }}
            >
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-200"
                style={{
                  background: styles.inputBg,
                  border: `1px solid ${styles.inputBorder}`,
                  boxShadow: 'none'
                }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Ask Rider Saathi…"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{
                    color: styles.textPrimary,
                    outline: 'none',
                    outlineOffset: 0,
                    boxShadow: 'none'
                  }}
                />
                <motion.button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity"
                  style={{
                    background: `linear-gradient(135deg, ${styles.accent}, ${isDark ? '#0891b2' : '#2563eb'})`,
                    opacity: loading || !input.trim() ? 0.5 : 1
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2L7 9" />
                    <path d="M14 2l-5 12-2-5-5-2 12-5z" />
                  </svg>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default ChatWidget