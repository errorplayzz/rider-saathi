import React from 'react'
import logo from '../assets/Rider-saathi-logo.jpeg'

export default function Footer() {
  return (
    <footer className="relative text-gray-300 mt-12">
      {/* Decorative wave */}
      <div className="-mt-1">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-10 md:h-16 fill-current text-[#0b1020]">
          <path d="M0,0 C150,100 350,100 600,50 C850,0 1050,0 1200,80 L1200,120 L0,120 Z"></path>
        </svg>
      </div>

      <div className="bg-gradient-to-r from-[#07121a] via-[#0b1b24] to-[#1a1420] py-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Brand */}
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Rider Saathi" className="h-12 w-12 rounded-full object-cover ring-2 ring-neon-cyan/30" />
              <div>
                <div className="text-white font-semibold text-lg">Rider Saathi</div>
                <div className="text-sm text-gray-400">Making rides safer</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-400 max-w-sm">Rider Saathi combines GPS tracking, emergency alerts, AI navigation and real-time communication — designed for riders who value safety and control.</p>
            <div className="flex gap-3 mt-4">
              {/* Social icons: keeping Instagram and adding YouTube. Replace the href placeholders with your real links. */}
              {/* Instagram: replace INSTAGRAM_LINK with your Instagram URL */}
              <a href="https://instagram.com/YOUR_INSTAGRAM_HANDLE" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="p-2 rounded-md bg-gradient-to-tr from-neon-purple/10 to-transparent hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-neon-purple" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 6.2A3.8 3.8 0 1 0 15.8 12 3.8 3.8 0 0 0 12 8.2zM18.5 6.1a1.1 1.1 0 1 0 1.1 1.1 1.1 1.1 0 0 0-1.1-1.1z"/></svg>
              </a>

              {/* YouTube: replace YOUTUBE_LINK with your YouTube channel URL */}
              <a href="https://youtu.be/jhhElAydbMc" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="p-2 rounded-md bg-gradient-to-tr from-red-600/10 to-transparent hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M23.5 6.2a2.8 2.8 0 0 0-1.96-2C19.86 3.5 12 3.5 12 3.5s-7.86 0-9.54.7A2.8 2.8 0 0 0 .5 6.2 29.3 29.3 0 0 0 0 12a29.3 29.3 0 0 0 .5 5.8 2.8 2.8 0 0 0 1.96 2c1.68.7 9.54.7 9.54.7s7.86 0 9.54-.7a2.8 2.8 0 0 0 1.96-2A29.3 29.3 0 0 0 24 12a29.3 29.3 0 0 0-.5-5.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-col">
            <h4 className="text-white font-semibold mb-3">Quick Links</h4>
            <nav className="flex flex-col gap-2">
              <a href="/" className="text-gray-300 hover:text-white transition">Home</a>
              <a href="/#features" className="text-gray-300 hover:text-white transition">Features</a>
              <a href="/dashboard" className="text-gray-300 hover:text-white transition">Dashboard</a>
              <a href="/contact" className="text-gray-300 hover:text-white transition">Contact</a>
            </nav>
          </div>

          {/* Newsletter */}
          <div className="flex flex-col">
            <h4 className="text-white font-semibold mb-3">Stay in the loop</h4>
            <p className="text-sm text-gray-400 mb-4">Subscribe for updates, safety tips and feature launches.</p>
            <form className="flex items-center gap-2">
              <input type="email" placeholder="Your email" className="flex-1 px-4 py-2 rounded-md bg-[#07121a] border border-neutral-800 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-cyan/30" />
              <button className="px-4 py-2 rounded-md bg-neon-cyan text-black font-semibold hover:brightness-110 transition">Subscribe</button>
            </form>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 mt-10">
          <div className="border-t border-neutral-800 pt-6 text-center text-sm text-gray-500">© 2025 Rider Saathi. Developed with ❤️ by Team Pseudocoders.</div>
        </div>
      </div>
    </footer>
  )
}
