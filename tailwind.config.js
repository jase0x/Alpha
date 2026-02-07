/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        xdex: {
          bg: '#000000',
          surface: '#0a0a0a',
          card: '#111111',
          border: '#1a1a1a',
          hover: '#141414',
          accent: '#0b77ea',
          'accent-dim': '#0b77ea33',
          teal: '#00d4aa',
          cyan: '#22d3ee',
          green: '#00c853',
          red: '#ff1744',
          yellow: '#f59e0b',
          text: '#e6e6e6',
          'text-secondary': '#999999',
          'text-muted': '#555555',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
