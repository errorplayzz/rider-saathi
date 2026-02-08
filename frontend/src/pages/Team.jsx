import { useMemo, useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import AnimatedBackground from '../components/AnimatedBackground';
import Footer from '../components/Footer';

/**
 * COMMAND TIMELINE - Professional Core Team Section
 * 
 * Design Concept:
 * - Vertical command-style timeline with alternating left/right nodes
 * - Each node represents ONE core team member
 * - Scroll-based reveal animations (no bounce, no elastic)
 * - Mission-control aesthetic for safety-tech platform
 * 
 * Photo Treatment (CRITICAL):
 * - DEFAULT: grayscale/desaturated (grayscale(100%))
 * - HOVER/ACTIVE: full color (grayscale(0%))
 * - Smooth transition (400ms)
 * - Subtle accent ring on active
 * 
 * Timeline Structure:
 * - Center vertical line with subtle glow
 * - Nodes alternate left/right
 * - Each node: photo + name + role + bio + tech chips
 * - Active item visually emphasized
 * 
 * Accessibility:
 * - prefers-reduced-motion respected
 * - Keyboard navigation friendly
 * - Mobile: single column, same grayscale→color on tap
 */

const Team = () => {
  const { isDark } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const particles = useMemo(() => (
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 6 + Math.random() * 8,
      delay: Math.random() * 4,
      opacity: 0.2 + Math.random() * 0.4
    }))
  ), []);

  // Core team data - Mission-critical safety system operators
  const coreTeam = [
    {
      id: 1,
      name: 'Raunak Kumar Singh',
      role: 'Core Team Member',
      image: '/team/raunak-kumar.jpeg',
      links: [
        { label: '🔗 LinkedIn', url: 'https://www.linkedin.com/in/raunak-kumar-singh-8038152b0/' },
        { label: '💻 GitHub', url: 'https://github.com/raunakk942-lab' }
      ],
      side: 'left'
    },
    {
      id: 2,
      name: 'Sumit Prajapati',
      role: 'Core Team Member',
      image: '/team/sumit.jpeg',
      links: [
        { label: '🔗 LinkedIn', url: 'https://www.linkedin.com/in/sumitprajapati2468/' },
        { label: '💻 GitHub', url: 'https://github.com/sumitprajapati2468-code' }
      ],
      side: 'right'
    },
    {
      id: 3,
      name: 'Shashank Mahariya',
      role: 'Core Team Member',
      image: '/team/shashank.jpeg',
      links: [
        { label: '🔗 LinkedIn', url: 'https://www.linkedin.com/in/shashank-mahariya/' },
        { label: '💻 GitHub', url: 'https://github.com/errorplayzz/' }
      ],
      side: 'left'
    },
    {
      id: 4,
      name: 'Kumar Daksha Singh',
      role: 'Core Team Member',
      image: '/team/kumar-daksha.jpeg',
      links: [
        { label: '🔗 LinkedIn', url: 'https://www.linkedin.com/in/kumar-daksha-singh-19700437a/' },
        { label: '💻 GitHub', url: 'https://github.com/singhdaksha10-art/' }
      ],
      side: 'right'
    },
    {
      id: 5,
      name: 'Nirdesh khanna',
      role: 'Core Team Member',
      image: '/team/khanna.jpeg',
      links: [
        { label: '🔗 LinkedIn', url: 'https://www.linkedin.com/in/nirdesh-khanna-9b231530b/' },
        { label: '💻 GitHub', url: 'https://github.com/khannanirdesh-0408/' }
      ],
      side: 'left'
    },
    {
      id: 6,
      name: 'Mehul Adlakha',
      role: 'Core Team Member',
      image: '/team/adlakha.jpeg',
      links: [
        { label: '🔗 LinkedIn', url: 'https://www.linkedin.com/in/mehul-adlakha-2423b7362/' },
        { label: '💻 GitHub', url: 'https://github.com/MehulAdlakha' }
      ],
      side: 'right'
    },
    {
      id: 7,
      name: 'Aarushi Jaiswal',
      role: 'Core Team Member',
      image: '/team/arushi.jpeg',
      links: [
        { label: '🔗 LinkedIn', url: 'https://www.linkedin.com/in/aarushi-09-jaiswal/' },
        { label: '💻 GitHub', url: 'https://github.com/aarushi09jaiswal-coder' }
      ],
      side: 'left'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <AnimatedBackground />

      {/* Premium Particle Layer */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {particles.map((dot) => (
          <motion.span
            key={dot.id}
            className="absolute rounded-full"
            style={{
              width: dot.size,
              height: dot.size,
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              background: isDark ? 'rgba(94,234,212,0.7)' : 'rgba(59,130,246,0.35)',
              opacity: dot.opacity,
              filter: 'blur(0.2px)'
            }}
            animate={prefersReducedMotion ? {} : { y: [0, -18, 0], opacity: [dot.opacity, dot.opacity + 0.2, dot.opacity] }}
            transition={{
              duration: dot.duration,
              repeat: Infinity,
              delay: dot.delay,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-slate-50 mb-4">
              Team Errorist
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              The core team operating Rider Saathi's mission-critical safety infrastructure.
              <br />
              <span className="text-sm opacity-75">Ensuring 24/7 protection for riders across the network.</span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* Command Timeline */}
      <section className="relative z-10 py-12 px-4 pb-20">
        <div className="max-w-5xl mx-auto relative">
          {/* Center Timeline Line */}
          <div 
            className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 hidden md:block"
            style={{
              background: isDark 
                ? 'linear-gradient(to bottom, transparent, rgb(6 182 212 / 0.3), transparent)'
                : 'linear-gradient(to bottom, transparent, rgb(148 163 184 / 0.4), transparent)'
            }}
          />

          {/* Timeline Nodes */}
          <div className="space-y-16 md:space-y-24">
            {coreTeam.map((member, index) => (
              <TimelineNode
                key={member.id}
                member={member}
                index={index}
                prefersReducedMotion={prefersReducedMotion}
                isDark={isDark}
              />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

/**
 * TimelineNode Component
 * 
 * Renders individual team member on the timeline.
 * Handles:
 * - Scroll-based reveal animation
 * - Grayscale → Color transition on hover
 * - Left/Right alternating layout
 * - Mobile responsive (single column)
 */
const TimelineNode = ({ member, index, prefersReducedMotion, isDark }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { 
    once: true, 
    margin: "-100px",
    amount: 0.3 
  });

  // Determine layout direction (alternating left/right)
  const isLeft = member.side === 'left';
  
  // Animation variants for timeline item reveal
  const nodeVariants = {
    hidden: {
      opacity: 0,
      x: prefersReducedMotion ? 0 : (isLeft ? -40 : 40),
      y: prefersReducedMotion ? 0 : 20
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 0.7,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: prefersReducedMotion ? 0 : index * 0.15
      }
    }
  };

  return (
    <motion.div
      ref={ref}
      variants={nodeVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={`relative flex items-center ${
        isLeft 
          ? 'md:justify-start md:pr-[50%]' 
          : 'md:justify-end md:pl-[50%]'
      }`}
    >
      {/* Timeline Node Connector (Desktop Only) */}
      <div className="hidden md:block absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10">
        <div className="w-4 h-4 rounded-full border-2 border-cyan-500 dark:border-cyan-400 bg-white dark:bg-slate-900 shadow-lg">
          <div className="w-full h-full rounded-full bg-cyan-500/20 dark:bg-cyan-400/20 animate-pulse" />
        </div>
      </div>

      {/* Team Member Card */}
      <div 
        className={`group relative w-full md:w-auto ${
          isLeft ? 'md:mr-12' : 'md:ml-12'
        }`}
      >
        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-500">
          
          {/* Photo Container - GRAYSCALE → COLOR on hover */}
          <div className="relative flex-shrink-0">
            {/* Accent Ring (visible on hover) */}
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-400" />
            
            {/* Photo with grayscale filter */}
            <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden ring-2 ring-slate-200 dark:ring-slate-700 group-hover:ring-cyan-400 dark:group-hover:ring-cyan-500 transition-all duration-400">
              <img
                src={member.image}
                alt={member.name}
                className="w-full h-full object-cover transition-all duration-400 grayscale group-hover:grayscale-0 group-hover:scale-105"
                style={{
                  filter: 'contrast(0.95)'
                }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 text-center md:text-left space-y-3">
            {/* Role Badge */}
            <div className="inline-block">
              <span className="px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800">
                {member.role}
              </span>
            </div>

            {/* Name */}
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              {member.name}
            </h3>

            {/* Links */}
            {member.links && (
              <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
                {member.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan-700 dark:hover:text-cyan-300 hover:border-cyan-300 dark:hover:border-cyan-700 transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Connecting Line to Timeline (Desktop Only) */}
        <div 
          className={`hidden md:block absolute top-1/2 -translate-y-1/2 w-12 h-px bg-gradient-to-r ${
            isLeft 
              ? 'right-0 translate-x-full from-slate-300 dark:from-slate-700 to-transparent' 
              : 'left-0 -translate-x-full from-transparent to-slate-300 dark:to-slate-700'
          }`}
        />
      </div>
    </motion.div>
  );
};

export default Team;
