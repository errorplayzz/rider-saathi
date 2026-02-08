# Video Background Implementation Guide

## Overview

Two subtle, looping background videos have been integrated into the home page:

1. **Video 1**: "Trusted Rider Safety Platform" section (Feature Highlights)
2. **Video 2**: "Impact and Benefits" section

**Hero section remains STATIC** — no video added per requirements.

---

## File Structure

```
frontend/
├── src/
│   ├── assets/
│   │   └── videos/
│   │       ├── README.md                    # Video specifications
│   │       ├── road-context.mp4             # Video 1 (replace this)
│   │       └── network-impact.mp4           # Video 2 (replace this)
│   ├── components/
│   │   └── VideoBackground.jsx              # Reusable video component
│   └── pages/
│       └── Home.jsx                         # Updated with video backgrounds
```

---

## How to Add Your Videos

### Step 1: Prepare Your Videos

**Video 1: road-context.mp4**
- **Content**: Road POV, riding footage, motion context
- **Duration**: 10-20 seconds (seamless loop)
- **Resolution**: 1920x1080 or 1280x720
- **File Size**: Under 2MB (optimize for web)
- **Format**: MP4 (H.264 codec)
- **Style**: Slow motion, muted colors, low contrast

**Video 2: network-impact.mp4**
- **Content**: Abstract network, ecosystem visualization, connections
- **Duration**: 15-30 seconds (seamless loop)
- **Resolution**: 1920x1080 or 1280x720
- **File Size**: Under 2MB (optimize for web)
- **Format**: MP4 (H.264 codec)
- **Style**: Very subtle, abstract, slow-moving

### Step 2: Replace Placeholder Files

Simply drop your video files into:
```
frontend/src/assets/videos/
```

Replace:
- `road-context.mp4` with your road/POV video
- `network-impact.mp4` with your network visualization video

**No code changes required!** The videos are automatically imported.

---

## Technical Implementation

### VideoBackground Component

Located at: `src/components/VideoBackground.jsx`

**Features**:
- ✅ Lazy loading (only loads when section enters viewport)
- ✅ Accessibility (respects `prefers-reduced-motion`)
- ✅ Performance optimized (pauses when out of view)
- ✅ Pointer events disabled (doesn't interfere with clicks)
- ✅ Dark overlay for text readability

**Props**:
```jsx
<VideoBackground 
  videoSrc={videoFile}        // Path to video
  opacity={0.15}              // Video opacity (0-1)
  blur={2}                    // Blur amount in pixels
  overlayGradient="..."       // CSS gradient overlay
/>
```

### Current Settings

**Video 1** (Feature Highlights):
- Opacity: 0.18
- Blur: 2px
- Overlay: Dark gradient (75% → 88%)

**Video 2** (Impact & Benefits):
- Opacity: 0.14 (more subtle)
- Blur: 3px (more blur)
- Overlay: Dark gradient (80% → 92%)

---

## Adjusting Video Settings

If videos are too visible or too subtle, edit `Home.jsx`:

```jsx
// Feature Highlights section (around line 273)
<VideoBackground 
  videoSrc={roadContextVideo}
  opacity={0.18}              // ← Adjust this (lower = more subtle)
  blur={2}                    // ← Adjust this (higher = more blur)
  overlayGradient="..."       // ← Adjust darkness
/>

// Impact & Benefits section (around line 406)
<VideoBackground 
  videoSrc={networkImpactVideo}
  opacity={0.14}              // ← Adjust this
  blur={3}                    // ← Adjust this
  overlayGradient="..."       // ← Adjust darkness
/>
```

---

## Performance & Accessibility

### Lazy Loading
- Videos only load after Hero section renders
- Video 2 only plays when "Impact & Benefits" section enters viewport
- Videos pause when scrolled out of view

### Accessibility
- Automatically hidden if user has `prefers-reduced-motion` enabled
- Videos are decorative only — all content remains readable without them
- No audio (muted by default)

### Mobile Optimization
- Videos use `playsInline` to prevent fullscreen on iOS
- IntersectionObserver reduces memory usage
- Falls back gracefully if video fails to load

---

## Video Recommendations

### Creating Seamless Loops
- Use fade in/out at start/end for smooth transition
- Match first and last frame colors
- Keep motion subtle and slow

### Optimization Tools
- **HandBrake**: Free video compression
- **FFmpeg**: Command-line optimization
- **CloudConvert**: Online converter

### Example FFmpeg Command
```bash
ffmpeg -i input.mp4 -vcodec h264 -acodec aac -vf scale=1280:720 -b:v 1M output.mp4
```

---

## Troubleshooting

### Video Not Showing
1. Check file exists: `src/assets/videos/road-context.mp4`
2. Check console for errors
3. Verify video format is MP4 (H.264)
4. Try reducing file size if over 5MB

### Video Too Visible
- Decrease `opacity` value
- Increase `blur` value
- Make overlay gradient darker

### Video Too Subtle
- Increase `opacity` value
- Decrease `blur` value
- Make overlay gradient lighter

### Performance Issues
- Reduce video resolution to 720p
- Compress video file size
- Consider disabling video on mobile (add media query)

---

## Why These Sections?

**Feature Highlights**: 
- First informational section after Hero
- Lower text density allows subtle motion
- Supports "mission control" narrative

**Impact & Benefits**:
- Shift from features to ecosystem vision
- Two-column layout has natural breathing room
- Video reinforces long-term thinking

**Sections WITHOUT video**:
- Hero (remains static per requirements)
- Tech Stack (needs clarity for logos)
- Advanced Features (too much text)
- Live Stats (numbers need immediate focus)

---

## Questions?

If you need to adjust positioning, opacity, or add custom behavior:
1. Edit `src/components/VideoBackground.jsx` for component logic
2. Edit `src/pages/Home.jsx` for section-specific settings
3. Replace videos in `src/assets/videos/` anytime

All changes take effect immediately in development mode.
