/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#06080d',
          900: '#0a0d14',
          850: '#0f1420',
          800: '#151b2a',
          750: '#1b2337',
          700: '#232d44',
          600: '#323f5d',
        },
        market: {
          green: '#00e676',
          greenDim: '#00b050',
          greenDark: '#064e3b',
          red: '#ff3366',
          redDim: '#d6244f',
          redDark: '#5c1024',
          cyan: '#00f0ff',
          amber: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Roboto Mono', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-green': 'flashGreen 0.6s ease-out',
        'flash-red': 'flashRed 0.6s ease-out',
      },
      keyframes: {
        flashGreen: {
          '0%': { backgroundColor: 'rgba(0, 230, 118, 0.4)' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashRed: {
          '0%': { backgroundColor: 'rgba(255, 51, 102, 0.4)' },
          '100%': { backgroundColor: 'transparent' },
        },
      }
    },
  },
  plugins: [],
}
