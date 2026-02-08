import React from 'react'

const TechStack = () => {
  const techStack = [
    {
      name: 'React + Vite',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="currentColor" strokeWidth="1.5" />
          <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="currentColor" strokeWidth="1.5" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke="currentColor" strokeWidth="1.5" transform="rotate(120 12 12)" />
        </svg>
      ),
      color: 'text-cyan-500'
    },
    {
      name: 'Tailwind CSS',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
          <path d="M12 6C9.33 6 7.67 7.33 7 10C8 8.67 9.17 8.17 10.5 8.5C11.26 8.68 11.81 9.24 12.41 9.85C13.39 10.85 14.5 12 17 12C19.67 12 21.33 10.67 22 8C21 9.33 19.83 9.83 18.5 9.5C17.74 9.32 17.19 8.76 16.59 8.15C15.61 7.15 14.5 6 12 6ZM7 12C4.33 12 2.67 13.33 2 16C3 14.67 4.17 14.17 5.5 14.5C6.26 14.68 6.81 15.24 7.41 15.85C8.39 16.85 9.5 18 12 18C14.67 18 16.33 16.67 17 14C16 15.33 14.83 15.83 13.5 15.5C12.74 15.32 12.19 14.76 11.59 14.15C10.61 13.15 9.5 12 7 12Z" fill="currentColor" />
        </svg>
      ),
      color: 'text-sky-500'
    },
    {
      name: 'Node.js',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
          <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M12 12V22" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 7L12 12L21 7" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
      color: 'text-green-500'
    },
    {
      name: 'Socket.io',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <path d="M12 2V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 19V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M4.22 4.22L6.34 6.34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M17.66 17.66L19.78 19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      color: 'text-purple-500'
    },
    {
      name: 'OpenStreetMap',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
          <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="10" r="3" fill="currentColor" />
        </svg>
      ),
      color: 'text-orange-500'
    },
    {
      name: 'Weather API',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
          <path d="M7 18C4.79 18 3 16.21 3 14C3 12.17 4.21 10.59 5.91 10.14C6.33 7.19 8.9 5 12 5C15.31 5 18 7.69 18 11V11.17C19.72 11.6 21 13.13 21 15C21 17.21 19.21 19 17 19H7Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="12" cy="9" r="2" fill="currentColor" />
        </svg>
      ),
      color: 'text-blue-400'
    },
    {
      name: 'Supabase',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
          <path d="M13 3L4 14H11L11 21L20 10H13L13 3Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      ),
      color: 'text-emerald-500'
    },
    {
      name: 'MongoDB',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
          <path d="M12 3L4 7V17L12 21L20 17V7L12 3Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 3V21" stroke="currentColor" strokeWidth="1.5" />
          <ellipse cx="12" cy="12" rx="5" ry="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      ),
      color: 'text-green-600'
    },
    {
      name: 'Render',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M8 8H16V16H8V8Z" fill="currentColor" />
          <circle cx="12" cy="12" r="2" fill="white" className="dark:fill-slate-900" />
        </svg>
      ),
      color: 'text-violet-500'
    },
    {
      name: 'Vercel',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
          <path d="M12 3L3 21H21L12 3Z" fill="currentColor" />
        </svg>
      ),
      color: 'text-slate-700 dark:text-slate-300'
    }
  ]

  // Triple the tech stack for seamless infinite loop
  const extendedTechStack = [...techStack, ...techStack, ...techStack]

  return (
    <section className="relative py-12 overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(94, 234, 212, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(94, 234, 212, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'gridMove 20s linear infinite'
          }}
        />
      </div>

      {/* Floating Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-teal-500/20 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px] animate-float-delayed" />
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-sky-500/15 rounded-full blur-[80px] animate-pulse" />
      </div>

      {/* Animated Scan Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div 
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent"
          style={{
            top: '20%',
            animation: 'scanLine 6s ease-in-out infinite'
          }}
        />
        <div 
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-400 to-transparent"
          style={{
            top: '60%',
            animation: 'scanLine 8s ease-in-out infinite',
            animationDelay: '2s'
          }}
        />
      </div>

      {/* Radial Gradient Waves */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-teal-400/10 animate-wave" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-sky-400/10 animate-wave" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-purple-400/10 animate-wave" style={{ animationDelay: '2s' }} />
      </div>

      {/* Background overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/20 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 backdrop-blur-md border border-cyan-500/20 mb-3">
            <span className="text-cyan-400 text-xs font-semibold uppercase tracking-wider">Technology Stack</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Built on Modern Infrastructure</h2>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">Production-grade technologies powering real-time safety</p>
        </div>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-900/80 dark:from-slate-950/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-900/80 dark:from-slate-950/80 to-transparent z-10 pointer-events-none" />
          
          <div className="overflow-hidden py-8">
            <ul className="flex gap-16 items-center animate-scroll-infinite">
              {extendedTechStack.map((tech, index) => (
                <li key={`${tech.name}-${index}`} className="flex-shrink-0 flex flex-col items-center gap-3 group cursor-default" style={{ width: '180px' }}>
                  <div className={`p-6 rounded-2xl bg-slate-800/60 backdrop-blur-xl shadow-lg shadow-slate-900/50 border border-slate-700/50 transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-teal-500/20 ${tech.color}`}>
                    {tech.icon}
                  </div>
                  <span className="text-sm font-semibold text-slate-300 text-center">{tech.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TechStack