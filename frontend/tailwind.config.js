/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Strict Black & White Color System
        ink: 'var(--surface-l1)',          // Page background
        prussian: 'var(--surface-l2)',     // Section/Sidebar
        dusk: 'var(--surface-l3)',         // Cards/Panels
        dusty: 'var(--text-secondary)',    // Secondary text
        alabaster: 'var(--text-heading)',  // Primary text/Headings

        // Surface System (Monochrome Layers)
        surface: {
          l1: 'var(--surface-l1)',  // Deep background
          l2: 'var(--surface-l2)',  // Containers
          l3: 'var(--surface-l3)',  // Cards
          l4: 'var(--surface-l4)',  // Elements
        },

        // No accent color - pure monochrome
        accent: 'var(--accent-color)',
        'accent-hover': 'var(--accent-active)',

        // Emergency colors (monochrome greys only)
        emergency: {
          critical: '#111111',    // Darkest grey - Highest urgency
          high: '#222222',        // Very dark grey - High attention
          medium: '#444444',      // Medium grey - Requires action
          low: '#666666',         // Light grey - Non-critical
          // Specific emergency types mapped to severity levels
          accident: '#CC0000',    // Red for accidents
          medical: '#DC143C',     // Crimson for medical
          fire: '#FF4500',        // Orange-red for fire
          breakdown: '#666666',   // Grey for low-priority breakdown
        },

        // Legacy dark colors (monochrome only)
        dark: {
          900: '#0E0E0E',
          800: '#111111',
          700: '#1A1A1A',
          600: '#222222',
        },

        // Legacy light colors (monochrome only)
        light: {
          100: '#FFFFFF',
          200: '#FAFAFA',
          300: '#F5F5F5',
          400: '#F0F0F0',
        },

        // Remove all neon/colored references
        neon: {
          cyan: '#888888',
          purple: '#888888',
          pink: '#888888',
          blue: '#888888',
        },
      },
      boxShadow: {
        // Professional shadow system - subtle elevation
        'card': '0 1px 3px rgba(0, 0, 0, 0.12)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'button': '0 2px 4px rgba(0, 0, 0, 0.15)',
        'input-focus': '0 0 0 3px rgba(74, 155, 143, 0.1)',
        'emergency': '0 4px 16px rgba(220, 38, 38, 0.25)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}