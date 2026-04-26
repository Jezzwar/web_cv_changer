/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        ink: '#0a0a12',
        surface: '#111120',
        card: '#16162a',
        border: '#2a2a4a',
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        cyan: {
          400: '#22d3ee',
        },
        emerald: {
          400: '#34d399',
        },
        rose: {
          400: '#fb7185',
        },
      },
    },
  },
  plugins: [],
};
