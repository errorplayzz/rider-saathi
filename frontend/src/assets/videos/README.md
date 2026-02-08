# Video Assets for Home Page

This folder contains looping background videos used on the homepage.

## Video Files

### 1. road-context.mp4
**Location**: "Trusted Rider Safety Platform" section (Feature Highlights)
**Purpose**: Subtle motion context - road POV, riding footage
**Specifications**:
- Duration: 10-20 seconds (seamless loop)
- Resolution: 1920x1080 or 1280x720
- Bitrate: Keep under 2MB for web performance
- Format: MP4 (H.264)
- Style: Slow motion, muted colors, low contrast

### 2. network-impact.mp4
**Location**: "Impact and Benefits" section
**Purpose**: Abstract ecosystem visualization - network nodes, connections
**Specifications**:
- Duration: 15-30 seconds (seamless loop)
- Resolution: 1920x1080 or 1280x720
- Bitrate: Keep under 2MB for web performance
- Format: MP4 (H.264)
- Style: Abstract, slow-moving, very subtle

## Usage

Videos are automatically imported and used in `src/pages/Home.jsx`.
To update videos, simply replace the files in this folder with the same filenames.
No code changes required.

## Performance Notes

- Videos load lazily (after initial page render)
- Video 2 only plays when section enters viewport
- Videos respect `prefers-reduced-motion` accessibility setting
- Mobile devices may disable videos for performance
