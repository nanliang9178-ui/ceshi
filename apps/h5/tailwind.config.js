/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#17181C',
          700: '#2A2B33',
          500: '#5A5B66',
          400: '#8A8B96',
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
        card: '0 1px 2px rgba(23,24,28,.04), 0 10px 26px -16px rgba(23,24,28,.18)',
        bar: '0 18px 36px -18px rgba(23,24,28,.7)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'sheet-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(.6)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up .32s cubic-bezier(.22,1,.36,1) both',
        'sheet-up': 'sheet-up .28s cubic-bezier(.22,1,.36,1) both',
        pop: 'pop .42s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [],
};
