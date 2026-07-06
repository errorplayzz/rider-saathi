import React, { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useFrameLoader } from '../hooks/useFrameLoader';
import { useCanvasRenderer } from '../hooks/useCanvasRenderer';
import Footer from '../components/Footer';
import { 
  ShieldCheckIcon, 
  CpuChipIcon, 
  UserGroupIcon, 
  MapIcon,
  ArrowRightIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  SignalIcon,
  PhoneIcon,
  MapPinIcon,
  CloudIcon,
  DevicePhoneMobileIcon,
  StarIcon,
  SpeakerWaveIcon,
  PlayIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

import protectionImg from '../assets/protection image for home.png';

gsap.registerPlugin(ScrollTrigger);

const clip1Files = import.meta.glob('../assets/frame videos/clip 1 frames/*.png', { eager: true, query: '?url', import: 'default' });
const clip2Files = import.meta.glob('../assets/frame videos/clip 2 frames/*.png', { eager: true, query: '?url', import: 'default' });

const sortedUrls = [
  ...Object.keys(clip1Files).sort().map(k => clip1Files[k]),
  ...Object.keys(clip2Files).sort().map(k => clip2Files[k])
];

const NavigationMapVisual = () => {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    let ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 85%",
        }
      });

      tl.from(".map-layer", { opacity: 0, duration: 2, ease: "power2.out" })
        .from(".base-road", { opacity: 0, duration: 1, ease: "power2.out" }, "-=1");

      const pathEl = document.querySelector(".route-path");
      if (pathEl) {
        const pathLength = pathEl.getTotalLength();
        gsap.set(".route-path", { strokeDasharray: pathLength, strokeDashoffset: pathLength });
        tl.to(".route-path", { strokeDashoffset: 0, duration: 2.5, ease: "power2.inOut" }, "-=0.5");
      }

      tl.fromTo(".waypoint", 
        { opacity: 0, scale: 0, transformOrigin: "center center" }, 
        { opacity: 1, scale: 1, duration: 0.6, stagger: 0.2, ease: "back.out(1.5)" }, 
        "-=1.5"
      );

      const glowEl = document.querySelector(".route-glow");
      if (glowEl) {
        const glowLength = glowEl.getTotalLength();
        gsap.fromTo(".route-glow",
          { strokeDashoffset: glowLength },
          { strokeDashoffset: -glowLength, duration: 4, repeat: -1, ease: "none" }
        );
      }

      gsap.to(".gps-pulse", {
        scale: 2.5,
        opacity: 0,
        transformOrigin: "center center",
        duration: 3,
        repeat: -1,
        ease: "power2.out"
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden rounded-3xl opacity-80 mix-blend-screen">
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" className="w-full h-full opacity-60">
        <defs>
          <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="map-layer" stroke="#ffffff" strokeOpacity="0.04" fill="none" strokeWidth="1">
          <path d="M-100,100 Q200,50 400,150 T900,100" />
          <path d="M-100,150 Q200,100 400,200 T900,150" />
          <path d="M-100,200 Q200,150 400,250 T900,200" />
          <path d="M-100,250 Q200,200 400,300 T900,250" />
          <path d="M150,500 C300,300 500,600 700,200" />
          <path d="M200,550 C350,350 550,650 750,250" />
          <path d="M250,600 C400,400 600,700 800,300" />
          <path d="M-50,350 Q250,450 500,300 T950,400" />
          <path d="M-50,400 Q250,500 500,350 T950,450" />
        </g>

        <path className="base-road" d="M100,450 C250,450 350,250 500,250 S650,450 750,150" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="12" fill="none" strokeLinecap="round" />
        <path className="route-path" d="M100,450 C250,450 350,250 500,250 S650,450 750,150" stroke="#B08968" strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#routeGlow)" />
        <path className="route-glow" d="M100,450 C250,450 350,250 500,250 S650,450 750,150" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" style={{ strokeDasharray: "40 1000" }} filter="url(#routeGlow)" />
        
        <circle className="waypoint" cx="300" cy="350" r="4" fill="#86868B" />
        <circle className="waypoint" cx="425" cy="250" r="4" fill="#86868B" />
        <circle className="waypoint" cx="575" cy="350" r="4" fill="#86868B" />

        <g className="waypoint" transform="translate(100,450)">
          <circle className="gps-pulse" r="20" fill="#B08968" opacity="0.4" />
          <circle r="6" fill="#ffffff" />
          <circle r="2" fill="#B08968" />
        </g>
        
        <g className="waypoint" transform="translate(750,150)">
          <circle r="14" fill="#111" stroke="#B08968" strokeWidth="2" />
          <circle r="4" fill="#B08968" />
        </g>
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/80 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(17,17,17,0.8)_100%)]" />
    </div>
  );
};

