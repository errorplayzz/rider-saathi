import React from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/Rider-saathi-logo.jpeg'

export default function Footer() {
  return (
    <footer className="relative transition-colors duration-300 overflow-hidden">
      {/* Animated Grid Background - consistent with site */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(94, 234, 212, 0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(94, 234, 212, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'gridMove 25s linear infinite'
          }}
        />
      </div>

      {/* Floating Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-teal-500/10 rounded-full blur-[100px] animate-float" />
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] animate-float-delayed" />
      </div>

      {/* Smooth gradient transition from content */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent pointer-events-none z-10" />

      <div className="py-12 transition-colors duration-300 relative z-10" style={{ backgroundColor: 'rgba(18, 18, 26, 0.8)', backdropFilter: 'blur(10px)' }}>
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Brand */}
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Rider Saathi" className="h-12 w-12 rounded-full object-cover ring-2" style={{ ringColor: 'var(--border-color)' }} />
              <div>
                <div className="font-semibold text-lg transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>Rider Saathi</div>
                <div className="text-sm transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>Making rides safer</div>
              </div>
            </div>
            <p className="mt-4 text-sm max-w-sm transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>Rider Saathi combines GPS tracking, emergency alerts, AI navigation and real-time communication — designed for riders who value safety and control.</p>
            <div className="flex gap-3 mt-4">
              {/* Social icons */}
              <a href="https://instagram.com/YOUR_INSTAGRAM_HANDLE" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="p-2 rounded-md transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <svg className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 6.2A3.8 3.8 0 1 0 15.8 12 3.8 3.8 0 0 0 12 8.2zM18.5 6.1a1.1 1.1 0 1 0 1.1 1.1 1.1 1.1 0 0 0-1.1-1.1z" /></svg>
              </a>

              {/* YouTube */}
              <a href="https://youtu.be/jhhElAydbMc" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="p-2 rounded-md transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <svg className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M23.5 6.2a2.8 2.8 0 0 0-1.96-2C19.86 3.5 12 3.5 12 3.5s-7.86 0-9.54.7A2.8 2.8 0 0 0 .5 6.2 29.3 29.3 0 0 0 0 12a29.3 29.3 0 0 0 .5 5.8 2.8 2.8 0 0 0 1.96 2c1.68.7 9.54.7 9.54.7s7.86 0 9.54-.7a2.8 2.8 0 0 0 1.96-2A29.3 29.3 0 0 0 24 12a29.3 29.3 0 0 0-.5-5.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col">
            <h4 className="font-semibold mb-3 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>Quick Links</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/" className="transition-colors duration-300 hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>Home</Link>
              <a href="/#features" className="transition-colors duration-300 hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>Features</a>
              <Link to="/dashboard" className="transition-colors duration-300 hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>Dashboard</Link>
              <Link to="/team" className="transition-colors duration-300 hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>Team</Link>
              <a href="/contact" className="transition-colors duration-300 hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>Contact</a>
            </nav>
          </div>

          {/* Newsletter */}
          <div className="flex flex-col">
            <h4 className="font-semibold mb-3 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>Stay in the loop</h4>
            <p className="text-sm mb-4 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>Subscribe for updates, safety tips and feature launches.</p>
            <form className="flex items-center gap-2">
              <input type="email" placeholder="Your email" className="flex-1 px-4 py-2 rounded-md border focus:outline-none focus:ring-2 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
              <button className="px-4 py-2 rounded-md font-semibold transition-colors duration-300" style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}>Subscribe</button>
            </form>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 mt-10">
          <div className="border-t pt-6 text-center text-sm transition-colors duration-300" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>© 2025 Rider Saathi. Developed with ❤️ by Team Errorist.</div>
        </div>
      </div>
    </footer>
  )
}

