/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './views/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
      colors: {
        royal: { DEFAULT: '#0a2e5d', deep: '#081f3f', mid: '#0d3a6e' },
        gold: { DEFAULT: '#d4af37', glow: '#f4d160', dark: '#8b7320' },
        navy: { 950: '#081f3f', 900: '#0a2e5d', 800: '#0d3a6e' },
        muted: { DEFAULT: '#5c6b7a', soft: '#7a8a99' },
        border: '#dde3ea',
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#0a2e5d',
          600: '#081f3f',
          700: '#061d45',
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'chat-slide-up': 'chatSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'pop-in': 'popIn 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        chatSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