const CommunityNetworkVisual = () => {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    const section = containerRef.current.closest('section');
    let ctx = gsap.context(() => {
      
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 70%",
        }
      });

      tl.from(".network-bg", { opacity: 0, duration: 2, ease: "power2.out" });

      tl.from(".network-node", { 
        opacity: 0, 
        scale: 0, 
        transformOrigin: "center", 
        duration: 0.8, 
        stagger: 0.05, 
        ease: "back.out(1.5)" 
      }, "-=1");

      const lines = gsap.utils.toArray(".network-line");
      lines.forEach(line => {
        const length = line.getTotalLength();
        gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
      });
      tl.to(".network-line", {
        strokeDashoffset: 0,
        duration: 2,
        stagger: 0.02,
        ease: "power2.inOut"
      }, "-=0.5");

      const pulses = gsap.utils.toArray(".network-pulse");
      pulses.forEach(pulse => {
        const lineClass = pulse.getAttribute("data-line");
        const lineEl = document.querySelector(`.${lineClass}`);
        if (lineEl) {
          const length = lineEl.getTotalLength();
          gsap.fromTo(pulse, 
            { strokeDashoffset: length },
            { strokeDashoffset: -length, duration: 3 + Math.random() * 2, repeat: -1, ease: "none", delay: Math.random() * 2 }
          );
        }
      });

      // Cards staggered rise
      const cards = section.querySelectorAll('.community-card');
      if (cards.length > 0) {
        gsap.fromTo(cards, 
          { y: 50, opacity: 0, filter: 'blur(10px)' },
          { 
            y: 0, opacity: 1, filter: 'blur(0px)', duration: 1, stagger: 0.2, ease: "power3.out",
            scrollTrigger: { trigger: section, start: "top 75%" }
          }
        );
      }

      // Mouse Hover Interaction
      const onMouseMove = (e) => {
        const rect = section.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 1000;
        const y = ((e.clientY - rect.top) / rect.height) * 600;
        
        gsap.to(".network-node-group", {
          opacity: (i, target) => {
            const cx = parseFloat(target.dataset.cx);
            const cy = parseFloat(target.dataset.cy);
            const dist = Math.hypot(cx - x, cy - y);
            return dist < 300 ? 1 : 0.3;
          },
          scale: (i, target) => {
            const cx = parseFloat(target.dataset.cx);
            const cy = parseFloat(target.dataset.cy);
            const dist = Math.hypot(cx - x, cy - y);
            return dist < 200 ? 1.2 : 1;
          },
          duration: 0.6,
          ease: "power2.out",
          overwrite: "auto"
        });
      };
      
      const onMouseLeave = () => {
        gsap.to(".network-node-group", {
          opacity: 0.4,
          scale: 1,
          duration: 1,
          ease: "power2.out",
          overwrite: "auto"
        });
      };
      
      section.addEventListener("mousemove", onMouseMove);
      section.addEventListener("mouseleave", onMouseLeave);
      
      return () => {
        section.removeEventListener("mousemove", onMouseMove);
        section.removeEventListener("mouseleave", onMouseLeave);
      };

    }, section);

    return () => ctx.revert();
  }, []);

  const nodes = [
    { id: 1, cx: 100, cy: 150, r: 4, type: "primary" },
    { id: 2, cx: 250, cy: 100, r: 3, type: "secondary" },
    { id: 3, cx: 400, cy: 200, r: 6, type: "primary" },
    { id: 4, cx: 550, cy: 120, r: 3, type: "secondary" },
    { id: 5, cx: 700, cy: 220, r: 5, type: "primary" },
    { id: 6, cx: 850, cy: 100, r: 3, type: "secondary" },
    { id: 7, cx: 150, cy: 350, r: 5, type: "primary" },
    { id: 8, cx: 300, cy: 400, r: 4, type: "secondary" },
    { id: 9, cx: 500, cy: 380, r: 7, type: "primary" },
    { id: 10, cx: 700, cy: 450, r: 4, type: "secondary" },
    { id: 11, cx: 850, cy: 300, r: 4, type: "secondary" },
    { id: 12, cx: 200, cy: 500, r: 3, type: "secondary" },
    { id: 13, cx: 450, cy: 550, r: 4, type: "primary" },
    { id: 14, cx: 750, cy: 550, r: 5, type: "secondary" },
    { id: 15, cx: 950, cy: 450, r: 4, type: "primary" },
    { id: 16, cx: 50, cy: 300, r: 3, type: "secondary" },
    { id: 17, cx: 900, cy: 180, r: 4, type: "primary" },
    { id: 18, cx: 600, cy: 500, r: 3, type: "secondary" }
  ];

  const lines = [
    [1, 2], [1, 7], [2, 3], [3, 4], [3, 8], [4, 5], [5, 6], [5, 11], [6, 17], [17, 15], 
    [7, 8], [7, 12], [8, 9], [8, 12], [9, 10], [9, 13], [10, 11], [10, 14], [10, 18],
    [11, 15], [12, 13], [13, 18], [14, 15], [18, 14], [1, 16], [7, 16], [3, 9], [5, 9]
  ];

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden mix-blend-screen opacity-15">
      <div className="network-bg absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(176,137,104,0.08)_0%,transparent_60%)]" />
      <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
        <defs>
          <filter id="meshGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="network-connections">
          {lines.map((pair, idx) => {
            const n1 = nodes.find(n => n.id === pair[0]);
            const n2 = nodes.find(n => n.id === pair[1]);
            if (!n1 || !n2) return null;
            const lineClass = `line-${n1.id}-${n2.id}`;
            return (
              <g key={idx}>
                <path 
                  className={`network-line ${lineClass}`}
                  d={`M${n1.cx},${n1.cy} L${n2.cx},${n2.cy}`}
                  stroke="#ffffff"
                  strokeWidth="1"
                  strokeOpacity="0.15"
                  fill="none"
                />
                {(n1.type === "primary" || n2.type === "primary") && (
                  <path 
                    className="network-pulse"
                    data-line={lineClass}
                    d={`M${n1.cx},${n1.cy} L${n2.cx},${n2.cy}`}
                    stroke="#B08968"
                    strokeWidth="2"
                    fill="none"
                    style={{ strokeDasharray: "30 1000" }}
                  />
                )}
              </g>
            );
          })}
        </g>

        <g className="network-nodes">
          {nodes.map(n => (
            <g key={n.id} className="network-node-group" data-cx={n.cx} data-cy={n.cy} style={{ opacity: 0.4, transformOrigin: `${n.cx}px ${n.cy}px` }}>
              {n.type === "primary" && (
                <circle cx={n.cx} cy={n.cy} r={n.r * 2.5} fill="#B08968" opacity="0.25" className="network-node" filter="url(#meshGlow)" />
              )}
              <circle 
                cx={n.cx} 
                cy={n.cy} 
                r={n.r} 
                fill={n.type === "primary" ? "#B08968" : "#ffffff"} 
                className="network-node"
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

const Home = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const cinematicRef = useRef(null);
  const timelineSectionRef = useRef(null);
  const progressLineRef = useRef(null);
  const stepNodesRef = useRef([]);
  const protectionImgRef = useRef(null);
  const protectionImgScrollRef = useRef(null);
  const protectionImgMouseRef = useRef(null);

  const handleProtectionMouseMove = (e) => {
    if (!protectionImgMouseRef.current) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;

    gsap.to(protectionImgMouseRef.current, {
      x: x * -16, // max 8px movement
      y: y * -16,
      duration: 0.6,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  };

  const handleProtectionMouseLeave = () => {
    if (!protectionImgMouseRef.current) return;
    gsap.to(protectionImgMouseRef.current, {
      x: 0,
      y: 0,
      duration: 0.8,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  };

  
  // Custom hooks handling the heavy lifting off the main thread
  const { framesRef, firstFrameReady } = useFrameLoader(sortedUrls, 30);
  const renderFrame = useCanvasRenderer(canvasRef, framesRef);

  useLayoutEffect(() => {
    if (!firstFrameReady || !canvasRef.current || !cinematicRef.current) return;

    // The playhead tracks our exact frame across the sequence
    const playhead = { frame: 0 };
    
    // Total frames = 600 - 40 overlap - 1 (0-indexed)
    const OVERLAP = 40;
    const totalFrames = sortedUrls.length > 0 ? sortedUrls.length - 1 - OVERLAP : 0;

    // Initial render - draw immediately
    renderFrame(0);

    // Master Timeline configuring the entire cinematic experience
    const masterTl = gsap.timeline({
      scrollTrigger: {
        trigger: cinematicRef.current,
        start: "top top",
        end: "+=8000", // 8000px provides ~13px scroll distance per frame, guaranteeing smoothness
        scrub: 0.5,
        pin: true,
        anticipatePin: 1
      }
    });

    // 1. Core Frame Animation (0 to 100% of the timeline)
    masterTl.to(playhead, {
      frame: totalFrames,
      ease: "none",
      duration: 1, // Normalized duration for GSAP timelines
      onUpdate: () => {
        // Pass the raw float to renderFrame for precise opacity blending
        renderFrame(playhead.frame);
      }
    }, 0);

    // 2. Synchronize Text & Canvas Overlays
    masterTl.to(".hero-content", {
      opacity: 0, y: -50, filter: "blur(10px)", ease: "power2.inOut", duration: 0.1
    }, 0.1);

    masterTl.fromTo(".problem-content", 
      { opacity: 0, y: 50, filter: "blur(10px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", ease: "power2.out", duration: 0.1 }
    , 0.25);
    masterTl.to(".problem-content", {
      opacity: 0, y: -50, filter: "blur(10px)", ease: "power2.in", duration: 0.1
    }, 0.4);

    masterTl.fromTo(".transition-content",
      { opacity: 0, y: 50, filter: "blur(10px)", scale: 0.95 },
      { opacity: 1, y: 0, filter: "blur(0px)", scale: 1, ease: "power3.out", duration: 0.1 }
    , 0.55);
    masterTl.to(".transition-content", {
      opacity: 0, y: -50, filter: "blur(10px)", ease: "power2.in", duration: 0.1
    }, 0.75);

    masterTl.to(canvasRef.current, {
      opacity: 0, ease: "power2.inOut", duration: 0.1
    }, 0.9);

    const revealElements = gsap.utils.toArray('.reveal-text');
    revealElements.forEach(el => {
      gsap.fromTo(el, 
        { y: 40, opacity: 0, filter: 'blur(10px)' },
        {
          y: 0, opacity: 1, filter: 'blur(0px)', duration: 1, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" }
        }
      );
    });

    if (protectionImgScrollRef.current) {
      gsap.fromTo(protectionImgScrollRef.current, 
        { y: -20 },
        { 
          y: 20,
          ease: "none",
          scrollTrigger: { 
            trigger: protectionImgScrollRef.current.parentElement.parentElement, 
            start: "top bottom", 
            end: "bottom top", 
            scrub: true 
          }
        }
      );
    }

    if (protectionImgRef.current) {
      gsap.fromTo(protectionImgRef.current, 
        { opacity: 0, scale: 1.08, x: 80 },
        { 
          opacity: 1, scale: 1, x: 0, duration: 1.8, ease: "power3.out",
          scrollTrigger: { trigger: protectionImgRef.current.closest('section'), start: "top 70%" }
        }
      );
    }

    gsap.to(".shield-glow", {
      opacity: 0.7,
      scale: 1.1,
      duration: 2.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, [firstFrameReady, renderFrame]);

  useLayoutEffect(() => {
    if (!firstFrameReady || !timelineSectionRef.current || !progressLineRef.current) return;
    
    // Interactive Timeline ScrollTrigger
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: timelineSectionRef.current,
        start: "center center",
        end: "+=3000",
        pin: true,
        scrub: 1,
        anticipatePin: 1
      }
    });

    // Animate the progress line natively bound to scroll
    tl.to(progressLineRef.current, {
      scaleX: 1,
      ease: "none",
      duration: 1
    }, 0);

    // Stagger step animations evenly across the timeline duration (0 to 1)
    stepNodesRef.current.forEach((node, i) => {
      if (!node) return;
      const progressPosition = i / (stepNodesRef.current.length - 1);
      
      tl.to(node, {
        scale: 1,
        opacity: 1,
        duration: 0.1,
        ease: "power2.out",
        boxShadow: "0 0 30px rgba(176, 137, 104, 0.4)",
        borderColor: "#B08968"
      }, Math.max(0, progressPosition - 0.05));
      
      const content = node.nextElementSibling;
      if (content) {
        tl.to(content, {
          opacity: 1,
          y: 0,
          duration: 0.1,
          ease: "power2.out"
        }, Math.max(0, progressPosition - 0.05));
      }

      // Past nodes visually recede slightly to keep focus on active node
      if (i < stepNodesRef.current.length - 1) {
        tl.to(node, {
          scale: 0.95,
          opacity: 0.8,
          boxShadow: "0 0 0px rgba(176, 137, 104, 0)",
          borderColor: "#333",
          duration: 0.1,
          ease: "power2.inOut"
        }, progressPosition + 0.1);
        
        if (content) {
          tl.to(content, {
            opacity: 0.5,
            duration: 0.1,
            ease: "power2.inOut"
          }, progressPosition + 0.1);
        }
      }
    });

    return () => {
      if (tl.scrollTrigger) tl.scrollTrigger.kill();
      tl.kill();
    };
  }, [firstFrameReady]);

  // Loading UI (Wait ONLY for the first frame, not all 600)
  if (!firstFrameReady) {
    return (
      <div className="min-h-screen bg-[#0C0C0C] flex flex-col items-center justify-center text-[#F5F5F7]">
        <div className="w-10 h-10 border-2 border-[#333] border-t-[#B08968] rounded-full animate-spin mb-4" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="bg-[#0C0C0C] text-[#F5F5F7] selection:bg-[#B08968] selection:text-white font-sans overflow-x-hidden">
      
      {/* High-Performance Canvas Engine */}
      <canvas 
        ref={canvasRef} 
        className="fixed top-0 left-0 w-full h-full object-cover z-0 pointer-events-none"
      />
      
      {/* Overlay to ensure text readability */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0C0C0C]/50 via-transparent to-[#0C0C0C]/95 z-[1] pointer-events-none" />

      <main className="relative z-10">
        
        {/* Pinned Cinematic Sequence Area */}
        <section ref={cinematicRef} className="relative h-screen w-full flex items-center justify-center">
          
          {/* Section 1: Hero */}
          <div className="hero-content absolute inset-0 flex flex-col items-center justify-center text-center px-4 will-change-transform">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight mb-6">
              The intelligent<br />ride companion.
            </h1>
            <p className="text-lg md:text-xl text-[#86868B] max-w-2xl mb-10">
              Engineering safety. Mastering the journey.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 relative z-50 pointer-events-auto">
              <button 
                onClick={() => document.getElementById('safety-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-3 bg-[#F5F5F7] text-[#0C0C0C] rounded-full font-medium transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                Explore
              </button>
              <button 
                className="group relative px-8 py-3 bg-transparent border border-[#F5F5F7]/20 text-[#F5F5F7] rounded-full font-medium transition-colors hover:bg-[#F5F5F7]/10 hover:border-[#B08968]/30 overflow-hidden cursor-pointer"
              >
                <span className="group-hover:opacity-0 transition-opacity duration-300 inline-block px-2">Download App</span>
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[#B08968] transition-opacity duration-300">Coming Soon</span>
              </button>
            </div>
          </div>

          {/* Section 2: Problem */}
          <div className="problem-content absolute inset-0 flex flex-col items-center justify-center text-center px-4 opacity-0 will-change-transform pointer-events-none">
            <div className="max-w-4xl mx-auto space-y-12">
              <h2 className="text-3xl md:text-5xl font-medium leading-tight text-[#B08968]">
                Every year, millions of riders face the road alone.
              </h2>
              <p className="text-xl md:text-3xl text-[#86868B] leading-relaxed">
                When milliseconds matter, isolation is the greatest risk. A dropped bike. A dead battery. An unseen corner. 
              </p>
              <p className="text-xl md:text-3xl text-[#F5F5F7] leading-relaxed">
                We believe technology should protect you before you even realize you need it.
              </p>
            </div>
          </div>

          {/* Section 3: Transition */}
          <div className="transition-content absolute inset-0 flex flex-col items-center justify-center px-4 opacity-0 will-change-transform pointer-events-none">
            <h2 className="text-4xl md:text-6xl font-medium tracking-tight text-[#F5F5F7] drop-shadow-2xl">
              Enter the intelligent network.
            </h2>
          </div>

        </section>

        {/* REST OF WEBSITE (Standard Scroll Flow) */}
        <div className="relative z-20 bg-[#0C0C0C]">
          
          {/* Section 4.1: Safety & Intelligence */}
          <section 
            id="safety-section"
            className="min-h-screen flex flex-col justify-center py-8 md:py-12 px-4 relative border-t border-[#ffffff0a] overflow-hidden"
            onMouseMove={handleProtectionMouseMove}
            onMouseLeave={handleProtectionMouseLeave}
          >
            {/* Background Layers */}
            {/* Base Dark Background */}
            <div className="absolute inset-0 bg-[#0C0C0C]" />
            
            {/* Parallax & Reveal Engine */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {/* Scroll Parallax Layer */}
              <div ref={protectionImgScrollRef} className="absolute inset-x-0 w-full h-[120%] -top-[10%] will-change-transform">
                {/* Mouse Parallax Layer */}
                <div ref={protectionImgMouseRef} className="relative w-full h-full will-change-transform">
                  {/* Reveal Layer (Image) */}
                  <img 
                    ref={protectionImgRef}
                    src={protectionImg} 
                    alt="Rider Saathi Protection"
                    className="absolute inset-0 w-full h-full object-cover object-center opacity-60 lg:opacity-75 will-change-transform"
                    style={{
                      WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
                      maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
                    }}
                  />
                  {/* Blending Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#0C0C0C]/90 via-transparent to-[#0C0C0C]/90" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(12,12,12,0.85)_100%)]" />
                  
                  {/* Shield Glow */}
                  <div className="shield-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#B08968]/20 blur-[100px] rounded-full mix-blend-screen opacity-40" />
                </div>
              </div>
            </div>
            
            {/* Content Container */}
            <div className="max-w-7xl mx-auto w-full relative z-10 flex flex-col flex-1 justify-between">
              
              <div className="pt-8 md:pt-16 text-center lg:text-left">
                <div className="mb-6 md:mb-8 reveal-text">
                  <h3 className="text-[#B08968] font-medium tracking-wide uppercase text-xs md:text-sm mb-2 md:mb-4">Safety First</h3>
                  <h2 className="text-4xl md:text-5xl lg:text-7xl font-medium tracking-tight text-[#F5F5F7]">
                    Protection that thinks ahead.
                  </h2>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-12 pb-4 md:pb-8">
                {/* Card 1 */}
                <Link to="/feature/emergency-assistance" className="block outline-none cursor-pointer">
                  <div className="h-full p-6 md:p-8 rounded-3xl bg-[#0f0f0f]/65 backdrop-blur-[14px] border border-white/5 reveal-text hover:-translate-y-1 hover:border-white/10 transition-all duration-500 shadow-[0_15px_40px_rgba(0,0,0,0.4)] flex flex-col justify-end">
                    <ShieldCheckIcon className="w-8 h-8 md:w-10 md:h-10 text-[#B08968] mb-3 md:mb-6" />
                    <h4 className="text-xl md:text-2xl font-medium mb-1 md:mb-3">Emergency SOS</h4>
                    <p className="text-[#86868B] text-sm md:text-base leading-relaxed">
                      Instant crash detection broadcasts your distress signal and precise telemetry to nearby riders within a 10km radius. Zero latency when it matters most.
                    </p>
                  </div>
                </Link>
                
                {/* Card 2 */}
                <Link to="/feature/dead-battery-alert" className="block outline-none cursor-pointer">
                  <div className="h-full p-6 md:p-8 rounded-3xl bg-[#0f0f0f]/65 backdrop-blur-[14px] border border-white/5 reveal-text hover:-translate-y-1 hover:border-white/10 transition-all duration-500 shadow-[0_15px_40px_rgba(0,0,0,0.4)] flex flex-col justify-end">
                    <BoltIcon className="w-8 h-8 md:w-10 md:h-10 text-[#F5F5F7] mb-3 md:mb-6" />
                    <h4 className="text-xl md:text-2xl font-medium mb-1 md:mb-3">Dead Battery Alert</h4>
                    <p className="text-[#86868B] text-sm md:text-base leading-relaxed">Predictive voltage monitoring warns you before you get stranded.</p>
                  </div>
                </Link>

                {/* Card 3 */}
                <Link to="/feature/emergency-assistance" className="block outline-none cursor-pointer">
                  <div className="h-full p-6 md:p-8 rounded-3xl bg-[#0f0f0f]/65 backdrop-blur-[14px] border border-white/5 reveal-text hover:-translate-y-1 hover:border-white/10 transition-all duration-500 shadow-[0_15px_40px_rgba(0,0,0,0.4)] flex flex-col justify-end">
                    <PhoneIcon className="w-8 h-8 md:w-10 md:h-10 text-[#F5F5F7] mb-3 md:mb-6" />
                    <h4 className="text-xl md:text-2xl font-medium mb-1 md:mb-3">Emergency Contacts</h4>
                    <p className="text-[#86868B] text-sm md:text-base leading-relaxed">Automatic dialing and location sharing when you remain unresponsive.</p>
                  </div>
                </Link>
              </div>

            </div>
          </section>

          {/* Section 4.2: Precision Navigation */}
          <section className="min-h-screen flex flex-col justify-center py-16 px-4 relative">
            <div className="max-w-7xl mx-auto w-full">
              <div className="mb-12 md:mb-16 text-left md:text-right reveal-text md:ml-auto">
                <h3 className="text-[#B08968] font-medium tracking-wide uppercase text-sm mb-4">Navigation</h3>
                <h2 className="text-4xl md:text-6xl font-medium tracking-tight text-[#F5F5F7] max-w-3xl md:ml-auto">
                  Know every curve.
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-5 flex flex-col gap-6">
                  <Link to="/feature/offline-maps" className="block outline-none cursor-pointer flex-1">
                    <div className="h-full p-8 rounded-3xl bg-[#111111] border border-[#ffffff0a] reveal-text hover:border-[#ffffff20] transition-colors">
                      <SignalIcon className="w-8 h-8 text-[#F5F5F7] mb-4" />
                      <h4 className="text-xl font-medium mb-2">Offline Maps</h4>
                      <p className="text-[#86868B] text-sm">Full topographical navigation that works deep in the mountains, independent of cell towers.</p>
                    </div>
                  </Link>
                  <div className="grid grid-cols-2 gap-6">
                    <Link to="/feature/weather-integration" className="block outline-none cursor-pointer">
                      <div className="h-full p-8 rounded-3xl bg-[#111111] border border-[#ffffff0a] reveal-text hover:border-[#ffffff20] transition-colors">
                        <CloudIcon className="w-8 h-8 text-[#F5F5F7] mb-4" />
                        <h4 className="text-lg font-medium mb-2">Weather</h4>
                        <p className="text-[#86868B] text-xs">Micro-climate radar.</p>
                      </div>
                    </Link>
                    <Link to="/feature/nearby-essential" className="block outline-none cursor-pointer">
                      <div className="h-full p-8 rounded-3xl bg-[#111111] border border-[#ffffff0a] reveal-text hover:border-[#ffffff20] transition-colors">
                        <MapPinIcon className="w-8 h-8 text-[#F5F5F7] mb-4" />
                        <h4 className="text-lg font-medium mb-2">Essentials</h4>
                        <p className="text-[#86868B] text-xs">Fuel and mechanics.</p>
                      </div>
                    </Link>
                  </div>
                </div>
                <Link to="/feature/gps-tracking" className="block outline-none cursor-pointer md:col-span-7">
                  <div className="h-full p-10 md:p-16 rounded-3xl bg-[#111111] border border-[#ffffff0a] reveal-text flex flex-col justify-end min-h-[400px] hover:border-[#B08968]/30 transition-colors relative overflow-hidden group">
                    <NavigationMapVisual />
                    <div className="relative z-10 pointer-events-none">
                      <MapIcon className="w-12 h-12 text-[#B08968] mb-6" />
                      <h4 className="text-3xl font-medium mb-4">Real-Time GPS Tracking</h4>
                      <p className="text-[#86868B] text-lg leading-relaxed max-w-xl">
                        Motorcycle-optimized routing powered by OpenStreetMap and OSRM. 
                        Share your live location seamlessly and avoid dangerous terrains to stay on the perfect line.
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </section>

          {/* Section 4.3: The Rider Network */}
          <section className="min-h-screen flex flex-col justify-center py-16 px-4 relative overflow-hidden">
            <CommunityNetworkVisual />
            <div className="max-w-7xl mx-auto w-full relative z-10">
              <div className="mb-12 md:mb-16 reveal-text text-center">
                <h3 className="text-[#B08968] font-medium tracking-wide uppercase text-sm mb-4">Community</h3>
                <h2 className="text-4xl md:text-6xl font-medium tracking-tight text-[#F5F5F7]">
                  Never ride alone.
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link to="/feature/group-communication" className="block outline-none cursor-pointer">
                  <div className="h-full community-card p-10 rounded-3xl bg-[#111111]/80 backdrop-blur-md border border-[#ffffff0a] hover:border-[#ffffff20] transition-colors">
                    <UserGroupIcon className="w-10 h-10 text-[#F5F5F7] mb-6" />
                    <h4 className="text-2xl font-medium mb-3">Rider Network</h4>
                    <p className="text-[#86868B] leading-relaxed">
                      A mesh of peer-to-peer tracking. Identify friends versus strangers on the road and coordinate group rides.
                    </p>
                  </div>
                </Link>
                <Link to="/feature/group-communication" className="block outline-none cursor-pointer">
                  <div className="h-full community-card p-10 rounded-3xl bg-[#111111]/80 backdrop-blur-md border border-[#ffffff0a] hover:border-[#ffffff20] transition-colors">
                    <ChatBubbleLeftRightIcon className="w-10 h-10 text-[#F5F5F7] mb-6" />
                    <h4 className="text-2xl font-medium mb-3">Ride Chat</h4>
                    <p className="text-[#86868B] leading-relaxed">
                      Communicate instantly with your convoy. Send waypoints, hazard warnings, or regroup requests with a single tap.
                    </p>
                  </div>
                </Link>
                <Link to="/feature/rewards-system" className="block outline-none cursor-pointer">
                  <div className="h-full community-card p-10 rounded-3xl bg-[#111111]/80 backdrop-blur-md border border-[#ffffff0a] hover:border-[#ffffff20] transition-colors">
                    <StarIcon className="w-10 h-10 text-[#F5F5F7] mb-6" />
                    <h4 className="text-2xl font-medium mb-3">Rewards System</h4>
                    <p className="text-[#86868B] leading-relaxed">
                      Gamified safety incentives. Earn points for riding safely, helping others, and mapping new safe routes.
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </section>

          {/* Section 4.4: Smart Connectivity */}
          <section className="min-h-screen flex flex-col justify-center py-16 px-4 relative border-b border-[#ffffff0a]">
            <div className="max-w-7xl mx-auto w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                <div className="reveal-text">
                  <h3 className="text-[#B08968] font-medium tracking-wide uppercase text-sm mb-4">Hardware Integration</h3>
                  <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-[#F5F5F7] mb-8">
                    Seamless sync with your gear.
                  </h2>
                  <p className="text-[#86868B] text-lg leading-relaxed mb-8">
                    Rider Saathi doesn't just live on your phone. It bridges the gap between your machine, your helmet, and the cloud.
                  </p>
                  
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <CpuChipIcon className="w-6 h-6 text-[#F5F5F7] mt-1 shrink-0" />
                      <div>
                        <h4 className="font-medium text-lg text-[#F5F5F7]">AI Ride Assistant</h4>
                        <p className="text-[#86868B] text-sm">Contextual awareness that understands the physics of your ride.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <SpeakerWaveIcon className="w-6 h-6 text-[#F5F5F7] mt-1 shrink-0" />
                      <div>
                        <h4 className="font-medium text-lg text-[#F5F5F7]">Voice Commands</h4>
                        <p className="text-[#86868B] text-sm">Control navigation and communication without taking your hands off the bars.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <DevicePhoneMobileIcon className="w-6 h-6 text-[#F5F5F7] mt-1 shrink-0" />
                      <div>
                        <h4 className="font-medium text-lg text-[#F5F5F7]">Helmet & Bluetooth</h4>
                        <p className="text-[#86868B] text-sm">Universal audio integration with Sena, Cardo, and native motorcycle dash systems.</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="relative h-[400px] md:h-[500px] rounded-3xl bg-gradient-to-tr from-[#111111] to-[#1a1a1a] border border-[#ffffff0a] reveal-text flex items-center justify-center overflow-hidden">
                   {/* Abstract tech visualization */}
                   <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(176,137,104,0.3)_0%,transparent_70%)]" />
                   
                   {/* Coming Soon Text */}
                   <div className="relative z-20 text-center">
                     <h3 className="text-5xl md:text-7xl font-bold tracking-[0.2em] text-[#F5F5F7] uppercase drop-shadow-2xl">
                       Coming
                     </h3>
                     <h3 className="text-5xl md:text-7xl font-bold tracking-[0.2em] text-[#B08968] uppercase drop-shadow-2xl mt-2">
                       Soon
                     </h3>
                   </div>
                   
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-96 md:h-96 border border-[#B08968]/20 rounded-full animate-[spin_10s_linear_infinite]" />
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 md:w-[500px] md:h-[500px] border border-[#B08968]/10 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: How It Works (Interactive Timeline) */}
          <section ref={timelineSectionRef} className="py-20 px-4 border-t border-[#ffffff0a] min-h-screen flex flex-col justify-center bg-[#0C0C0C]">
            <div className="max-w-7xl mx-auto w-full">
              <h3 className="text-[#B08968] font-medium tracking-wide uppercase text-sm mb-4 text-center">How it works</h3>
              <h2 className="text-4xl md:text-5xl font-medium mb-24 md:mb-32 text-center text-[#F5F5F7] tracking-tight">
                Seamless Operation
              </h2>
              
              <div className="relative max-w-6xl mx-auto px-4 md:px-0">
                {/* Connecting Line Base */}
                <div className="absolute top-8 left-8 right-8 md:left-12 md:right-12 h-[2px] bg-[#222] -translate-y-1/2 rounded-full hidden md:block" />
                
                {/* Connecting Line Progress */}
                <div 
                  ref={progressLineRef}
                  className="absolute top-8 left-8 right-8 md:left-12 md:right-12 h-[2px] bg-[#B08968] -translate-y-1/2 rounded-full hidden md:block origin-left shadow-[0_0_15px_rgba(176,137,104,0.6)] z-[5]" 
                  style={{ transform: 'scaleX(0)' }}
                />
                
                <div className="flex flex-col md:flex-row justify-between gap-12 md:gap-4 relative z-10">
                  {[
                    { title: 'Ride', desc: 'Monitoring begins automatically', Icon: PlayIcon },
                    { title: 'Monitor', desc: 'GPS + AI start tracking', Icon: SignalIcon },
                    { title: 'Detect', desc: 'Potential risk identified', Icon: ExclamationTriangleIcon },
                    { title: 'Notify', desc: 'Nearby riders receive alerts', Icon: SpeakerWaveIcon },
                    { title: 'Respond', desc: 'Emergency assistance activated', Icon: ShieldCheckIcon },
                    { title: 'Safe', desc: 'Ride completed safely', Icon: CheckBadgeIcon }
                  ].map((step, index) => (
                    <div key={step.title} className="flex flex-row md:flex-col items-center md:items-center text-left md:text-center w-full md:w-40 relative gap-6 md:gap-0">
                      
                      <div 
                        ref={el => stepNodesRef.current[index] = el}
                        className="w-16 h-16 md:mb-8 rounded-full bg-[#111] border-2 border-[#333] flex items-center justify-center shrink-0 opacity-30 scale-90 transition-colors relative z-10"
                      >
                        <step.Icon className="w-6 h-6 text-[#F5F5F7]" />
                      </div>
                      
                      <div className="step-content opacity-0 translate-y-4 md:translate-y-8 md:absolute md:top-24 md:left-1/2 md:-translate-x-1/2 w-48 md:w-full">
                        <h4 className="text-xl font-medium text-[#F5F5F7] mb-2">{step.title}</h4>
                        <p className="text-[#86868B] text-sm leading-relaxed">{step.desc}</p>
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>




          {/* Section 8: Team & Outro */}
          <section className="py-40 px-4 bg-gradient-to-b from-[#0C0C0C] to-[#050505] flex items-center justify-center text-center">
            <h2 className="text-3xl md:text-5xl font-medium text-[#B08968] reveal-text max-w-3xl leading-tight">
              Engineered with precision.<br />Designed for survival.
            </h2>
          </section>

          {/* Section 9: Footer */}
          <Footer />
          
        </div>
      </main>
    </div>
  );
};

export default Home;
