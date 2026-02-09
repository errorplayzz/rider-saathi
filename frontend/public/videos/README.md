
# Background Video Assets

This folder contains background video files used in the Rider Saathi homepage.

## Current Videos

1. **road-context.mp4** - Used in the Feature Highlights section
   - Opacity: 0.18
   - Blur: 2px
   - Shows: Road/journey context visualization

2. **network-impact.mp4** - Used in the Impact and Benefits section
   - Opacity: 0.14  
   - Blur: 3px
   - Shows: Abstract network/ecosystem visualization

## Technical Specs

- **Location**: `/public/videos/` (served directly by Vite)
- **Format**: MP4 (H.264 codec recommended)
- **Resolution**: 1920x1080 or similar
- **File Size**: Keep under 5MB for optimal loading
- **Optimization**: Use web-optimized encoding

## Usage

Videos are referenced in the code as:
```javascript
const videoPath = '/videos/filename.mp4'
```

The VideoBackground component handles:
- Lazy loading (only loads when section is visible)
- Autoplay with muted audio
- Accessibility (respects prefers-reduced-motion)
- Error handling (graceful fallback if video fails to load)

## Video Optimization

To optimize videos for web use:

```bash
ffmpeg -i input.mp4 -vcodec h264 -acodec aac -strict -2 \
  -pix_fmt yuv420p -vf "scale=1920:-1" -b:v 2M output.mp4
```

This ensures:
- H.264 codec (widely supported)
- Reasonable file size
- Fast streaming
- Mobile compatibility
