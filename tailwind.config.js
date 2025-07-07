/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Islamic color palette
        'islamic-gold': '#D4AF37',
        'islamic-green': '#0F5132',
        'islamic-blue': '#1B4332',
        'islamic-teal': '#006A6B',
        'islamic-cream': '#F8F6F0',
        // Tajweed colors (subtle)
        tajweed: {
          ikhfaa: 'rgba(251, 191, 36, 0.15)',
          idgham: 'rgba(34, 197, 94, 0.15)',
          iqlab: 'rgba(147, 51, 234, 0.15)',
          izhar: 'rgba(59, 130, 246, 0.15)',
          qalqalah: 'rgba(239, 68, 68, 0.15)',
          madd: 'rgba(34, 197, 94, 0.1)',
          heavy: 'rgba(251, 146, 60, 0.15)',
          shaddah: 'rgba(99, 102, 241, 0.15)',
        },
      },
      fontFamily: {
        // Arabic fonts
        arabic: ['Amiri', 'Scheherazade New', 'Traditional Arabic', 'serif'],
        // Modern UI fonts
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'quran-sm': ['1.75rem', { lineHeight: '2.5' }],
        'quran-md': ['2.25rem', { lineHeight: '3' }],
        'quran-lg': ['2.75rem', { lineHeight: '3.5' }],
        'quran-xl': ['3.25rem', { lineHeight: '4' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-gentle': 'pulseGentle 2s infinite',
        'recording': 'recording 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGentle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        recording: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
      },
      backgroundImage: {
        'islamic-pattern': 'url("data:image/svg+xml,%3Csvg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23000" fill-opacity="0.03"%3E%3Cpolygon points="10,0 20,10 10,20 0,10"/%3E%3C/g%3E%3C/svg%3E")',
      },
    },
  },
  plugins: [],
}