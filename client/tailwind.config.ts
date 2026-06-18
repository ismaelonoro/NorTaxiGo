import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fdf9ed',
          100: '#f9f0cd',
          200: '#f2df97',
          300: '#eac85a',
          400: '#e4b330',
          500: '#C4973A',
          600: '#a87830',
          700: '#875d29',
          800: '#6f4b27',
          900: '#5e3f24',
        },
        cream: {
          50: '#fafaf8',
          100: '#f5f4ef',
          200: '#eceae0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        modal: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      },
    },
  },
  plugins: [],
} satisfies Config;
