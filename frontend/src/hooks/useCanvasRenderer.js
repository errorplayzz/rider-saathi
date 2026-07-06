import { useLayoutEffect, useRef, useCallback } from 'react';

export const useCanvasRenderer = (canvasRef, framesRef) => {
  const contextRef = useRef(null);
  const lastRenderedFrameRef = useRef(-1);

  // Setup canvas size and DPI strictly on resize, never during render loop
  const setupCanvas = useCallback(() => {
    if (!canvasRef.current) {
      return;
    }
    
    const canvas = canvasRef.current;
    // Request desynchronized context for lower latency if supported
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    contextRef.current = ctx;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Force high quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Invalidate the last rendered frame so it forces a redraw at the new size
    lastRenderedFrameRef.current = -1;
  }, [canvasRef]);

  useLayoutEffect(() => {
    setupCanvas();

    let resizeTimeout;
    const handleResize = () => {
      // Debounce resize to prevent layout thrashing
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setupCanvas();
        // Redraw current frame immediately after resize
        if (lastRenderedFrameRef.current !== -1 && framesRef.current) {
          const currentFrame = lastRenderedFrameRef.current;
          lastRenderedFrameRef.current = -1;
          renderFrame(currentFrame);
        }
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [setupCanvas, framesRef]);

  const renderFrame = useCallback((playheadFloat) => {
    // Cache key down to 2 decimal places to prevent microscopic sub-pixel re-renders
    const cacheKey = Math.round(playheadFloat * 100) / 100;
    if (cacheKey === lastRenderedFrameRef.current) {
      return;
    }
    
    // Critical Fallback: Initialize context if missing
    if (!contextRef.current && canvasRef.current) {
      setupCanvas();
    }
    
    const ctx = contextRef.current;
    if (!ctx || !canvasRef.current || !framesRef.current) {
      return;
    }

    const OVERLAP = 40;
    const CLIP1_FRAMES = 300;
    const TOTAL_FRAMES = 600;

    let fIndex1 = Math.floor(playheadFloat);
    let fIndex2 = Math.floor(playheadFloat) + OVERLAP;

    let drawClip1 = false;
    let drawClip2 = false;
    let clip2Opacity = 0;

    if (playheadFloat < CLIP1_FRAMES - OVERLAP) {
      drawClip1 = true;
      clip2Opacity = 0;
    } else if (playheadFloat < CLIP1_FRAMES) {
      drawClip1 = true;
      drawClip2 = true;
      // Crossfade logic: smoothly transition opacity from 0 to 1 over the OVERLAP window
      clip2Opacity = (playheadFloat - (CLIP1_FRAMES - OVERLAP)) / OVERLAP;
    } else {
      drawClip2 = true;
      clip2Opacity = 1;
    }

    // Safely clamp indices to their respective clips to avoid OOB errors
    fIndex1 = Math.min(Math.max(fIndex1, 0), CLIP1_FRAMES - 1);
    fIndex2 = Math.min(Math.max(fIndex2, CLIP1_FRAMES), TOTAL_FRAMES - 1);

    const frame1 = drawClip1 ? framesRef.current[fIndex1] : null;
    const frame2 = drawClip2 ? framesRef.current[fIndex2] : null;

    // Progressive rendering: skip if required frames are not yet in memory
    if (drawClip1 && !frame1) return;
    if (drawClip2 && !frame2) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const refFrame = frame1 || frame2;
    const scale = Math.max(width / refFrame.width, height / refFrame.height);
    const x = (width / 2) - (refFrame.width / 2) * scale;
    const y = (height / 2) - (refFrame.height / 2) * scale;

    // Fast fill background
    ctx.fillStyle = '#0C0C0C';
    ctx.fillRect(0, 0, width, height);

    // Draw Clip 1 (Base)
    if (drawClip1 && frame1) {
      ctx.globalAlpha = 1.0;
      ctx.drawImage(frame1, x, y, frame1.width * scale, frame1.height * scale);
    }

    // Draw Clip 2 (Overlay Crossfade)
    if (drawClip2 && frame2 && clip2Opacity > 0) {
      ctx.globalAlpha = clip2Opacity;
      ctx.drawImage(frame2, x, y, frame2.width * scale, frame2.height * scale);
    }

    // Reset alpha
    ctx.globalAlpha = 1.0;
    
    // Track state
    lastRenderedFrameRef.current = cacheKey;
  }, [canvasRef, framesRef, setupCanvas]);

  return renderFrame;
};
