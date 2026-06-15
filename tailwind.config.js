/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float':    'float 3s ease-in-out infinite',
        'page-in':  'pageFadeIn 0.25s ease-out forwards',
        'shimmer':  'shimmer 1.5s infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-8px)' },
        },
        pageFadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      colors: {
        primary: {
          light: '#4F46E5', // indigo-600
          DEFAULT: '#6D28D9', // purple-700
          dark: '#4C1D95', // deeper purple
        },
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(90deg, #4F46E5 0%, #7C3AED 100%)',
      },
    },
  },
  plugins: [],
}
