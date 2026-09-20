/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#edfcf4',
          100: '#d4f7e4',
          200: '#aceece',
          300: '#74dfb1',
          400: '#3dc88e',
          500: '#1aac72',
          600: '#0d8c5c',
          700: '#0a704b',
          800: '#0b593d',
          900: '#094934',
          950: '#04291d',
        },
        brand: {
          green: '#1aac72',
          teal:  '#0d8c5c',
          dark:  '#04291d',
          lime:  '#a3e635',
        },
        surface: {
          DEFAULT: '#0f1a14',
          card:    '#141f18',
          muted:   '#1c2d22',
          border:  '#2a3d30',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      animation: {
        'fade-in':      'fadeIn 0.6s ease-out both',
        'slide-up':     'slideUp 0.6s ease-out both',
        'slide-down':   'slideDown 0.4s ease-out both',
        'float':        'float 6s ease-in-out infinite',
        'pulse-slow':   'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow':    'spin 20s linear infinite',
        'glow':         'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        float:   { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-16px)' } },
        glow:    { from: { boxShadow: '0 0 20px rgba(26,172,114,0.3)' }, to: { boxShadow: '0 0 40px rgba(26,172,114,0.6)' } },
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(ellipse at center, rgba(26,172,114,0.15) 0%, transparent 70%)',
        'hero-mesh':   'radial-gradient(at 30% 20%, rgba(26,172,114,0.12) 0, transparent 50%), radial-gradient(at 80% 80%, rgba(163,230,53,0.08) 0, transparent 50%)',
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(26,172,114,0.25)',
        'glow':    '0 0 30px rgba(26,172,114,0.35)',
        'glow-lg': '0 0 60px rgba(26,172,114,0.4)',
        'card':    '0 4px 24px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}
