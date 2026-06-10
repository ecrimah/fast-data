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
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
