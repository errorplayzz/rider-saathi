import React, { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { 
  HeartIcon, 
  Squares2X2Icon, 
  ScaleIcon, 
  AtSymbolIcon, 
  ArrowUpIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

export default function Footer() {
  const containerRef = useRef(null)
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end end"]
  })

  // Parallax effects
  const textY = useTransform(scrollYProgress, [0, 1], [100, 0])
  const textOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0.5, 1])
  
  const cardY = useTransform(scrollYProgress, [0, 1], [150, 0])
  const cardOpacity = useTransform(scrollYProgress, [0, 0.3, 1], [0, 1, 1])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }

  return (
    <footer ref={containerRef} className="relative w-full overflow-hidden selection:bg-[#B08968] selection:text-black">
      {/* Giant Background Text with Parallax */}
      <motion.div 
        style={{ y: textY, opacity: textOpacity }}
        className="relative pt-8 flex justify-center pointer-events-none select-none overflow-hidden"
      >
        <h1 
          className="text-[21vw] md:text-[22vw] font-black leading-none whitespace-nowrap lowercase text-transparent bg-clip-text bg-gradient-to-b from-[#2e2e2e] to-[#000000]"
          style={{ letterSpacing: '-0.06em' }}
        >
          ridersaathi
        </h1>
      </motion.div>

      {/* Main Footer Container with Parallax */}
      <motion.div 
        style={{ y: cardY, opacity: cardOpacity }}
        className="relative z-10 bg-[#0a0a0a] rounded-t-[2.5rem] md:rounded-t-[3.5rem] px-8 py-16 md:px-12 lg:px-20 -mt-16 md:-mt-28 lg:-mt-32 border-t border-white/5 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]"
      >
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          
          {/* Column 1: Call to Action */}
          <div className="lg:col-span-1 flex flex-col items-start">
            <SparklesIcon className="w-5 h-5 text-[#B08968] mb-6" />
            <h3 className="text-[#F5F5F7] text-sm md:text-base font-medium mb-4 leading-snug">
              Want to make sure we're the right fit? Book a discovery call!
            </h3>
            <p className="text-[#86868B] text-xs mb-8 leading-relaxed">
              Find out how you can up your safety game, forever.
            </p>
            <Link to="/dashboard" className="w-fit inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#B08968] text-[#050505] font-semibold hover:bg-[#c39b7a] transition-all duration-300 mb-4 text-xs">
              Try It Now →
            </Link>
            <a href="/#features" className="w-fit inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-white/10 text-[#F5F5F7] hover:border-[#B08968] hover:text-[#B08968] transition-all duration-300 text-xs">
              Explore Features
            </a>
          </div>

          {/* Column 2: Navigation */}
          <div className="flex flex-col">
            <Squares2X2Icon className="w-5 h-5 text-[#B08968] mb-6" />
            <h4 className="text-[#F5F5F7] font-medium mb-6 text-xs">Navigation</h4>
            <nav className="flex flex-col gap-3">
              <Link to="/" className="text-[#86868B] text-xs hover:text-[#F5F5F7] transition-colors">Home</Link>
              <Link to="/dashboard" className="text-[#86868B] text-xs hover:text-[#F5F5F7] transition-colors">Dashboard</Link>
              <a href="/#safety-section" className="text-[#86868B] text-xs hover:text-[#F5F5F7] transition-colors">Safety First</a>
            </nav>
          </div>

          {/* Column 3: Legal Info */}
          <div className="flex flex-col">
            <ScaleIcon className="w-5 h-5 text-[#B08968] mb-6" />
            <h4 className="text-[#F5F5F7] font-medium mb-6 text-xs">Legal Info</h4>
            <nav className="flex flex-col gap-3">
              <Link to="/" className="text-[#86868B] text-xs hover:text-[#F5F5F7] transition-colors">Terms & Conditions</Link>
              <Link to="/" className="text-[#86868B] text-xs hover:text-[#F5F5F7] transition-colors">Privacy Policy</Link>
            </nav>
          </div>

          {/* Column 4: Made By */}
          <div className="flex flex-col relative">
            {/* Scroll to Top Button */}
            <button 
              onClick={scrollToTop}
              className="absolute right-0 top-0 p-2.5 rounded-full border border-white/10 text-[#86868B] hover:text-[#B08968] hover:border-[#B08968] transition-all duration-300 group"
              aria-label="Scroll to top"
            >
              <ArrowUpIcon className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
            </button>

            <HeartIcon className="w-5 h-5 text-[#B08968] mb-6" />
            <h4 className="text-[#F5F5F7] font-medium mb-6 text-xs">Made by Team Errorist</h4>
            <div className="flex flex-col gap-3 mb-6">
              <Link to="/team" className="text-[#86868B] text-xs hover:text-[#F5F5F7] transition-colors">
                Meet the Team
              </Link>
            </div>
          </div>

        </div>
      </motion.div>
    </footer>
  )
}
