import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const coreTeam = [
  {
    id: 1,
    name: 'Raunak Kumar Singh',
    shortName: 'Raunak',
    role: 'Core Team Member',
    image: '/team/raunak-kumar.jpeg',
    imagePosition: 'object-center',
    links: [
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/raunak-kumar-singh-8038152b0/' },
      { label: 'GitHub', url: 'https://github.com/raunakk942-lab' }
    ]
  },
  {
    id: 2,
    name: 'Sumit Prajapati',
    shortName: 'Sumit',
    role: 'Core Team Member',
    image: '/team/sumit.jpeg',
    imagePosition: 'object-top', 
    links: [
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/sumitprajapati2468/' },
      { label: 'GitHub', url: 'https://github.com/sumitprajapati2468-code' }
    ]
  },
  {
    id: 3,
    name: 'Shashank Mahariya',
    shortName: 'Shashank',
    role: 'Core Team Member',
    image: '/team/shashank.jpeg',
    imagePosition: 'object-center', 
    links: [
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/shashank-mahariya/' },
      { label: 'GitHub', url: 'https://github.com/errorplayzz/' }
    ]
  },
  {
    id: 4,
    name: 'Kumar Daksha Singh',
    shortName: 'Daksha',
    role: 'Core Team Member',
    image: '/team/kumar-daksha.jpeg',
    imagePosition: 'object-[50%_35%]', 
    links: [
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/kumar-daksha-singh-19700437a/' },
      { label: 'GitHub', url: 'https://github.com/singhdaksha10-art/' }
    ]
  },
  {
    id: 5,
    name: 'Nirdesh khanna',
    shortName: 'Nirdesh',
    role: 'Core Team Member',
    image: '/team/khanna.jpeg',
    imagePosition: 'object-top',
    links: [
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/nirdesh-khanna-9b231530b/' },
      { label: 'GitHub', url: 'https://github.com/khannanirdesh-0408/' }
    ]
  },
  {
    id: 6,
    name: 'Aarushi Jaiswal',
    shortName: 'Aarushi',
    role: 'Core Team Member',
    image: '/team/arushi.jpeg',
    imagePosition: 'object-[50%_35%]', 
    links: [
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/aarushi-09-jaiswal/' },
      { label: 'GitHub', url: 'https://github.com/aarushi09jaiswal-coder' }
    ]
  }
];

const Team = () => {
  // Start with the first member hovered for a great initial state
  const [hoveredIndex, setHoveredIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const resumeTimeoutRef = useRef(null);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setHoveredIndex((prev) => (prev + 1) % coreTeam.length);
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handleGalleryEnter = () => {
    setIsAutoPlaying(false);
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }
  };

  const handleGalleryLeave = () => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }
    // Wait 2 seconds before resuming auto-play
    resumeTimeoutRef.current = setTimeout(() => {
      setIsAutoPlaying(true);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F7] selection:bg-[#B08968] selection:text-[#050505] overflow-x-hidden">
      
      {/* Hero Section: Interactive Expandable Accordion */}
      <section className="relative pt-32 pb-12 px-4 flex flex-col items-center justify-center min-h-screen">
        
        {/* Back to Home Link (Top Left) */}
        <Link
          to="/"
          className="absolute top-28 left-4 md:left-8 lg:left-12 inline-flex items-center gap-2 text-sm font-medium text-[#86868B] hover:text-[#B08968] transition-colors z-50"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-8 max-w-4xl relative z-20"
        >
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Meet <span className="text-[#B08968]">Team Errorist</span>
          </h1>
          <p className="text-base md:text-lg text-[#86868B] leading-relaxed max-w-2xl mx-auto px-4">
            A diverse group of passionate professionals, each bringing unique skills and experiences to drive innovation and excellence in Rider Saathi's mission-critical safety infrastructure.
          </p>
        </motion.div>

        {/* Expandable Hover Gallery (The "Clean & Mast" Approach) */}
        <div 
          className="w-full max-w-[1400px] mx-auto h-[50vh] min-h-[350px] max-h-[550px] flex gap-2 md:gap-4 px-2 md:px-8"
          onMouseEnter={handleGalleryEnter}
          onMouseLeave={handleGalleryLeave}
        >
          {coreTeam.map((member, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <motion.div
                key={`accordion-${member.id}`}
                className="relative overflow-hidden rounded-3xl cursor-pointer group"
                animate={{
                  flex: isHovered ? 4 : 1,
                }}
                transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
                onHoverStart={() => setHoveredIndex(i)}
                onClick={() => setHoveredIndex(i)}
              >
                {/* Background Image */}
                <motion.img 
                  src={member.image}
                  alt={member.name}
                  className={`absolute inset-0 w-full h-full object-cover filter contrast-110 ${member.imagePosition || 'object-center'}`}
                  animate={{
                    scale: isHovered ? 1.05 : 1,
                    filter: isHovered ? "grayscale(0%)" : "grayscale(50%)"
                  }}
                  transition={{ duration: 0.7 }}
                />

                {/* Dark Gradient Overlay */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-t transition-opacity duration-700 ${
                    isHovered 
                      ? 'from-[#050505]/90 via-[#050505]/20 to-transparent opacity-100' 
                      : 'from-[#050505]/60 to-transparent opacity-80'
                  }`} 
                />

                {/* Vertical Name (Visible when collapsed) */}
                <AnimatePresence>
                  {!isHovered && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <span className="text-[#F5F5F7]/80 font-bold tracking-widest uppercase text-xs md:text-sm -rotate-90 whitespace-nowrap">
                        {member.shortName || member.name.split(' ')[0]}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Expanded Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 flex flex-col justify-end pointer-events-none">
                  <motion.div
                    animate={{
                      opacity: isHovered ? 1 : 0,
                      y: isHovered ? 0 : 30
                    }}
                    transition={{ duration: 0.5, delay: isHovered ? 0.2 : 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    <h3 className="text-2xl md:text-4xl font-bold text-[#F5F5F7] mb-2 drop-shadow-lg">
                      {member.name}
                    </h3>
                    <p className="text-[#B08968] font-semibold tracking-wider uppercase text-xs md:text-sm drop-shadow-md mb-4">
                      {member.role}
                    </p>

                    {/* Social Links */}
                    {member.links && (
                      <div className="flex gap-4 pointer-events-auto">
                        {member.links.map((link) => (
                          <a
                            key={link.label}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#F5F5F7]/70 hover:text-[#F5F5F7] hover:scale-110 transition-all duration-300 drop-shadow-lg"
                          >
                            {link.label === 'LinkedIn' && (
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                            )}
                            {link.label === 'GitHub' && (
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Team;
