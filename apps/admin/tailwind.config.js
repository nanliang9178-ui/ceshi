import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF4ED',
          100: '#FFE6D5',
          200: '#FECBA9',
          300: '#FDA772',
          400: '#FB7A3A',
          500: '#FF5A1F',
          600: '#E8451A',
          700: '#C03314',
          800: '#992A15',
          900: '#7A2514',
        },
        ink: {
          900: '#17181C',
          800: '#1F2026',
          700: '#2A2B33',
          600: '#3A3B45',
        },
        cream: '#FBF7F2',
        line: '#EDE7E0',
      },
      fontFamily: {
        sans: [
          'PingFang SC',
          '-apple-system',
          'BlinkMacSystemFont',
          'Microsoft YaHei',
          'Helvetica Neue',
          'sans-serif',
        ],
        num: ['DIN Alternate', 'SF Pro Display', 'PingFang SC', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,24,28,0.04), 0 8px 24px -12px rgba(23,24,28,0.12)',
        lift: '0 18px 40px -18px rgba(255,90,31,0.45)',
        glass: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 12px 32px -16px rgba(23,24,28,0.2)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        breathe: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(255,90,31,0.35)' },
          '50%': { boxShadow: '0 0 0 8px rgba(255,90,31,0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .35s cubic-bezier(.22,1,.36,1) both',
        'pop-in': 'pop-in .22s cubic-bezier(.22,1,.36,1) both',
        breathe: 'breathe 2s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [animate],
};
