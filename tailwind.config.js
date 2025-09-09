/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'border-indigo-500',
    'text-indigo-600',
    'dark:border-indigo-400',
    'dark:text-indigo-400',
    'border-teal-500',
    'text-teal-600',
    'dark:border-teal-400',
    'dark:text-teal-400',
    'border-purple-500',
    'text-purple-600',
    'dark:border-purple-400',
    'dark:text-purple-400'
  ],
  theme: {
    extend: {
      keyframes: {
        'shake-subtle': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-3px) rotate(-2deg)' },
          '75%': { transform: 'translateX(3px) rotate(2deg)' },
        },
        'pulse-subtle': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
      },
      animation: {
        'shake-subtle': 'shake-subtle 0.5s ease-in-out',
        'pulse-subtle': 'pulse-subtle 0.2s ease-in-out',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}