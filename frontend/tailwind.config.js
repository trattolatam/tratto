/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0F1B2D', green: '#00C896', 'green-dim': '#E1F5EE', 'green-text': '#0F6E56',
          amber: '#F5A623', 'amber-dim': '#FAEEDA', slate: '#64748B',
          blue: '#378ADD', 'blue-dim': '#E6F1FB', red: '#E24B4A', pink: '#D4537E',
        },
        surface: { DEFAULT: '#F7F9FC', card: '#FFFFFF', dark: '#0F1B2D' },
      },
      fontFamily: { sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'], display: ['var(--font-jakarta)', 'system-ui', 'sans-serif'] },
      borderRadius: { DEFAULT: '10px', sm: '6px', lg: '14px', xl: '20px' },
      boxShadow: { card: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.06)', 'card-hover': '0 4px 16px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.06)', green: '0 4px 20px rgba(0,200,150,0.25)' },
      animation: { 'pulse-green': 'pulse-green 2s ease-in-out infinite', 'fade-in': 'fade-in 0.3s ease-out', 'slide-up': 'slide-up 0.4s ease-out' },
      keyframes: {
        'pulse-green': { '0%, 100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.7, transform: 'scale(1.05)' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
